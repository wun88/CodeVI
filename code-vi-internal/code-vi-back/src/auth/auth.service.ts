import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignInRequestDto } from './dto/sign-in-request.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateGoogleUserRequestDto } from '../users/dto/create-google-user-request.dto';
import { CreateGithubUserRequestDto } from '../users/dto/create-github-user-request.dto';
import { CreateKakaoUserRequestDto } from '../users/dto/create-kakao-user-request.dto';
import { CreateNaverUserRequestDto } from '../users/dto/create-naver-user-request.dto';
import { User } from '../users/entities/user.entity';
import { GithubConnection } from '../github-connect/entities/github-connection.entity';

const GITHUB_CONNECT_STATE_PURPOSE = 'github-connect';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClientId: string;
  private privateKey: string;
  private publicKey: string;

  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    @InjectRepository(GithubConnection)
    private githubConnectionRepository: Repository<GithubConnection>,
  ) {
    this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    this.generateRsaKeyPair();
  }

  private generateRsaKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.logger.log('RSA Key Pair generated for secure onboarding.');
  }

  getRsaPublicKey(): string {
    return this.publicKey;
  }

  decryptText(encryptedText: string): string {
    try {
      const buffer = Buffer.from(encryptedText, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      );
      return decrypted.toString('utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`RSA Decryption Failed: ${message}`);
      throw new InternalServerErrorException('Failed to decrypt data');
    }
  }

  // Sign-In
  async signIn(signInRequestDto: SignInRequestDto): Promise<User> {
    this.logger.verbose(
      `User with email: ${signInRequestDto.email} is signing in`,
    );

    const { email, password } = signInRequestDto;

    try {
      const existingUser = await this.userService.getUserByEmail(email);

      if (
        !existingUser ||
        !(await bcrypt.compare(password, existingUser.password))
      ) {
        throw new UnauthorizedException('Invalid credentials');
      }

      this.logger.verbose(`User with email: ${signInRequestDto.email} found`);
      return existingUser;
    } catch (error) {
      this.logger.error(`Invalid credentials or Internal Server error`);
      throw error;
    }
  }

  async findOrCreateGoogleUser(googleProfile: {
    googleUid: string;
    email: string;
    name: string;
  }): Promise<User | null> {
    this.logger.verbose(
      `User with Google UID: ${googleProfile.googleUid} is trying to sign in`,
    );
    const { googleUid, email, name } = googleProfile;

    // 먼저 Google UID로 사용자 검색
    let existingUser = await this.userService.getUserByGoogleUid(googleUid);

    if (!existingUser) {
      // Google UID가 없으면 이메일로 검색
      existingUser = await this.userService
        .getUserByEmail(email)
        .catch(() => null);
      if (!existingUser) {
        this.logger.verbose(
          `User with Google UID: ${googleUid} not found, creating new user`,
        );
        const createGoogleUserRequestDto: CreateGoogleUserRequestDto = {
          googleUid,
          email,
          username: name || email.split('@')[0],
          role: UserRole.USER,
        };
        existingUser = await this.userService.createUserByGoogle(
          createGoogleUserRequestDto,
        );
        this.logger.verbose(
          `New user with Google UID: ${googleUid} created successfully`,
        );
      }
    }
    return existingUser;
  }

  async findOrCreateGithubUser(githubProfile: {
    githubUid: number;
    email: string;
    name: string;
  }): Promise<User | null> {
    this.logger.verbose(
      `User with GitHub UID: ${githubProfile.githubUid} is trying to sign in`,
    );
    const { githubUid, email, name } = githubProfile;

    // 먼저 GitHub UID로 사용자 검색
    let existingUser = await this.userService.getUserByGithubUid(githubUid);

    if (!existingUser) {
      // GitHub UID가 없으면 이메일로 검색
      existingUser = await this.userService
        .getUserByEmail(email)
        .catch(() => null);

      if (existingUser) {
        this.logger.verbose(
          `User found by email: ${email}, linking GitHub UID: ${githubUid}`,
        );
        existingUser = await this.userService.updateGithubUid(
          existingUser.id,
          githubUid,
        );
      } else {
        this.logger.verbose(
          `User with GitHub UID: ${githubUid} not found, creating new user`,
        );
        const createGithubUserRequestDto: CreateGithubUserRequestDto = {
          githubUid,
          email,
          username: name || email.split('@')[0],
          role: UserRole.USER,
        };
        existingUser = await this.userService.createUserByGithub(
          createGithubUserRequestDto,
        );
        this.logger.verbose(
          `New user with GitHub UID: ${githubUid} created successfully`,
        );
      }
    }

    this.logger.verbose(`User with GitHub UID: ${githubUid} found`);
    return existingUser;
  }

  async findOrCreateKakaoUser(kakaoProfile: {
    kakaoUid: number;
    email: string;
    name: string;
  }): Promise<User | null> {
    this.logger.verbose(
      `User with Kakao UID: ${kakaoProfile.kakaoUid} is trying to sign in`,
    );
    const { kakaoUid, email, name } = kakaoProfile;

    // 먼저 Kakao UID로 사용자 검색
    let existingUser = await this.userService.getUserByKakaoUid(kakaoUid);

    if (!existingUser) {
      // Kakao UID가 없으면 이메일로 검색
      existingUser = await this.userService
        .getUserByEmail(email)
        .catch(() => null);

      if (existingUser) {
        this.logger.verbose(
          `User found by email: ${email}, linking Kakao UID: ${kakaoUid}`,
        );
        existingUser = await this.userService.updateKakaoUid(
          existingUser.id,
          kakaoUid,
        );
      } else {
        this.logger.verbose(
          `User with Kakao UID: ${kakaoUid} not found, creating new user`,
        );
        const createKakaoUserRequestDto: CreateKakaoUserRequestDto = {
          kakaoUid,
          email,
          username: name || email.split('@')[0],
          role: UserRole.USER,
        };
        existingUser = await this.userService.createUserByKakao(
          createKakaoUserRequestDto,
        );
        this.logger.verbose(
          `New user with Kakao UID: ${kakaoUid} created successfully`,
        );
      }
    }

    this.logger.verbose(`User with Kakao UID: ${kakaoUid} found`);
    return existingUser;
  }

  async findOrCreateNaverUser(naverProfile: {
    naverUid: string;
    email: string;
    name: string;
  }): Promise<User | null> {
    this.logger.verbose(
      `User with Naver UID: ${naverProfile.naverUid} is trying to sign in`,
    );
    const { naverUid, email, name } = naverProfile;

    // 먼저 Naver UID로 사용자 검색
    let existingUser = await this.userService.getUserByNaverUid(naverUid);

    if (!existingUser) {
      // Naver UID가 없으면 이메일로 검색
      existingUser = await this.userService
        .getUserByEmail(email)
        .catch(() => null);

      if (existingUser) {
        this.logger.verbose(
          `User found by email: ${email}, linking Naver UID: ${naverUid}`,
        );
        existingUser = await this.userService.updateNaverUid(
          existingUser.id,
          naverUid,
        );
      } else {
        this.logger.verbose(
          `User with Naver UID: ${naverUid} not found, creating new user`,
        );
        const createNaverUserRequestDto: CreateNaverUserRequestDto = {
          naverUid,
          email,
          username: name || email.split('@')[0],
          role: UserRole.USER,
        };
        existingUser = await this.userService.createUserByNaver(
          createNaverUserRequestDto,
        );
        this.logger.verbose(
          `New user with Naver UID: ${naverUid} created successfully`,
        );
      }
    }

    this.logger.verbose(`User with Naver UID: ${naverUid} found`);
    return existingUser;
  }

  generateJwt(user: User): Promise<string> {
    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    return Promise.resolve(this.jwtService.sign(payload));
  }

  // 출석 qrcode에 포함되는 jwt token
  generateAttendanceJwt(classId: number, sessionId: number): Promise<string> {
    const payload = { classId, sessionId };
    return Promise.resolve(this.jwtService.sign(payload));
  }

  // ===== GitHub Repository 연동 (repo scope 토큰 저장/조회) =====
  // AuthService의 RSA 키 쌍(generateRsaKeyPair)은 프로세스 시작마다 재생성되어 영속 저장에 부적합하므로,
  // 장기 보관이 필요한 GitHub access token은 별도의 AES-256-GCM(env 고정 키)으로 암복호화한다.
  private githubTokenEncKey(): Buffer {
    const raw = process.env.GITHUB_TOKEN_ENC_KEY;
    if (!raw) {
      throw new InternalServerErrorException(
        'GITHUB_TOKEN_ENC_KEY가 설정되지 않았습니다. .env에 32byte(base64) 키를 추가해주세요.',
      );
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'GITHUB_TOKEN_ENC_KEY는 base64로 인코딩된 32byte 키여야 합니다.',
      );
    }
    return key;
  }

  private encryptGithubToken(token: string): string {
    const key = this.githubTokenEncKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join('.');
  }

  private decryptGithubToken(stored: string): string {
    const key = this.githubTokenEncKey();
    const [ivB64, tagB64, dataB64] = stored.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new InternalServerErrorException(
        '저장된 GitHub 토큰 형식이 올바르지 않습니다.',
      );
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /**
   * repo scope OAuth 인가 시작 시 브라우저 풀 리다이렉트에 실어 보낼 signed state (10분 만료).
   * teamProjectId가 있으면 "기존 프로젝트에 코드 연결" 플로우(jej_20 Phase 5) — 콜백이 끝난 뒤
   * 어느 프로젝트로 돌아가야 하는지 state에 실어 왕복시킨다.
   */
  signGithubConnectState(userId: number, teamProjectId?: number): string {
    return this.jwtService.sign(
      { purpose: GITHUB_CONNECT_STATE_PURPOSE, userId, teamProjectId },
      { expiresIn: '10m' },
    );
  }

  /** GitHub 콜백에서 돌아온 state를 검증한다. 로그인 전용 콜백(state 없음)과의 구분에 사용. */
  verifyGithubConnectState(
    state: string,
  ): { userId: number; teamProjectId?: number } | null {
    try {
      const payload = this.jwtService.verify<{
        purpose?: string;
        userId?: number;
        teamProjectId?: number;
      }>(state);
      if (payload?.purpose !== GITHUB_CONNECT_STATE_PURPOSE || !payload.userId)
        return null;
      return { userId: payload.userId, teamProjectId: payload.teamProjectId };
    } catch {
      return null;
    }
  }

  async saveGithubConnection(
    userId: number,
    accessToken: string,
    scope: string,
    githubUsername?: string | null,
  ): Promise<void> {
    const encryptedAccessToken = this.encryptGithubToken(accessToken);
    const existing = await this.githubConnectionRepository.findOne({
      where: { userId },
    });
    if (existing) {
      await this.githubConnectionRepository.save({
        ...existing,
        encryptedAccessToken,
        scope,
        githubUsername: githubUsername ?? existing.githubUsername,
      });
      return;
    }
    await this.githubConnectionRepository.save(
      this.githubConnectionRepository.create({
        userId,
        encryptedAccessToken,
        scope,
        githubUsername: githubUsername ?? null,
      }),
    );
  }

  async getGithubConnection(userId: number): Promise<GithubConnection | null> {
    return this.githubConnectionRepository.findOne({ where: { userId } });
  }

  /** 저장된 GitHub access token을 복호화해 반환한다. 미연결 시 409. */
  async getDecryptedGithubToken(userId: number): Promise<string> {
    const connection = await this.githubConnectionRepository.findOne({
      where: { userId },
    });
    if (!connection) {
      throw new ConflictException('GitHub 계정이 연결되어 있지 않습니다.');
    }
    return this.decryptGithubToken(connection.encryptedAccessToken);
  }

  async deleteGithubConnection(userId: number): Promise<void> {
    const existing = await this.githubConnectionRepository.findOne({
      where: { userId },
    });
    if (!existing) {
      throw new ConflictException('GitHub 계정이 연결되어 있지 않습니다.');
    }
    await this.githubConnectionRepository.remove(existing);
  }
}
