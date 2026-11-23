import { ChangeDetectorRef, Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  AdminProductQuery,
  ApiService,
  Product,
} from '../../../../core/services/api.service';

import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { LoadingEmptyComponent } from '../../../../shared/components/loading-empty/loading-empty.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { VndPipe } from '../../../../shared/pipes/vnd.pipe';

type SortKey = NonNullable<AdminProductQuery['sort']>;

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    VndPipe,
    StatusBadgeComponent,
    PaginationComponent,
    LoadingEmptyComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './admin-products.html',
  styleUrls: ['../../styles/admin-page.css', './admin-products.css'],
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private loadSub?: Subscription;
  private statusSub?: Subscription;

  products: Product[] = [];
  loading = false;
  error = '';

  filters: {
    q: string;
    kind: AdminProductQuery['kind'];
    category: string;
    status: AdminProductQuery['status'];
    sort: SortKey;
  } = {
    q: '',
    kind: '',
    category: '',
    status: '',
    sort: 'newest',
  };

  page = 1;
  readonly limit = 10;
  total = 0;
  totalPages = 0;

  togglingId: string | null = null;
  pendingHide: Product | null = null;

  ngOnInit(): void {
    if (this.isBrowser) {
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.statusSub?.unsubscribe();
  }

  imageUrl(id: string): string {
    return this.api.getProductImageUrl(id);
  }

  load(): void {
    this.loadSub?.unsubscribe();

    this.loading = true;
    this.error = '';

    this.cdr.markForCheck();

    const query: AdminProductQuery = {
      q: this.filters.q.trim(),
      kind: this.filters.kind,
      category: this.filters.category.trim(),
      status: this.filters.status,
      sort: this.filters.sort,
      page: this.page,
      limit: this.limit,
    };

    this.loadSub = this.api.getAdminProducts(query).subscribe({
      next: (res) => {
        this.products = res.data ?? [];
        this.total = res.pagination?.total ?? this.products.length;
        this.totalPages = res.pagination?.totalPages ?? 1;
        this.loading = false;

        this.cdr.markForCheck();
      },

      error: (err) => {
        console.error('[AdminProducts] API error:', err);

        this.products = [];
        this.total = 0;
        this.totalPages = 0;
        this.loading = false;
        this.error =
          err?.error?.message ||
          'Không tải được danh sách sản phẩm. Vui lòng thử lại.';

        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.filters = {
      q: '',
      kind: '',
      category: '',
      status: '',
      sort: 'newest',
    };

    this.applyFilters();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }

    this.page = page;
    this.load();
  }

  requestToggle(product: Product): void {
    if (this.togglingId) return;

    if (product.status === 'visible') {
      this.pendingHide = product;
      this.cdr.markForCheck();
    } else {
      this.changeStatus(product, 'visible');
    }
  }

  confirmHide(): void {
    if (this.pendingHide) {
      const product = this.pendingHide;
      this.pendingHide = null;
      this.changeStatus(product, 'hidden');
    }
  }

  private changeStatus(
    product: Product,
    status: 'visible' | 'hidden'
  ): void {
    this.statusSub?.unsubscribe();

    this.togglingId = product._id;
    this.cdr.markForCheck();

    this.statusSub = this.api
      .updateAdminProductStatus(product._id, status)
      .subscribe({
        next: () => {
          this.togglingId = null;

          this.toast.success(
            status === 'hidden'
              ? `Đã ẩn “${product.name}”.`
              : `Đã hiển thị lại “${product.name}”.`
          );

          this.load();
          this.cdr.markForCheck();
        },

        error: (err) => {
          this.togglingId = null;

          this.toast.error(
            err?.error?.message ||
            'Không đổi được trạng thái sản phẩm.'
          );

          this.cdr.markForCheck();
        },
      });
  }
}
