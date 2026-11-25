
import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import {
  catchError,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
} from 'rxjs/operators';

import { ProductService } from '@core/services/product.service';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { CartItem } from '@shared/models/cart.model';
import { VndPipe } from '@shared/pipes/vnd.pipe';

export interface DrawerSuggestion {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  category: string;
}

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, VndPipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
})
export class CartDrawerComponent {
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly isOpen$ = this.cartService.drawerOpen$;
  readonly cartItems$ = this.cartService.cartItems$;
  readonly subtotal$ = this.cartService.subtotal$;
  readonly totalItems$ = this.cartService.totalItems$;

  selectedItemIds = new Set<string>();
  private knownItemIds = new Set<string>();

  private readonly allProducts$ = this.cartService.drawerOpen$.pipe(
    filter((open) => open),
    take(1),
    switchMap(() =>
      this.productService
        .getProducts()
        .pipe(catchError(() => of([] as Product[])))
    ),
    startWith([] as Product[]),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly suggestions$ = combineLatest([
    this.allProducts$,
    this.cartItems$,
  ]).pipe(
    map(([products, items]) => {
      const inCartIds = new Set(items.map((item) => item.productId));

      const cartCategories = new Set(
        products
          .filter((product) => inCartIds.has(product.id))
          .map((product) => product.category)
          .filter(Boolean)
      );

      return products
        .filter((product) => product.id && !inCartIds.has(product.id))
        .sort((a, b) => {
          const sameA = cartCategories.has(a.category) ? 1 : 0;
          const sameB = cartCategories.has(b.category) ? 1 : 0;

          if (sameA !== sameB) return sameB - sameA;

          const bestA = a.bestSeller ? 1 : 0;
          const bestB = b.bestSeller ? 1 : 0;

          return bestB - bestA;
        })
        .slice(0, 6)
        .map(
          (product): DrawerSuggestion => ({
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.thumbnail || null,
            category: product.category,
          })
        );
    })
  );

  constructor() {
    this.cartItems$.pipe(takeUntilDestroyed()).subscribe((items) => {
      const next = new Set<string>();

      for (const item of items) {
        const isNew = !this.knownItemIds.has(item.id);

        if (isNew || this.selectedItemIds.has(item.id)) {
          next.add(item.id);
        }
      }

      this.selectedItemIds = next;
      this.knownItemIds = new Set(items.map((item) => item.id));
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  get selectedItems(): CartItem[] {
    return this.cartService.items.filter((item) =>
      this.selectedItemIds.has(item.id)
    );
  }

  // Tổng số lượng sản phẩm được chọn, giống cách tính totalItems của giỏ hàng.
  get selectedCount(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  get selectedSubtotal(): number {
    return this.selectedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  }

  isSelected(itemId: string): boolean {
    return this.selectedItemIds.has(itemId);
  }

  isAllSelected(items: CartItem[]): boolean {
    return (
      items.length > 0 &&
      items.every((item) => this.selectedItemIds.has(item.id))
    );
  }

  isIndeterminate(items: CartItem[]): boolean {
    const count = items.filter((item) =>
      this.selectedItemIds.has(item.id)
    ).length;

    return count > 0 && count < items.length;
  }

  toggleItem(itemId: string): void {
    const next = new Set(this.selectedItemIds);

    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }

    this.selectedItemIds = next;
  }

  toggleAll(items: CartItem[], checked: boolean): void {
    this.selectedItemIds = checked
      ? new Set(items.map((item) => item.id))
      : new Set<string>();
  }

  close(): void {
    this.cartService.closeDrawer();
  }

  increaseQty(item: CartItem): void {
    if (item.quantity >= 10) return;

    this.cartService.updateQuantity(item.id, item.quantity + 1);
  }

  decreaseQty(item: CartItem): void {
    if (item.quantity <= 1) {
      this.cartService.removeItem(item.id);
      return;
    }

    this.cartService.updateQuantity(item.id, item.quantity - 1);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  goToCart(): void {
    this.close();
    this.router.navigate(['/cart']);
  }

  goToCheckout(): void {
    this.close();
    this.router.navigate(['/checkout']);
  }

  goToShop(): void {
    this.close();
    this.router.navigate(['/danh-sach-san-pham']);
  }
}
