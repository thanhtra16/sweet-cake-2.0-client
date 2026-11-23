
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  private readonly cartService = inject(CartService);

  readonly cartCount$ = this.cartService.totalItems$;
  readonly cartItems$ = this.cartService.cartItems$;

  @Input() userName: string | null = null;
  @Output() logout = new EventEmitter<void>();

  isCartDrawerOpen = false;

  openCartDrawer(): void {
    this.isCartDrawerOpen = true;
  }

  closeCartDrawer(): void {
    this.isCartDrawerOpen = false;
  }

  toggleCartDrawer(): void {
    this.isCartDrawerOpen = !this.isCartDrawerOpen;
  }

  increaseQuantity(itemId: string, currentQuantity: number): void {
    if (currentQuantity >= 10) {
      return;
    }

    this.cartService.updateQuantity(itemId, currentQuantity + 1);
  }

  decreaseQuantity(itemId: string, currentQuantity: number): void {
    if (currentQuantity <= 1) {
      return;
    }

    this.cartService.updateQuantity(itemId, currentQuantity - 1);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  getSubtotal(
    items: { unitPrice: number; quantity: number }[]
  ): number {
    return items.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0
    );
  }
}
