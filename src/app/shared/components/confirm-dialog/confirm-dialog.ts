
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrls: ['./confirm-dialog.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Xác nhận');
  readonly cancelLabel = input('Hủy');
  readonly danger = input(false);
  readonly askReason = input(false);
  readonly busy = input(false);

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  protected readonly reason = signal('');

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.busy()) {
      this.cancelled.emit();
    }
  }

  protected onReasonInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.reason.set(target.value);
  }

  protected confirm(): void {
    if (this.busy()) return;

    this.confirmed.emit(this.reason().trim());
  }
}
