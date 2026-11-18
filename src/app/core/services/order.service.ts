import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:5000/api/orders';

  constructor(private http: HttpClient) {}

  // Tra cứu đơn hàng cho khách vãng lai (Guest)
  trackOrder(code: string, phone: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/track`, { code, phone });
  }

  // Lấy danh sách đơn hàng (Buyer)
  getOrders(filterParams?: { group?: string; status?: string; page?: number; limit?: number }): Observable<any> {
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

  // Hủy đơn trực tiếp
  cancelOrder(orderId: string, reasonCode: string, reason: string, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.post(`${this.apiUrl}/${orderId}/cancel`, { reasonCode, reason }, { headers });
  }

  // Gửi yêu cầu hủy đơn
  createCancelRequest(orderId: string, reasonCode: string, reason: string, trackToken?: string): Observable<any> {
    const headers = this.getHeaders(trackToken);
    return this.http.post(`${this.apiUrl}/${orderId}/cancel-request`, { reasonCode, reason }, { headers });
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