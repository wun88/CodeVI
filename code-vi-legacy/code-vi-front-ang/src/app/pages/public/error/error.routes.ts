import { Routes } from '@angular/router';
import { ErrorComponent } from './error.component';
import { Error404Component } from './error404/error404.component';
import { Error500Component } from './error500/error500.component';

export const ERROR_ROUTES: Routes = [
    {
        path: '',
        component: ErrorComponent,
        children: [
            { path: '', redirectTo: '404', pathMatch: 'full' },
            { path: '404', component: Error404Component },
            { path: '500', component: Error500Component },
            { path: '**', redirectTo: '404' }
        ]
    }
];
