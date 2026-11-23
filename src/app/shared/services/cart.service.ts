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

  // State điều khiển ngăn kéo giỏ hàng (CartDrawerComponent)
  private readonly drawerOpenSubject = new BehaviorSubject<boolean>(false);
  readonly drawerOpen$ = this.drawerOpenSubject.asObservable();

  readonly totalItems$ = this.cartItems$.pipe(
    map((items) => items.reduce((total, item) => total + item.quantity, 0))
  );

  readonly subtotal$ = this.cartItems$.pipe(
    map((items) =>
      items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
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

  // ==================== ĐIỀU KHIỂN DRAWER ====================

  openDrawer(): void {
    this.drawerOpenSubject.next(true);
  }

  closeDrawer(): void {
    this.drawerOpenSubject.next(false);
  }

  // ==================== KHỞI TẠO & ĐỒNG BỘ ====================

  async initCart(): Promise<void> {
    if (!this.isBrowser) return;

    if (this.isAuthenticated) {
      await this.fetchBuyerCart();
    } else {
      this.loadGuestCartFromStorage();
    }
  }

  /**
   * Tải giỏ hàng Buyer từ MongoDB (GET /api/cart)
   */
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
      console.error('[CartService] Không thể tải giỏ hàng từ server:', error);
    }
  }

  /**
   * Gọi ngay sau khi Đăng nhập thành công (UC-KH-02):
   * Gộp giỏ hàng Guest từ localStorage lên collection carts trên MongoDB
   */
  async mergeGuestCartOnLogin(): Promise<string[]> {
    if (!this.isBrowser) return [];

    const guestItems = this.readGuestCartRaw();
    if (guestItems.length === 0) {
      await this.fetchBuyerCart();
      return [];
    }

    try {
      const payloadItems = guestItems.map((item) =>
        this.mapClientItemToServerPayload(item)
      );

      const res = await firstValueFrom(
        this.http.post<{ items: any[]; warnings?: string[] }>(
          `${this.apiUrl}/merge`,
          { items: payloadItems }
        )
      );

      // Chỉ xóa localStorage khi server đã xác nhận gộp thành công (200 OK)
      localStorage.removeItem(CART_STORAGE_KEY);

      const mapped = (res.items || []).map((serverItem) =>
        this.mapServerItemToClient(serverItem)
      );
      this.cartSubject.next(mapped);
      return res.warnings || [];
    } catch (error) {
      console.error('[CartService] Lỗi đồng bộ giỏ hàng khi đăng nhập:', error);
      await this.fetchBuyerCart();
      return ['Chưa thể đồng bộ giỏ hàng tạm do lỗi kết nối.'];
    }
  }

  /**
   * Gọi ngay khi Đăng xuất (UC-KH-03 & Mục 3.2.2.8):
   * Xóa giỏ hiển thị trên client, trả về trạng thái Guest với giỏ trống.
   * Giỏ hàng của Buyer vẫn được bảo toàn trên server.
   */
  clearOnLogout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    this.cartSubject.next([]);
  }

  // ==================== CÁC THAO TÁC CRUD GIỎ HÀNG ====================

  /**
   * Thêm sản phẩm vào giỏ (BR10, BR11, UC-KH-15).
   * Tự động phân nhánh Buyer (API MongoDB) hoặc Guest (localStorage).
   */
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

    const normalizedAccessories = this.normalizeAccessories(
      input.accessories || [],
      input.customization
    );

    const resolvedVariantId = input.variantId ?? input.variant ?? null;
    const resolvedVariantLabel = input.variantLabel ?? null;

    const normalizedInput: AddCartItemInput = {
      ...input,
      variantId: resolvedVariantId,
      variantLabel: resolvedVariantLabel,
      variant: resolvedVariantId,
      accessories: normalizedAccessories,
    };

    // 1. LUỒNG BUYER: Lưu vào collection carts qua REST API
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
                frostingColor: normalizedInput.customization.frostingColor,
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
        console.error('[CartService] Lỗi thêm vào giỏ Buyer:', error);
        return false;
      }
    }

    // 2. LUỒNG GUEST: Lưu vào localStorage
    const configurationKey = this.createConfigurationKey(
      normalizedInput,
      normalizedAccessories
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
      const newItem: CartItem = {
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
              accessories: [...(normalizedInput.customization.accessories ?? [])],
              accessoryVariants: {
                ...(normalizedInput.customization.accessoryVariants ?? {}),
              },
            }
          : null,
        variantId: resolvedVariantId,
        variantLabel: resolvedVariantLabel,
        accessories: normalizedAccessories,
        configurationKey,
      };

      currentItems.push(newItem);
    }

    this.updateGuestCart(currentItems);
    return true;
  }

  /**
   * Cập nhật số lượng một dòng sản phẩm (1..10) - UC-KH-17
   */
  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    if (!Number.isFinite(quantity)) return;

    const nextQuantity = Math.max(
      1,
      Math.min(MAX_QUANTITY_PER_ITEM, Math.floor(quantity))
    );

    if (this.isAuthenticated) {
      try {
        const res = await firstValueFrom(
          this.http.patch<{ items: any[] }>(`${this.apiUrl}/items/${itemId}`, {
            qty: nextQuantity,
          })
        );
        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );
        this.cartSubject.next(mapped);
      } catch (error) {
        console.error('[CartService] Lỗi cập nhật số lượng Buyer:', error);
      }
      return;
    }

    const updatedItems = this.items.map((item) =>
      item.id === itemId ? { ...item, quantity: nextQuantity } : item
    );
    this.updateGuestCart(updatedItems);
  }

  /**
   * Xóa một dòng khỏi giỏ hàng - UC-KH-18
   */
  async removeItem(itemId: string): Promise<void> {
    if (this.isAuthenticated) {
      try {
        const res = await firstValueFrom(
          this.http.delete<{ items: any[] }>(`${this.apiUrl}/items/${itemId}`)
        );
        const mapped = (res.items || []).map((serverItem) =>
          this.mapServerItemToClient(serverItem)
        );
        this.cartSubject.next(mapped);
      } catch (error) {
        console.error('[CartService] Lỗi xóa sản phẩm Buyer:', error);
      }
      return;
    }

    this.updateGuestCart(this.items.filter((item) => item.id !== itemId));
  }

  /**
   * Xóa các dòng sản phẩm đã đặt hàng sau khi POST /api/orders thành công
   */
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
        console.error('[CartService] Lỗi xóa các dòng đã đặt:', error);
      }
      return;
    }

    const idSet = new Set(orderedItemIds);
    this.updateGuestCart(this.items.filter((item) => !idSet.has(item.id)));
  }

  clearCart(): void {
    this.updateGuestCart([]);
  }

  // ==================== HELPER & MAPPING METHODS ====================

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
      configurationKey: JSON.stringify({
        kind: serverItem.kind,
        config: cfg,
        variant: serverItem.variant ?? null,
      }),
    };
  }

  private mapClientItemToServerPayload(item: CartItem): any {
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
      variant: item.variantId ?? (item as any).variant ?? null,
      surcharges: 0,
      qty: item.quantity,
    };
  }

  private normalizeAccessories(
    accessories: CartItem['accessories'],
    customization: CakeCustomization | null
  ): CartItem['accessories'] {
    return (accessories ?? []).map((accessory) => {
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

  private createConfigurationKey(
    input: AddCartItemInput,
    accessories: CartItem['accessories']
  ): string {
    const customization = input.customization;

    const sortedAccessories = accessories
      .map((accessory) => ({
        id: accessory.id,
        variantId: accessory.variantId ?? null,
      }))
      .sort((a, b) => {
        const idCompare = a.id.localeCompare(b.id);
        if (idCompare !== 0) {
          return idCompare;
        }
        return (a.variantId ?? '').localeCompare(b.variantId ?? '');
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

    const resolvedVariant = input.variantId ?? input.variant ?? null;
    if (resolvedVariant) {
      configuration['variantId'] = resolvedVariant;
    }

    return JSON.stringify(configuration);
  }

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
        const normalizedAccessories = Array.isArray(item.accessories)
          ? item.accessories.map((accessory) => ({
              ...accessory,
              variantId: accessory.variantId ?? null,
              variantLabel: accessory.variantLabel ?? null,
            }))
          : [];

        return {
          ...item,
          variantId: item.variantId ?? null,
          variantLabel: item.variantLabel ?? null,
          customization: item.customization
            ? {
                ...item.customization,
                accessories: [...(item.customization.accessories ?? [])],
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
      });
    } catch (error) {
      console.error('[CartService] Không thể đọc giỏ hàng:', error);
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
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('[CartService] Không thể lưu giỏ hàng:', error);
    }
  }
}