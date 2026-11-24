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
import { Router, RouterLink } from '@angular/router';

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
  private readonly router = inject(Router);
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

  /** Thông báo khi vừa thêm sản phẩm từ trang chi tiết quay về Trang chủ */
  readonly toastMessage = signal('');
  readonly showViewCartAction = signal(false);
  private toastTimer?: ReturnType<typeof setTimeout>;
  private slideTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.startAutoplay();
    this.consumeAddedToastFromHistoryState();

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
    clearTimeout(this.toastTimer);
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

  /**
   * Theo quy trình: Bấm "Thêm vào giỏ hàng" trên thẻ sản phẩm ở Trang chủ
   * sẽ mở trang chi tiết để khách tùy biến (bánh kem) hoặc chọn biến thể (phụ kiện).
   */
  onAddToCart(product: BuyerProduct): void {
    const productId = String(product._id ?? product.id ?? '');
    if (!productId) {
      return;
    }

    this.router.navigate(['/product', productId], {
      state: { returnUrl: this.router.url || '/' }
    });
  }

  openCart(): void {
    if (typeof (this.cart as any).openDrawer === 'function') {
      (this.cart as any).openDrawer();
      return;
    }
    this.router.navigate(['/cart']);
  }

  private consumeAddedToastFromHistoryState(): void {
    if (!this.isBrowser) {
      return;
    }

    const state = window.history.state as {
      cartAdded?: { quantity: number; productName: string };
    } | null;

    if (state?.cartAdded) {
      const { quantity, productName } = state.cartAdded;
      this.toastMessage.set(
        `Đã thêm vào giỏ hàng: ${quantity} × ${productName}`
      );
      this.showViewCartAction.set(true);

      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastMessage.set('');
        this.showViewCartAction.set(false);
      }, 5000);

      const { cartAdded: _removed, ...restState } = state;
      window.history.replaceState(restState, '');
    }
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
    this.slideTimer = setInterval(
      () => this.goTo(this.activeSlide() + 1),
      SLIDE_INTERVAL_MS
    );
  }

  private stopAutoplay(): void {
    clearInterval(this.slideTimer);
  }
}