import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Số nguyên (cho phép để trống, để `required` xử lý riêng). */
export function integerOrEmpty(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return v === null || v === '' || Number.isInteger(v) ? null : { integer: true };
}

/**
 * Cross-field validator cho cả form voucher:
 *  - percent: value từ 1–100; amount: value ≥ 1
 *  - thời gian kết thúc phải sau thời gian bắt đầu
 * Lỗi đặt trên group: `valueRange`, `dateOrder`.
 */
export function voucherRules(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const type = group.get('type')?.value as string;
    const value = group.get('value')?.value as number | null;
    const startsAt = group.get('startsAt')?.value as string;
    const expiresAt = group.get('expiresAt')?.value as string;

    const errors: ValidationErrors = {};
    if (value !== null && Number.isInteger(value)) {
      if (type === 'percent' && (value < 1 || value > 100)) errors['valueRange'] = 'percent';
      if (type === 'amount' && value < 1) errors['valueRange'] = 'amount';
    }
    if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
      errors['dateOrder'] = true;
    }
    return Object.keys(errors).length ? errors : null;
  };
}

/** ISO (UTC) -> giá trị cho <input type="datetime-local"> theo giờ máy. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Giá trị datetime-local -> ISO (UTC); rỗng -> null. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
