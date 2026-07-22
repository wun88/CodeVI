import { Entity, Column, Index } from 'typeorm';
import { CommonEntity } from '../../common/entities/common.entity';

@Entity()
export class GithubConnection extends CommonEntity {
  @Index({ unique: true })
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', nullable: true })
  githubUsername: string | null;

  // AES-256-GCM: `${iv}.${authTag}.${ciphertext}` (각 base64) — 서버 재시작에도 살아남아야 하므로
  // AuthService의 RSA 키(프로세스별 재생성)와는 별도로 GITHUB_TOKEN_ENC_KEY(env)로 암복호화한다.
  @Column({ type: 'text' })
  encryptedAccessToken: string;

  @Column({ type: 'varchar' })
  scope: string;
}
