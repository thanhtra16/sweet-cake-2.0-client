
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  Observable,
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';

import {
  Customer,
  CustomerSort,
  CustomerStats,
  CustomerStatus,
  CustomerStatusFilter,
  Pagination,
} from '../../../../shared/models/user-management.model';

import { UserAccount } from '../../../../shared/models/user.model';

import { AdminUserService } from '../../../../core/services/user-management.service';

type ModalMode = 'detail' | 'lock' | 'unlock' | null;

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const REASON_MIN = 5;
const REASON_MAX = 300;

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit, OnDestroy {
  private readonly api = inject(AdminUserService);

  private readonly isBrowser = isPlatformBrowser(
    inject(PLATFORM_ID)
  );

  readonly reasonMax = REASON_MAX;
  readonly reasonMin = REASON_MIN;

  // =====================================
  // DATA
  // =====================================

  readonly customers = signal<Customer[]>([]);

  readonly stats = signal<CustomerStats>({
    total: 0,
    active: 0,
    locked: 0,
    newThisMonth: 0,
  });

  readonly pagination = signal<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  // =====================================
  // FILTER
  // =====================================

  search = '';
  status: CustomerStatusFilter = 'all';
  sort: CustomerSort = 'newest';

  private page = 1;
  private readonly limit = 10;

  private readonly search$ = new Subject<string>();
  private searchSub?: Subscription;

  // =====================================
  // MODAL
  // =====================================

  readonly modalMode = signal<ModalMode>(null);
  readonly selected = signal<Customer | null>(null);

  lockReason = '';

  readonly submitting = signal(false);
  readonly modalError = signal<string | null>(null);

  // =====================================
  // TOAST
  // =====================================

  readonly toast = signal<Toast | null>(null);

  private toastTimer?: ReturnType<typeof setTimeout>;

  // =====================================
  // PAGINATION
  // =====================================

  readonly pages = computed(() => {
    const { page, totalPages } = this.pagination();

    const safeTotalPages = Math.max(1, totalPages);
    const safePage = Math.min(
      Math.max(1, page),
      safeTotalPages
    );

    const start = Math.max(
      1,
      Math.min(safePage - 2, safeTotalPages - 4)
    );

    const end = Math.min(safeTotalPages, start + 4);

    return Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );
  });

  // =====================================
  // LIFECYCLE
  // =====================================

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.searchSub = this.search$
      .pipe(
        debounceTime(350),
        distinctUntilChanged()
      )
      .subscribe(() => this.applyFilters());

    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  // =====================================
  // CONVERT API DATA
  // =====================================

  private toCustomer(user: UserAccount): Customer {
    const id = user.id || user._id;

    if (!id) {
      throw new Error(
        'Backend không trả về id hoặc _id người dùng.'
      );
    }

    const status: CustomerStatus = user.isLocked
      ? 'locked'
      : 'active';

    return {
      id,
      fullName: user.fullName,
      email: user.email ?? '',
      phone: user.phone,
      role: user.role,
      isLocked: user.isLocked,
      status,
      lockedAt: null,
      lockedReason: null,
      unlockedAt: null,
      lastLoginAt: null,
      createdAt: user.createdAt,
    };
  }

  // =====================================
  // SEARCH
  // =====================================

  onSearchInput(value: string): void {
    this.search = value;
    this.search$.next(value.trim());
  }

  // =====================================
  // FILTER
  // =====================================

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  resetFilters(): void {
    this.search = '';
    this.status = 'all';
    this.sort = 'newest';

    this.applyFilters();
  }

  // =====================================
  // PAGINATION
  // =====================================

  goTo(page: number): void {
    const { totalPages } = this.pagination();

    if (
      page < 1 ||
      page > totalPages ||
      page === this.page
    ) {
      return;
    }

    this.page = page;
    this.load();
  }

  // =====================================
  // LOAD USERS
  // =====================================

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.api.list({
      page: this.page,
      limit: this.limit,
      search: this.search,
      status: this.status,
      sort: this.sort,
    }).subscribe({
      next: (res) => {
        try {
          const items = Array.isArray(res?.items)
            ? res.items
            : [];

          this.customers.set(
            items.map(user => this.toCustomer(user))
          );
          // Cập nhật thống kê khách hàng từ Backend
          this.stats.set({
            total: Number(res?.stats?.total ?? 0),
            active: Number(res?.stats?.active ?? 0),
            locked: Number(res?.stats?.locked ?? 0),
            newThisMonth: Number(res?.stats?.newThisMonth ?? 0),
          });          

          const apiPagination = res?.pagination;

          const currentPage = Number(
            apiPagination?.page ?? this.page
          );

          const currentLimit = Number(
            apiPagination?.limit ?? this.limit
          );

          const total = Number(
            apiPagination?.total ?? items.length
          );

          const totalPages = Number(
            apiPagination?.totalPages ??
            Math.max(1, Math.ceil(total / currentLimit))
          );

          this.pagination.set({
            page: Number.isFinite(currentPage)
              ? Math.max(1, currentPage)
              : 1,

            limit: Number.isFinite(currentLimit)
              ? Math.max(1, currentLimit)
              : this.limit,

            total: Number.isFinite(total)
              ? Math.max(0, total)
              : 0,

            totalPages: Number.isFinite(totalPages)
              ? Math.max(1, totalPages)
              : 1,
          });

          this.loading.set(false);
        } catch (error) {
          this.loading.set(false);
          this.customers.set([]);

          this.loadError.set(
            this.messageOf(
              error,
              'Dữ liệu người dùng không hợp lệ.'
            )
          );
        }
      },

      error: (err) => {
        this.loading.set(false);
        this.customers.set([]);

        this.loadError.set(
          this.messageOf(
            err,
            'Không tải được danh sách khách hàng.'
          )
        );
      },
    });
  }

  // =====================================
  // MODAL
  // =====================================

  openDetail(customer: Customer): void {
    this.open('detail', customer);
  }

  openLock(customer: Customer): void {
    this.lockReason = '';
    this.open('lock', customer);
  }

  openUnlock(customer: Customer): void {
    this.open('unlock', customer);
  }

  private open(
    mode: Exclude<ModalMode, null>,
    customer: Customer
  ): void {
    this.selected.set(customer);
    this.modalError.set(null);
    this.modalMode.set(mode);
  }

  closeModal(): void {
    if (this.submitting()) return;

    this.modalMode.set(null);
    this.selected.set(null);
    this.modalError.set(null);
  }

  // =====================================
  // LOCK REASON VALIDATION
  // =====================================

  get reasonLength(): number {
    return this.lockReason.trim().length;
  }

  get canSubmitLock(): boolean {
    return (
      this.reasonLength >= REASON_MIN &&
      this.reasonLength <= REASON_MAX &&
      !this.submitting()
    );
  }

  // =====================================
  // LOCK USER
  // =====================================

  confirmLock(): void {
    const customer = this.selected();

    if (!customer || !this.canSubmitLock) return;

    this.submit(
      this.api.updateStatus(
        customer.id,
        'locked',
        this.lockReason.trim()
      ),
      'Đã khóa tài khoản khách hàng.'
    );
  }

  // =====================================
  // UNLOCK USER
  // =====================================

  confirmUnlock(): void {
    const customer = this.selected();

    if (!customer || this.submitting()) return;

    this.submit(
      this.api.updateStatus(
        customer.id,
        'active'
      ),
      'Đã mở khóa tài khoản khách hàng.'
    );
  }

  // =====================================
  // SUBMIT STATUS
  // =====================================

  private submit(
    request: Observable<UserAccount>,
    successMsg: string
  ): void {
    this.submitting.set(true);
    this.modalError.set(null);

    request.subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.modalMode.set(null);
        this.selected.set(null);

        try {
          const customer = this.toCustomer(user);

          this.customers.update(list =>
            list.map(item =>
              item.id === customer.id
                ? customer
                : item
            )
          );

          this.showToast('success', successMsg);

          // Tải lại để đồng bộ dữ liệu và thống kê
          this.load();
        } catch (error) {
          this.showToast(
            'error',
            this.messageOf(
              error,
              'Không thể cập nhật dữ liệu tài khoản.'
            )
          );

          this.load();
        }
      },

      error: (err) => {
        this.submitting.set(false);

        this.modalError.set(
          this.messageOf(
            err,
            'Thao tác thất bại. Vui lòng thử lại.'
          )
        );
      },
    });
  }

  // =====================================
  // HELPERS
  // =====================================

  initials(customer: Customer): string {
    const parts = (
      customer.fullName ||
      customer.email ||
      '?'
    )
      .trim()
      .split(/\s+/);

    return (
      parts.length > 1
        ? parts[0][0] + parts[parts.length - 1][0]
        : parts[0].slice(0, 2)
    ).toUpperCase();
  }

  trackById(
    _: number,
    customer: Customer
  ): string {
    return customer.id;
  }

  // =====================================
  // TOAST
  // =====================================

  private showToast(
    type: Toast['type'],
    message: string
  ): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast.set({
      type,
      message,
    });

    this.toastTimer = setTimeout(
      () => this.toast.set(null),
      3500
    );
  }

  // =====================================
  // ERROR HANDLER
  // =====================================

  private messageOf(
    err: unknown,
    fallback: string
  ): string {
    if (err instanceof HttpErrorResponse) {
      return (
        err.error?.message ||
        (
          err.status === 0
            ? 'Không kết nối được máy chủ.'
            : fallback
        )
      );
    }

    return err instanceof Error
      ? err.message
      : fallback;
  }
}
