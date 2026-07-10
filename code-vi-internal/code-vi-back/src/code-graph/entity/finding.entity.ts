import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, Index } from 'typeorm';

/** 언어 무관 코드 스멜/발견. entityKey = 대상 CodeUnit.unitKey. category는 8종 고정. */
@Entity('finding')
@Index(['snapshotId'])
export class Finding extends CommonEntity {
  @Column()
  snapshotId: number;

  @Column({ type: 'varchar', length: 80 })
  detector: string;

  @Column({ type: 'varchar', length: 48 })
  category: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  entityKey: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  file: string | null;

  @Column({ type: 'int', nullable: true })
  line: number | null;

  @Column({ type: 'varchar', length: 16 })
  severity: string;

  @Column({ type: 'json', nullable: true })
  metrics: Record<string, any> | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  message: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  language: string | null;
}
