import { CommonModule, Location } from '@angular/common';
import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  ApiService,
  OrderQuote,
  QuoteRequest,
  QuoteRequestItem,
  ReceiveMethod,
} from '../../../../../core/services/api.service';

import { CartService } from '../../../../../shared/services/cart.service';
import { CartItem } from '../../../../../shared/models/cart.model';
import { VndPipe } from '../../../../../shared/pipes/vnd.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, VndPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnDestroy {
  private readonly cartService = inject(CartService);
  private readonly apiService = inject(ApiService);
  private readonly location = inject(Location);

  private quoteSubscription?: Subscription;

  readonly cartItems$ = this.cartService.cartItems$;

  selectedItemIds = new Set<string>(
    this.cartService.items.map(item => item.id)
  );

  receiveMethod: ReceiveMethod = 'pickup';

  quoteResult: OrderQuote | null = null;
  quoteLoading = false;
  quoteError = '';

  // Lưu thông tin từng dòng gửi lên Backend để đối chiếu kết quả.
  private quoteLines: {
    cartItemId: string;
    productName: string;
  }[] = [];

  constructor() {
    // Đồng bộ lựa chọn và tính lại báo giá khi giỏ hàng thay đổi.
    this.cartItems$.subscribe(items => {
      const currentIds = new Set(items.map(item => item.id));
      const nextSelected = new Set<string>();

      // Giữ lựa chọn cũ nếu sản phẩm vẫn còn trong giỏ.
      for (const id of this.selectedItemIds) {
        if (currentIds.has(id)) {
          nextSelected.add(id);
        }
      }

      // Tự động chọn các dòng sản phẩm mới được thêm vào.
      for (const item of items) {
        if (!this.selectedItemIds.has(item.id)) {
          nextSelected.add(item.id);
        }
      }

      this.selectedItemIds = nextSelected;
      this.refreshQuote();
    });
  }

  ngOnDestroy(): void {
    this.quoteSubscription?.unsubscribe();
  }

  get totalItems(): number {
    return this.cartService.totalItems;
  }

  get selectedItems(): CartItem[] {
    return this.cartService.items.filter(
      item => this.selectedItemIds.has(item.id)
    );
  }

  get selectedQuantity(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  // Đây chỉ là số tiền tham khảo từ Frontend.
  get selectedSubtotal(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  }

  get isAllSelected(): boolean {
    const items = this.cartService.items;

    return items.length > 0 &&
      items.every(item => this.selectedItemIds.has(item.id));
  }

  get isIndeterminate(): boolean {
    const selectedCount = this.selectedItems.length;
    const totalCount = this.cartService.items.length;

    return selectedCount > 0 && selectedCount < totalCount;
  }

  get isQuoteValid(): boolean {
    return !!this.quoteResult &&
      this.quoteResult.valid &&
      this.quoteResult.items.every(item => item.valid);
  }

  isSelected(itemId: string): boolean {
    return this.selectedItemIds.has(itemId);
  }

  toggleItem(itemId: string): void {
    const next = new Set(this.selectedItemIds);

    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }

    this.selectedItemIds = next;
    this.refreshQuote();
  }

  toggleAll(checked: boolean): void {
    this.selectedItemIds = checked
      ? new Set(this.cartService.items.map(item => item.id))
      : new Set<string>();

    this.refreshQuote();
  }

  onReceiveMethodChange(value: string): void {
    if (value !== 'pickup' && value !== 'delivery') {
      return;
    }

    this.receiveMethod = value;
    this.refreshQuote();
  }

  increaseQuantity(item: CartItem): void {
    if (item.quantity >= 10) {
      return;
    }

    this.cartService.updateQuantity(item.id, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      return;
    }

    this.cartService.updateQuantity(item.id, item.quantity - 1);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);

    const next = new Set(this.selectedItemIds);
    next.delete(itemId);
    this.selectedItemIds = next;
  }

  /**
   * Tạo các dòng báo giá từ sản phẩm được chọn.
   * Bánh và từng phụ kiện được gửi thành các dòng riêng.
   */
  private buildQuoteRequest(): QuoteRequest {
    const items: QuoteRequestItem[] = [];
    this.quoteLines = [];

    for (const cartItem of this.selectedItems) {
      if (cartItem.productKind === 'cake') {
        const config = cartItem.customization;

        items.push({
          productId: cartItem.productId,
          qty: cartItem.quantity,
          ...(config
            ? {
                config: {
                  size: config.size,
                  base: config.base,
                  filling: config.filling,
                  frostingColor: config.frostingColor,
                  sweetness: config.sweetness,
                  message: config.message,
                },
              }
            : {}),
        });

        this.quoteLines.push({
          cartItemId: cartItem.id,
          productName: cartItem.productName,
        });

        // Phụ kiện được báo giá riêng, số lượng theo số bánh.
        for (const accessory of cartItem.accessories) {
          items.push({
            productId: accessory.id,
            qty: cartItem.quantity,
            ...(accessory.variantId
              ? { variant: accessory.variantId }
              : {}),
          });

          this.quoteLines.push({
            cartItemId: cartItem.id,
            productName: accessory.name,
          });
        }
      } else {
        // Sản phẩm phụ kiện được thêm độc lập vào giỏ.
        items.push({
          productId: cartItem.productId,
          qty: cartItem.quantity,
        });

        this.quoteLines.push({
          cartItemId: cartItem.id,
          productName: cartItem.productName,
        });
      }
    }

    return {
      receiveMethod: this.receiveMethod,
      items,
    };
  }

  /**
   * Gọi Backend tính lại báo giá.
   * Hủy request cũ nếu người dùng tiếp tục thay đổi giỏ hàng.
   */
  refreshQuote(): void {
    this.quoteSubscription?.unsubscribe();

    this.quoteResult = null;
    this.quoteError = '';
    this.quoteLoading = false;

    if (this.selectedItems.length === 0) {
      this.quoteLines = [];
      return;
    }

    const request = this.buildQuoteRequest();

    this.quoteLoading = true;

    this.quoteSubscription = this.apiService
      .quoteOrder(request)
      .subscribe({
        next: result => {
          this.quoteResult = result;
          this.quoteLoading = false;
        },
        error: error => {
          this.quoteResult = null;
          this.quoteLoading = false;
          this.quoteError =
            error?.error?.message ||
            'Không thể tính báo giá. Vui lòng thử lại.';
        },
      });
  }

  /**
   * Cộng giá các dòng Backend thuộc cùng một dòng giỏ hàng.
   * Ví dụ: một bánh + hai phụ kiện.
   */
  getLineTotal(item: CartItem): number {
    if (this.quoteResult) {
      const indexes = this.quoteLines
        .map((line, index) => line.cartItemId === item.id ? index : -1)
        .filter(index => index >= 0);

      if (indexes.length > 0) {
        const results = indexes.map(
          index => this.quoteResult!.items[index]
        );

        if (
          results.every(
            result => result?.valid && typeof result.lineTotal === 'number'
          )
        ) {
          return results.reduce(
            (total, result) => total + (result.lineTotal ?? 0),
            0
          );
        }
      }
    }

    return item.unitPrice * item.quantity;
  }

  getQuoteErrors(item: CartItem): string[] {
    if (!this.quoteResult) {
      return [];
    }

    return this.quoteLines
      .map((line, index) => ({
        line,
        result: this.quoteResult!.items[index],
      }))
      .filter(
        entry =>
          entry.line.cartItemId === item.id &&
          entry.result &&
          !entry.result.valid
      )
      .map(
        entry =>
          `${entry.line.productName}: ${entry.result.reason || 'Sản phẩm không hợp lệ'}`
      );
  }

  goBack(): void {
    this.location.back();
  }
}
