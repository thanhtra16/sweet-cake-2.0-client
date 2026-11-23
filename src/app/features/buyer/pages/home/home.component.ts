import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService } from '@core/services/product.service';
import { CartService } from '@shared/services/cart.service';
import {
  BuyerProduct,
  ProductCardComponent
} from '@shared/components/product-card/product-card.component';

interface Commitment {
  icon: string;
  title: string;
  description: string;
}

const SLIDE_INTERVAL_MS = 5000;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly cart = inject(CartService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly bannerImages = [
    'https://images.unsplash.com/photo-1535254973040-607b474cb50d?q=80&w=1280',
    'https://images.unsplash.com/photo-1519340333755-56e821703f26?q=80&w=1280',
    'https://images.unsplash.com/photo-1516685018646-549198525c1b?q=80&w=1280'
  ];

  readonly commitments: Commitment[] = [
    {
      icon: 'bi-flower1',
      title: 'Chứng nhận Organic',
      description: 'Chúng tôi sử dụng 100% nguyên liệu hữu cơ từ các nông trại địa phương.'
    },
    {
      icon: 'bi-hand-thumbs-up',
      title: 'Thủ công 100%',
      description: 'Mỗi chiếc bánh là một tác phẩm được nhào nặn tỉ mỉ bởi nghệ nhân.'
    },
    {
      icon: 'bi-shield-check',
      title: 'Chuẩn ATVSTP',
      description: 'Quy trình sản xuất khép kín, đạt tiêu chuẩn vệ sinh an toàn quốc tế.'
    }
  ];

  readonly activeSlide = signal(0);
  readonly featuredProducts = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  private slideTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.startAutoplay();

    this.productService.getFeaturedProducts().subscribe({
      next: (products) => {
        this.featuredProducts.set(products);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi tải sản phẩm nổi bật:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  nextSlide(): void {
    this.goTo(this.activeSlide() + 1);
    this.startAutoplay();
  }

  prevSlide(): void {
    this.goTo(this.activeSlide() - 1);
    this.startAutoplay();
  }

  selectSlide(index: number): void {
    this.goTo(index);
    this.startAutoplay();
  }

  async onAddToCart(product: BuyerProduct): Promise<void> {
    const productId = String(product._id ?? product.id ?? '');
    await this.cart.addItem({
      productId,
      productName: product.name,
      productKind: product.kind ?? 'cake',
      imageUrl: product.image ?? product.thumbnail ?? null,
      unitPrice: Number(product.price ?? 0),
      customization: null,
      accessories: [],
    });
  }

  private goTo(index: number): void {
    const total = this.bannerImages.length;
    this.activeSlide.set((index + total) % total);
  }

  /** Tự chuyển slide; chỉ chạy ở trình duyệt (tránh timer treo khi SSR). */
  private startAutoplay(): void {
    if (!this.isBrowser) {
      return;
    }
    this.stopAutoplay();
    this.slideTimer = setInterval(() => this.goTo(this.activeSlide() + 1), SLIDE_INTERVAL_MS);
  }

  private stopAutoplay(): void {
    clearInterval(this.slideTimer);
  }
}