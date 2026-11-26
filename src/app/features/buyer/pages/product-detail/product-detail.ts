import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
} from '@core/services/api.service';

import {
  CakeCustomizer,
  CakeCustomization,
  AccessoryOption,
} from '@features/buyer/components/cake-customizer/cake-customizer';

import { ReviewList } from '@features/buyer/components/review-list/review-list';
import {
  CartService,
  AddCartItemInput,
} from '@shared/services/cart.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, CakeCustomizer, ReviewList],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail
  implements OnInit, AfterViewInit, OnDestroy {

  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  readonly MIN_QUANTITY = 1;
  readonly MAX_QUANTITY = 10;

  productId = '';
  quantity = 1;

  product: Product | null = null;
  customizationConfig: ProductCustomization | null = null;
  customization: CakeCustomization | null = null;

  accessoryOptions: AccessoryOption[] = [];

  selectedVariantIds: string[] = [];

  isVariantDropdownOpen = false;

  loading = true;
  addToCartLoading = false;
  buyNowLoading = false;
  errorMessage = '';

  toastMessage = '';
  showToast = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ========================================
  // STICKY ORDER
  // ========================================

  private primaryActionsPassed = false;
  private footerVisible = false;

  private primaryActionsObserver?: IntersectionObserver;
  private footerObserver?: IntersectionObserver;

  @ViewChild('primaryActions')
  set primaryActionsElement(
    element: ElementRef<HTMLElement> | undefined
  ) {
    this.observePrimaryActions(element);
  }

  get showStickyOrder(): boolean {
    return (
      !this.loading &&
      !!this.product &&
      this.primaryActionsPassed &&
      !this.footerVisible
    );
  }

  get selectedVariantId(): string {
    return this.selectedVariantIds[0] ?? '';
  }

  set selectedVariantId(value: string) {
    this.selectedVariantIds = value ? [value] : [];
  }

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
        tap(() => {
          this.loading = true;
          this.errorMessage = '';

          this.product = null;
          this.customizationConfig = null;
          this.customization = null;
          this.accessoryOptions = [];
          this.selectedVariantIds = [];
          this.isVariantDropdownOpen = false;
          this.quantity = 1;

          this.primaryActionsPassed = false;
          this.footerVisible = false;
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

            // Lấy ảnh đầu tiên của phụ kiện
            imageUrl: accessory.imageIds?.[0]
              ? this.apiService.getProductImageUrl(
                  accessory.imageIds[0]
                )
              : null,

            variants: (accessory.variants ?? [])
              .filter(
                (variant) =>
                  variant.active !== false && !!variant._id
              )
              .map((variant) => ({
                id: variant._id as string,
                label: variant.label,
              })),
          };
        });

        if (this.product.kind === 'accessory') {
          const activeVariants = this.activeProductVariants;

          this.selectedVariantIds =
            activeVariants.length === 1
              ? [activeVariants[0]._id!]
              : [];
        }

        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.observeFooter();
  }

  ngOnDestroy(): void {
    this.primaryActionsObserver?.disconnect();
    this.footerObserver?.disconnect();

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  // ========================================
  // STICKY ORDER - INTERSECTION OBSERVER
  // ========================================

  private observePrimaryActions(
    element: ElementRef<HTMLElement> | undefined
  ): void {
    this.primaryActionsObserver?.disconnect();

    if (
      !element ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    this.primaryActionsObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          // Nút đặt hàng chính xuất hiện lại trong màn hình.
          this.primaryActionsPassed = false;
        } else if (entry.boundingClientRect.bottom < 0) {
          // Nút đặt hàng chính đã cuộn lên phía trên màn hình.
          this.primaryActionsPassed = true;
        }

        this.cdr.markForCheck();
      },
      {
        threshold: 0,
      }
    );

    this.primaryActionsObserver.observe(element.nativeElement);
  }

  private observeFooter(): void {
    if (
      typeof document === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    // Tìm footer của layout dùng chung.
    const footer = document.querySelector(
      'app-footer, footer, .site-footer'
    );

    if (!footer) {
      return;
    }

    this.footerObserver?.disconnect();

    this.footerObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        this.footerVisible = entry.isIntersecting;
        this.cdr.markForCheck();
      },
      {
        threshold: 0,
      }
    );

    this.footerObserver.observe(footer);
  }

  // ========================================
  // QUANTITY
  // ========================================

  increaseQuantity(): void {
    if (this.quantity >= this.MAX_QUANTITY) {
      return;
    }

    this.quantity++;
    this.cdr.markForCheck();
  }

  decreaseQuantity(): void {
    if (this.quantity <= this.MIN_QUANTITY) {
      return;
    }

    this.quantity--;
    this.cdr.markForCheck();
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
  get estimatedTotalPrice(): number {
  const unitPrice =
    this.product?.kind === 'cake'
      ? (this.customization?.estimatedPrice ?? this.displayPrice)
      : this.displayPrice;

  return unitPrice * this.quantity;
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
      (variant) => variant.active !== false && !!variant._id
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

    if (this.activeProductVariants.length === 0) {
      return false;
    }

    if (this.selectedVariantIds.length === 0) {
      return false;
    }

    const activeIds = this.activeProductVariants.map(
      (variant) => variant._id
    );

    return (
      this.selectedVariantIds.every((id) => activeIds.includes(id)) &&
      new Set(this.selectedVariantIds).size ===
        this.selectedVariantIds.length
    );
  }

  isProductVariantSelected(variantId: string): boolean {
    return this.selectedVariantIds.includes(variantId);
  }

  onProductVariantToggle(
    variantId: string,
    checked: boolean
  ): void {
    const exists = this.selectedVariantIds.includes(variantId);

    if (checked && !exists) {
      this.selectedVariantIds = [
        ...this.selectedVariantIds,
        variantId,
      ];
    } else if (!checked && exists) {
      this.selectedVariantIds = this.selectedVariantIds.filter(
        (id) => id !== variantId
      );
    }

    this.cdr.markForCheck();
  }

  toggleVariantDropdown(): void {
    this.isVariantDropdownOpen = !this.isVariantDropdownOpen;
  }

  get selectedProductVariants(): Product['variants'] {
    return this.activeProductVariants.filter(
      (variant) =>
        !!variant._id &&
        this.selectedVariantIds.includes(variant._id)
    );
  }

  get selectedProductVariantLabels(): string[] {
    return this.selectedProductVariants.map(
      (variant) => variant.label
    );
  }

  onProductVariantChange(variantId: string): void {
    this.selectedVariantIds = variantId ? [variantId] : [];
    this.cdr.markForCheck();
  }

  get selectedProductVariant(): Product['variants'][number] | null {
    return this.selectedProductVariants[0] ?? null;
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
        'Vui lòng chọn ít nhất một biến thể sản phẩm.'
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

      const rawVariantIds =
        customization.accessoryVariants?.[accessoryId] ?? [];

      const selectedIds = Array.isArray(rawVariantIds)
        ? rawVariantIds
        : rawVariantIds
          ? [rawVariantIds]
          : [];

      const validIds = accessory.variants.map(
        (variant) => variant.id
      );

      const isValid =
        selectedIds.length > 0 &&
        selectedIds.every((id) => validIds.includes(id)) &&
        new Set(selectedIds).size === selectedIds.length;

      if (!isValid) {
        this.showNotification(
          `Vui lòng chọn ít nhất một biến thể cho phụ kiện "${accessory.name}".`
        );
        return false;
      }
    }

    return true;
  }

  // ========================================
  // CART - TẠO DÒNG PHỤ KIỆN RIÊNG
  // ========================================

  private buildAccessoryCartItems(
    customization: CakeCustomization
  ): AddCartItemInput[] {
    const items: AddCartItemInput[] = [];

    for (const accessoryId of customization.accessories) {
      const accessory = this.accessoryOptions.find(
        (option) => option.id === accessoryId
      );

      if (!accessory) {
        continue;
      }

      const rawVariantIds =
        customization.accessoryVariants?.[accessoryId] ?? [];

      const variantIds = Array.isArray(rawVariantIds)
        ? [...new Set(rawVariantIds)]
        : rawVariantIds
          ? [rawVariantIds]
          : [];

      // Phụ kiện có biến thể:
      // Mỗi biến thể được tạo thành một dòng riêng.
      if (variantIds.length > 0) {
        for (const variantId of variantIds) {
          const selectedVariant = accessory.variants.find(
            (variant) => variant.id === variantId
          );

          if (!selectedVariant) {
            continue;
          }

          items.push({
            productId: accessory.id,
            productName: accessory.name,
            productKind: 'accessory',
            imageUrl: accessory.imageUrl,
            unitPrice: accessory.price,
            customization: null,
            accessories: [],
            variantId: selectedVariant.id,
            variantLabel: selectedVariant.label,
            variantIds: [selectedVariant.id],
            variantLabels: [selectedVariant.label],
            quantity: this.quantity,
          });
        }

        continue;
      }

      // Phụ kiện không có biến thể:
      // Tạo một dòng riêng cho phụ kiện đó.
      items.push({
        productId: accessory.id,
        productName: accessory.name,
        productKind: 'accessory',
        imageUrl: accessory.imageUrl,
        unitPrice: accessory.price,
        customization: null,
        accessories: [],
        variantId: null,
        variantLabel: null,
        variantIds: [],
        variantLabels: [],
        quantity: this.quantity,
      });
    }

    return items;
  }

  // ========================================
  // CART
  // ========================================

  async addToCart(): Promise<void> {
    const currentProduct = this.product;

    if (!currentProduct || this.addToCartLoading) {
      return;
    }

    if (
      this.quantity < this.MIN_QUANTITY ||
      this.quantity > this.MAX_QUANTITY
    ) {
      this.showNotification(
        'Số lượng mỗi dòng sản phẩm chỉ được từ 1 đến 10.'
      );
      return;
    }

    if (
      currentProduct.kind === 'cake' &&
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
      currentProduct.kind === 'cake' &&
      selectedCustomization &&
      !this.validateAccessoryVariants(selectedCustomization)
    ) {
      return;
    }

    this.addToCartLoading = true;
    this.cdr.markForCheck();

    let hasAddedItem = false;

    try {
      // ========================================
      // TRƯỜNG HỢP 1: SẢN PHẨM LÀ BÁNH
      // ========================================

      if (
        currentProduct.kind === 'cake' &&
        selectedCustomization
      ) {
        // Tạo danh sách phụ kiện thành các dòng riêng.
        // Số lượng mỗi phụ kiện bằng số lượng bánh.
        const accessoryCartItems =
          this.buildAccessoryCartItems(selectedCustomization);

        // Giá bánh không bao gồm tiền phụ kiện.
        const accessoryTotal = Number(
          selectedCustomization.accessoryTotal || 0
        );

        const cakeUnitPrice = Math.max(
          0,
          Math.round(
            selectedCustomization.estimatedPrice - accessoryTotal
          )
        );

        // Không lưu phụ kiện lồng bên trong dòng bánh.
        const cakeCustomization: CakeCustomization = {
          ...selectedCustomization,
          accessories: [],
          accessoryVariants: {},
          accessoryTotal: 0,
          estimatedPrice: cakeUnitPrice,
        };

        // Thêm dòng bánh trước.
        const cakeAdded = await this.cartService.addItem({
          productId: currentProduct._id,
          productName: currentProduct.name,
          productKind: 'cake',
          imageUrl: this.mainImageUrl,
          unitPrice: cakeUnitPrice,
          customization: cakeCustomization,
          accessories: [],
          variantIds: [],
          variantLabels: [],
          quantity: this.quantity,
        });

        if (!cakeAdded) {
          this.showNotification(
            'Không thể thêm bánh vào giỏ hàng. Có thể số lượng sau khi gộp vượt quá giới hạn 10 sản phẩm mỗi dòng.'
          );
          return;
        }

        hasAddedItem = true;

        // Thêm lần lượt từng phụ kiện thành dòng riêng.
        for (const accessoryItem of accessoryCartItems) {
          const accessoryAdded =
            await this.cartService.addItem(accessoryItem);

          if (!accessoryAdded) {
            this.showNotification(
              'Bánh đã được thêm nhưng một số phụ kiện chưa thể thêm. Có thể số lượng sau khi gộp vượt quá giới hạn 10 sản phẩm mỗi dòng. Vui lòng kiểm tra lại giỏ hàng.'
            );

            this.cartService.openDrawer();
            return;
          }

          hasAddedItem = true;
        }
      } else {
        // ========================================
        // TRƯỜNG HỢP 2: SẢN PHẨM LÀ PHỤ KIỆN
        // ========================================

        const selectedVariants = this.selectedProductVariants;

        if (
          currentProduct.kind === 'accessory' &&
          selectedVariants.length > 0
        ) {
          // Mỗi biến thể được thêm thành một dòng riêng.
          for (const variant of selectedVariants) {
            const added = await this.cartService.addItem({
              productId: currentProduct._id,
              productName: currentProduct.name,
              productKind: 'accessory',
              imageUrl: this.mainImageUrl,
              unitPrice: this.displayPrice,
              customization: null,
              accessories: [],
              variantId: variant._id ?? null,
              variantLabel: variant.label,
              variantIds: variant._id ? [variant._id] : [],
              variantLabels: [variant.label],
              quantity: this.quantity,
            });

            if (!added) {
              this.showNotification(
                'Một số biến thể chưa thể thêm vào giỏ hàng. Có thể số lượng sau khi gộp vượt quá giới hạn 10 sản phẩm mỗi dòng. Vui lòng kiểm tra lại.'
              );

              if (hasAddedItem) {
                this.cartService.openDrawer();
              }

              return;
            }

            hasAddedItem = true;
          }
        } else {
          // Phụ kiện không có biến thể.
          const added = await this.cartService.addItem({
            productId: currentProduct._id,
            productName: currentProduct.name,
            productKind: currentProduct.kind,
            imageUrl: this.mainImageUrl,
            unitPrice: this.displayPrice,
            customization: null,
            accessories: [],
            variantIds: [],
            variantLabels: [],
            quantity: this.quantity,
          });

          if (!added) {
            this.showNotification(
              'Không thể thêm vào giỏ hàng. Có thể số lượng sau khi gộp vượt quá giới hạn 10 sản phẩm mỗi dòng.'
            );
            return;
          }

          hasAddedItem = true;
        }
      }

      if (hasAddedItem) {
        this.cartService.openDrawer();
      }
    } catch (error) {
      console.error(
        '[ProductDetail] Lỗi khi thêm vào giỏ:',
        error
      );

      this.showNotification(
        hasAddedItem
          ? 'Một số sản phẩm đã được thêm. Vui lòng kiểm tra lại giỏ hàng.'
          : 'Đã xảy ra lỗi khi thêm vào giỏ hàng. Vui lòng thử lại.'
      );

      if (hasAddedItem) {
        this.cartService.openDrawer();
      }
    } finally {
      this.addToCartLoading = false;
      this.cdr.markForCheck();
    }
  }

  // ========================================
  // BUY NOW
  // ========================================

  private buildBuyNowRequest(): QuoteRequest {
    if (!this.product) {
      throw new Error('Không tìm thấy sản phẩm.');
    }

    const items: QuoteRequestItem[] = [];

    if (this.product.kind === 'cake') {
      const config = this.customization;

      if (!config) {
        throw new Error(
          'Vui lòng hoàn tất tùy chỉnh bánh.'
        );
      }

      items.push({
        productId: this.product._id,
        qty: this.quantity,
        config: {
          size: config.size,
          base: config.base,
          filling: config.filling,
          frostingColor: config.frostingColor,
          sweetness: config.sweetness,
          message: config.message,
        },
      });

      for (const accessoryId of config.accessories) {
        const accessory = this.accessoryOptions.find(
          (option) => option.id === accessoryId
        );

        if (!accessory) {
          throw new Error(
            'Một phụ kiện đã chọn không còn khả dụng.'
          );
        }

        const rawVariantIds =
          config.accessoryVariants?.[accessoryId] ?? [];

        const variantIds = Array.isArray(rawVariantIds)
          ? rawVariantIds
          : rawVariantIds
            ? [rawVariantIds]
            : [];

        if (
          accessory.variants.length > 0 &&
          variantIds.length === 0
        ) {
          throw new Error(
            `Vui lòng chọn biến thể cho phụ kiện "${accessory.name}".`
          );
        }

        if (variantIds.length > 0) {
          for (const variantId of variantIds) {
            items.push({
              productId: accessory.id,
              qty: this.quantity,
              variant: variantId,
            });
          }
        } else {
          items.push({
            productId: accessory.id,
            qty: this.quantity,
          });
        }
      }
    } else {
      if (this.requiresProductVariant) {
        if (this.selectedVariantIds.length === 0) {
          throw new Error(
            'Vui lòng chọn ít nhất một biến thể sản phẩm.'
          );
        }

        for (const variantId of this.selectedVariantIds) {
          items.push({
            productId: this.product._id,
            qty: this.quantity,
            variant: variantId,
          });
        }
      } else {
        items.push({
          productId: this.product._id,
          qty: this.quantity,
        });
      }
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
      this.quantity < this.MIN_QUANTITY ||
      this.quantity > this.MAX_QUANTITY
    ) {
      this.showNotification(
        'Số lượng mỗi dòng sản phẩm chỉ được từ 1 đến 10.'
      );
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

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 2500);
  }
}
