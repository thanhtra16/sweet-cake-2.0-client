/** Khớp PHONE_REGEX ở Backend (auth.controller.js): 0xxxxxxxxx hoặc +84xxxxxxxxx */
export const PHONE_REGEX = /^(0|\+84)\d{9}$/;

/** Bỏ khoảng trắng, dấu chấm, gạch ngang người dùng gõ cho dễ đọc ("090 1234 567" -> "0901234567"). */
export const normalizePhone = (value: string): string =>
  (value ?? '').replace(/[\s.\-]/g, '');

export const isValidPhone = (value: string): boolean =>
  PHONE_REGEX.test(normalizePhone(value));

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordRules {
  length: boolean;
  upper: boolean;
  digit: boolean;
}

/** Quy tắc mật khẩu hiển thị trên giao diện: >= 8 ký tự, 1 chữ hoa, 1 số. */
export const checkPassword = (password: string): PasswordRules => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  digit: /[0-9]/.test(password)
});

export const isStrongPassword = (password: string): boolean => {
  const r = checkPassword(password);
  return r.length && r.upper && r.digit;
};
