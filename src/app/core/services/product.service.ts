
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Product, ProductDto } from '@shared/models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);

  /** Lấy toàn bộ sản phẩm */
  getProducts(): Observable<Product[]> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/products`, {
        params: { limit: '100' },
      })
      .pipe(
        map((res) =>
          this.extractList(res).map((dto) => this.toProduct(dto)),
        ),
      );
  }

  /** Lấy sản phẩm nổi bật */
  getFeaturedProducts(limit = 8): Observable<Product[]> {
    return this.getProducts().pipe(
      map((products) =>
        products.filter((p) => p.bestSeller).slice(0, limit),
      ),
    );
  }

  /** Trích xuất danh sách sản phẩm từ API */
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

  /** Chuẩn hóa đường dẫn ảnh */
  private resolveImageUrl(raw: unknown): string {
    if (!raw) return '';

    if (typeof raw === 'string') {
      const trimmed = raw.trim();

      if (!trimmed || trimmed === '[object Object]') {
        return '';
      }

      // URL ảnh đầy đủ hoặc đường dẫn tương đối
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
        return trimmed;
      }

      // ID ảnh lưu trong GridFS
      return `${environment.apiUrl}/images/${trimmed}`;
    }

    if (typeof raw === 'object') {
      const obj = raw as {
        url?: string;
        _id?: unknown;
        id?: unknown;
      };

      if (obj.url && typeof obj.url === 'string') {
        return obj.url;
      }

      const id = String(obj._id ?? obj.id ?? '').trim();

      if (id && id !== '[object Object]') {
        return `${environment.apiUrl}/images/${id}`;
      }
    }

    return '';
  }

  /** Chuyển dữ liệu Backend thành Product dùng ở giao diện */
  private toProduct(dto: ProductDto): Product {
    const createdAt = dto.createdAt
      ? new Date(dto.createdAt).getTime()
      : 0;

    const rawAny = dto as any;

    const firstImage =
      dto.imageIds?.[0] ??
      rawAny.images?.[0] ??
      rawAny.thumbnail ??
      rawAny.image;

    return {
      id: String(dto.id ?? dto._id ?? ''),
      name: dto.name ?? '',
      price: Number(dto.salePrice ?? dto.basePrice ?? 0),
      thumbnail: this.resolveImageUrl(firstImage),
      category: dto.category ?? '',
      occasion: Array.isArray(dto.occasions)
        ? dto.occasions.join(', ')
        : '',
      flavor: Array.isArray(dto.availableFillings)
        ? dto.availableFillings.join(', ')
        : '',
      type: dto.type ?? dto.category?.replace(/^Bánh\s+/i, '') ?? '',
      bestSeller: !!dto.featured,
      createdAt,
      kind: dto.kind ?? 'cake',
      status: dto.status ?? 'visible',
    };
  }
}
