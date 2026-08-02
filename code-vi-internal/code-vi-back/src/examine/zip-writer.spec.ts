import { execFileSync } from 'child_process';
import { createZip, crc32 } from './zip-writer';

/**
 * zip-writer 단위 테스트.
 * 바이너리 포맷이라 "python zipfile 이 읽을 수 있는가"가 유일하게 의미 있는 검증이다 —
 * examine 컨테이너가 실제로 zipfile.ZipFile 로 여는 쪽이므로 같은 구현으로 확인한다.
 */
describe('zip-writer', () => {
  it('CRC-32 가 표준값과 일치', () => {
    expect(crc32(Buffer.from(''))).toBe(0);
    expect(crc32(Buffer.from('hello'))).toBe(0x3610a686);
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });

  it('EOCD 시그니처와 엔트리 수를 기록', () => {
    const zip = createZip([
      { path: 'a.py', content: 'x = 1\n' },
      { path: 'pkg/b.py', content: 'y = 2\n' },
    ]);
    const eocd = zip.subarray(zip.length - 22);
    expect(eocd.readUInt32LE(0)).toBe(0x06054b50);
    expect(eocd.readUInt16LE(10)).toBe(2);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50); // 첫 local header
  });

  it('같은 입력이면 같은 바이트 (타임스탬프 고정)', () => {
    const files = [{ path: 'a.py', content: 'x = 1\n' }];
    expect(createZip(files).equals(createZip(files))).toBe(true);
  });

  it('아카이브 밖으로 나가는 경로를 거부', () => {
    expect(() => createZip([{ path: '../evil.py', content: '' }])).toThrow(
      /escape/,
    );
    expect(() => createZip([{ path: 'a/../../evil.py', content: '' }])).toThrow(
      /escape/,
    );
    expect(() => createZip([{ path: '', content: '' }])).toThrow(/empty/);
    // 선행 '/' 는 제거해 상대경로로 정규화한다(거부 아님).
    expect(() => createZip([{ path: '/a.py', content: '' }])).not.toThrow();
  });

  it('python zipfile 이 열 수 있고 내용이 보존된다', () => {
    const zip = createZip([
      {
        path: 'shape.py',
        content: 'class A:\n    def f(self):\n        return 1\n',
      },
      { path: 'pkg/util.py', content: '한글 주석\nZ = 3\n' },
    ]);

    const output = execFileSync(
      'python3',
      [
        '-c',
        [
          'import sys, zipfile, io, json',
          'z = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
          'assert z.testzip() is None',
          'print(json.dumps({n: z.read(n).decode("utf-8") for n in z.namelist()}))',
        ].join('\n'),
      ],
      { input: zip },
    ).toString();

    expect(JSON.parse(output)).toEqual({
      'shape.py': 'class A:\n    def f(self):\n        return 1\n',
      'pkg/util.py': '한글 주석\nZ = 3\n',
    });
  });
});
