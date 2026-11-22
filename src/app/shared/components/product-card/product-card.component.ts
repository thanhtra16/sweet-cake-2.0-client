import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  /** Hiện nút "Thêm vào giỏ" khi hover (trang chủ tắt đi). */
  readonly showAction = input(true);

  /** Hiện dòng "Nhân & loại bánh" dưới tên. */
  readonly showMeta = input(false);

  /** Phát ra khi bấm "Thêm vào giỏ"; component cha quyết định xử lý. */
  readonly addToCart = output<Product>();

  private static readonly priceFormat = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });

  formatPrice(price: number): string {
    return ProductCardComponent.priceFormat.format(price);
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product());
  }
}