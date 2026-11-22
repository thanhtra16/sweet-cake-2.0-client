import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'faq',
    renderMode: RenderMode.Client,
  },
    {
    // Blog lấy dữ liệu từ API Backend (Mongo) nên render ở trình duyệt, không prerender lúc build
    path: 'blog',
    renderMode: RenderMode.Client
  },
  {
    path: 'blog/:id',
    renderMode: RenderMode.Client
  },
    {
    // Blog lấy dữ liệu từ API Backend (Mongo) nên render ở trình duyệt, không prerender lúc build
    path: 'blog',
    renderMode: RenderMode.Client
  },
  {
    path: 'blog/:id',
    renderMode: RenderMode.Client
  },
    {
    // Các trang auth dùng sessionStorage/localStorage nên render ở trình duyệt
    path: 'auth/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'product/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout',
    renderMode: RenderMode.Client,
  },
  {
    path: 'payment/:orderId',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];