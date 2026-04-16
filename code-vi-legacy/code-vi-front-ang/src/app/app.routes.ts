import { Routes } from '@angular/router';
import { LayoutComponent } from './layouts/layout.component';

export const routes: Routes = [
    { path: '', redirectTo: 'main', pathMatch: 'full' },
    {
        path: 'auth',
        loadChildren: () => import('./pages/public/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: 'errors',
        loadChildren: () => import('./pages/public/error/error.routes').then((m) => m.ERROR_ROUTES),
    },
    {
        path: '',
        component: LayoutComponent,
        loadChildren: () => import('./layouts/layout.routes').then((m) => m.LAYOUT_ROUTES),
    },
    { path: '**', redirectTo: 'errors/404' },
];
