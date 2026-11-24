import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { VndPipe } from '../../pipes/vnd.pipe';
import { Product } from '../../models/product.model';

export interface BuyerProduct extends Partial<Product> {
  _id?: string;
  id?: string;
  name: string;
  kind?: 'cake' | 'accessory';
  price: number;
  image?: string;
  thumbnail?: string;
  description?: string;
  bestSeller?: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, VndPipe],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  private readonly router = inject(Router);

  @Input({ required: true }) product!: BuyerProduct;
  @Input() showAddToCart = true;
  @Input() showAction = true;
  @Input() showMeta = false;

  @Output() viewDetail = new EventEmitter<BuyerProduct>();
  @Output() addToCart = new EventEmitter<BuyerProduct>();

  get productId(): string {
    return String(this.product?._id ?? this.product?.id ?? '').trim();
  }

  get currentUrl(): string {
    return this.router.url || '/products';
  }

  get productImage(): string {
    return (
      this.product.image ||
      this.product.thumbnail ||
      'https://placehold.co/400x400?text=Sweet+Cake'
    );
  }

  onViewDetail(): void {
    this.viewDetail.emit(this.product);
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product);

    if (this.addToCart.observed || !this.productId) {
      return;
    }

    this.router.navigate(['/product', this.productId], {
      state: { returnUrl: this.currentUrl },
    });
  }
}