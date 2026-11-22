import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'sweetcake_access_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (typeof localStorage === 'undefined') {
    return next(req);
  }

  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
