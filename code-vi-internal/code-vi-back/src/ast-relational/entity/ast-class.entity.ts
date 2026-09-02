import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstFile } from './ast-file.entity';
import { AstFunction } from './ast-function.entity';

@Entity('ast_class')
export class AstClass extends CommonEntity {
  @Column({ type: 'varchar', length: 300 })
  name: string;

  @Column()
  fileId: number;

  // pyexamine이 계산한 CK/OO 메트릭 (cbo/rfc/lcom/wmc/dit/noc/nom). 없으면 null.
  @Column({ type: 'json', nullable: true })
  metrics: Record<string, number> | null;

  // tree-sitter 노드의 원문 텍스트(AstNodeInputDto.text). 파서가 안 보내거나 구버전 스냅샷이면 null.
  @Column({ type: 'longtext', nullable: true })
  sourceCode: string | null;

  @Column({ type: 'int' })
  startLine: number;

  @Column({ type: 'int' })
  startCol: number;

  @Column({ type: 'int' })
  endLine: number;

  @Column({ type: 'int' })
  endCol: number;

  @ManyToOne(() => AstFile, (file) => file.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: AstFile;

  @OneToMany(() => AstFunction, (fn) => fn.ownerClass, { cascade: true })
  methods: AstFunction[];

  @Column({ nullable: true })
  parentClassId: number | null;

  @ManyToOne(() => AstClass, (cls) => cls.childClasses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentClassId' })
  parentClass: AstClass | null;

  @OneToMany(() => AstClass, (cls) => cls.parentClass, { cascade: true })
  childClasses: AstClass[];

  @Column({ nullable: true })
  parentFunctionId: number | null;

  @ManyToOne(() => AstFunction, (fn) => fn.childClasses, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentFunctionId' })
  parentFunction: AstFunction | null;
}
