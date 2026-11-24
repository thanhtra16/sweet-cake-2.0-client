import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { Product } from '@shared/models/product.model';
import { ProductService } from '@core/services/product.service';
import { CartService } from '@shared/services/cart.service';
import {
  BuyerProduct,
  ProductCardComponent
} from '@shared/components/product-card/product-card.component';

type FilterKey = 'kind' | 'occasion' | 'filling' | 'cakeType' | 'price';
type SortMode = 'newest' | 'price-asc' | 'price-desc';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  key: FilterKey;
  title: string;
  options: FilterOption[];
}

const PAGE_SIZE = 9;

/** Chuẩn hóa chuỗi để so sánh dữ liệu. */
function normalizeValue(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .toLowerCase();
}

/** Ánh xạ dịp đặc biệt. */
const CATEGORY_TO_OCCASION: Record<string, string> = {
  'birthday cake': 'Sinh nhật',
  'sinh nhật': 'Sinh nhật',
  'anniversary cake': 'Kỷ niệm',
  'kỷ niệm': 'Kỷ niệm',
  'wedding cake': 'Tiệc cưới',
  'tiệc cưới': 'Tiệc cưới',
  'valentine cake': 'Valentine',
  'valentine': 'Valentine',
  'chúc mừng': 'Chúc mừng',
  'congratulations': 'Chúc mừng'
};

/** Ánh xạ nhân bánh. */
const FILLING_ALIASES: Record<string, string> = {
  'bắp': 'Bắp',
  'corn': 'Bắp',
  'matcha': 'Matcha',
  'phô mai': 'Phô mai',
  'pho mai': 'Phô mai',
  'cheese': 'Phô mai',
  'cream cheese': 'Phô mai',
  'trái cây tươi': 'Trái cây tươi',
  'trai cay tuoi': 'Trái cây tươi',
  'fresh fruit': 'Trái cây tươi',
  'fruit': 'Trái cây tươi',
  'socola': 'Socola',
  'sô cô la': 'Socola',
  'chocolate': 'Socola',
  'mứt dâu tây': 'Mứt dâu tây',
  'mứt dâu': 'Mứt dâu tây',
  'strawberry': 'Mứt dâu tây'
};

/** Ánh xạ loại bánh / danh mục phụ kiện. */
const CAKE_TYPE_ALIASES: Record<string, string> = {
  'bông lan': 'Bông lan',
  'bong lan': 'Bông lan',
  'bánh bông lan': 'Bông lan',
  'bánh sinh nhật': 'Bông lan',
  'bánh kem': 'Bông lan',
  'sponge cake': 'Bông lan',
  'mousse': 'Mousse',
  'bánh mousse': 'Mousse',
  'bento': 'Bento',
  'bánh bento': 'Bento',
  'bento cake': 'Bento'
};

/** Quy tắc lọc giá. */
const PRICE_RULES: Record<string, (price: number) => boolean> = {
  'under-200': (price) => price < 200_000,
  '200-300': (price) => price >= 200_000 && price <= 300_000,
  '300-400': (price) => price > 300_000 && price <= 400_000,
  '400-500': (price) => price > 400_000 && price <= 500_000,
  'over-500': (price) => price > 500_000
};

function extractOccasions(product: any): string[] {
  const raw = Array.isArray(product?.occasions)
    ? product.occasions
    : product?.occasion
      ? String(product.occasion).split(',')
      : [];

  return raw
    .map((item: unknown) => {
      const normalized = normalizeValue(item);
      return CATEGORY_TO_OCCASION[normalized] ?? String(item ?? '').trim();
    })
    .filter(Boolean);
}

function extractFillings(product: any): string[] {
  const raw = Array.isArray(product?.availableFillings)
    ? product.availableFillings
    : product?.flavor
      ? String(product.flavor).split(',')
      : [];

  return raw
    .map((item: unknown) => {
      const normalized = normalizeValue(item);
      return FILLING_ALIASES[normalized] ?? String(item ?? '').trim();
    })
    .filter(Boolean);
}

function extractCakeType(product: any): string {
  const raw = product?.type ?? product?.category ?? '';
  const normalized = normalizeValue(raw);
  return CAKE_TYPE_ALIASES[normalized] ?? String(raw).trim();
}

