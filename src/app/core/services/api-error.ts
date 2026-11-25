import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorInfo {
  status: number;
  message: string;
  /** Lỗi theo từng trường mà Backend trả về trong `errors`, ví dụ { phone: '...' } */
  fields: Record<string, string>;
}

/** Chuyển HttpErrorResponse thành thông tin lỗi dễ dùng cho giao diện. */
export function parseApiError(err: unknown, fallback: string): ApiErrorInfo {
  const e = err as HttpErrorResponse;

  if (!e || e.status === 0) {
    return {
      status: 0,
      message: 'Không thể kết nối tới máy chủ, vui lòng thử lại sau.',
      fields: {}
    };
  }

  const body = e.error as { message?: string; errors?: Record<string, string> } | null;

  return {
    status: e.status,
    message: body?.message || fallback,
    fields: body?.errors && typeof body.errors === 'object' ? body.errors : {}
  };
}
