import { ChangeDetectionStrategy, Component, HostListener, OnInit, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Voucher, VoucherPayload, VoucherType } from '../../../../../shared/models/admin-voucher.model';
import { fromLocalInput, integerOrEmpty, toLocalInput, voucherRules } from '../../../../../shared/validators/voucher-form.validators';

/** Hộp thoại thêm mới / chỉnh sửa voucher. */
@Component({
  selector: 'app-voucher-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './voucher-form-dialog.html',
  styleUrls: ['./voucher-form-dialog.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoucherFormDialog implements OnInit {
  /** null = thêm mới; có giá trị = chỉnh sửa. */
  readonly voucher = input<Voucher | null>(null);
  readonly busy = input(false);
  readonly serverError = input('');

  readonly submitted = output<VoucherPayload>();
  readonly cancelled = output<void>();

  protected readonly form = new FormGroup(
    {
      code: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{3,20}$/)],
      }),
      type: new FormControl<VoucherType>('percent', { nonNullable: true }),
      value: new FormControl<number | null>(null, [Validators.required, integerOrEmpty]),
      maxDiscount: new FormControl<number | null>(null, [Validators.min(1), integerOrEmpty]),
      minOrder: new FormControl<number | null>(0, [Validators.min(0), integerOrEmpty]),
      usageLimit: new FormControl<number | null>(null, [Validators.min(1), integerOrEmpty]),
      startsAt: new FormControl('', { nonNullable: true }),
      expiresAt: new FormControl('', { nonNullable: true }),
      description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
    },
    { validators: voucherRules() }
  );

  protected readonly type = toSignal(this.form.controls.type.valueChanges, { initialValue: 'percent' as VoucherType });
  protected lockedCodeType = false;
  protected usedCount = 0;

  ngOnInit(): void {
    const v = this.voucher();
    if (!v) return;
    this.usedCount = v.usedCount;
    this.form.patchValue({
      code: v.code,
      type: v.type,
      value: v.value,
      maxDiscount: v.maxDiscount,
      minOrder: v.minOrder,
      usageLimit: v.usageLimit,
      startsAt: toLocalInput(v.startsAt),
      expiresAt: toLocalInput(v.expiresAt),
      description: v.description,
    });
    if (v.usedCount > 0) {
      // Đã có lượt dùng: khóa mã và loại giảm giá để không làm sai lịch sử đơn hàng.
      this.lockedCodeType = true;
      this.form.controls.code.disable();
      this.form.controls.type.disable();
    }
    if (v.usedCount > 0) this.form.controls.usageLimit.addValidators(Validators.min(v.usedCount));
    this.form.controls.usageLimit.updateValueAndValidity();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.busy()) this.cancelled.emit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.submitted.emit({
      code: raw.code.trim().toUpperCase(),
      type: raw.type,
      value: raw.value as number,
      maxDiscount: raw.type === 'percent' ? raw.maxDiscount : null,
      minOrder: raw.minOrder ?? 0,
      usageLimit: raw.usageLimit,
      startsAt: fromLocalInput(raw.startsAt),
      expiresAt: fromLocalInput(raw.expiresAt),
      description: raw.description.trim(),
    });
  }
}
