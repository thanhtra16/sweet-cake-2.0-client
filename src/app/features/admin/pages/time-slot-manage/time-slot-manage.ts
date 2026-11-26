import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminTimeSlotService } from '../../../../core/services/admin-time-slot.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  SlotTemplate,
  TimeSlotItem,
  TimeSlotSummary,
} from '../../../../shared/models/admin-time-slot.model';
import { SlotFormDialog, SlotFormValue } from './slot-form-dialog/slot-form-dialog';

interface DialogState {
  mode: 'create' | 'edit';
  slot: TimeSlotItem | null;
}

interface EditableTemplate {
  label: string;
  capacity: number;
}

/** YYYY-MM-DD theo giờ máy người dùng (admin dùng ở Việt Nam). */
function formatDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
  selector: 'app-time-slot-manage',
  imports: [FormsModule, ConfirmDialog, SlotFormDialog],
  templateUrl: './time-slot-manage.html',
  styleUrls: ['./time-slot-manage.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSlotManage implements OnInit {
  private readonly api = inject(AdminTimeSlotService);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly date = signal(formatDate(new Date()));
  protected readonly today = signal(formatDate(new Date()));
  protected readonly slots = signal<TimeSlotItem[]>([]);
  protected readonly summary = signal<TimeSlotSummary>({
    totalCapacity: 0,
    totalUsed: 0,
    open: 0,
    closed: 0,
  });
  protected readonly templates = signal<SlotTemplate[]>([]);
  protected readonly templateDrafts = signal<EditableTemplate[]>([]);
  protected readonly savingTemplates = signal(false);

  protected readonly loading = signal(false);
  protected readonly loadError = signal('');

  protected readonly dialog = signal<DialogState | null>(null);
  protected readonly dialogError = signal('');
  protected readonly pendingToggle = signal<TimeSlotItem | null>(null);
  protected readonly saving = signal(false);

  protected readonly isPast = computed(() => this.date() < this.today());
  protected readonly displayDate = computed(() => {
    const [y, m, d] = this.date().split('-');
    return `${d}/${m}/${y}`;
  });

  ngOnInit(): void {
    if (this.isBrowser) this.load();
  }

  private syncTemplateDrafts(list: SlotTemplate[]): void {
    this.templateDrafts.set(
      (list || []).map((t) => ({
        label: String(t.label ?? ''),
        capacity:
          typeof t.capacity === 'number' && t.capacity > 0
            ? Math.floor(t.capacity)
            : 5,
      }))
    );
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.listByDate(this.date()).subscribe({
      next: (res) => {
        this.slots.set(res.items);
        this.summary.set(res.summary);
        this.templates.set(res.templates);
        this.syncTemplateDrafts(res.templates);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(
          err.error?.message ?? 'Không tải được danh sách khung giờ.'
        );
      },
    });
  }

  protected addTemplate(): void {
    this.templateDrafts.update((list) => [
      ...list,
      { label: '', capacity: 5 },
    ]);
  }

  protected removeTemplate(index: number): void {
    this.templateDrafts.update((list) => list.filter((_, i) => i !== index));
  }

  protected saveTemplates(): void {
    const normalized = this.templateDrafts()
      .map((item) => ({
        label: String(item.label ?? '').trim().replace(/\s+/g, ' '),
        capacity: Math.floor(Number(item.capacity)),
      }))
      .filter(
        (item) =>
          item.label.length > 0 &&
          Number.isFinite(item.capacity) &&
          item.capacity > 0
      );

    if (normalized.length === 0) {
      this.toast.error(
        'Khung giờ mẫu chưa hợp lệ',
        'Vui lòng nhập ít nhất 1 khung giờ và sức chứa lớn hơn 0.'
      );
      return;
    }

    this.savingTemplates.set(true);
    this.http
      .put<any>('/api/admin/time-slots/templates', {
        slotTemplates: normalized,
      })
      .subscribe({
        next: (res) => {
          this.savingTemplates.set(false);
          const savedList: SlotTemplate[] =
            res?.data?.slotTemplates ?? res?.slotTemplates ?? normalized;
          this.templates.set(savedList);
          this.syncTemplateDrafts(savedList);
          this.toast.success(
            'Đã lưu khung giờ mẫu',
            `Áp dụng ${normalized.length} khung giờ mặc định cho trang đặt bánh.`
          );
        },
        error: (err: HttpErrorResponse) => {
          this.savingTemplates.set(false);
          this.toast.error(
            'Lưu khung giờ mẫu thất bại',
            err.error?.message ?? 'Vui lòng thử lại.'
          );
        },
      });
  }

  protected onDateInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.setDate(value);
  }

  protected shiftDay(delta: number): void {
    const d = new Date(`${this.date()}T12:00:00`);
    d.setDate(d.getDate() + delta);
    this.setDate(formatDate(d));
  }

  protected goToday(): void {
    this.setDate(this.today());
  }

  private setDate(value: string): void {
    if (value === this.date()) return;
    this.date.set(value);
    this.load();
  }

  protected percent(slot: TimeSlotItem): number {
    return slot.capacity > 0
      ? Math.min(100, Math.round((slot.used / slot.capacity) * 100))
      : 0;
  }

  /** Có mẫu với sức chứa mặc định để tạo hàng loạt. */
  protected readonly canUseTemplates = computed(() =>
    this.templates().some((t) => t.capacity !== null)
  );

  protected createFromTemplates(): void {
    this.saving.set(true);
    this.api.createFromTemplates(this.date()).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.created > 0) {
          this.toast.success(
            'Đã tạo khung giờ theo mẫu',
            `${res.created} ca mới, bỏ qua ${res.skipped} ca đã có.`
          );
        } else {
          this.toast.show(
            'info',
            'Không có ca nào cần tạo',
            'Các khung giờ mẫu đã có đủ trong ngày này.'
          );
        }
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(
          'Không thể tạo theo mẫu',
          err.error?.message ?? 'Vui lòng thử lại.'
        );
      },
    });
  }

  // Thêm / sửa sức chứa
  protected openCreate(): void {
    this.dialogError.set('');
    this.dialog.set({ mode: 'create', slot: null });
  }

  protected openEdit(slot: TimeSlotItem): void {
    this.dialogError.set('');
    this.dialog.set({ mode: 'edit', slot });
  }

  protected closeDialog(): void {
    if (!this.saving()) this.dialog.set(null);
  }

  protected submitDialog(value: SlotFormValue): void {
    const state = this.dialog();
    if (!state) return;

    console.log('[TIME SLOT] mode:', state.mode);
    console.log('[TIME SLOT] slot:', state.slot);
    console.log('[TIME SLOT] value:', value);

    this.saving.set(true);
    this.dialogError.set('');

    const request =
      state.mode === 'create'
        ? this.api.create({
            date: this.date(),
            label: value.label,
            capacity: value.capacity,
          })
        : this.api.update(state.slot!._id, {
            capacity: value.capacity,
          });

    console.log(
      '[TIME SLOT] request type:',
      state.mode === 'create' ? 'POST CREATE' : 'PUT UPDATE'
    );

    request.subscribe({
      next: (slot) => {
        this.saving.set(false);
        this.dialog.set(null);

        this.toast.success(
          state.mode === 'create'
            ? 'Đã tạo khung giờ'
            : 'Đã cập nhật sức chứa',
          slot.label
        );

        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);

        this.dialogError.set(
          err.error?.message ??
            'Không thể lưu khung giờ. Vui lòng thử lại.'
        );

        console.error('[TIME SLOT] API error:', err);
      },
    });
  }

  // Mở / đóng
  protected askToggle(slot: TimeSlotItem): void {
    this.pendingToggle.set(slot);
  }

  protected confirmToggle(): void {
    const slot = this.pendingToggle();
    if (!slot) return;
    this.saving.set(true);
    this.api.update(slot._id, { closed: !slot.closed }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.pendingToggle.set(null);
        this.toast.success(
          updated.closed ? 'Đã đóng khung giờ' : 'Đã mở lại khung giờ',
          updated.label
        );
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(
          'Không thể cập nhật khung giờ',
          err.error?.message ?? 'Vui lòng thử lại.'
        );
      },
    });
  }
}