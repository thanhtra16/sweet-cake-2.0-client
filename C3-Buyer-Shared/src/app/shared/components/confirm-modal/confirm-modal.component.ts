import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.css'],
})
export class ConfirmModalComponent {
  @Input() visible = false;
  @Input() title = 'Xác nhận';
  @Input() message = 'Bạn có chắc chắn muốn thực hiện thao tác này?';
  @Input() confirmText = 'Xác nhận';
  @Input() cancelText = 'Hủy';
  @Input() danger = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  confirm(): void {
    this.confirmed.emit();
    this.closed.emit();
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
