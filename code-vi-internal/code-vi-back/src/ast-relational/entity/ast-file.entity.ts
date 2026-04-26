import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstDirectory } from './ast-directory.entity';
import { AstClass } from './ast-class.entity';
import { AstFunction } from './ast-function.entity';

@Entity('ast_file')
export class AstFile extends CommonEntity {
  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column()
  directoryId: number;

  @ManyToOne(() => AstDirectory, (dir) => dir.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directoryId' })
  directory: AstDirectory;

  @OneToMany(() => AstClass, (cls) => cls.file, { cascade: true })
  classes: AstClass[];

  @OneToMany(() => AstFunction, (fn) => fn.file, { cascade: true })
  fileFunctions: AstFunction[];
}
