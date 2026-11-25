import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:3000/api/orders';
  private adminApiUrl = 'http://localhost:3000/api/admin/orders';

  constructor(private http: HttpClient) {}

  // ==================== CUSTOMER & GUEST APIs ====================

  // Tra cứu đơn hàng cho khách vãng lai (Guest)
  trackOrder(code: string, phone: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/track`, { code, phone });
  }

  // Lấy danh sách đơn hàng (Buyer)
  getOrders(filterParams?: { group?: string; status?: string; phone?: string; page?: number; limit?: number }): Observable<any> {
    let params = new HttpParams();
    if (filterParams) {
      Object.keys(filterParams).forEach(key => {
        const val = (filterParams as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, val.toString());
        }
      });
    }
    return this.http.get(`${this.apiUrl}`, { params });
  }

  // Lấy chi tiết đơn hàng
  getCustomerOrderById(orderId: string, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.get(`${this.apiUrl}/${orderId}`, { headers });
  }

  // Hủy đơn trực tiếp (khi đang chờ thanh toán / chờ duyệt)
  cancelOrder(orderId: string, reasonCode: string, reason: string, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.post(`${this.apiUrl}/${orderId}/cancel`, { reasonCode, reason }, { headers });
  }

  // Gửi yêu cầu hủy đơn (khi đã tiếp nhận / đang làm / đang giao)
  createCancelRequest(orderId: string, reasonCode: string, reason: string, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.post(`${this.apiUrl}/${orderId}/cancel-request`, { reasonCode, reason }, { headers });
  }

  // Mua lại (mode: 'preview' kiểm tra hiển thị & giá | 'create' tạo đơn mới)
  reorderOrder(orderId: string, payload: any, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.post(`${this.apiUrl}/${orderId}/reorder`, payload, { headers });
  }

  // ==================== ADMIN APIs ====================

  // Lấy danh sách đơn hàng cho Admin
  getAdminOrders(filterParams?: {
    status?: string;
    hasCancelRequest?: boolean;
    refundOverdue?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<any> {
    let params = new HttpParams();
    if (filterParams) {
      Object.keys(filterParams).forEach(key => {
        const val = (filterParams as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, val.toString());
        }
      });
    }
    return this.http.get(`${this.adminApiUrl}`, { params });
  }

  // Lấy chi tiết đơn hàng cho Admin
  getAdminOrderById(orderId: string): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/${orderId}`);
  }

  // Xác nhận thanh toán thủ công

confirmPaymentManual(
  orderId: string,
  payload: {
    txnId: string;
    evidence: string;
    note?: string;
  }
): Observable<any> {
  return this.http.post(
    `${this.adminApiUrl}/${orderId}/confirm-payment`,
    payload
  );
}


  // Tiếp nhận đơn hàng
  acceptOrder(orderId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/${orderId}/accept`, {});
  }

  // Từ chối / Hủy đơn thông thường
  rejectOrCancelOrder(orderId: string, payload: { reasonCode?: string; reason: string; cause?: string }): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/${orderId}/reject`, payload);
  }

  // Duyệt hoặc từ chối yêu cầu hủy của khách
  decideCancelRequest(
    orderId: string,
    payload: { decision: 'accepted' | 'rejected'; decisionReason?: string; cause?: string }
  ): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/${orderId}/cancel-request/decision`, payload);
  }

  // Hủy đặc biệt từ phía cửa hàng (hoàn 100%)
  specialCancelOrder(orderId: string, payload: { reason: string; cause?: string }): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/${orderId}/special-cancel`, payload);
  }

  // Xác nhận hoàn tiền thủ công
  confirmRefund(orderId: string, payload: { amount?: number; adjustReason?: string }): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/${orderId}/refund/confirm`, payload);
  }

  private getHeaders(trackToken?: string) {
    let headers: any = {};
    const token = trackToken || sessionStorage.getItem('trackToken');
    if (token) {
      headers['X-Track-Token'] = token;
    }
    return headers;
  }
}