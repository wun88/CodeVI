/**
 * 의존성 없는 최소 ZIP(STORED) 인코더.
 *
 * examine 서비스(/codegraph)는 zip 업로드만 받는다. 스니펫처럼 메모리에만 있는
 * 소스를 보내려면 zip 으로 감싸야 하는데, 이것 하나 때문에 압축 라이브러리를
 * 의존성에 추가하지 않는다 — method 0(STORED)로 쓰면 CRC32 외에 로직이 없다.
 *
 * 타임스탬프는 1980-01-01 로 고정한다(같은 입력 → 같은 바이트, 캐시·테스트 안정).
 */

/** DOS 시각/날짜 (1980-01-01 00:00:00 = zip 이 표현 가능한 최소값). */
const DOS_TIME = 0;
const DOS_DATE = 0x21; // (1980-1980)<<9 | 1<<5 | 1

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

/** 범용 플래그 bit 11 — 파일명이 UTF-8 임을 명시. */
const FLAG_UTF8 = 0x0800;

export interface ZipEntry {
  /** zip 내부 경로. 항상 '/' 구분자, 선행 '/' 없이. (예: 'snippet.py') */
  path: string;
  content: string | Buffer;
}

const CRC_TABLE: Int32Array = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

/** ZIP/PKZIP 표준 CRC-32 (unsigned). */
export function crc32(buffer: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

/**
 * 무압축 zip 아카이브를 만든다.
 *
 * @throws Error 경로가 비었거나 절대경로/상위경로(`..`)를 포함할 때 —
 *   examine 컨테이너가 extractall 하므로 zip slip 여지를 여기서 차단한다.
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = normalizeEntryPath(entry.path);
    const nameBuffer = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, 'utf8');
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCAL_HEADER_SIG, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(FLAG_UTF8, 6);
    localHeader.writeUInt16LE(0, 8); // method: stored
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18); // compressed size
    localHeader.writeUInt32LE(data.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(CENTRAL_HEADER_SIG, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(FLAG_UTF8, 8);
    centralHeader.writeUInt16LE(0, 10); // method: stored
    centralHeader.writeUInt16LE(DOS_TIME, 12);
    centralHeader.writeUInt16LE(DOS_DATE, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    // external attrs 상위 16비트 = unix mode(rw-r--r--). JS 시프트는 부호 있는 32비트라 >>> 0 필요.
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(offset, 42); // local header offset

    localParts.push(localHeader, nameBuffer, data);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // central directory start disk
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(central.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, central, eocd]);
}

function normalizeEntryPath(path: string): string {
  const normalized = String(path ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!normalized) {
    throw new Error('zip entry path must not be empty');
  }
  if (normalized.split('/').includes('..')) {
    throw new Error(`zip entry path must not escape the archive root: ${path}`);
  }
  return normalized;
}
