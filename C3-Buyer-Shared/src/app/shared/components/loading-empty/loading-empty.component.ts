import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-empty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-empty.component.html',
  styleUrls: ['./loading-empty.component.css'],
})
export class LoadingEmptyComponent {
  @Input() loading = false;
  @Input() isEmpty = false;
  @Input() loadingText = 'Đang tải dữ liệu...';
  @Input() emptyTitle = 'Chưa có dữ liệu';
  @Input() emptyMessage = 'Hiện chưa có dữ liệu để hiển thị.';
}
