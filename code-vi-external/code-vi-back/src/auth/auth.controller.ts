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

    // Sign-Up
    @Post('/signup')
    async createUser(
        @Body() createUserRequestDto: CreateUserDto,
    ): Promise<ApiResponseDto<void>> {
        this.logger.verbose(
            `Visitor is trying to create a new account with email: ${createUserRequestDto.email}`,
        );

        try {
            await this.usersService.createUser(createUserRequestDto);
            this.logger.verbose(`New account created Successfully`);
            return new ApiResponseDto(
                true,
                HttpStatus.CREATED,
                '회원가입이 완료되었습니다.',
            );
        } catch (error) {
            if (error instanceof ConflictException) {
                throw new ConflictException(error.message);
            } else if (error instanceof BadRequestException) {
                throw new BadRequestException(error.message);
            }
            throw new BadRequestException('회원가입 중 오류가 발생했습니다.');
        }
    }

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

    @Get('/attendance/:classId/:sessionId')
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
    async getAttendanceJwt(
        @Param('classId') classId: number,
        @Param('sessionId') sessionId: number,
    ): Promise<ApiResponseDto<string>> {
        this.logger.verbose(`Generate JWT Token for Attendance`);

        const jwt = await this.authService.generateAttendanceJwt(
            classId,
            sessionId,
        );

        this.logger.verbose(`JWT Token generated Successfully`);
        return new ApiResponseDto(
            true,
            HttpStatus.CREATED,
            `JWT Token generated Successfully`,
            jwt,
        );
    }
}
