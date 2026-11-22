import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product, ProductDto } from '../../shared/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly http = inject(HttpClient);

  /** Lấy toàn bộ sản phẩm: GET {apiUrl}/products */
  getProducts(): Observable<Product[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/products`, {
        params: { kind: 'cake', limit: '100' }
      })
      .pipe(map((res) => this.extractList(res).map((dto) => this.toProduct(dto))));
  }

  /**
   * Backend có thể trả mảng thuần, hoặc bọc trong { data } / { data: { products } }
   * (định dạng chung của utils/response.js). Hàm này chấp nhận cả ba.
   */
  private extractList(res: unknown): ProductDto[] {
    if (Array.isArray(res)) {
      return res;
    }

    const body = res as {
      data?: ProductDto[] | { products?: ProductDto[] };
      products?: ProductDto[];
    };

    if (Array.isArray(body?.data)) {
      return body.data;
    }
    if (Array.isArray(body?.data?.products)) {
      return body.data.products;
    }
    if (Array.isArray(body?.products)) {
      return body.products;
    }
    return [];
  }

  private toProduct(dto: ProductDto): Product {
    const createdAt = dto.createdAt
      ? new Date(dto.createdAt).getTime()
      : 0;

    return {
      id: String(dto.id ?? dto._id ?? ''),
      name: dto.name ?? '',
      price: Number(dto.salePrice ?? dto.basePrice ?? 0),
      thumbnail: dto.imageIds?.[0]?.url ?? '',
      category: dto.category ?? '',
      // Giữ toàn bộ mảng (nối chuỗi hoặc lưu mảng) để không bị sót khi lọc
      occasion: Array.isArray(dto.occasions) ? dto.occasions.join(', ') : '',
      flavor: Array.isArray(dto.availableFillings) ? dto.availableFillings.join(', ') : '',
      // Map category sang type (ví dụ "Bánh mousse" -> "Mousse", "Bánh Bento" -> "Bento")
      type: dto.type ?? dto.category?.replace(/^Bánh\s+/i, '') ?? '',
      bestSeller: !!dto.featured,
      createdAt
    };
  }
}
