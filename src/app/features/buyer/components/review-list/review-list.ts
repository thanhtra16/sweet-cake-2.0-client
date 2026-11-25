import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  ProductReview,
  ReviewService,
  ReviewSummary,
} from '@core/services/review.service';

@Component({
  selector: 'app-review-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review-list.html',
  styleUrl: './review-list.scss',
})
export class ReviewList implements OnChanges {
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) productId = '';

  readonly reviews = signal<ProductReview[]>([]);
  readonly summary = signal<ReviewSummary | null>(null);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly ratingFilter = signal<number | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly stars = [5, 4, 3, 2, 1];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && this.productId) {
      this.ratingFilter.set(null);
      this.load(1, true);
    }
  }

  setFilter(rating: number | null): void {
    this.ratingFilter.set(this.ratingFilter() === rating ? null : rating);
    this.load(1, true);
  }

  loadMore(): void {
    this.load(this.page() + 1, false);
  }

  percent(star: number): number {
    const s = this.summary();
    if (!s || !s.reviewCount) return 0;
    return Math.round(((s.distribution[star] ?? 0) / s.reviewCount) * 100);
  }

  imageUrl(id: string): string {
    return this.reviewService.imageUrl(id);
  }

  starText(rating: number): string {
    const value = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(value) + '☆'.repeat(5 - value);
  }

  private load(page: number, replace: boolean): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.reviewService
      .getProductReviews(this.productId, page, this.ratingFilter())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.reviews.set(
            replace ? res.reviews : [...this.reviews(), ...res.reviews]
          );
          this.summary.set(res.summary);
          this.page.set(res.page);
          this.totalPages.set(res.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('Không thể tải đánh giá. Vui lòng thử lại.');
          this.loading.set(false);
        },
      });
  }
}