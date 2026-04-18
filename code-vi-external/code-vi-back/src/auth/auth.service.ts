import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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

    constructor(
        private jwtService: JwtService,
        private userService: UsersService,
    ) {
        this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
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

    async findOrCreateGoogleUser(googleProfile: { email: string, name: string }): Promise<User | null> {
        this.logger.verbose(`User with G-mail: ${googleProfile.email} is trying to sign in`);
        const { email, name } = googleProfile;

        let existingUser = await this.userService.getUserByEmail(email).catch(() => null);

        if (!existingUser) {
            this.logger.verbose(`User with email: ${email} not found, creating new user with Google profile`);
            const createGoogleUserRequestDto: CreateGoogleUserRequestDto = {
                email,
                username: name || email.split('@')[0],
                role: UserRole.STUDENT,
            };
            await this.userService.createUserByGoogle(createGoogleUserRequestDto);
            existingUser = await this.userService.getUserByEmail(email);
            this.logger.verbose(`New user with google email: ${email} created successfully`);
        }
        this.logger.verbose(`User with G-mail: ${email} found`);
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

            if (!existingUser) {
                this.logger.verbose(`User with GitHub UID: ${githubUid} not found, creating new user`);
                const createGithubUserRequestDto: CreateGithubUserRequestDto = {
                    githubUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.STUDENT,
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

            if (!existingUser) {
                this.logger.verbose(`User with Kakao UID: ${kakaoUid} not found, creating new user`);
                const createKakaoUserRequestDto: CreateKakaoUserRequestDto = {
                    kakaoUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.STUDENT,
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

            if (!existingUser) {
                this.logger.verbose(`User with Naver UID: ${naverUid} not found, creating new user`);
                const createNaverUserRequestDto: CreateNaverUserRequestDto = {
                    naverUid,
                    email,
                    username: name || email.split('@')[0],
                    role: UserRole.STUDENT,
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