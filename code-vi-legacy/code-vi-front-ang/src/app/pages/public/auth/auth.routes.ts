import { Routes } from '@angular/router';
import { AuthComponent } from './auth.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { GoogleCallbackComponent } from './google-callback/google-callback.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { NewPasswordComponent } from './new-password/new-password.component';
import { TwoStepsComponent } from './two-steps/two-steps.component';
import { SignOutComponent } from './sign-out/sign-out.component';

export const AUTH_ROUTES: Routes = [
    {
        path: '',
        component: AuthComponent,
        children: [
            { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
            { path: 'sign-in', component: SignInComponent, data: { returnUrl: window.location.pathname } },
            { path: 'sign-up', component: SignUpComponent },
            { path: 'google-callback', component: GoogleCallbackComponent },
            { path: 'forgot-password', component: ForgotPasswordComponent },
            { path: 'new-password', component: NewPasswordComponent },
            { path: 'two-steps', component: TwoStepsComponent },
            { path: 'sign-out', component: SignOutComponent },
            { path: '**', redirectTo: 'sign-in' }
        ]
    }
];
