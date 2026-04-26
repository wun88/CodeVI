import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PyExamineResult } from '../interface/pyexamine.interface';
import { IsOptional } from 'class-validator';

@Entity()
export class CodeAnalysis extends CommonEntity {
  @Column()
  jobName: string;

  @Column()
  buildNumber: number;

  @Column()
  status: string;

  @Column()
  buildUrl: string;

  @Column()
  commitHash: string;

  // 1. Reliability
  @Column({ type: 'int', default: 0 })
  bugs: number;

  @Column({ type: 'varchar', nullable: true })
  reliability_rating: string;

  @Column({ type: 'int', default: 0 })
  reliability_remediation_effort: number;

  // 2. Security
  @Column({ type: 'int', default: 0 })
  vulnerabilities: number;

  @Column({ type: 'varchar', nullable: true })
  security_rating: string;

  @Column({ type: 'int', default: 0 })
  security_hotspots: number;

  // 3. Maintainability
  @Column({ type: 'int', default: 0 })
  code_smells: number;

  @Column({ type: 'varchar', nullable: true })
  sqale_rating: string;

  @Column({ type: 'int', default: 0 })
  sqale_index: number; // 기술 부채(분)

  // 4. Complexity
  @Column({ type: 'int', default: 0 })
  complexity: number;

  @Column({ type: 'int', default: 0 })
  cognitive_complexity: number;

  @Column({ type: 'int', default: 0 })
  ncloc: number; // 코드 라인 수

  @Column({ nullable: true })
  teamProjectId: number;

  @Column({ type: 'json', nullable: true })
  @IsOptional()
  pyExamineResult: PyExamineResult[];

  @ManyToOne(() => TeamProject, (project) => project.codeAnalyses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject;
}
