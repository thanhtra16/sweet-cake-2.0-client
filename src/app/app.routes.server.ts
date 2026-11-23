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
    // Danh sách sản phẩm lấy dữ liệu từ API Backend nên render ở trình duyệt
    path: 'menu',
    renderMode: RenderMode.Client
  },
  {
    path: 'blog/:id',
    renderMode: RenderMode.Client
  },
  {
    // Trang tài khoản cần token trong localStorage nên render ở trình duyệt
    path: 'account',
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
    // Khu vực Admin cần đăng nhập, không prerender
  { path: 'admin/**', renderMode: RenderMode.Client },

  // Route Buyer có tham số :id (lỗi có sẵn từ trước)
  { path: 'orders/:id', renderMode: RenderMode.Client },
  
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];