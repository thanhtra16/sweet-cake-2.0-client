
import { Routes } from '@angular/router';

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
        path: '',
        redirectTo: 'gioi-thieu',
        pathMatch: 'full'
    }

];
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/buyer-layout/buyer-layout.component')
        .then(m => m.BuyerLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'product/demo'
      },
      {
        path: 'product/:id',
        loadComponent: () =>
          import('./product/pages/product-detail/product-detail')
            .then(m => m.ProductDetail)
      },
      {
        path: 'cart',
        loadComponent: () =>
          import('./cart/pages/cart/cart')
            .then(m => m.Cart)
      }
    ]
  }
];
