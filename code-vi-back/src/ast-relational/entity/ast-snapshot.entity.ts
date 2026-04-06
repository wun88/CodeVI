import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AstDirectory } from './ast-directory.entity';

@Entity('ast_snapshot')
export class AstSnapshot extends CommonEntity {
  @Column()
  teamProjectId: number;

  @Column()
  buildNumber: number;

  @Column()
  buildUrl: string;

  @ManyToOne(() => TeamProject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;

  @Column({ type: 'json', nullable: true, select: false })
  wholeJson: any;

  @OneToMany(() => AstDirectory, (dir) => dir.snapshot, { cascade: true })
  directories: AstDirectory[];
}
