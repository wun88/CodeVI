import { Entity, Column, OneToMany, ManyToMany, Index } from 'typeorm';
import { UserRole } from './user-role.enum';
import { UserStatus } from './user-status.enum';
import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';

@Entity()
export class User extends CommonEntity {
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 18 })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @Column({ type: 'enum', enum: UserRole, nullable: true })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  googleUid: string;

  @Index({ unique: true })
  @Column({ type: 'bigint', nullable: true })
  githubUid: number;

  @Index({ unique: true })
  @Column({ type: 'bigint', nullable: true })
  kakaoUid: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  naverUid: string;

  @ManyToMany(() => TeamProject, (teamProject) => teamProject.users)
  teamProjects: TeamProject[];
}
