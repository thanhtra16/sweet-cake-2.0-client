import { Routes } from '@angular/router';

export const BUYER_ROUTES: Routes = [

    {
        path: 'gioi-thieu',

        loadComponent: () =>
            import('./pages/about/about.component')
                .then(m => m.AboutComponent)
    },

    {
        path: '',
        redirectTo: 'gioi-thieu',
        pathMatch: 'full'
    }

];