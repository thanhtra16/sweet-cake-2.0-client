import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import {
  ApiService,
  Product,
  ProductCustomization,
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
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  productId = '';

  product: Product | null = null;
  customizationConfig: ProductCustomization | null = null;
  customization: CakeCustomization | null = null;

  accessoryOptions: AccessoryOption[] = [];

  loading = true;
  errorMessage = '';

  toastMessage = '';
  showToast = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly apiService: ApiService,
    private readonly destroyRef: DestroyRef,
    private readonly cdr: ChangeDetectorRef,
    private readonly cartService: CartService
  ) {}

  // ========================================
  // INITIALIZATION & API
  // ========================================

  ngOnInit(): void {
    console.log('[ProductDetail] ngOnInit');

    this.route.paramMap
      .pipe(
        tap((params) => {
          console.log(
            '[ProductDetail] Route params:',
            params.get('id')
          );

          this.loading = true;
          this.errorMessage = '';

          this.product = null;
          this.customizationConfig = null;
          this.customization = null;
          this.accessoryOptions = [];
        }),

        switchMap((params) => {
          this.productId = params.get('id') ?? '';

          if (!this.productId) {
            this.errorMessage = 'Không tìm thấy mã sản phẩm.';
            this.loading = false;
            this.cdr.markForCheck();

            return of(null);
          }

          console.log('[ProductDetail] Calling APIs...');

          return forkJoin({
            product: this.apiService.getProductById(this.productId),

            customization: this.apiService.getProductCustomization(),

            // Nếu API phụ kiện lỗi, trang chi tiết vẫn tải bình thường.
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
        console.log('[ProductDetail] Subscribe result:', result);

        if (!result) {
          return;
        }

        // Lưu thông tin sản phẩm và cấu hình tùy chỉnh.
        this.product = result.product;
        this.customizationConfig = result.customization;

        // Chuyển dữ liệu phụ kiện từ Backend sang CakeCustomizer.
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

            // Chỉ lấy các biến thể đang hoạt động.
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

        this.loading = false;

        console.log('[ProductDetail] Product:', this.product);

        console.log(
          '[ProductDetail] Customization:',
          this.customizationConfig
        );

        console.log(
          '[ProductDetail] Accessory options:',
          this.accessoryOptions
        );

        console.log('[ProductDetail] Loading:', this.loading);

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
  // CUSTOMIZATION
  // ========================================

  onCustomizationChange(value: CakeCustomization): void {
    this.customization = value;
    this.cdr.markForCheck();
  }

  // ========================================
  // ACCESSORY VALIDATION
  // ========================================

  /**
   * Kiểm tra các phụ kiện đã chọn có đầy đủ biến thể hay chưa.
   * Phụ kiện không có variants không cần chọn biến thể.
   */
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

      // Phụ kiện không có biến thể thì không cần kiểm tra.
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
  // ACTIONS
  // ========================================

  addToCart(): void {
    if (!this.product) {
      return;
    }

    // Bánh bắt buộc phải có cấu hình.
    if (
      this.product.kind === 'cake' &&
      !this.customization
    ) {
      this.showNotification(
        'Vui lòng hoàn tất tùy chỉnh bánh.'
      );
      return;
    }

    const selectedCustomization = this.customization;

    // Kiểm tra biến thể của các phụ kiện đi kèm bánh.
    if (
      this.product.kind === 'cake' &&
      selectedCustomization &&
      !this.validateAccessoryVariants(selectedCustomization)
    ) {
      return;
    }

    // Lấy thông tin các phụ kiện đã chọn.
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

    // Giá bánh bao gồm phụ phí kích thước và phụ kiện.
    const unitPrice = selectedCustomization
      ? selectedCustomization.estimatedPrice
      : this.displayPrice;

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
    });

    if (!added) {
      this.showNotification(
        'Số lượng sản phẩm trong dòng giỏ hàng đã đạt giới hạn 10.'
      );
      return;
    }

    this.showNotification('Đã thêm sản phẩm vào giỏ hàng.');
  }

  buyNow(): void {
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

    if (
      this.product.kind === 'cake' &&
      this.customization &&
      !this.validateAccessoryVariants(this.customization)
    ) {
      return;
    }

    // Sẽ kết nối luồng mua hàng ở giai đoạn tiếp theo.
    this.showNotification(
      'Đã ghi nhận sản phẩm bạn muốn mua.'
    );
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
