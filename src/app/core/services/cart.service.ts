import { Injectable, computed, signal } from '@angular/core';

import { Product } from '../../shared/models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
}

/**
 * Giỏ hàng tối giản (lưu trong bộ nhớ) để nút "Thêm vào giỏ" hoạt động.
 * Khi làm trang giỏ hàng / đồng bộ API thì mở rộng tại đây.
 */
@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly _items = signal<CartItem[]>([]);

  readonly items = this._items.asReadonly();
  readonly totalQuantity = computed(() =>
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );

  add(product: Product, quantity = 1): void {
    this._items.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);

      if (existing) {
        return items.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...items, { product, quantity }];
    });
  }
}
