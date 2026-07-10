import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, Index } from 'typeorm';

/** 코드 유닛 간 관계 (inherits|imports|calls…). unitKey 참조. */
@Entity('code_relation')
@Index(['snapshotId'])
export class CodeRelation extends CommonEntity {
  @Column()
  snapshotId: number;

  @Column({ type: 'varchar', length: 24 })
  kind: string;

  @Column({ type: 'varchar', length: 512 })
  sourceKey: string;

  @Column({ type: 'varchar', length: 512 })
  targetKey: string;
}
