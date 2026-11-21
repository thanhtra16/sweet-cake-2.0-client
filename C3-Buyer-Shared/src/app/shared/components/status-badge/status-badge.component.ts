import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pink';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="sc-badge" [ngClass]="'sc-badge--' + status">{{ label }}</span>`,
  styles: [':host { display: inline-block; }'],
  imports: [NgClass],
})
export class StatusBadgeComponent {
  @Input() status: BadgeStatus = 'neutral';
  @Input() label = 'Chưa xác định';
}