function getEffectivePrice(product: any): number {
  const rawPrice =
    product?.salePrice ?? product?.basePrice ?? product?.price ?? 0;
  return Number(rawPrice) || 0;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ---------- Filter options ----------

  readonly filterGroups: FilterGroup[] = [
    {
      key: 'kind',
      title: 'Danh mục sản phẩm',
      options: [
        { value: 'cake', label: 'Bánh kem' },
        { value: 'accessory', label: 'Phụ kiện sinh nhật' }
      ]
    },
    {
      key: 'occasion',
      title: 'Dịp đặc biệt',
      options: [
        { value: 'Sinh nhật', label: 'Sinh nhật' },
        { value: 'Kỷ niệm', label: 'Kỷ niệm' },
        { value: 'Tiệc cưới', label: 'Tiệc cưới' },
        { value: 'Valentine', label: 'Valentine' },
        { value: 'Chúc mừng', label: 'Chúc mừng' }
      ]
    },
    {
      key: 'filling',
      title: 'Nhân bánh',
      options: [
        { value: 'Bắp', label: 'Bắp' },
        { value: 'Matcha', label: 'Matcha' },
        { value: 'Phô mai', label: 'Phô mai' },
        { value: 'Trái cây tươi', label: 'Trái cây tươi' },
        { value: 'Socola', label: 'Socola' },
        { value: 'Mứt dâu tây', label: 'Mứt dâu tây' }
      ]
    },
    {
      key: 'cakeType',
      title: 'Loại bánh',
      options: [
        { value: 'Bông lan', label: 'Bông lan' },
        { value: 'Mousse', label: 'Mousse' },
        { value: 'Bento', label: 'Bento' }
      ]
    },
    {
      key: 'price',
      title: 'Giá',
      options: [
        { value: 'under-200', label: 'Dưới 200.000' },
        { value: '200-300', label: '200.000 - 300.000' },
        { value: '300-400', label: '300.000 - 400.000' },
        { value: '400-500', label: '400.000 - 500.000' },
        { value: 'over-500', label: 'Trên 500.000' }
      ]
    }
  ];

  // ---------- State ----------

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);

  readonly searchKeyword = signal('');
  readonly sortMode = signal<SortMode>('newest');

  readonly selectedFilters = signal<Record<FilterKey, string[]>>({
    kind: [],
    occasion: [],
    filling: [],
    cakeType: [],
    price: []
  });

  readonly currentPage = signal(1);

  /** Thông báo khi vừa thêm sản phẩm từ trang chi tiết quay về */
  readonly toastMessage = signal('');
  readonly showViewCartAction = signal(false);
  private toastTimer?: ReturnType<typeof setTimeout>;

  // ---------- Filter products ----------

  readonly filteredProducts = computed(() => {
    const keyword = normalizeValue(this.searchKeyword());
    const filters = this.selectedFilters();

    const result = this.products().filter((product: any) => {
      // Chỉ hiển thị sản phẩm có trạng thái "visible" (Hiển thị)
      if (product?.status && product.status !== 'visible') {
        return false;
      }

      const productKind = product?.kind ?? 'cake';
      const occasions = extractOccasions(product);
      const fillings = extractFillings(product);
      const cakeType = extractCakeType(product);
      const effectivePrice = getEffectivePrice(product);

      const matchesKind =
        filters.kind.length === 0 || filters.kind.includes(productKind);

      const matchesKeyword =
        !keyword ||
        normalizeValue(product?.name).includes(keyword) ||
        normalizeValue(product?.description).includes(keyword) ||
        normalizeValue(product?.category).includes(keyword);

      const matchesOccasion = this.matchesList(filters.occasion, occasions);

      // Bộ lọc nhân bánh & loại bánh chỉ áp dụng cho bánh kem (phụ kiện không có thuộc tính này)
      const matchesFilling =
        filters.filling.length === 0 ||
        (productKind === 'cake' && this.matchesList(filters.filling, fillings));

      const matchesCakeType =
        filters.cakeType.length === 0 ||
        (productKind === 'cake' && this.matches(filters.cakeType, cakeType));

      const matchesPrice =
        filters.price.length === 0 ||
        filters.price.some(
          (rule) => PRICE_RULES[rule]?.(effectivePrice) ?? false
        );

      return (
        matchesKind &&
        matchesKeyword &&
        matchesOccasion &&
        matchesFilling &&
        matchesCakeType &&
        matchesPrice
      );
    });

    switch (this.sortMode()) {
      case 'price-asc':
        return [...result].sort(
          (a, b) => getEffectivePrice(a) - getEffectivePrice(b)
        );

      case 'price-desc':
        return [...result].sort(
          (a, b) => getEffectivePrice(b) - getEffectivePrice(a)
        );

      default:
        return result;
    }
  });

  // ---------- Pagination ----------

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / PAGE_SIZE))
  );

  readonly pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredProducts().slice(start, start + PAGE_SIZE);
  });

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  // ---------- Result title ----------

  readonly resultTitle = computed(() => {
    const count = this.filteredProducts().length;
    const keyword = this.searchKeyword().trim();

    return keyword
      ? `Đã tìm thấy ${count} kết quả cho từ khóa "${keyword}"`
      : `Đã tìm thấy ${count} sản phẩm`;
  });

  readonly hasActiveFilters = computed(
    () =>
      Object.values(this.selectedFilters()).some(
        (values) => values.length > 0
      ) || this.searchKeyword().trim().length > 0
  );

  // ---------- Lifecycle ----------

  ngOnInit(): void {
    this.syncFiltersFromQueryParams();
    this.consumeAddedToastFromHistoryState();
    this.loadProducts();
  }

  /**
   * Nhận thông báo khi khách bấm "Thêm vào giỏ hàng" tại trang chi tiết
   * và được quay về trang danh sách:
   * “Đã thêm vào giỏ hàng: [số lượng] × [tên bánh]” kèm nút Xem giỏ hàng.
   */
  private consumeAddedToastFromHistoryState(): void {
    const state = window.history.state as {
      cartAdded?: { quantity: number; productName: string };
    } | null;

    if (state?.cartAdded) {
      const { quantity, productName } = state.cartAdded;
      this.showAddedCartBanner(
        `Đã thêm vào giỏ hàng: ${quantity} × ${productName}`
      );

      // Xóa state sau khi hiển thị để F5 không hiện lại
      const { cartAdded: _removed, ...restState } = state;
      window.history.replaceState(restState, '');
    }
  }

  private syncFiltersFromQueryParams(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const q = params.get('q') ?? params.get('search') ?? '';
        const kindParam = params.get('kind');
        const occasionParam = params.get('occasion');
        const fillingParam = params.get('filling');
        const cakeTypeParam =
          params.get('cakeType') ?? params.get('category') ?? params.get('type');

        this.searchKeyword.set(q);

        this.selectedFilters.set({
          kind:
            kindParam === 'cake' || kindParam === 'accessory'
              ? [kindParam]
              : [],
          occasion: occasionParam
            ? [
                CATEGORY_TO_OCCASION[normalizeValue(occasionParam)] ??
                  occasionParam.trim()
              ]
            : [],
          filling: fillingParam
            ? [
                FILLING_ALIASES[normalizeValue(fillingParam)] ??
                  fillingParam.trim()
              ]
            : [],
          cakeType: cakeTypeParam
            ? [
                CAKE_TYPE_ALIASES[normalizeValue(cakeTypeParam)] ??
                  cakeTypeParam.trim()
              ]
            : [],
          price: []
        });

        this.currentPage.set(1);
      });
  }

  private loadProducts(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.productService
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const list: Product[] = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : [];

          this.products.set(list);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Lỗi tải sản phẩm:', error);
          this.hasError.set(true);
          this.isLoading.set(false);
        }
      });
  }

  // ---------- Search ----------

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchKeyword.set(value);
    this.currentPage.set(1);
  }

  // ---------- Sort ----------

  selectSort(mode: SortMode): void {
    this.sortMode.set(mode);
    this.currentPage.set(1);
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.sortMode.set(value as SortMode);
    this.currentPage.set(1);
  }

  // ---------- Filter handlers ----------

  isChecked(key: FilterKey, value: string): boolean {
    return this.selectedFilters()[key].includes(value);
  }

  toggleFilter(key: FilterKey, value: string): void {
    this.selectedFilters.update((filters) => {
      const current = filters[key];

      return {
        ...filters,
        [key]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value]
      };
    });

    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.selectedFilters.set({
      kind: [],
      occasion: [],
      filling: [],
      cakeType: [],
      price: []
    });

    this.searchKeyword.set('');
    this.currentPage.set(1);

    if (this.route.snapshot.queryParamMap.keys.length > 0) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }
  }

  // ---------- Pagination handlers ----------

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // ---------- Navigation & Card Actions ----------

  /**
   * Theo quy trình nghiệp vụ:
   * Thẻ sản phẩm ở trang danh sách chỉ có nút "Thêm vào giỏ hàng".
   * Khi bấm (hoặc bấm vào thẻ), hệ thống mở trang chi tiết để khách:
   * - Tùy biến bánh kem (kích thước, cốt, nhân, độ ngọt, nội dung trang trí)
   * - Hoặc chọn biến thể phụ kiện (chữ số, mẫu chữ, màu sắc, kích thước...)
   */
  onAddToCart(product: BuyerProduct | Product): void {
    this.openProductDetail(product);
  }

  openProductDetail(product: BuyerProduct | Product): void {
    const raw = product as any;
    const productId = String(raw?._id ?? raw?.id ?? '');
    if (!productId) {
      return;
    }

    this.router.navigate(['/product', productId], {
      state: { returnUrl: this.router.url }
    });
  }

  openCart(): void {
    if (typeof (this.cart as any).openDrawer === 'function') {
      (this.cart as any).openDrawer();
      return;
    }
    this.router.navigate(['/cart']);
  }

  // ---------- Helpers ----------

  private showAddedCartBanner(message: string): void {
    this.toastMessage.set(message);
    this.showViewCartAction.set(true);

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
      this.showViewCartAction.set(false);
    }, 5000);
  }

  private matches(selected: string[], value: string): boolean {
    if (selected.length === 0) {
      return true;
    }

    const parts = value
      .split(',')
      .map((part) => normalizeValue(part))
      .filter(Boolean);

    return selected.some((item) => parts.includes(normalizeValue(item)));
  }

  private matchesList(selected: string[], values: string[]): boolean {
    if (selected.length === 0) {
      return true;
    }

    const normalizedValues = values.map((v) => normalizeValue(v));
    return selected.some((item) =>
      normalizedValues.includes(normalizeValue(item))
    );
  }
}