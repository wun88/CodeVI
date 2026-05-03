import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { SignInRequestDto } from './dto/sign-in-request.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateGoogleUserRequestDto } from '../users/dto/create-google-user-request.dto';
import { CreateGithubUserRequestDto } from '../users/dto/create-github-user-request.dto';
import { CreateKakaoUserRequestDto } from '../users/dto/create-kakao-user-request.dto';
import { CreateNaverUserRequestDto } from '../users/dto/create-naver-user-request.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly googleClientId: string;
    private privateKey: string;
    private publicKey: string;

    constructor(
        private jwtService: JwtService,
        private userService: UsersService,
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
            this.logger.error(`RSA Decryption Failed: ${error.message}`);
            throw new InternalServerErrorException('Failed to decrypt data');
        }
    }

    // Sign-In
    async signIn(
        signInRequestDto: SignInRequestDto
    ): Promise<User> {
        this.logger.verbose(`User with email: ${signInRequestDto.email} is signing in`);

        const { email, password } = signInRequestDto;

        try {
            const existingUser = await this.userService.getUserByEmail(email);

            if (!existingUser || !(await bcrypt.compare(password, existingUser.password))) {
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

    async findOrCreateGithubUser(githubProfile: { githubUid: number; email: string; name: string }): Promise<User | null> {
        this.logger.verbose(`User with GitHub UID: ${githubProfile.githubUid} is trying to sign in`);
        const { githubUid, email, name } = githubProfile;

        // 먼저 GitHub UID로 사용자 검색
        let existingUser = await this.userService.getUserByGithubUid(githubUid);

        if (!existingUser) {
            // GitHub UID가 없으면 이메일로 검색
            existingUser = await this.userService.getUserByEmail(email).catch(() => null);

            if (existingUser) {
                this.logger.verbose(`User found by email: ${email}, linking GitHub UID: ${githubUid}`);
                existingUser = await this.userService.updateGithubUid(existingUser.id, githubUid);
            } else {
                this.logger.verbose(`User with GitHub UID: ${githubUid} not found, creating new user`);
                const createGithubUserRequestDto: CreateGithubUserRequestDto = {
                    githubUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.USER,
                };
                existingUser = await this.userService.createUserByGithub(createGithubUserRequestDto);
                this.logger.verbose(`New user with GitHub UID: ${githubUid} created successfully`);
            }
        }

        this.logger.verbose(`User with GitHub UID: ${githubUid} found`);
        return existingUser;
    }

    async findOrCreateKakaoUser(kakaoProfile: { kakaoUid: number; email: string; name: string }): Promise<User | null> {
        this.logger.verbose(`User with Kakao UID: ${kakaoProfile.kakaoUid} is trying to sign in`);
        const { kakaoUid, email, name } = kakaoProfile;

        // 먼저 Kakao UID로 사용자 검색
        let existingUser = await this.userService.getUserByKakaoUid(kakaoUid);

        if (!existingUser) {
            // Kakao UID가 없으면 이메일로 검색
            existingUser = await this.userService.getUserByEmail(email).catch(() => null);

            if (existingUser) {
                this.logger.verbose(`User found by email: ${email}, linking Kakao UID: ${kakaoUid}`);
                existingUser = await this.userService.updateKakaoUid(existingUser.id, kakaoUid);
            } else {
                this.logger.verbose(`User with Kakao UID: ${kakaoUid} not found, creating new user`);
                const createKakaoUserRequestDto: CreateKakaoUserRequestDto = {
                    kakaoUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.USER,
                };
                existingUser = await this.userService.createUserByKakao(createKakaoUserRequestDto);
                this.logger.verbose(`New user with Kakao UID: ${kakaoUid} created successfully`);
            }
        }

        this.logger.verbose(`User with Kakao UID: ${kakaoUid} found`);
        return existingUser;
    }


    async findOrCreateNaverUser(naverProfile: { naverUid: string; email: string; name: string }): Promise<User | null> {
        this.logger.verbose(`User with Naver UID: ${naverProfile.naverUid} is trying to sign in`);
        const { naverUid, email, name } = naverProfile;

        // 먼저 Naver UID로 사용자 검색
        let existingUser = await this.userService.getUserByNaverUid(naverUid);

        if (!existingUser) {
            // Naver UID가 없으면 이메일로 검색
            existingUser = await this.userService.getUserByEmail(email).catch(() => null);

            if (existingUser) {
                this.logger.verbose(`User found by email: ${email}, linking Naver UID: ${naverUid}`);
                existingUser = await this.userService.updateNaverUid(existingUser.id, naverUid);
            } else {
                this.logger.verbose(`User with Naver UID: ${naverUid} not found, creating new user`);
                const createNaverUserRequestDto: CreateNaverUserRequestDto = {
                    naverUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.USER,
                };
                existingUser = await this.userService.createUserByNaver(createNaverUserRequestDto);
                this.logger.verbose(`New user with Naver UID: ${naverUid} created successfully`);
            }
        }

        this.logger.verbose(`User with Naver UID: ${naverUid} found`);
        return existingUser;
    }

    async generateJwt(user: User): Promise<string> {
        const payload = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
        };
        return await this.jwtService.sign(payload);
    }

    // 출석 qrcode에 포함되는 jwt token
    async generateAttendanceJwt(classId: number, sessionId: number): Promise<string> {
        const payload = { classId, sessionId };
        return this.jwtService.sign(payload);
    }
}