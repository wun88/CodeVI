import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, Index } from 'typeorm';

/**
 * 언어 무관 폴리모픽 코드 유닛. (directory|file|module|class|interface|struct|enum|function|method|field…)
 * kind/language는 열린 문자열 → 언어/종류 추가 시 스키마 불변.
 * 계층은 parentKey(같은 snapshot 내 unitKey 참조)로 표현. 메트릭/속성은 열린 JSON 백.
 */
@Entity('code_unit')
@Index(['snapshotId', 'unitKey'], { unique: true })
export class CodeUnit extends CommonEntity {
  @Column()
  snapshotId: number;

  /** 어댑터가 부여한 캐노니컬 id (snapshot 내 유일). relations/parent가 이걸 참조. */
  @Column({ type: 'varchar', length: 512 })
  unitKey: string;

  @Column({ type: 'varchar', length: 40 })
  kind: string;

  @Column({ type: 'varchar', length: 24 })
  language: string;

  @Column({ type: 'varchar', length: 300 })
  name: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  qualname: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  file: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  parentKey: string | null;

  @Column({ type: 'json', nullable: true })
  range: Record<string, number> | null;

  @Column({ type: 'json', nullable: true })
  attributes: Record<string, any> | null;

  /** 태그형 메트릭: { type, version, values{} } */
  @Column({ type: 'json', nullable: true })
  metrics: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;
}
