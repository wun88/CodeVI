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

  @ManyToOne(() => AstClass, (cls) => cls.childClasses, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentClassId' })
  parentClass: AstClass | null;

  @OneToMany(() => AstClass, (cls) => cls.parentClass, { cascade: true })
  childClasses: AstClass[];

  @Column({ nullable: true })
  parentFunctionId: number | null;

  @ManyToOne(() => AstFunction, (fn) => fn.childClasses, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentFunctionId' })
  parentFunction: AstFunction | null;
}
