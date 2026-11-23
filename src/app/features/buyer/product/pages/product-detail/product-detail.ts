
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import {
  ApiService,
  Product,
  ProductCustomization,
  QuoteRequest,
  QuoteRequestItem,
} from '../../../../../core/services/api.service';

import {
  CakeCustomizer,
  CakeCustomization,
  AccessoryOption,
} from '../../components/cake-customizer/cake-customizer';

import { CartService } from '../../../../../shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, CakeCustomizer],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  productId = '';

  product: Product | null = null;
  customizationConfig: ProductCustomization | null = null;
  customization: CakeCustomization | null = null;

  accessoryOptions: AccessoryOption[] = [];

  selectedVariantId = '';

  loading = true;
  buyNowLoading = false;
  errorMessage = '';

  toastMessage = '';
  showToast = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apiService: ApiService,
    private readonly destroyRef: DestroyRef,
    private readonly cdr: ChangeDetectorRef,
    private readonly cartService: CartService
  ) {}

  // ========================================
  // INITIALIZATION & API
  // ========================================

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap((params) => {
          this.loading = true;
          this.errorMessage = '';

          this.product = null;
          this.customizationConfig = null;
          this.customization = null;
          this.accessoryOptions = [];
          this.selectedVariantId = '';
        }),

        switchMap((params) => {
          this.productId = params.get('id') ?? '';

          if (!this.productId) {
            this.errorMessage = 'Không tìm thấy mã sản phẩm.';
            this.loading = false;
            this.cdr.markForCheck();

            return of(null);
          }

          return forkJoin({
            product: this.apiService.getProductById(this.productId),
            customization: this.apiService.getProductCustomization(),
            accessories: this.apiService.getAccessories().pipe(
              catchError((error) => {
                console.error(
                  '[ProductDetail] Cannot load accessories:',
                  error
                );

                return of([] as Product[]);
              })
            ),
          }).pipe(
            tap((result) => {
              console.log('[ProductDetail] API result:', result);
            }),

            catchError((error) => {
              console.error('[ProductDetail] API error:', error);

              if (error.status === 404) {
                this.errorMessage =
                  'Sản phẩm không tồn tại hoặc hiện không được hiển thị.';
              } else if (error.status === 0) {
                this.errorMessage =
                  'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend.';
              } else {
                this.errorMessage =
                  error.error?.message ||
                  `Đã xảy ra lỗi khi tải dữ liệu. HTTP status: ${error.status}`;
              }

              this.loading = false;
              this.cdr.markForCheck();

              return of(null);
            })
          );
        }),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.product = result.product;
        this.customizationConfig = result.customization;

        this.accessoryOptions = result.accessories.map((accessory) => {
          const basePrice = Number(accessory.basePrice);
          const salePrice = Number(accessory.salePrice);

          const hasValidPromotion =
            accessory.salePrice !== null &&
            accessory.salePrice !== undefined &&
            Number.isFinite(salePrice) &&
            Number.isFinite(basePrice) &&
            salePrice >= 0 &&
            salePrice < basePrice;

          return {
            id: accessory._id,
            name: accessory.name,
            price: Math.round(
              hasValidPromotion ? salePrice : basePrice
            ),
            variants: (accessory.variants ?? [])
              .filter(
                (variant) =>
                  variant.active !== false &&
                  !!variant._id
              )
              .map((variant) => ({
                id: variant._id as string,
                label: variant.label,
              })),
          };
        });

        if (this.product.kind === 'accessory') {
          const activeVariants = this.activeProductVariants;

          this.selectedVariantId =
            activeVariants.length === 1
              ? activeVariants[0]._id!
              : '';
        }

        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  // ========================================
  // PRODUCT DISPLAY
  // ========================================

  get isPromotionValid(): boolean {
    if (!this.product || this.product.salePrice === null) {
      return false;
    }

    return (
      Number.isFinite(this.product.salePrice) &&
      this.product.salePrice >= 0 &&
      this.product.salePrice < this.product.basePrice
    );
  }

  get displayPrice(): number {
    if (!this.product) {
      return 0;
    }

    return this.isPromotionValid
      ? this.product.salePrice!
      : this.product.basePrice;
  }

  get salePercentage(): number {
    if (!this.product || !this.isPromotionValid) {
      return 0;
    }

    return Math.round(
      (1 - this.product.salePrice! / this.product.basePrice) * 100
    );
  }

  get mainImageUrl(): string | null {
    const imageId = this.product?.imageIds?.[0];

    return imageId
      ? this.apiService.getProductImageUrl(imageId)
      : null;
  }

  // ========================================
  // PRODUCT VARIANTS
  // ========================================

  get activeProductVariants(): Product['variants'] {
    return (this.product?.variants ?? []).filter(
      (variant) =>
        variant.active !== false &&
        !!variant._id
    );
  }

  get requiresProductVariant(): boolean {
    return (
      this.product?.kind === 'accessory' &&
      (this.product.variants?.length ?? 0) > 0
    );
  }

  get isProductVariantSelectionValid(): boolean {
    if (!this.product || this.product.kind !== 'accessory') {
      return true;
    }

    if (!this.requiresProductVariant) {
      return true;
    }

    return this.activeProductVariants.some(
      (variant) => variant._id === this.selectedVariantId
    );
  }

  onProductVariantChange(variantId: string): void {
    this.selectedVariantId = variantId;
    this.cdr.markForCheck();
  }

  get selectedProductVariant():
    | Product['variants'][number]
    | null {
    if (!this.selectedVariantId) {
      return null;
    }

    return (
      this.activeProductVariants.find(
        (variant) => variant._id === this.selectedVariantId
      ) ?? null
    );
  }

  private validateProductVariant(): boolean {
    if (!this.product || this.product.kind !== 'accessory') {
      return true;
    }

    if (!this.requiresProductVariant) {
      return true;
    }

    if (this.activeProductVariants.length === 0) {
      this.showNotification(
        'Sản phẩm hiện không có biến thể khả dụng.'
      );
      return false;
    }

    if (!this.isProductVariantSelectionValid) {
      this.showNotification(
        'Vui lòng chọn biến thể sản phẩm.'
      );
      return false;
    }

    return true;
  }

  // ========================================
  // CUSTOMIZATION
  // ========================================

  onCustomizationChange(value: CakeCustomization): void {
    this.customization = value;
    this.cdr.markForCheck();
  }

  // ========================================
  // ACCESSORY VALIDATION
  // ========================================

  private validateAccessoryVariants(
    customization: CakeCustomization
  ): boolean {
    for (const accessoryId of customization.accessories) {
      const accessory = this.accessoryOptions.find(
        (option) => option.id === accessoryId
      );

      if (!accessory) {
        this.showNotification(
          'Một phụ kiện đã chọn không còn khả dụng. Vui lòng kiểm tra lại.'
        );
        return false;
      }

      if (accessory.variants.length === 0) {
        continue;
      }

      const selectedVariantId =
        customization.accessoryVariants?.[accessoryId];

      const isValidVariant = accessory.variants.some(
        (variant) => variant.id === selectedVariantId
      );

      if (!isValidVariant) {
        this.showNotification(
          `Vui lòng chọn biến thể cho phụ kiện "${accessory.name}".`
        );
        return false;
      }
    }

    return true;
  }

  // ========================================
  // CART
  // ========================================

  addToCart(): void {
    if (!this.product) {
      return;
    }

    if (
      this.product.kind === 'cake' &&
      !this.customization
    ) {
      this.showNotification(
        'Vui lòng hoàn tất tùy chỉnh bánh.'
      );
      return;
    }

    if (!this.validateProductVariant()) {
      return;
    }

    const selectedCustomization = this.customization;

    if (
      this.product.kind === 'cake' &&
      selectedCustomization &&
      !this.validateAccessoryVariants(selectedCustomization)
    ) {
      return;
    }

    const selectedAccessories = selectedCustomization
      ? this.accessoryOptions
          .filter((option) =>
            selectedCustomization.accessories.includes(option.id)
          )
          .map((option) => {
            const variantId =
              selectedCustomization.accessoryVariants?.[option.id] ?? null;

            const selectedVariant = option.variants.find(
              (variant) => variant.id === variantId
            );

            return {
              id: option.id,
              name: option.name,
              price: option.price,
              variantId,
              variantLabel: selectedVariant?.label ?? null,
            };
          })
      : [];

    const unitPrice = selectedCustomization
      ? selectedCustomization.estimatedPrice
      : this.displayPrice;

    const selectedVariant = this.selectedProductVariant;

    const added = this.cartService.addItem({
      productId: this.product._id,
      productName: this.product.name,
      productKind: this.product.kind,
      imageUrl: this.mainImageUrl,
      unitPrice,

      customization: selectedCustomization
        ? {
            ...selectedCustomization,
            accessories: [...selectedCustomization.accessories],
            accessoryVariants: {
              ...selectedCustomization.accessoryVariants,
            },
          }
        : null,

      accessories: selectedAccessories,
      variantId: selectedVariant?._id ?? null,
      variantLabel: selectedVariant?.label ?? null,
    });

    if (!added) {
      this.showNotification(
        'Số lượng sản phẩm trong dòng giỏ hàng đã đạt giới hạn 10.'
      );
      return;
    }

    this.showNotification('Đã thêm sản phẩm vào giỏ hàng.');
  }

  // ========================================
  // BUY NOW - INDEPENDENT FROM CART
  // ========================================

  private buildBuyNowRequest(): QuoteRequest {
    if (!this.product) {
      throw new Error('Không tìm thấy sản phẩm.');
    }

    const items: QuoteRequestItem[] = [];

    if (this.product.kind === 'cake') {
      const config = this.customization;

      if (!config) {
        throw new Error('Vui lòng hoàn tất tùy chỉnh bánh.');
      }

      items.push({
        productId: this.product._id,
        qty: 1,
        config: {
          size: config.size,
          base: config.base,
          filling: config.filling,
          frostingColor: config.frostingColor,
          sweetness: config.sweetness,
          message: config.message,
        },
      });

      // Phụ kiện đi kèm bánh được gửi thành các dòng riêng,
      // giống hoàn toàn cách Cart đang tạo báo giá.
      for (const accessoryId of config.accessories) {
        const accessory = this.accessoryOptions.find(
          (option) => option.id === accessoryId
        );

        if (!accessory) {
          throw new Error(
            'Một phụ kiện đã chọn không còn khả dụng.'
          );
        }

        const variantId =
          config.accessoryVariants?.[accessoryId];

        items.push({
          productId: accessory.id,
          qty: 1,
          ...(variantId ? { variant: variantId } : {}),
        });
      }
    } else {
      // Phụ kiện mua riêng.
      items.push({
        productId: this.product._id,
        qty: 1,
        ...(this.selectedVariantId
          ? { variant: this.selectedVariantId }
          : {}),
      });
    }

    return {
      receiveMethod: 'pickup',
      items,
    };
  }

  buyNow(): void {
    if (!this.product || this.buyNowLoading) {
      return;
    }

    if (
      this.product.kind === 'cake' &&
      !this.customization
    ) {
      this.showNotification(
        'Vui lòng hoàn tất tùy chỉnh bánh.'
      );
      return;
    }

    if (!this.validateProductVariant()) {
      return;
    }

    if (
      this.product.kind === 'cake' &&
      this.customization &&
      !this.validateAccessoryVariants(this.customization)
    ) {
      return;
    }

    let request: QuoteRequest;

    try {
      request = this.buildBuyNowRequest();
    } catch (error) {
      this.showNotification(
        error instanceof Error
          ? error.message
          : 'Thông tin sản phẩm không hợp lệ.'
      );
      return;
    }

    this.buyNowLoading = true;
    this.cdr.markForCheck();

    this.apiService
      .quoteOrder(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (quote) => {
          this.buyNowLoading = false;

          if (
            !quote.valid ||
            !quote.items?.length ||
            !quote.items.every((item) => item.valid)
          ) {
            const invalidItem = quote.items?.find(
              (item) => !item.valid
            );

            this.showNotification(
              invalidItem?.reason ||
              'Sản phẩm không hợp lệ hoặc không thể báo giá. Vui lòng kiểm tra lại.'
            );

            this.cdr.markForCheck();
            return;
          }

          try {
            sessionStorage.setItem(
              this.BUY_NOW_STORAGE_KEY,
              JSON.stringify({
                items: request.items,
                receiveMethod: request.receiveMethod,
                quote,
              })
            );
          } catch {
            this.showNotification(
              'Không thể lưu thông tin đơn hàng tạm thời. Vui lòng thử lại.'
            );
            this.cdr.markForCheck();
            return;
          }

          this.cdr.markForCheck();

          this.router.navigate(['/checkout']);
        },

        error: (error) => {
          this.buyNowLoading = false;

          this.showNotification(
            error?.error?.message ||
            'Không thể tính báo giá. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        },
      });
  }

  // ========================================
  // NOTIFICATION
  // ========================================

  private showNotification(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 2500);
  }
}
