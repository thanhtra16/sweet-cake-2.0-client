import { CommonModule, Location } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import {
  ApiService,
  OrderQuote,
  QuoteRequest,
  QuoteRequestItem,
  ReceiveMethod,
} from '@core/services/api.service';

import { CartService } from '@shared/services/cart.service';
import { CartItem } from '@shared/models/cart.model';
import { VndPipe } from '@shared/pipes/vnd.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, VndPipe],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit, OnDestroy {
  private readonly cartService = inject(CartService);
  private readonly apiService = inject(ApiService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  private quoteSubscription?: Subscription;
  private cartSubscription?: Subscription;

  // Lưu danh sách ID sản phẩm ở lần phát dữ liệu giỏ hàng trước đó.
  // Dùng để nhận biết sản phẩm mới được thêm vào.
  private previousCartItemIds = new Set<string>(
    this.cartService.items.map((item) => item.id)
  );

  readonly cartItems$ = this.cartService.cartItems$;

  selectedItemIds = new Set<string>(
    this.cartService.items.map((item) => item.id)
  );

  receiveMethod: ReceiveMethod = 'pickup';

  quoteResult: OrderQuote | null = null;
  quoteLoading = false;
  quoteError = '';

  // POPUP XÁC NHẬN XÓA SẢN PHẨM
  itemToRemove: CartItem | null = null;
  isRemovingItem = false;

  private quoteLines: {
    cartItemId: string;
    productName: string;
  }[] = [];

  ngOnInit(): void {
    this.cartSubscription = this.cartItems$.subscribe((items) => {
      const currentIds = new Set(items.map((item) => item.id));
      const nextSelected = new Set<string>();

      // Giữ nguyên trạng thái chọn/bỏ chọn của các sản phẩm còn tồn tại.
      for (const id of this.selectedItemIds) {
        if (currentIds.has(id)) {
          nextSelected.add(id);
        }
      }

      // Chỉ tự động chọn sản phẩm thực sự mới được thêm vào giỏ hàng.
      // Không chọn lại những sản phẩm người dùng đã bỏ chọn.
      for (const item of items) {
        if (!this.previousCartItemIds.has(item.id)) {
          nextSelected.add(item.id);
        }
      }

      // Cập nhật danh sách ID để so sánh ở lần phát dữ liệu tiếp theo.
      this.previousCartItemIds = currentIds;

      this.selectedItemIds = nextSelected;

      // Đóng popup nếu sản phẩm đang chờ xác nhận
      // đã bị xóa từ một nơi khác.
      if (
        this.itemToRemove &&
        !currentIds.has(this.itemToRemove.id)
      ) {
        this.itemToRemove = null;
        this.isRemovingItem = false;
      }

      this.refreshQuote();
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.quoteSubscription?.unsubscribe();
  }

  get totalItems(): number {
    return this.cartService.totalItems;
  }

  get selectedItems(): CartItem[] {
    return this.cartService.items.filter((item) =>
      this.selectedItemIds.has(item.id)
    );
  }

  // Tổng số lượng sản phẩm được chọn.
  get selectedQuantity(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  // Số sản phẩm được chọn, dùng thống nhất với ngăn kéo.
  get selectedCount(): number {
    return this.selectedQuantity;
  }

  get selectedSubtotal(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  }

  get isAllSelected(): boolean {
    const items = this.cartService.items;

    return (
      items.length > 0 &&
      items.every((item) => this.selectedItemIds.has(item.id))
    );
  }

  get isIndeterminate(): boolean {
    const selectedCount = this.selectedItems.length;
    const totalCount = this.cartService.items.length;

    return selectedCount > 0 && selectedCount < totalCount;
  }

  get isQuoteValid(): boolean {
    if (!this.quoteResult) {
      return false;
    }

    return (
      this.quoteResult.valid &&
      this.quoteResult.items.every((item) => item.valid)
    );
  }

  get hasInvalidSelectedItems(): boolean {
    if (!this.quoteResult) {
      return false;
    }

    return (
      !this.quoteResult.valid ||
      this.quoteResult.items.some((item) => !item.valid)
    );
  }

  isSelected(itemId: string): boolean {
    return this.selectedItemIds.has(itemId);
  }

  // CHỌN / BỎ CHỌN SẢN PHẨM
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

  // CHỌN TẤT CẢ / BỎ CHỌN TẤT CẢ
  toggleAll(checked: boolean): void {
    this.selectedItemIds = checked
      ? new Set(this.cartService.items.map((item) => item.id))
      : new Set<string>();

    this.refreshQuote();
  }

  // THAY ĐỔI PHƯƠNG THỨC NHẬN HÀNG
  onReceiveMethodChange(value: string): void {
    if (value !== 'pickup' && value !== 'delivery') {
      return;
    }

    this.receiveMethod = value;
    this.refreshQuote();
  }

  // TĂNG SỐ LƯỢNG
  async increaseQuantity(item: CartItem): Promise<void> {
    if (item.quantity >= 10) {
      return;
    }

    await this.cartService.updateQuantity(
      item.id,
      item.quantity + 1
    );
  }

  // GIẢM SỐ LƯỢNG
  async decreaseQuantity(item: CartItem): Promise<void> {
    if (item.quantity <= 1) {
      return;
    }

    await this.cartService.updateQuantity(
      item.id,
      item.quantity - 1
    );
  }

  // MỞ POPUP XÁC NHẬN XÓA
  openRemoveConfirm(item: CartItem): void {
    if (this.isRemovingItem) {
      return;
    }

    this.itemToRemove = item;
  }

  // ĐÓNG POPUP, KHÔNG XÓA SẢN PHẨM
  cancelRemoveConfirm(): void {
    if (this.isRemovingItem) {
      return;
    }

    this.itemToRemove = null;
  }

  // XÁC NHẬN XÓA SẢN PHẨM
  async confirmRemoveItem(): Promise<void> {
    if (!this.itemToRemove || this.isRemovingItem) {
      return;
    }

    const itemId = this.itemToRemove.id;

    this.isRemovingItem = true;
    this.cdr.detectChanges();

    try {
      await this.removeItem(itemId);

      this.itemToRemove = null;
    } finally {
      this.isRemovingItem = false;
      this.cdr.detectChanges();
    }
  }

  // XÓA SẢN PHẨM KHỎI CART SERVICE
  async removeItem(itemId: string): Promise<void> {
    await this.cartService.removeItem(itemId);

    const next = new Set(this.selectedItemIds);
    next.delete(itemId);

    this.selectedItemIds = next;
  }

  // XÂY DỰNG DỮ LIỆU GỬI LÊN API BÁO GIÁ
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

        // Thêm phụ kiện đi kèm bánh vào dữ liệu báo giá.
        for (const accessory of cartItem.accessories || []) {
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
        const resolvedVariant =
          cartItem.variantId ?? (cartItem as any).variant ?? null;

        items.push({
          productId: cartItem.productId,
          qty: cartItem.quantity,
          ...(resolvedVariant
            ? { variant: resolvedVariant }
            : {}),
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

  // LÀM MỚI BÁO GIÁ
  refreshQuote(): void {
    this.quoteSubscription?.unsubscribe();

    this.quoteResult = null;
    this.quoteError = '';

    if (this.selectedItems.length === 0) {
      this.quoteLines = [];
      this.quoteLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const request = this.buildQuoteRequest();

    this.quoteLoading = true;
    this.cdr.detectChanges();

    this.quoteSubscription = this.apiService
      .quoteOrder(request)
      .pipe(
        finalize(() => {
          this.quoteLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (rawResult: any) => {
          this.quoteResult = rawResult?.data ?? rawResult;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.quoteResult = null;
          this.quoteError =
            error?.error?.message ||
            'Không thể tính báo giá. Vui lòng thử lại.';

          this.cdr.detectChanges();
        },
      });
  }

  // CHUYỂN ĐẾN THANH TOÁN
  proceedToCheckout(): void {
    // Chỉ cho phép tiếp tục khi có ít nhất một sản phẩm được chọn.
    const selectedItems = this.selectedItems;

    if (selectedItems.length === 0) {
      return;
    }

    // Tạo dữ liệu đặt hàng từ những sản phẩm đã chọn.
    const quotePayload = this.buildQuoteRequest();

    if (quotePayload.items.length === 0) {
      return;
    }

    // Lưu dữ liệu để trang checkout tiếp nhận.
    sessionStorage.setItem(
      this.BUY_NOW_STORAGE_KEY,
      JSON.stringify({
        items: quotePayload.items,
        receiveMethod: this.receiveMethod,
      })
    );

    // Chuyển sang trang checkout.
    this.router.navigate(['/checkout']).then((success) => {
      if (!success) {
        console.error('[Cart] Không thể điều hướng đến trang thanh toán.');
      }
    });
  }

  // TÍNH TỔNG TIỀN CỦA MỘT DÒNG SẢN PHẨM
  getLineTotal(item: CartItem): number {
    if (this.quoteResult) {
      const indexes = this.quoteLines
        .map((line, index) =>
          line.cartItemId === item.id ? index : -1
        )
        .filter((index) => index >= 0);

      if (indexes.length > 0) {
        const results = indexes.map(
          (index) => this.quoteResult!.items[index]
        );

        if (
          results.every(
            (result) =>
              result?.valid &&
              typeof result.lineTotal === 'number'
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

  // LẤY DANH SÁCH LỖI BÁO GIÁ CỦA SẢN PHẨM
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
        (entry) =>
          entry.line.cartItemId === item.id &&
          entry.result &&
          !entry.result.valid
      )
      .map(
        (entry) =>
          `${entry.line.productName}: ${
            entry.result.reason || 'Sản phẩm không hợp lệ'
          }`
      );
  }

  // QUAY LẠI TRANG TRƯỚC
  goBack(): void {
    this.location.back();
  }
}
