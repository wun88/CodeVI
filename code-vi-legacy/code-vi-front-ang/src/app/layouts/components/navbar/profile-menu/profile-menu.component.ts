import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, NgIf, NgForOf } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ThemeService } from 'src/app/core/services/theme/theme.service';
import { UserService } from 'src/app/core/services/users/users.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { UserProfile } from 'src/app/core/models/users/user-response.interface';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-profile-menu',
    templateUrl: './profile-menu.component.html',
    styleUrls: ['./profile-menu.component.scss'],
    standalone: true,
    imports: [NgClass, RouterLink, AngularSvgIconModule, NgIf, NgForOf],
    providers: [UserService, AuthService],
    animations: [
        trigger('openClose', [
            state(
                'open',
                style({
                    opacity: 1,
                    transform: 'translateY(0)',
                    visibility: 'visible',
                }),
            ),
            state(
                'closed',
                style({
                    opacity: 0,
                    transform: 'translateY(-20px)',
                    visibility: 'hidden',
                }),
            ),
            transition('open => closed', [animate('0.2s')]),
            transition('closed => open', [animate('0.2s')]),
        ]),
    ],
})
export class ProfileMenuComponent implements OnInit, OnDestroy {
    user: UserProfile | null = null;
    public isOpen = false;
    public profileMenuItems: { title: string; icon: string; link?: string; click?: () => void }[] = [];
    public themeColors: { name: string; code: string }[] = [
        {
            name: 'base',
            code: '#e11d48',
        },
        {
            name: 'yellow',
            code: '#f59e0b',
        },
        {
            name: 'green',
            code: '#22c55e',
        },
        {
            name: 'blue',
            code: '#3b82f6',
        },
        {
            name: 'orange',
            code: '#ea580c',
        },
        {
            name: 'red',
            code: '#cc0022',
        },
        {
            name: 'violet',
            code: '#6d28d9',
        },
    ];
    public themeMode = ['light', 'dark'];
    private authSubscription: Subscription | undefined;

    constructor(
        public themeService: ThemeService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.authSubscription = this.authService.currentUser$.subscribe(currentUser => {
            this.updateProfileMenuItems(!!currentUser);
            if (currentUser) {
                this.loadUserProfile(currentUser);
            } else {
                this.user = null;
            }
        });

        if (this.authService.isTokenExpired()) {
            console.log('초기 로딩 시 토큰 만료됨. 로그아웃 처리.');
            this.authService.signOut();
        } else {
            this.loadUserProfile(this.authService.loadUserFromToken());
        }
    }

    ngOnDestroy(): void {
        if (this.authSubscription) {
            this.authSubscription.unsubscribe();
        }
    }

    private loadUserProfile(decodedToken: any): void {
        if (decodedToken && decodedToken.id && decodedToken.username && decodedToken.email && decodedToken.role) {
            this.user = {
                id: decodedToken.id,
                username: decodedToken.username,
                email: decodedToken.email,
                role: decodedToken.role,
            };
        } else {
            console.error('디코드된 토큰이 유효하지 않거나 필수 정보가 부족합니다.');
            this.user = null;
        }
    }

    private updateProfileMenuItems(isAuthenticated: boolean): void {
        this.profileMenuItems = [];
        if (isAuthenticated) {
            this.profileMenuItems.push(
                {
                    title: 'Your Profile',
                    icon: './assets/icons/heroicons/outline/user-circle.svg',
                    link: '/profile',
                },
                {
                    title: 'Settings',
                    icon: './assets/icons/heroicons/outline/cog-6-tooth.svg',
                    link: '/settings',
                },
                {
                    title: 'Sign Out',
                    icon: './assets/icons/heroicons/outline/lock-open.svg',
                    link: '/auth/sign-out',
                }
            );
        } else {
            this.profileMenuItems.push(
                {
                    title: 'Sign up',
                    icon: './assets/icons/heroicons/outline/user-plus.svg',
                    link: '/auth/sign-up',
                },
                {
                    title: 'Sign in',
                    icon: './assets/icons/heroicons/outline/lock-closed.svg',
                    link: '/auth/sign-in',
                }
            );
        }
    }

    public toggleMenu(): void {
        this.isOpen = !this.isOpen;
    }

    toggleThemeMode() {
        this.themeService.theme.update((theme) => ({ ...theme, mode: !this.themeService.isDark ? 'dark' : 'light' }));
    }

    toggleThemeColor(color: string) {
        this.themeService.theme.update((theme) => ({ ...theme, color }));
    }

    signOut(): void {
        this.authService.signOut();
        this.router.navigate(['/']).then(() => {
            window.location.reload();
        });
    }
}