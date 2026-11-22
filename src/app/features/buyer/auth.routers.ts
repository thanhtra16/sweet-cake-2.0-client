import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'register',
    title: 'SweetCake - Đăng ký',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'login',
    title: 'SweetCake - Đăng nhập',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    title: 'SweetCake - Khôi phục mật khẩu',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'verify-otp',
    title: 'SweetCake - Xác thực tài khoản',
    loadComponent: () =>
      import('./pages/verify-otp/verify-otp.component').then((m) => m.VerifyOtpComponent)
  },
  {
    path: 'reset-password',
    title: 'SweetCake - Thiết lập mật khẩu mới',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      )
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
