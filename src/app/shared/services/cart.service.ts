import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { CartItem } from '../models/cart.model';
import { CakeCustomization } from '../../features/buyer/product/components/cake-customizer/cake-customizer';

const CART_STORAGE_KEY = 'sweetcake_cart';
const MAX_QUANTITY_PER_ITEM = 10;

export interface AddCartItemInput {
  productId: string;
  productName: string;
  productKind: 'cake' | 'accessory';
  imageUrl: string | null;
  unitPrice: number;
  customization: CakeCustomization | null;
  accessories: CartItem['accessories'];
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly cartSubject = new BehaviorSubject<CartItem[]>([]);
  readonly cartItems$ = this.cartSubject.asObservable();

  readonly totalItems$ = this.cartItems$.pipe(
    map(items =>
      items.reduce((total, item) => total + item.quantity, 0)
    )
  );

  readonly subtotal$ = this.cartItems$.pipe(
    map(items =>
      items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0
      )
    )
  );

  constructor() {
    this.loadCart();
  }

  get items(): CartItem[] {
    return this.cartSubject.value;
  }

  get totalItems(): number {
    return this.items.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  /**
   * Thêm sản phẩm vào giỏ.
   * Trả về false nếu dữ liệu không hợp lệ hoặc dòng sản phẩm
   * đã đạt giới hạn 10 sản phẩm.
   */
  addItem(input: AddCartItemInput): boolean {
    if (
      !input.productId ||
      !input.productName ||
      !Number.isFinite(input.unitPrice) ||
      input.unitPrice < 0
    ) {
      return false;
    }

    const normalizedAccessories = this.normalizeAccessories(
      input.accessories,
      input.customization
    );

    const configurationKey = this.createConfigurationKey(
      input,
      normalizedAccessories
    );

    const currentItems = [...this.cartSubject.value];

    const existingIndex = currentItems.findIndex(
      item =>
        item.productId === input.productId &&
        item.configurationKey === configurationKey
    );

    if (existingIndex >= 0) {
      const existingItem = currentItems[existingIndex];

      if (existingItem.quantity >= MAX_QUANTITY_PER_ITEM) {
        return false;
      }

      currentItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + 1,
      };
    } else {
      const newItem: CartItem = {
        id: `${input.productId}-${Date.now()}`,
        productId: input.productId,
        productName: input.productName,
        productKind: input.productKind,
        imageUrl: input.imageUrl,
        unitPrice: Math.round(input.unitPrice),
        quantity: 1,
        customization: input.customization
          ? {
              ...input.customization,
              accessories: [...input.customization.accessories],
              accessoryVariants: {
                ...input.customization.accessoryVariants,
              },
            }
          : null,
        accessories: normalizedAccessories,
        configurationKey,
      };

      currentItems.push(newItem);
    }

    this.updateCart(currentItems);
    return true;
  }

  /**
   * Chuẩn hóa phụ kiện trước khi lưu.
   * Nếu phụ kiện chưa có variantId thì lấy từ cấu hình bánh.
   */
  private normalizeAccessories(
    accessories: CartItem['accessories'],
    customization: CakeCustomization | null
  ): CartItem['accessories'] {
    return accessories.map(accessory => {
      const variantId =
        accessory.variantId ||
        customization?.accessoryVariants?.[accessory.id] ||
        null;

      return {
        ...accessory,
        variantId,
        variantLabel: accessory.variantLabel ?? null,
      };
    });
  }

  /**
   * Cập nhật số lượng một dòng sản phẩm.
   * Số lượng hợp lệ từ 1 đến 10.
   */
  updateQuantity(itemId: string, quantity: number): void {
    if (!Number.isFinite(quantity)) {
      return;
    }

    const nextQuantity = Math.max(
      1,
      Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(quantity))
    );

    const updatedItems = this.items.map(item =>
      item.id === itemId
        ? { ...item, quantity: nextQuantity }
        : item
    );

    this.updateCart(updatedItems);
  }

  removeItem(itemId: string): void {
    this.updateCart(
      this.items.filter(item => item.id !== itemId)
    );
  }

  clearCart(): void {
    this.updateCart([]);
  }

  /**
   * Tạo khóa cấu hình.
   * Hai dòng chỉ được gộp khi có cùng cấu hình bánh,
   * cùng phụ kiện và cùng biến thể phụ kiện.
   */
  private createConfigurationKey(
    input: AddCartItemInput,
    accessories: CartItem['accessories']
  ): string {
    const customization = input.customization;

    const sortedAccessories = accessories
      .map(accessory => ({
        id: accessory.id,
        variantId: accessory.variantId ?? null,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (!customization) {
      return JSON.stringify({
        customization: null,
        accessories: sortedAccessories,
      });
    }

    return JSON.stringify({
      size: customization.size,
      base: customization.base,
      filling: customization.filling,
      frostingColor: customization.frostingColor,
      sweetness: customization.sweetness,
      message: customization.message.trim(),
      accessories: sortedAccessories,
    });
  }

  private updateCart(items: CartItem[]): void {
    this.cartSubject.next(items);
    this.saveCart(items);
  }

  private loadCart(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const storedValue = localStorage.getItem(CART_STORAGE_KEY);

      if (!storedValue) {
        return;
      }

      const parsed: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsed)) {
        return;
      }

      const validItems = parsed.filter(
        (item): item is CartItem =>
          item !== null &&
          typeof item === 'object' &&
          typeof item.id === 'string' &&
          typeof item.productId === 'string' &&
          typeof item.productName === 'string' &&
          typeof item.unitPrice === 'number' &&
          typeof item.quantity === 'number' &&
          item.quantity >= 1 &&
          item.quantity <= MAX_QUANTITY_PER_ITEM
      );

      // Tương thích với giỏ hàng cũ chưa có thông tin biến thể.
      const normalizedItems = validItems.map(item => ({
        ...item,
        accessories: Array.isArray(item.accessories)
          ? item.accessories.map(accessory => ({
              ...accessory,
              variantId: accessory.variantId ?? null,
              variantLabel: accessory.variantLabel ?? null,
            }))
          : [],
      }));

      this.cartSubject.next(normalizedItems);
    } catch (error) {
      console.error('[CartService] Không thể đọc giỏ hàng:', error);
      this.cartSubject.next([]);
    }
  }

  private saveCart(items: CartItem[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error('[CartService] Không thể lưu giỏ hàng:', error);
    }
  }
}
