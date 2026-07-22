import { BadRequestException, Body, ConflictException, Controller, HttpStatus, Logger, Post, Res, Get, UseGuards, Req, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInRequestDto } from './dto/sign-in-request.dto';
import type { Request, Response } from 'express';
import { ApiResponseDto } from 'src/common/api-response-dto/api-response.dto';
import { CreateUserDto } from 'src/users/dto/create-user-request.dto';
import { UsersService } from 'src/users/users.service';
import { GoogleAuthGuard } from './custom-guards-decorators/google-auth.guard';
import { GithubAuthGuard } from './custom-guards-decorators/github-auth.guard';
import { KakaoAuthGuard } from './custom-guards-decorators/kakao-auth.guard';
import { NaverAuthGuard } from './custom-guards-decorators/naver-auth.guard';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { Roles } from './custom-guards-decorators/roles.decorator';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);
    private readonly frontendUrl: string;

    constructor(
        private authService: AuthService,
        private usersService: UsersService,
    ) {
        this.frontendUrl = process.env.FRONTEND_REDIRECT_URI || '';
    }

    // DEAD CODE (2026-07-11): 정책상 로컬 이메일 회원가입 미사용 — 인증은 GitHub·Google OAuth만 사용.
    // (엔드포인트 자체는 role 포함 시 정상 동작 확인됨. 프론트 호출자 없음)
    // Sign-Up
    @Post('/signup')
    async createUser(
        @Body() createUserRequestDto: CreateUserDto,
    ): Promise<void> {
        this.logger.verbose(
            `Visitor is trying to create a new account with email: ${createUserRequestDto.email}`,
        );

        try {
            await this.usersService.createUser(createUserRequestDto);
            this.logger.verbose(`New account created Successfully`);
        } catch (error) {
            if (error instanceof ConflictException) {
                throw new ConflictException(error.message);
            } else if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('회원가입 중 오류가 발생했습니다.');
        }
    }

    // DEAD CODE (2026-07-11): 정책상 로컬 이메일 로그인 미사용 — 인증은 GitHub·Google OAuth만 사용.
    // (엔드포인트 자체는 정상 동작 확인됨. 프론트 호출자 없음)
    // Sign-In
    @Post('/signin')
    async signIn(
        @Body() signInRequestDto: SignInRequestDto,
        @Res() res: Response,
    ): Promise<void> {
        this.logger.verbose(
            `User with email: ${signInRequestDto.email} is trying to sign in`,
        );

        try {
            const user = await this.authService.signIn(signInRequestDto);

            const jwtToken = await this.authService.generateJwt(user);

            this.logger.verbose(
                `User with email: ${signInRequestDto.email} issued JWT ${jwtToken}`,
            );

            res.setHeader('Authorization', `Bearer ${jwtToken}`);
            const response = new ApiResponseDto(
                true,
                HttpStatus.OK,
                'User logged in successfully',
                { jwtToken },
            );
            res.send(response);
        } catch (error) {
            this.logger.error(`Sign-in failed: ${error.message}`);
            res
                .status(HttpStatus.UNAUTHORIZED)
                .send(
                    new ApiResponseDto(
                        false,
                        HttpStatus.UNAUTHORIZED,
                        '이메일 또는 비밀번호를 확인해주세요.',
                    ),
                );
        }
    }

    @Get('/google/signin')
    @UseGuards(GoogleAuthGuard)
    async googleAuth(): Promise<void> {
        this.logger.verbose(`User is trying to Google social sign-in`);
    }

    @Get('/google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        this.logger.verbose(`Processing Google authentication callback`);
        if (!req.user) {
            this.logger.error(`Google authentication failed, req.user is null`);
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=google_auth_failed`,
            );
        }
        try {
            const jwtToken = await this.authService.generateJwt(req.user as User);
            this.logger.verbose(
                `Google authentication successful for user, JWT issued.`,
            );

            const callbackUrlWithToken = `${this.frontendUrl}/auth/google-callback?jwtToken=Bearer ${jwtToken}`;

            return res.redirect(callbackUrlWithToken);
        } catch (error) {
            this.logger.error(
                `Error processing Google callback for user: ${req.user ? (req.user as User).id : 'unknown'}`,
                error instanceof Error ? error.stack : undefined
            );
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=jwt_generation_failed`,
            );
        }
    }

    @Get('/github/signin')
    @UseGuards(GithubAuthGuard)
    async githubAuth(): Promise<void> {
        this.logger.verbose(`User is trying to GitHub social sign-in`);
        // GitHub 로그인 페이지로 리디렉션 (Passport가 처리)
    }

    @Get('/github/callback')
    @UseGuards(GithubAuthGuard)
    async githubAuthRedirect(
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        this.logger.verbose(`Processing GitHub authentication callback`);
        if (!req.user) {
            this.logger.error(`GitHub authentication failed, req.user is null`);
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=github_auth_failed`,
            );
        }

        // Project Analysis > GitHub 연동(repo scope)에서 시작된 콜백인지 state로 구분한다.
        // GitHub OAuth App은 콜백 URL을 하나만 등록할 수 있어 로그인과 같은 콜백을 공유하고,
        // state(서명된 JWT)만으로 두 흐름을 분기한다.
        const connectState = req.query.state
            ? this.authService.verifyGithubConnectState(req.query.state as string)
            : null;
        if (connectState) {
            const authenticatedUser = req.user as User & {
                _githubAccessToken?: string;
                _githubUsername?: string;
            };
            const accessToken = authenticatedUser._githubAccessToken;
            if (!accessToken) {
                this.logger.error('GitHub connect callback: access token missing on req.user');
                return res.redirect(`${this.frontendUrl}/code-insight/github?error=github_token_missing`);
            }
            try {
                await this.authService.saveGithubConnection(
                    connectState.userId,
                    accessToken,
                    'repo,read:user',
                    authenticatedUser._githubUsername ?? authenticatedUser.username,
                );
                return res.redirect(`${this.frontendUrl}/code-insight/github?connected=true`);
            } catch (error) {
                this.logger.error(
                    `Failed to save GitHub connection: ${error instanceof Error ? error.message : error}`,
                );
                return res.redirect(`${this.frontendUrl}/code-insight/github?error=github_connect_failed`);
            }
        }

        try {
            const jwtToken = await this.authService.generateJwt(req.user as User);
            this.logger.verbose(
                `GitHub authentication successful for user, JWT issued.`,
            );

            const callbackUrlWithToken = `${this.frontendUrl}/auth/github-callback?jwtToken=Bearer ${jwtToken}`;
            return res.redirect(callbackUrlWithToken);
        } catch (error) {
            this.logger.error(
                `Error processing GitHub callback for user: ${req.user ? (req.user as User).id : 'unknown'}`,
                error instanceof Error ? error.stack : undefined
            );
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=jwt_generation_failed`,
            );
        }
    }

    // DEAD CODE (2026-07-11): 정책상 GitHub·Google 로그인만 사용 — Kakao OAuth 미사용.
    @Get('/kakao/signin')
    @UseGuards(KakaoAuthGuard)
    async kakaoAuth(): Promise<void> {
        this.logger.verbose(`User is trying to Kakao social sign-in`);
    }

    @Get('/kakao/callback')
    @UseGuards(KakaoAuthGuard)
    async kakaoAuthRedirect(
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        this.logger.verbose(`Processing Kakao authentication callback`);
        if (!req.user) {
            this.logger.error(`Kakao authentication failed, req.user is null`);
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=kakao_auth_failed`,
            );
        }
        try {
            const jwtToken = await this.authService.generateJwt(req.user as User);
            this.logger.verbose(
                `Kakao authentication successful for user, JWT issued.`,
            );

            const callbackUrlWithToken = `${this.frontendUrl}/auth/kakao-callback?jwtToken=Bearer ${jwtToken}`;
            return res.redirect(callbackUrlWithToken);
        } catch (error) {
            this.logger.error(
                `Error processing Kakao callback for user: ${req.user ? (req.user as User).id : 'unknown'}`,
                error instanceof Error ? error.stack : undefined
            );
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=jwt_generation_failed`,
            );
        }
    }

    // DEAD CODE (2026-07-11): 정책상 GitHub·Google 로그인만 사용 — Naver OAuth 미사용.
    @Get('/naver/signin')
    @UseGuards(NaverAuthGuard)
    async naverAuth(): Promise<void> {
        this.logger.verbose(`User is trying to Naver social sign-in`);
    }

    @Get('/naver/callback')
    @UseGuards(NaverAuthGuard)
    async naverAuthRedirect(
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        this.logger.verbose(`Processing Naver authentication callback`);
        if (!req.user) {
            this.logger.error(`Naver authentication failed, req.user is null`);
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=naver_auth_failed`,
            );
        }
        try {
            const jwtToken = await this.authService.generateJwt(req.user as User);
            this.logger.verbose(
                `Naver authentication successful for user, JWT issued.`,
            );

            const callbackUrlWithToken = `${this.frontendUrl}/auth/naver-callback?jwtToken=Bearer ${jwtToken}`;
            return res.redirect(callbackUrlWithToken);
        } catch (error) {
            this.logger.error(
                `Error processing Naver callback for user: ${req.user ? (req.user as User).id : 'unknown'}`,
                error instanceof Error ? error.stack : undefined
            );
            return res.redirect(
                `${this.frontendUrl}/auth/sign-in?error=jwt_generation_failed`,
            );
        }
    }

    // DEAD CODE (2026-07-11): 출결/클래스 기능 잔재 — 현 프론트(react)·Jenkins·MCP 어디에서도
    // 호출하지 않음(legacy Angular 프론트만 관련 UI 존재). User 엔티티의 classRegistrations
    // 관계도 이미 제거되어 관련 users.service 조회는 500을 냄.
    @Get('/attendance/:classId/:sessionId')
    @Roles(UserRole.ADMIN)
    async getAttendanceJwt(
        @Param('classId') classId: number,
        @Param('sessionId') sessionId: number,
    ): Promise<string> {
        this.logger.verbose(`Generate JWT Token for Attendance`);

        const jwt = await this.authService.generateAttendanceJwt(
            classId,
            sessionId,
        );

        this.logger.verbose(`JWT Token generated Successfully`);
        return jwt;
    }

    @Get('/rsa-public-key')
    async getRsaPublicKey(): Promise<string> {
        this.logger.verbose(`Retrieving RSA Public Key`);
        return this.authService.getRsaPublicKey();
    }
}
