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
import { environment } from '../../../../environments/environment';

export interface BuyerProduct extends Omit<Partial<Product>, 'thumbnail'> {
  _id?: string;
  id?: string;
  name: string;
  kind?: 'cake' | 'accessory';
  price: number;
  image?: unknown;
  thumbnail?: unknown;
  imageIds?: unknown[];
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
  private readonly fallbackImage = 'https://placehold.co/400x400?text=Sweet+Cake';

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
    const candidates = [this.product?.image, this.product?.thumbnail, this.product?.imageIds?.[0]];

    for (const candidate of candidates) {
      const resolved = this.normalizeImage(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return this.fallbackImage;
  }

  private normalizeImage(raw: unknown): string {
    if (!raw) return '';

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed || trimmed === '[object Object]') return '';
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
        return trimmed;
      }
      return `${environment.apiUrl}/images/${trimmed}`;
    }

    if (typeof raw === 'object') {
      const obj = raw as { url?: string; _id?: unknown; id?: unknown };
      if (obj.url && typeof obj.url === 'string') {
        return obj.url;
      }
      const id = String(obj._id ?? obj.id ?? '').trim();
      if (id && id !== '[object Object]') {
        return `${environment.apiUrl}/images/${id}`;
      }
    }

    return '';
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
