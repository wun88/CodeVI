import { Routes } from '@angular/router';
import { MainComponent } from './main.component';
import { IntroductionComponent } from './introduction/introduction.component';

export const MAIN_ROUTES: Routes = [
    {
        path: '',
        component: MainComponent,
        children: [
            { path: '', component: IntroductionComponent },
            { path: '**', redirectTo: '' }
        ]
    }
];
