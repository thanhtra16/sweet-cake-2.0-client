# Ví dụ tích hợp nhanh

## Dùng component trong trang standalone

```ts
import { Component } from '@angular/core';
import { ProductCardComponent, BuyerProduct } from '../../shared/components/product-card/product-card.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LoadingEmptyComponent } from '../../shared/components/loading-empty/loading-empty.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CharacterCountDirective } from '../../shared/directives/character-count.directive';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [
    ProductCardComponent,
    PaginationComponent,
    LoadingEmptyComponent,
    ConfirmModalComponent,
    StatusBadgeComponent,
    CharacterCountDirective,
  ],
  templateUrl: './example-page.component.html',
})
export class ExamplePageComponent {
  products: BuyerProduct[] = [
    { _id: 'demo-1', name: 'Bánh kem dâu', price: 250000, image: 'assets/images/cake.jpg' },
  ];

  page = 1;
  totalPages = 3;
  isLoading = false;
  showConfirm = false;
  noteLength = 0;

  constructor(private readonly toast: ToastService) {}

  addProduct(product: BuyerProduct): void {
    // Thay bằng lời gọi CartService thật của nhóm.
    this.toast.success(`Đã chọn ${product.name}.`);
  }

  viewProduct(product: BuyerProduct): void {
    // Điều hướng đến trang chi tiết theo route thật của nhóm.
    console.log('Product selected:', product);
  }

  changePage(page: number): void {
    this.page = page;
    // Gọi API lấy dữ liệu trang mới tại đây.
  }
}
```

## Ví dụ template

```html
<div class="sc-container">
  <app-loading-empty
    [loading]="isLoading"
    [isEmpty]="products.length === 0"
  ></app-loading-empty>

  <div class="sc-product-grid" *ngIf="!isLoading && products.length">
    <app-product-card
      *ngFor="let product of products"
      [product]="product"
      (viewDetail)="viewProduct($event)"
      (addToCart)="addProduct($event)"
    ></app-product-card>
  </div>

  <app-pagination
    [currentPage]="page"
    [totalPages]="totalPages"
    (pageChange)="changePage($event)"
  ></app-pagination>

  <app-status-badge status="success" label="Đã thanh toán"></app-status-badge>

  <textarea
    appCharacterCount
    [characterLimit]="200"
    (characterCountChange)="noteLength = $event"
    maxlength="200"
    class="sc-textarea"
  ></textarea>
  <p class="sc-help-text">{{ noteLength }}/200 ký tự</p>

  <app-confirm-modal
    [visible]="showConfirm"
    title="Xác nhận thao tác"
    message="Bạn có chắc chắn muốn tiếp tục?"
    (confirmed)="showConfirm = false"
    (closed)="showConfirm = false"
  ></app-confirm-modal>
</div>
```

> Trong trang standalone có dùng `*ngIf` / `*ngFor`, nhớ import `CommonModule` vào `imports` của component trang đó.
