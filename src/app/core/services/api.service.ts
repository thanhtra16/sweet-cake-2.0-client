import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

/** Body gửi lên POST/PUT /admin/products. Backend KHÔNG nhận imageIds, rating, reviewCount. */
export type ProductPayload = Partial<
  Pick<
    Product,
    | 'name'
    | 'kind'
    | 'category'
    | 'occasions'
    | 'description'
    | 'basePrice'
    | 'salePrice'
    | 'status'
    | 'featured'
    | 'availableSizes'
    | 'availableFillings'
    | 'variants'
  >
>;

/** Phần tử trả về từ POST /images. */
export interface UploadedImage {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  purpose: string;
}

/** Body PUT /admin/customizations (Backend cho phép cập nhật từng phần). */
export type CustomizationPayload = Partial<Omit<ProductCustomization, 'required'>> & {
  required?: Partial<ProductCustomization['required']>;
};

// Response danh sách sản phẩm
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

// Tham số tìm kiếm, lọc và phân trang sản phẩm Admin
export interface AdminProductQuery {
  q?: string;
  kind?: 'cake' | 'accessory' | '';
  category?: string;
  status?: 'visible' | 'hidden' | '';
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';
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

  /** Gọi GET và trả về trực tiếp phần data của phản hồi. */
  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${path}`).pipe(map((res) => res.data));
  }

  /** Gọi POST và trả về trực tiếp phần data của phản hồi. */
  post<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  /** Gọi PATCH và trả về trực tiếp phần data của phản hồi. */
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
      .get<ApiResponse<ProductCustomization>>(`${this.apiUrl}/products/customization`)
      .pipe(map((response) => response.data));
  }

  // GET /api/products?kind=accessory
  getAccessories(): Observable<Product[]> {
    return this.http
      .get<ProductListResponse>(`${this.apiUrl}/products?kind=accessory&page=1&limit=100`)
      .pipe(map((response) => response.data));
  }

  // POST /api/orders/quote
  quoteOrder(request: QuoteRequest): Observable<OrderQuote> {
    return this.http
      .post<ApiResponse<OrderQuote>>(`${this.apiUrl}/orders/quote`, request)
      .pipe(map((response) => response.data));
  }

  // URL ảnh GridFS: GET /api/images/:fileId
  getProductImageUrl(file: unknown): string {
    if (!file) return '';

    if (typeof file === 'string') {
      const trimmed = file.trim();
      if (!trimmed || trimmed === '[object Object]') return '';
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
        return trimmed;
      }
      return `${this.apiUrl}/images/${trimmed}`;
    }

    if (typeof file === 'object') {
      const obj = file as { url?: string; _id?: unknown; id?: unknown };
      if (obj.url && typeof obj.url === 'string') {
        return obj.url;
      }
      const id = String(obj._id ?? obj.id ?? '').trim();
      if (id && id !== '[object Object]') {
        return `${this.apiUrl}/images/${id}`;
      }
    }

    return '';
  }

  /**
   * GET /api/admin/products
   * Lấy danh sách sản phẩm kèm thông tin phân trang.
   */
  getAdminProducts(filters: AdminProductQuery = {}): Observable<ProductListResponse> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ProductListResponse>(`${this.apiUrl}/admin/products`, { params });
  }

  /**
   * PATCH /api/admin/products/:id/status
   * Cập nhật trạng thái hiển thị sản phẩm.
   */
  updateAdminProductStatus(id: string, status: 'visible' | 'hidden'): Observable<Product> {
    return this.http
      .patch<ApiResponse<Product>>(`${this.apiUrl}/admin/products/${id}/status`, { status })
      .pipe(map((response) => response.data));
  }

  /** GET /api/admin/products/:id */
  getAdminProductById(id: string): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(`${this.apiUrl}/admin/products/${id}`)
      .pipe(map((res) => res.data));
  }
  /** Gọi PUT và trả về trực tiếp phần data của phản hồi. */
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(`${this.apiUrl}${path}`, body)
      .pipe(map((res) => res.data));
  }

  /** Gọi DELETE và trả về trực tiếp phần data của phản hồi. */
  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.apiUrl}${path}`).pipe(map((res) => res.data));
  }

  /** POST /api/admin/products */
  createAdminProduct(body: ProductPayload): Observable<Product> {
    return this.http
      .post<ApiResponse<Product>>(`${this.apiUrl}/admin/products`, body)
      .pipe(map((res) => res.data));
  }

  /** PUT /api/admin/products/:id */
  updateAdminProduct(id: string, body: ProductPayload): Observable<Product> {
    return this.http
      .put<ApiResponse<Product>>(`${this.apiUrl}/admin/products/${id}`, body)
      .pipe(map((res) => res.data));
  }

  /**
   * POST /api/images (multer: upload.array('images', 10))
   * Backend tự thêm id ảnh vào Product.imageIds.
   */
  uploadProductImages(productId: string, files: File[]): Observable<UploadedImage[]> {
    const form = new FormData();
    form.append('purpose', 'product');
    form.append('productId', productId);
    files.forEach((file) => form.append('images', file, file.name));
    return this.http
      .post<ApiResponse<UploadedImage[]>>(`${this.apiUrl}/images`, form)
      .pipe(map((res) => res.data));
  }

  /** GET /api/admin/customizations (404 nếu chưa có cấu hình) */
  getAdminCustomization(): Observable<ProductCustomization> {
    return this.http
      .get<ApiResponse<ProductCustomization>>(`${this.apiUrl}/admin/customizations`)
      .pipe(map((res) => res.data));
  }

  /** PUT /api/admin/customizations */
  updateAdminCustomization(body: CustomizationPayload): Observable<ProductCustomization> {
    return this.http
      .put<ApiResponse<ProductCustomization>>(`${this.apiUrl}/admin/customizations`, body)
      .pipe(map((res) => res.data));
  }
}
