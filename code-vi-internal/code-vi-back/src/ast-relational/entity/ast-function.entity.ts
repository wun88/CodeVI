import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstFile } from './ast-file.entity';
import { AstClass } from './ast-class.entity';

@Entity('ast_function')
export class AstFunction extends CommonEntity {
  @Column({ type: 'varchar', length: 300 })
  name: string;

  @Column({ type: 'int' })
  startLine: number;

  @Column({ type: 'int' })
  startCol: number;

  @Column({ type: 'int' })
  endLine: number;

  @Column({ type: 'int' })
  endCol: number;

  // 파일 레벨 함수인 경우 (클래스에 속하지 않는 함수)
  @Column({ nullable: true })
  fileId: number | null;

  @ManyToOne(() => AstFile, (file) => file.fileFunctions, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: AstFile | null;

  // 클래스 메서드인 경우
  @Column({ nullable: true })
  classId: number | null;

  @ManyToOne(() => AstClass, (cls) => cls.methods, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  ownerClass: AstClass | null;

  @Column({ nullable: true })
  parentFunctionId: number | null;

  @ManyToOne(() => AstFunction, (fn) => fn.childFunctions, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentFunctionId' })
  parentFunction: AstFunction | null;

  @OneToMany(() => AstFunction, (fn) => fn.parentFunction, { cascade: true })
  childFunctions: AstFunction[];

  @OneToMany(() => AstClass, (cls) => cls.parentFunction, { cascade: true })
  childClasses: AstClass[];
}
