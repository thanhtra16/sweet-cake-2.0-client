
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Chuẩn bị Interceptor.
  // Sẽ bổ sung xử lý JWT, X-Track-Token và lỗi HTTP sau khi thống nhất với Backend.

  return next(req);
};
