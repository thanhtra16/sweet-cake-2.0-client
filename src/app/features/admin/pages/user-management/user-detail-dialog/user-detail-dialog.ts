
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  input,
  output,
} from '@angular/core';

import { UserAccount } from '../../../../../shared/models/user.model';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './user-detail-dialog.html',
  styleUrls: ['./user-detail-dialog.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailDialog {
  readonly user = input.required<UserAccount>();
  readonly closed = output<void>();
  readonly toggleStatus = output<UserAccount>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }

  protected initial(): string {
    return (this.user().fullName?.trim()[0] ?? '?').toUpperCase();
  }

  protected onToggle(): void {
    this.toggleStatus.emit(this.user());
  }
}
