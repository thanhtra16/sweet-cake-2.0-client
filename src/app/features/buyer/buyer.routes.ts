import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { BlogListComponent } from './pages/blog/blog-list/blog-list.component';
import { BlogDetailComponent } from './pages/blog/blog-detail/blog-detail.component';

export const BUYER_ROUTES: Routes = [
  {
    path: 'trang-chu',
    pathMatch: 'full',
    title: 'SweetCake - Tiệm Bánh Thủ Công Ngọt Ngào',
    loadComponent: () =>
      import('./pages/home/home.component')
        .then(m => m.HomeComponent)
  },
  {
    path: 'gioi-thieu',
    loadComponent: () =>
      import('./pages/about/about.component')
        .then(m => m.AboutComponent)
  },
  {
    path: 'danh-sach-san-pham',
    title: 'SweetCake - Danh mục sản phẩm',
    loadComponent: () =>
      import('./pages/product-list/product-list.component')
        .then(m => m.ProductListComponent)
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
    path: 'account',
    canActivate: [authGuard],
    title: 'SweetCake - Tài khoản của tôi',
    loadComponent: () =>
      import('./pages/account/account.component')
        .then(m => m.AccountComponent)
  },
  {
    path: 'menu',
    redirectTo: 'danh-sach-san-pham',
    pathMatch: 'full'
  }
];