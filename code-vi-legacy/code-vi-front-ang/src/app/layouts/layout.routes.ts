import { Routes } from '@angular/router';

export const LAYOUT_ROUTES: Routes = [
    {
        path: 'dashboard',
        loadChildren: () => import('../pages/admin/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
    },
    {
        path: 'main',
        loadChildren: () => import('../pages/public/main/main.routes').then(m => m.MAIN_ROUTES)
    },
    { path: '', redirectTo: 'main', pathMatch: 'full' }
];
