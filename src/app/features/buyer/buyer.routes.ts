import { Routes } from '@angular/router';

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
        redirectTo: 'gioi-thieu',
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
        path: 'product/:id',
        loadComponent: () =>
          import('./product/pages/product-detail/product-detail').then(
            (m) => m.ProductDetail
          ),
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./cart/pages/cart/cart').then((m) => m.Cart),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./checkout/pages/checkout/checkout').then(
            (m) => m.CheckoutPage
          ),
      },
      {
        path: 'payment/:orderId',
        loadComponent: () =>
          import('./payment/pages/payment/payment').then(
            (m) => m.PaymentPage
          ),
      },
    ],
  },
];