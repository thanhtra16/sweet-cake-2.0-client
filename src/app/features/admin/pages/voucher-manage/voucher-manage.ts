import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AdminVoucherService } from '../../../../core/services/admin-voucher.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import {
  Voucher,
  VoucherPayload,
  VoucherState,
  VoucherSummary,
} from '../../../../shared/models/admin-voucher.model';
import { VoucherFormDialog } from './voucher-form-dialog/voucher-form-dialog';

interface StateView {
  label: string;
  badge: string;
}

const STATE_VIEW: Record<VoucherState, StateView> = {
  running: { label: 'Đang áp dụng', badge: 'ad-badge--ok' },
  scheduled: { label: 'Chưa bắt đầu', badge: 'sc-badge--info' },
  expired: { label: 'Hết hạn', badge: 'sc-badge--neutral' },
  exhausted: { label: 'Hết lượt', badge: 'sc-badge--warning' },
  inactive: { label: 'Đã tắt', badge: 'sc-badge--danger' },
};

interface DialogState {
  voucher: Voucher | null;
}

@Component({
  selector: 'app-voucher-manage',
imports: [ReactiveFormsModule, DatePipe, Pagination, VoucherFormDialog],
  templateUrl: './voucher-manage.html',
  styleUrls: ['./voucher-manage.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherManage implements OnInit {
  private readonly api = inject(AdminVoucherService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly limit = 10;

  protected readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl<VoucherState | ''>('', { nonNullable: true }),
  });

  protected readonly vouchers = signal<Voucher[]>([]);
  protected readonly summary = signal<VoucherSummary>({ total: 0, running: 0, inactive: 0, ended: 0 });
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');

  protected readonly dialog = signal<DialogState | null>(null);
  protected readonly dialogError = signal('');
  protected readonly saving = signal(false);

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set('');
    const { search, status } = this.filters.getRawValue();
    this.api.list({ search, status, page: this.page(), limit: this.limit }).subscribe({
      next: (res) => {
        this.vouchers.set(res.items);
        this.summary.set(res.summary);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
        // Xóa dòng cuối của trang cuối có thể làm trang hiện tại trống.
        if (res.items.length === 0 && res.page > 1) this.goTo(res.totalPages);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(err.error?.message ?? 'Không tải được danh sách voucher.');
      },
    });
  }

  protected search(): void {
    this.page.set(1);
    this.load();
  }

  protected reset(): void {
    this.filters.reset({ search: '', status: '' });
    this.search();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  // Hiển thị
  protected stateView(v: Voucher): StateView {
    return STATE_VIEW[v.state];
  }

  protected discountText(v: Voucher): string {
    return v.type === 'percent' ? `${v.value}%` : this.money(v.value);
  }

  protected money(n: number): string {
    return `${n.toLocaleString('vi-VN')} đ`;
  }

  protected usageText(v: Voucher): string {
    return `${v.usedCount}/${v.usageLimit ?? '∞'}`;
  }

  // Thêm / sửa
  protected openCreate(): void {
    this.dialogError.set('');
    this.dialog.set({ voucher: null });
  }

  protected openEdit(voucher: Voucher): void {
    this.dialogError.set('');
    this.dialog.set({ voucher });
  }

  protected closeDialog(): void {
    if (!this.saving()) this.dialog.set(null);
  }

  protected submitDialog(payload: VoucherPayload): void {
    const state = this.dialog();
    if (!state) return;
    this.saving.set(true);
    this.dialogError.set('');

    const request = state.voucher
      ? this.api.update(state.voucher._id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.dialog.set(null);
        this.toast.success(state.voucher ? 'Đã cập nhật voucher' : 'Đã tạo voucher', saved.code);
        if (!state.voucher) this.page.set(1);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const fieldErrors = err.error?.errors as Record<string, string> | undefined;
        this.dialogError.set(
          fieldErrors ? Object.values(fieldErrors).join(' · ') : (err.error?.message ?? 'Không thể lưu voucher.')
        );
      },
    });
  }

  // Kích hoạt / vô hiệu hóa
  protected toggleActive(voucher: Voucher): void {
    this.api.setActive(voucher._id, !voucher.active).subscribe({
      next: (updated) => {
        this.toast.success(updated.active ? 'Đã kích hoạt voucher' : 'Đã vô hiệu hóa voucher', updated.code);
        this.load();
      },
      error: (err: HttpErrorResponse) =>
        this.toast.error('Không thể đổi trạng thái', err.error?.message ?? 'Vui lòng thử lại.'),
    });
  }
}
