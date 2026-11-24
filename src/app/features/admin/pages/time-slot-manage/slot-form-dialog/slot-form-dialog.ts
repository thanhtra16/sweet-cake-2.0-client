import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { SlotTemplate, TimeSlotItem } from '../../../../../shared/models/admin-time-slot.model';

const integer = (control: AbstractControl): ValidationErrors | null =>
  control.value === null || control.value === '' || Number.isInteger(control.value) ? null : { integer: true };

export interface SlotFormValue {
  label: string;
  capacity: number;
}

/** Hộp thoại tạo khung giờ mới (create) hoặc điều chỉnh sức chứa (edit). */
@Component({
  selector: 'app-slot-form-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './slot-form-dialog.html',
  styleUrls: ['./slot-form-dialog.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotFormDialog implements OnInit {
  readonly mode = input.required<'create' | 'edit'>();
  /** Ngày đang quản lý (YYYY-MM-DD), hiển thị dạng dd/MM/yyyy. */
  readonly date = input.required<string>();
  readonly slot = input<TimeSlotItem | null>(null);
  readonly templates = input<SlotTemplate[]>([]);
  readonly busy = input(false);
  readonly serverError = input('');

  readonly submitted = output<SlotFormValue>();
  readonly cancelled = output<void>();

  protected readonly form = new FormGroup({
    label: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(30)],
    }),
    capacity: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0), Validators.max(1000), integer],
    }),
  });

  protected minCapacity = 0;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const slot = this.slot();
    if (this.mode() === 'edit' && slot) {
      this.minCapacity = slot.used;
      this.form.controls.label.setValue(slot.label);
      this.form.controls.label.disable();
      this.form.controls.capacity.setValue(slot.capacity);
      this.form.controls.capacity.addValidators(Validators.min(slot.used));
      this.form.controls.capacity.updateValueAndValidity();
      return;
    }

    // Chọn nhãn trùng khung giờ mẫu thì điền sẵn sức chứa mặc định (chỉ khi chưa nhập sức chứa).
    this.form.controls.label.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const capacity = this.form.controls.capacity;
      if (capacity.value !== null && capacity.dirty) return;
      const match = this.templates().find((t) => t.label.toLowerCase() === value.trim().toLowerCase());
      if (match && match.capacity !== null) capacity.setValue(match.capacity);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.busy()) this.cancelled.emit();
  }

  protected get displayDate(): string {
    const [y, m, d] = this.date().split('-');
    return `${d}/${m}/${y}`;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { label, capacity } = this.form.getRawValue();
    this.submitted.emit({ label: label.trim(), capacity: capacity as number });
  }
}
