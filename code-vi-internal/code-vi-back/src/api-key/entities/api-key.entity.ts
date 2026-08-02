import { CommonEntity } from '../../common/entities/common.entity';
import { TeamProject } from '../../team-project/entities/team-project.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity()
export class ApiKey extends CommonEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  prefix: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  hashedKey: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Index()
  @Column()
  userId: number;

  @Index()
  @Column({ nullable: true })
  teamProjectId: number | null;

  @ManyToOne(() => User, (user) => user.apiKeys, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => TeamProject, (teamProject) => teamProject.apiKeys, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teamProjectId' })
  teamProject: TeamProject | null;
}
