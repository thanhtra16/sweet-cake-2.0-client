
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { CartItem } from '../models/cart.model';
import { CakeCustomization } from '@features/buyer/components/cake-customizer/cake-customizer';

const CART_STORAGE_KEY = 'sweetcake_cart';
const MAX_QUANTITY_PER_ITEM = 10;

type ExtendedCartAccessory = CartItem['accessories'][number] & {
  variantIds?: string[];
  variantLabels?: string[];
};

type ExtendedCartItem = CartItem & {
  variantIds?: string[];
  variantLabels?: string[];
};

export interface AddCartItemInput {
  productId: string;
  productName: string;
  productKind: 'cake' | 'accessory';
  imageUrl: string | null;
  unitPrice: number;
  customization: CakeCustomization | null;
  accessories: CartItem['accessories'];

  // Tương thích dữ liệu cũ.
  variantId?: string | null;
  variantLabel?: string | null;

  // Hỗ trợ nhiều biến thể.
  variantIds?: string[];
  variantLabels?: string[];

  variant?: string | null;
  quantity?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cart`;

  private readonly cartSubject = new BehaviorSubject<CartItem[]>([]);
  readonly cartItems$ = this.cartSubject.asObservable();

  private readonly drawerOpenSubject = new BehaviorSubject<boolean>(false);
  readonly drawerOpen$ = this.drawerOpenSubject.asObservable();

  readonly totalItems$ = this.cartItems$.pipe(
    map((items) =>
      items.reduce((total, item) => total + item.quantity, 0)
    )
  );

  readonly subtotal$ = this.cartItems$.pipe(
    map((items) =>
      items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0
      )
    )
  );

  constructor() {
    this.initCart();
  }

  get items(): CartItem[] {
    return this.cartSubject.value;
  }

  get totalItems(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

    return !!(
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('sweetcake_access_token')
    );
  }

  // ========================================
  // HELPER CHUẨN HÓA BIẾN THỂ
  // ========================================

  private normalizeStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return [
        ...new Set(
          value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        ),
      ];
    }

    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }

    return [];
  }

  private getFirstVariant(ids: string[]): string | null {
    return ids.length > 0 ? ids[0] : null;
  }

  // ========================================
  // ĐIỀU KHIỂN DRAWER
  // ========================================

  openDrawer(): void {
    this.drawerOpenSubject.next(true);
  }

  closeDrawer(): void {
    this.drawerOpenSubject.next(false);
  }

  // ========================================
  // KHỞI TẠO & ĐỒNG BỘ
  // ========================================

  async initCart(): Promise<void> {
    if (!this.isBrowser) return;

    if (this.isAuthenticated) {
      await this.fetchBuyerCart();
    } else {
      this.loadGuestCartFromStorage();
    }
  }

  async fetchBuyerCart(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: any[] }>(this.apiUrl)
      );

      const mapped = (res.items || []).map((serverItem) =>
        this.mapServerItemToClient(serverItem)
      );

      this.cartSubject.next(mapped);
    } catch (error) {
      console.error(
        '[CartService] Không thể tải giỏ hàng từ server:',
        error
      );
    }
  }

  async mergeGuestCartOnLogin(): Promise<string[]> {
    if (!this.isBrowser) return [];

    const guestItems = this.readGuestCartRaw();

    if (guestItems.length === 0) {
      await this.fetchBuyerCart();
      return [];
    }

    try {
      const payloadItems = guestItems.flatMap((item) =>
        this.mapClientItemToServerPayloads(item)
      );

      const res = await firstValueFrom(
        this.http.post<{ items: any[]; warnings?: string[] }>(
          `${this.apiUrl}/merge`,
          { items: payloadItems }
        )
      );

      localStorage.removeItem(CART_STORAGE_KEY);

      const mapped = (res.items || []).map((serverItem) =>
        this.mapServerItemToClient(serverItem)
      );

      this.cartSubject.next(mapped);

      return res.warnings || [];
    } catch (error) {
      console.error(
        '[CartService] Lỗi đồng bộ giỏ hàng khi đăng nhập:',
        error
      );

      await this.fetchBuyerCart();

      return ['Chưa thể đồng bộ giỏ hàng tạm do lỗi kết nối.'];
    }
  }

  clearOnLogout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }

    this.cartSubject.next([]);
  }

  // ========================================
  // THÊM SẢN PHẨM
  // Mỗi lần gọi chỉ thêm một dòng sản phẩm.
  // ========================================

  async addItem(input: AddCartItemInput): Promise<boolean> {
    if (
      !input.productId ||
      !input.productName ||
      !Number.isFinite(input.unitPrice) ||
      input.unitPrice < 0
    ) {
      return false;
    }

    const qtyToAdd = Math.max(
      1,
      Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(input.quantity || 1))
    );

    const selectedVariantIds = this.normalizeStringArray(
      input.variantIds?.length
        ? input.variantIds
        : input.variantId ?? input.variant
    );

    const selectedVariantLabels = this.normalizeStringArray(
      input.variantLabels?.length
        ? input.variantLabels
        : input.variantLabel
    );

    const normalizedAccessories = this.normalizeAccessories(
      input.accessories || [],
      input.customization
    );

    // Một dòng sản phẩm chỉ sử dụng một biến thể.
    const resolvedVariantId = this.getFirstVariant(selectedVariantIds);
    const resolvedVariantLabel = this.getFirstVariant(
      selectedVariantLabels
    );

    const normalizedInput: AddCartItemInput = {
      ...input,
      variantId: resolvedVariantId,
      variantLabel: resolvedVariantLabel,
      variant: resolvedVariantId,
      variantIds: selectedVariantIds,
      variantLabels: selectedVariantLabels,
      accessories: normalizedAccessories,
    };

    // ========================================
    // BUYER: LƯU TRÊN SERVER
    // ========================================

    if (this.isAuthenticated) {
      try {
        const serverPayload = {
          productId: normalizedInput.productId,
          kind: normalizedInput.productKind,
          config: normalizedInput.customization
            ? {
                size: normalizedInput.customization.size,
                filling: normalizedInput.customization.filling,
                base: normalizedInput.customization.base,
                frostingColor:
                  normalizedInput.customization.frostingColor,
                sweetness: normalizedInput.customization.sweetness,
                message: normalizedInput.customization.message,
              }
            : {},
          variant: resolvedVariantId,
          surcharges: 0,
          qty: qtyToAdd,
        };

        const res = await firstValueFrom(
          this.http.post<{ items: any[] }>(
            `${this.apiUrl}/items`,
            serverPayload
          )
        );

        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );

        this.cartSubject.next(mapped);

        return true;
      } catch (error) {
        console.error(
          '[CartService] Lỗi thêm vào giỏ Buyer:',
          error
        );

        return false;
      }
    }

    // ========================================
    // GUEST: LƯU TRÊN LOCAL STORAGE
    // ========================================

    const configurationKey = this.createConfigurationKey(
      normalizedInput
    );

    const currentItems = [...this.cartSubject.value];

    const existingIndex = currentItems.findIndex(
      (item) =>
        item.productId === normalizedInput.productId &&
        item.configurationKey === configurationKey
    );

    if (existingIndex >= 0) {
      const existingItem = currentItems[existingIndex];

      if (existingItem.quantity + qtyToAdd > MAX_QUANTITY_PER_ITEM) {
        return false;
      }

      currentItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + qtyToAdd,
      };
    } else {
      const newItem = {
        id: this.createItemId(normalizedInput.productId),
        productId: normalizedInput.productId,
        productName: normalizedInput.productName,
        productKind: normalizedInput.productKind,
        imageUrl: normalizedInput.imageUrl,
        unitPrice: Math.round(normalizedInput.unitPrice),
        quantity: qtyToAdd,

        customization: normalizedInput.customization
          ? {
              ...normalizedInput.customization,
              accessories: [
                ...(normalizedInput.customization.accessories ?? []),
              ],
              accessoryVariants: Object.fromEntries(
                Object.entries(
                  normalizedInput.customization.accessoryVariants ?? {}
                ).map(([id, ids]) => [
                  id,
                  this.normalizeStringArray(ids),
                ])
              ),
            }
          : null,

        variantId: resolvedVariantId,
        variantLabel: resolvedVariantLabel,
        variantIds: selectedVariantIds,
        variantLabels: selectedVariantLabels,

        accessories: normalizedAccessories,
        configurationKey,
      } as ExtendedCartItem;

      currentItems.push(newItem);
    }

    this.updateGuestCart(currentItems);

    return true;
  }

  // ========================================
  // CẬP NHẬT SỐ LƯỢNG
  // ========================================

  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (!Number.isFinite(quantity)) return;

    const nextQuantity = Math.max(
      1,
      Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(quantity))
    );

    if (this.isAuthenticated) {
      try {
        const res = await firstValueFrom(
          this.http.patch<{ items: any[] }>(
            `${this.apiUrl}/items/${itemId}`,
            { qty: nextQuantity }
          )
        );

        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );

        this.cartSubject.next(mapped);
      } catch (error) {
        console.error(
          '[CartService] Lỗi cập nhật số lượng Buyer:',
          error
        );
      }

      return;
    }

    const updatedItems = this.items.map((item) =>
      item.id === itemId
        ? { ...item, quantity: nextQuantity }
        : item
    );

    this.updateGuestCart(updatedItems);
  }

  // ========================================
  // XÓA SẢN PHẨM
  // ========================================

  async removeItem(itemId: string): Promise<void> {
    if (this.isAuthenticated) {
      try {
        const res = await firstValueFrom(
          this.http.delete<{ items: any[] }>(
            `${this.apiUrl}/items/${itemId}`
          )
        );

        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );

        this.cartSubject.next(mapped);
      } catch (error) {
        console.error(
          '[CartService] Lỗi xóa sản phẩm Buyer:',
          error
        );
      }

      return;
    }

    this.updateGuestCart(
      this.items.filter((item) => item.id !== itemId)
    );
  }

  async removeOrderedItems(orderedItemIds: string[]): Promise<void> {
    if (!orderedItemIds.length) return;

    if (this.isAuthenticated) {
      try {
        const res = await firstValueFrom(
          this.http.post<{ items: any[] }>(
            `${this.apiUrl}/items/bulk-remove`,
            { itemIds: orderedItemIds }
          )
        );

        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );

        this.cartSubject.next(mapped);
      } catch (error) {
        console.error(
          '[CartService] Lỗi xóa các dòng đã đặt:',
          error
        );
      }

      return;
    }

    const idSet = new Set(orderedItemIds);

    this.updateGuestCart(
      this.items.filter((item) => !idSet.has(item.id))
    );
  }

  clearCart(): void {
    this.updateGuestCart([]);
  }

  // ========================================
  // HELPER & MAPPING
  // ========================================

  private createItemId(productId: string): string {
    return `${productId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  private mapServerItemToClient(serverItem: any): CartItem {
    const cfg = serverItem.config || {};
    const isCake = serverItem.kind === 'cake';

    const customization: CakeCustomization | null = isCake
      ? ({
          size: cfg.size || '',
          base: cfg.base || '',
          filling: cfg.filling || '',
          frostingColor: cfg.frostingColor || '',
          sweetness: cfg.sweetness || '',
          message: cfg.message || '',
          accessories: [],
          accessoryVariants: {},
        } as unknown as CakeCustomization)
      : null;

    return {
      id: String(serverItem._id),
      productId: String(serverItem.productId),
      productName: serverItem.name,
      productKind: serverItem.kind,
      imageUrl: serverItem.imageId
        ? `${environment.apiUrl}/images/${serverItem.imageId}`
        : null,
      unitPrice: Number(serverItem.unitPrice || 0),
      quantity: Number(serverItem.qty || 1),
      customization,
      variantId: serverItem.variant ?? null,
      variantLabel: serverItem.variantLabel ?? null,
      accessories: [],
      configurationKey: this.createConfigurationKey({
        productId: String(serverItem.productId),
        productName: serverItem.name,
        productKind: serverItem.kind,
        imageUrl: null,
        unitPrice: Number(serverItem.unitPrice || 0),
        customization,
        accessories: [],
        variantId: serverItem.variant ?? null,
      }),
    };
  }

  private mapClientItemToServerPayloads(item: CartItem): any[] {
    const extendedItem = item as ExtendedCartItem;

    const variantIds = this.normalizeStringArray(
      extendedItem.variantIds?.length
        ? extendedItem.variantIds
        : item.variantId ?? (item as any).variant
    );

    // Tương thích dữ liệu giỏ hàng cũ có nhiều biến thể trong một dòng.
    // Mỗi biến thể được chuyển thành một payload riêng.
    if (item.productKind === 'accessory' && variantIds.length > 1) {
      const extendedLabels = this.normalizeStringArray(
        extendedItem.variantLabels
      );

      return variantIds.map((variantId, index) => ({
        ...this.mapClientItemToServerPayload(item, variantId),
        qty: 1,
        variantLabel: extendedLabels[index] ?? null,
      }));
    }

    return [
      this.mapClientItemToServerPayload(
        item,
        variantIds[0] ?? null
      ),
    ];
  }

  private mapClientItemToServerPayload(
    item: CartItem,
    variant?: string | null
  ): any {
    const cfg = item.customization;

    return {
      productId: item.productId,
      kind: item.productKind,
      config: cfg
        ? {
            size: cfg.size,
            filling: cfg.filling,
            base: cfg.base,
            frostingColor: cfg.frostingColor,
            sweetness: cfg.sweetness,
            message: cfg.message,
          }
        : {},
      variant:
        variant !== undefined
          ? variant
          : item.variantId ?? (item as any).variant ?? null,
      surcharges: 0,
      qty: item.quantity,
    };
  }

  private normalizeAccessories(
    accessories: CartItem['accessories'],
    customization: CakeCustomization | null
  ): CartItem['accessories'] {
    return (accessories ?? []).map((accessory) => {
      const extendedAccessory =
        accessory as ExtendedCartAccessory;

      const customizationVariants =
        customization?.accessoryVariants?.[accessory.id];

      const variantIds = this.normalizeStringArray(
        extendedAccessory.variantIds?.length
          ? extendedAccessory.variantIds
          : extendedAccessory.variantId?.length
            ? extendedAccessory.variantId
            : customizationVariants
      );

      const variantLabels = this.normalizeStringArray(
        extendedAccessory.variantLabels?.length
          ? extendedAccessory.variantLabels
          : extendedAccessory.variantLabel
      );

      return {
        ...accessory,
        variantId: this.getFirstVariant(variantIds),
        variantLabel: this.getFirstVariant(variantLabels),
        variantIds,
        variantLabels,
      } as ExtendedCartAccessory;
    });
  }

  /**
   * Tạo khóa định danh cho một dòng sản phẩm.
   *
   * Không đưa danh sách phụ kiện của bánh vào khóa.
   * Phụ kiện đã được quản lý thành các dòng sản phẩm độc lập.
   */
  private createConfigurationKey(
    input: AddCartItemInput
  ): string {
    const customization = input.customization;

    const configuration: Record<string, unknown> = {
      kind: input.productKind,
    };

    if (input.productKind === 'cake' && customization) {
      configuration['size'] = customization.size;
      configuration['base'] = customization.base;
      configuration['filling'] = customization.filling;
      configuration['frostingColor'] = customization.frostingColor;
      configuration['sweetness'] = customization.sweetness;
      configuration['message'] = (customization.message ?? '').trim();
    }

    const variantIds = this.normalizeStringArray(
      input.variantIds?.length
        ? input.variantIds
        : input.variantId ?? input.variant
    ).sort();

    if (variantIds.length > 0) {
      configuration['variantIds'] = variantIds;
    }

    return JSON.stringify(configuration);
  }

  // ========================================
  // LOCAL STORAGE
  // ========================================

  private updateGuestCart(items: CartItem[]): void {
    this.cartSubject.next(items);
    this.saveGuestCartToStorage(items);
  }

  private readGuestCartRaw(): CartItem[] {
    if (!this.isBrowser) return [];

    try {
      const storedValue = localStorage.getItem(CART_STORAGE_KEY);

      if (!storedValue) return [];

      const parsed: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsed)) return [];

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

      return validItems.map((item) => {
        const extendedItem = item as ExtendedCartItem;

        const variantIds = this.normalizeStringArray(
          extendedItem.variantIds?.length
            ? extendedItem.variantIds
            : item.variantId ?? (item as any).variant
        );

        const variantLabels = this.normalizeStringArray(
          extendedItem.variantLabels?.length
            ? extendedItem.variantLabels
            : item.variantLabel
        );

        const normalizedAccessories = this.normalizeAccessories(
          Array.isArray(item.accessories) ? item.accessories : [],
          item.customization ?? null
        );

        const normalizedItem = {
          ...item,
          variantId: this.getFirstVariant(variantIds),
          variantLabel: this.getFirstVariant(variantLabels),
          variantIds,
          variantLabels,

          customization: item.customization
            ? {
                ...item.customization,
                accessories: [
                  ...(item.customization.accessories ?? []),
                ],
                accessoryVariants: Object.fromEntries(
                  Object.entries(
                    item.customization.accessoryVariants ?? {}
                  ).map(([id, variants]) => [
                    id,
                    this.normalizeStringArray(variants),
                  ])
                ),
              }
            : null,

          accessories: normalizedAccessories,
        } as ExtendedCartItem;

        // Luôn tạo lại khóa theo cấu trúc mới.
        // Không dùng phụ kiện tùy chỉnh để phân biệt dòng bánh.
        const configurationKey = this.createConfigurationKey({
          productId: item.productId,
          productName: item.productName,
          productKind: item.productKind,
          imageUrl: item.imageUrl ?? null,
          unitPrice: item.unitPrice,
          customization: item.customization ?? null,
          accessories: normalizedAccessories,
          variantIds,
          variantLabels,
          variantId: this.getFirstVariant(variantIds),
          variantLabel: this.getFirstVariant(variantLabels),
        });

        return {
          ...normalizedItem,
          configurationKey,
        } as CartItem;
      });
    } catch (error) {
      console.error(
        '[CartService] Không thể đọc giỏ hàng:',
        error
      );

      return [];
    }
  }

  private loadGuestCartFromStorage(): void {
    const normalizedItems = this.readGuestCartRaw();

    this.cartSubject.next(normalizedItems);

    if (normalizedItems.length > 0) {
      this.saveGuestCartToStorage(normalizedItems);
    }
  }

  private saveGuestCartToStorage(items: CartItem[]): void {
    if (!this.isBrowser) return;

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(items)
      );
    } catch (error) {
      console.error(
        '[CartService] Không thể lưu giỏ hàng:',
        error
      );
    }
  }
}
