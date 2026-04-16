import { Routes } from '@angular/router';
import { DashboardListComponent } from './dashboard-list/dashboard-list.component';
import { DashboardDetailsComponent } from './dashboard-details/dashboard-details.component';

export const DASHBOARD_ROUTES: Routes = [
    {
        path: '',
        component: DashboardListComponent
    },
    {
        path: 'details/:projectId/:astDataId',
        component: DashboardDetailsComponent
    }
];
