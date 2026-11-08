import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'vnd',
  standalone: true,
})
export class VndPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';

    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';

    return this.formatter.format(amount);
  }
}
