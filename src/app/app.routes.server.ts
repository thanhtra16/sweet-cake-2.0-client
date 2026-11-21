import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Trang FAQ lấy dữ liệu từ API Backend nên render ở trình duyệt, không prerender lúc build
    path: 'faq',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];