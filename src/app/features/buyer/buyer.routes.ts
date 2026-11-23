import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { BlogListComponent } from './pages/blog/blog-list/blog-list.component';
import { BlogDetailComponent } from './pages/blog/blog-detail/blog-detail.component';
import { OrderTrackComponent } from './pages/order-track/order-track.component';
import { OrderListComponent } from './pages/order-list/order-list.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';

export const BUYER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/buyer-layout/buyer-layout.component').then(
        (m) => m.BuyerLayoutComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'trang-chu',
      },
      {
        path: 'trang-chu',
        title: 'SweetCake - Tiệm Bánh Thủ Công Ngọt Ngào',
        loadComponent: () =>
          import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'danh-sach-san-pham',
        title: 'SweetCake - Danh mục sản phẩm',
        loadComponent: () =>
          import('./pages/product-list/product-list.component').then(
            (m) => m.ProductListComponent
          ),
      },
      {
        path: 'products',
        redirectTo: 'danh-sach-san-pham',
        pathMatch: 'full',
      },
      {
        path: 'menu',
        redirectTo: 'danh-sach-san-pham',
        pathMatch: 'full',
      },
      {
        path: 'accessories',
        redirectTo: 'danh-sach-san-pham',
        pathMatch: 'full',
      },
      {
        path: 'gioi-thieu',
        loadComponent: () =>
          import('./pages/about/about.component').then(
            (m) => m.AboutComponent
          ),
      },
      {
        path: 'lien-he',
        loadComponent: () =>
          import('./pages/contact/contact.component').then(
            (m) => m.ContactComponent
          ),
      },
      {
        path: 'faq',
        loadComponent: () =>
          import('./pages/faq/faq.component').then((m) => m.FaqComponent),
      },
      {
        path: 'policies',
        loadComponent: () =>
          import('./pages/policies/policies.component').then(
            (m) => m.PoliciesComponent
          ),
      },
      {
        path: 'blog',
        component: BlogListComponent,
      },
      {
        path: 'blog/:slug',
        component: BlogDetailComponent,
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./pages/product-detail/product-detail').then(
            (m) => m.ProductDetail
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./pages/cart/cart').then((m) => m.Cart),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./pages/checkout/checkout').then(
            (m) => m.CheckoutPage
          ),
      },
      {
        path: 'payment/:orderId',
        loadComponent: () =>
          import('./pages/payment/payment').then(
            (m) => m.PaymentPage
          ),
      },
      {
        path: 'track',
        component: OrderTrackComponent,
      },
      {
        path: 'orders',
        component: OrderListComponent,
      },
      {
        path: 'orders/:id',
        component: OrderDetailComponent,
      },
      {
        path: 'account',
        canActivate: [authGuard],
        title: 'SweetCake - Tài khoản của tôi',
        loadComponent: () =>
          import('./pages/account/account.component').then(
            (m) => m.AccountComponent
          ),
      },
      {
        path: 'quan-ly-tai-khoan',
        redirectTo: 'account',
        pathMatch: 'full',
      },
    ],
  },
];