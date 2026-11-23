import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CartService } from '@shared/services/cart.service';
import { CartItem } from '@shared/models/cart.model';
import { VndPipe } from '@shared/pipes/vnd.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, VndPipe],
  templateUrl: './cart-drawer.html',
  styleUrl: './cart-drawer.scss',
})
export class CartDrawerComponent {
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly isOpen$ = this.cartService.drawerOpen$;
  readonly cartItems$ = this.cartService.cartItems$;
  readonly subtotal$ = this.cartService.subtotal$;
  readonly totalItems$ = this.cartService.totalItems$;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
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