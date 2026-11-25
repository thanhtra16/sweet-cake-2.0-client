import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface ProductReview {
  _id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  imageIds: string[];
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  reviewCount: number;
  distribution: Record<number, number>;
}

export interface ReviewPage {
  reviews: ProductReview[];
  summary: ReviewSummary;
  page: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  /** GET /api/products/:id/reviews */
  getProductReviews(
    productId: string,
    page = 1,
    rating: number | null = null,
    limit = 5
  ): Observable<ReviewPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (rating) {
      params = params.set('rating', rating);
    }

    return this.http
      .get<{
        data: { reviews: ProductReview[]; summary: ReviewSummary };
        pagination: { page: number; totalPages: number };
      }>(`${environment.apiUrl}/products/${productId}/reviews`, { params })
      .pipe(
        map((res) => ({
          reviews: res.data.reviews,
          summary: res.data.summary,
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
        }))
      );
  }

  imageUrl(imageId: string): string {
    return `${environment.apiUrl}/images/${imageId}`;
  }
}