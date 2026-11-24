
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  CreateOrderRequest,
  CreatedOrderResponse,
  OrderQuote,
  PublicSettings,
  TimeSlot,
} from '@shared/models/checkout.model';

/**
 * Cấu trúc response thống nhất từ Backend.
 */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * GET /api/settings/public
   * Lấy cấu hình công khai phục vụ Checkout.
   */
  getSettings(): Observable<PublicSettings> {
    return this.http
      .get<ApiResponse<PublicSettings>>(
        `${this.apiUrl}/settings/public`
      )
      .pipe(map((response) => response.data));
  }

  /**
   * GET /api/time-slots?date=YYYY-MM-DD
   * Lấy danh sách khung giờ có thể nhận đơn.
   */
  getTimeSlots(date: string): Observable<{ items: TimeSlot[] }> {
    const params = new HttpParams().set('date', date);

    return this.http
      .get<ApiResponse<{ items: TimeSlot[] }>>(
        `${this.apiUrl}/time-slots`,
        { params }
      )
      .pipe(map((response) => response.data));
  }

  /**
   * POST /api/orders/quote
   * Tính báo giá đơn hàng.
   */
  quote(payload: {
    items: unknown[];
    voucherCode?: string;
    receiveMethod: 'delivery' | 'pickup';
  }): Observable<OrderQuote> {
    return this.http
      .post<ApiResponse<OrderQuote>>(
        `${this.apiUrl}/orders/quote`,
        payload
      )
      .pipe(map((response) => response.data));
  }

  /**
   * POST /api/vouchers/validate
   * Kiểm tra tính hợp lệ của voucher.
   */
  validateVoucher(
    code: string,
    subtotal: number
  ): Observable<{
    valid: boolean;
    discount: number;
    voucher: {
      code: string;
      description?: string;
    };
  }> {
    return this.http
      .post<
        ApiResponse<{
          valid: boolean;
          discount: number;
          voucher: {
            code: string;
            description?: string;
          };
        }>
      >(
        `${this.apiUrl}/vouchers/validate`,
        { code, subtotal }
      )
      .pipe(map((response) => response.data));
  }

  /**
   * POST /api/orders
   * Tạo đơn hàng.
   */
  createOrder(
    payload: CreateOrderRequest
  ): Observable<CreatedOrderResponse> {
    return this.http
      .post<ApiResponse<CreatedOrderResponse>>(
        `${this.apiUrl}/orders`,
        payload
      )
      .pipe(map((response) => response.data));
  }

  /**
   * POST /api/orders/:id/payment/qr
   * Tạo mã QR thanh toán cho đơn hàng.
   */
  createQr(orderId: string): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(
        `${this.apiUrl}/orders/${orderId}/payment/qr`,
        {}
      )
      .pipe(map((response) => response.data));
  }

  /**
   * GET /api/orders/:id
   * Lấy thông tin đơn hàng bằng tracking token.
   */
  getOrder(
    orderId: string,
    trackToken: string
  ): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(
        `${this.apiUrl}/orders/${orderId}`,
        {
          headers: {
            'X-Track-Token': trackToken,
          },
        }
      )
      .pipe(map((response) => response.data));
  }
}
