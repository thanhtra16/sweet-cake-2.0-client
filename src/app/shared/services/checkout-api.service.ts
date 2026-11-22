import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateOrderRequest, CreatedOrderResponse, OrderQuote, PublicSettings, TimeSlot } from '../models/checkout.model';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  // TODO: CHECK WITH PROJECT – thay bằng environment.apiUrl/service URL convention hiện tại.
  private readonly apiUrl = '/api';
  getSettings(): Observable<PublicSettings> { return this.http.get<PublicSettings>(`${this.apiUrl}/settings/public`); }
  getTimeSlots(date: string): Observable<{ items: TimeSlot[] }> {
    return this.http.get<{ items: TimeSlot[] }>(`${this.apiUrl}/time-slots`, { params: new HttpParams().set('date', date) });
  }
  quote(payload: { items: unknown[]; voucherCode?: string; receiveMethod: 'delivery' | 'pickup' }): Observable<OrderQuote> {
    return this.http.post<OrderQuote>(`${this.apiUrl}/orders/quote`, payload);
  }
  validateVoucher(code: string, subtotal: number): Observable<{ valid: boolean; discount: number; voucher: { code: string; description?: string } }> {
    return this.http.post<any>(`${this.apiUrl}/vouchers/validate`, { code, subtotal });
  }
  createOrder(payload: CreateOrderRequest): Observable<CreatedOrderResponse> { return this.http.post<CreatedOrderResponse>(`${this.apiUrl}/orders`, payload, { observe: 'body' }); }
  createQr(orderId: string): Observable<any> { return this.http.post(`${this.apiUrl}/orders/${orderId}/payment/qr`, {}); }
  getOrder(orderId: string, trackToken: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/orders/${orderId}`, { headers: { 'X-Track-Token': trackToken } });
  }
}
