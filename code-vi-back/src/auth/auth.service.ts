import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SignInRequestDto } from './dto/sign-in-request.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateGoogleUserRequestDto } from 'src/users/dto/create-google-user-request.dto';
import { CreateGithubUserRequestDto } from 'src/users/dto/create-github-user-request.dto';
import { User } from 'src/users/entities/user.entity';

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