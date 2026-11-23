
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
  variantId?: string | null;
  variantLabel?: string | null;
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

    const normalizedInput: AddCartItemInput = {
      ...input,
      variantId: input.variantId ?? null,
      variantLabel: input.variantLabel ?? null,
      accessories: normalizedAccessories,
    };

    const configurationKey = this.createConfigurationKey(
      normalizedInput,
      normalizedAccessories
    );

    const currentItems = [...this.cartSubject.value];

    const existingIndex = currentItems.findIndex(
      item =>
        item.productId === normalizedInput.productId &&
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
        id: this.createItemId(normalizedInput.productId),
        productId: normalizedInput.productId,
        productName: normalizedInput.productName,
        productKind: normalizedInput.productKind,
        imageUrl: normalizedInput.imageUrl,
        unitPrice: Math.round(normalizedInput.unitPrice),
        quantity: 1,

        customization: normalizedInput.customization
          ? {
              ...normalizedInput.customization,
              accessories: [
                ...normalizedInput.customization.accessories,
              ],
              accessoryVariants: {
                ...normalizedInput.customization.accessoryVariants,
              },
            }
          : null,

        variantId: normalizedInput.variantId ?? null,
        variantLabel: normalizedInput.variantLabel ?? null,

        accessories: normalizedAccessories,
        configurationKey,
      };

      currentItems.push(newItem);
    }

    this.updateCart(currentItems);
    return true;
  }

  private createItemId(productId: string): string {
    return `${productId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  private normalizeAccessories(
    accessories: CartItem['accessories'],
    customization: CakeCustomization | null
  ): CartItem['accessories'] {
    return (accessories ?? []).map(accessory => {
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
   * Giữ thứ tự thuộc tính tương thích với khóa cũ.
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
    .sort((a, b) => {
      const idCompare = a.id.localeCompare(b.id);

      if (idCompare !== 0) {
        return idCompare;
      }

      return (a.variantId ?? '').localeCompare(
        b.variantId ?? ''
      );
    });

  const configuration: Record<string, unknown> = {
    customization: null,
    accessories: sortedAccessories,
  };

  if (customization) {
    configuration['size'] = customization.size;
    configuration['base'] = customization.base;
    configuration['filling'] = customization.filling;
    configuration['frostingColor'] = customization.frostingColor;
    configuration['sweetness'] = customization.sweetness;
    configuration['message'] = customization.message.trim();

    delete configuration['customization'];
  }

  if (input.variantId) {
    configuration['variantId'] = input.variantId;
  }

  return JSON.stringify(configuration);
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
          Number.isFinite(item.unitPrice) &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1 &&
          item.quantity <= MAX_QUANTITY_PER_ITEM
      );

      const normalizedItems = validItems.map(item => {
        const normalizedAccessories = Array.isArray(item.accessories)
          ? item.accessories.map(accessory => ({
              ...accessory,
              variantId: accessory.variantId ?? null,
              variantLabel: accessory.variantLabel ?? null,
            }))
          : [];

        const normalizedItem: CartItem = {
          ...item,
          variantId: item.variantId ?? null,
          variantLabel: item.variantLabel ?? null,

          customization: item.customization
            ? {
                ...item.customization,
                accessories: [
                  ...(item.customization.accessories ?? []),
                ],
                accessoryVariants: {
                  ...(item.customization.accessoryVariants ?? {}),
                },
              }
            : null,

          accessories: normalizedAccessories,

          configurationKey:
            typeof item.configurationKey === 'string' &&
            item.configurationKey.length > 0
              ? item.configurationKey
              : this.createConfigurationKey(
                  {
                    productId: item.productId,
                    productName: item.productName,
                    productKind: item.productKind,
                    imageUrl: item.imageUrl ?? null,
                    unitPrice: item.unitPrice,
                    customization: item.customization ?? null,
                    accessories: normalizedAccessories,
                    variantId: item.variantId ?? null,
                    variantLabel: item.variantLabel ?? null,
                  },
                  normalizedAccessories
                ),
        };

        return normalizedItem;
      });

      this.cartSubject.next(normalizedItems);
      this.saveCart(normalizedItems);
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
