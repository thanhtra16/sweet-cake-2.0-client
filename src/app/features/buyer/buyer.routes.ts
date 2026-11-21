
import { Routes } from '@angular/router';
import { BlogListComponent } from './pages/blog/blog-list/blog-list.component';
import { BlogDetailComponent } from './pages/blog/blog-detail/blog-detail.component';
export const BUYER_ROUTES: Routes = [
  {
    path: 'gioi-thieu',
    loadComponent: () =>
      import('./pages/about/about.component')
        .then(m => m.AboutComponent)
  },
  {
    path: 'faq',
    loadComponent: () =>
      import('./pages/faq/faq.component')
        .then(m => m.FaqComponent)
  },
  {
    path: 'policies',
    loadComponent: () =>
      import('./pages/policies/policies.component')
        .then(m => m.PoliciesComponent)
  },
{
  path: 'blog',
  component: BlogListComponent
},
{
  path: 'blog/:slug',
  component: BlogDetailComponent
},
  {
    path: '',
    redirectTo: 'gioi-thieu',
    pathMatch: 'full'
  }
];
