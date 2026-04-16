import { CommonEntity } from 'src/common/entities/common.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstSnapshot } from './ast-snapshot.entity';
import { AstFile } from './ast-file.entity';

@Entity('ast_directory')
export class AstDirectory extends CommonEntity {
  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column()
  snapshotId: number;

  @ManyToOne(() => AstSnapshot, (snapshot) => snapshot.directories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshotId' })
  snapshot: AstSnapshot;

  @Column({ nullable: true })
  parentDirectoryId: number | null;

  @ManyToOne(() => AstDirectory, (dir) => dir.childDirectories, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentDirectoryId' })
  parentDirectory: AstDirectory | null;

  @OneToMany(() => AstDirectory, (dir) => dir.parentDirectory, { cascade: true })
  childDirectories: AstDirectory[];

  @OneToMany(() => AstFile, (file) => file.directory, { cascade: true })
  files: AstFile[];
}
