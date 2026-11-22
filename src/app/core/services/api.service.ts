import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Định dạng phản hồi chung của Backend (utils/response.js). */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Thông tin sản phẩm từ MongoDB
export interface Product {
  _id: string;
  name: string;
  kind: 'cake' | 'accessory';
  category: string;
  occasions: string[];
  description: string;
  basePrice: number;
  salePrice: number | null;
  status: 'visible' | 'hidden';
  featured: boolean;
  imageIds: string[];
  availableSizes: string[];
  availableFillings: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  createdAt?: string;
}

export interface ProductVariant {
  _id?: string;
  label: string;
  attributes: Record<string, unknown>;
  active: boolean;
}

// Một lựa chọn trong cấu hình tùy chỉnh
export interface CustomizationOption {
  _id?: string;
  name: string;
  priceDiff: number;
  isDefault: boolean;
  active: boolean;
  maxChars?: number | null;
}

// Cấu hình tùy chỉnh sản phẩm từ Backend
export interface ProductCustomization {
  sizes: CustomizationOption[];
  fillings: CustomizationOption[];
  bases: CustomizationOption[];
  frostingColors: CustomizationOption[];
  sweetnessLevels: CustomizationOption[];
  required: {
    base: boolean;
    frostingColor: boolean;
    sweetness: boolean;
  };
  bannedWords: string[];
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Phương thức nhận hàng khi tính báo giá
export type ReceiveMethod = 'pickup' | 'delivery';

// Một dòng sản phẩm gửi lên Backend để tính báo giá
export interface QuoteRequestItem {
  productId: string;
  qty: number;
  config?: {
    size: string;
    base: string;
    filling: string;
    frostingColor: string;
    sweetness: string;
    message: string;
  };
  variant?: string;
}

// Request báo giá
export interface QuoteRequest {
  receiveMethod: ReceiveMethod;
  items: QuoteRequestItem[];
}

// Phụ thu được Backend trả về
export interface QuoteSurcharge {
  [key: string]: unknown;
}

// Một dòng kết quả báo giá
export interface QuoteItemResult {
  valid: boolean;
  reason?: string;
  field?: string;
  unitPrice?: number;
  priceChanged?: boolean;
  basePrice?: number;
  salePrice?: number | null;
  surcharges?: unknown;
  variant?: {
    _id: string;
    label: string;
  } | null;
  lineTotal?: number;
}

// Kết quả báo giá từ Backend
export interface OrderQuote {
  valid: boolean;
  items: QuoteItemResult[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  voucher?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Gọi GET và trả về trực tiếp phần `data` của phản hồi. */
  get<T>(path: string): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.apiUrl}${path}`)
      .pipe(map((res) => res.data));
  }

  /** Gọi POST và trả về trực tiếp phần `data` của phản hồi. */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  /** Gọi PATCH và trả về trực tiếp phần `data` của phản hồi. */
  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  // GET /api/products/:id
  getProductById(id: string): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(`${this.apiUrl}/products/${id}`)
      .pipe(map((response) => response.data));
  }

  // GET /api/products/customization
  getProductCustomization(): Observable<ProductCustomization> {
    return this.http
      .get<ApiResponse<ProductCustomization>>(
        `${this.apiUrl}/products/customization`
      )
      .pipe(map((response) => response.data));
  }

  // GET /api/products?kind=accessory
  getAccessories(): Observable<Product[]> {
    return this.http
      .get<ProductListResponse>(
        `${this.apiUrl}/products?kind=accessory&page=1&limit=100`
      )
      .pipe(map((response) => response.data));
  }

  // POST /api/orders/quote
  quoteOrder(request: QuoteRequest): Observable<OrderQuote> {
    return this.http
      .post<ApiResponse<OrderQuote>>(
        `${this.apiUrl}/orders/quote`,
        request
      )
      .pipe(map((response) => response.data));
  }

  // URL ảnh GridFS: GET /api/images/:fileId
  getProductImageUrl(fileId: string): string {
    return `${this.apiUrl}/images/${fileId}`;
  }
}