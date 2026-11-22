import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { Product } from '../../../../shared/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { CartService } from '../../../../core/services/cart.service';
import { BuyerProduct, ProductCardComponent } from '../../../../shared/components/product-card/product-card.component';

type FilterKey = 'occasion' | 'filling' | 'cakeType' | 'price';
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

/** Ánh xạ category trong database sang dịp đặc biệt. */
const CATEGORY_TO_OCCASION: Record<string, string> = {
  'birthday cake': 'Sinh nhật',
  'anniversary cake': 'Kỷ niệm',
  'wedding cake': 'Tiệc cưới',
  'valentine cake': 'Valentine'
};

/** Ánh xạ các cách ghi nhân bánh. */
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
  'chocolate': 'Socola'
};

/** Ánh xạ các cách ghi loại bánh. */
const CAKE_TYPE_ALIASES: Record<string, string> = {
  'bông lan': 'Bông lan',
  'bong lan': 'Bông lan',
  'sponge cake': 'Bông lan',
  'mousse': 'Mousse',
  'bento': 'Bento',
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

/** Chuẩn hóa dữ liệu dịp đặc biệt. */
function normalizeOccasion(value: unknown): string {
  const normalized = normalizeValue(value);
  return CATEGORY_TO_OCCASION[normalized] ?? String(value ?? '').trim();
}

/** Chuẩn hóa dữ liệu nhân bánh. */
function normalizeFilling(value: unknown): string {
  const normalized = normalizeValue(value);
  return FILLING_ALIASES[normalized] ?? String(value ?? '').trim();
}

/** Chuẩn hóa dữ liệu loại bánh. */
function normalizeCakeType(value: unknown): string {
  const normalized = normalizeValue(value);
  return CAKE_TYPE_ALIASES[normalized] ?? String(value ?? '').trim();
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

  // ---------- Filter options ----------

  readonly filterGroups: FilterGroup[] = [
    {
      key: 'occasion',
      title: 'Dịp đặc biệt',
      options: [
        { value: 'Sinh nhật', label: 'Sinh nhật' },
        { value: 'Kỷ niệm', label: 'Kỷ niệm' },
        { value: 'Tiệc cưới', label: 'Tiệc cưới' },
        { value: 'Valentine', label: 'Valentine' }
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
        { value: 'Socola', label: 'Socola' }
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
    occasion: [],
    filling: [],
    cakeType: [],
    price: []
  });

  readonly currentPage = signal(1);

  readonly toastMessage = signal('');
  private toastTimer?: ReturnType<typeof setTimeout>;
//   --
    selectSort(mode: SortMode): void {
    this.sortMode.set(mode);
    this.currentPage.set(1);
    }

  // ---------- Filter products ----------

  readonly filteredProducts = computed(() => {
    const keyword = normalizeValue(this.searchKeyword());
    const filters = this.selectedFilters();

    const result = this.products().filter((product) => {
      const occasion = normalizeOccasion(product.occasion);
      const filling = normalizeFilling(product.flavor);
      const cakeType = normalizeCakeType(product.type);

      const matchesKeyword =
        !keyword ||
        normalizeValue(product.name).includes(keyword);

      const matchesOccasion = this.matches(
        filters.occasion,
        occasion
      );

      const matchesFilling = this.matches(
        filters.filling,
        filling
      );

      const matchesCakeType = this.matches(
        filters.cakeType,
        cakeType
      );

      const matchesPrice =
        filters.price.length === 0 ||
        filters.price.some((rule) =>
          PRICE_RULES[rule]?.(Number(product.price)) ?? false
        );

      return (
        matchesKeyword &&
        matchesOccasion &&
        matchesFilling &&
        matchesCakeType &&
        matchesPrice
      );
    });

    // Sắp xếp sản phẩm.
    switch (this.sortMode()) {
      case 'price-asc':
        return [...result].sort(
          (a, b) => a.price - b.price
        );

      case 'price-desc':
        return [...result].sort(
          (a, b) => b.price - a.price
        );
    default:
    return result;
    }
  });

  // ---------- Pagination ----------

  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.filteredProducts().length / PAGE_SIZE)
    )
  );

  readonly pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;

    return this.filteredProducts().slice(
      start,
      start + PAGE_SIZE
    );
  });

  readonly pageNumbers = computed(() =>
    Array.from(
      { length: this.totalPages() },
      (_, index) => index + 1
    )
  );

  // ---------- Result title ----------

  readonly resultTitle = computed(() => {
    const count = this.filteredProducts().length;
    const keyword = this.searchKeyword().trim();

    return keyword
      ? `Đã tìm thấy ${count} kết quả cho từ khóa "${keyword}"`
      : `Đã tìm thấy ${count} sản phẩm`;
  });

  readonly hasActiveFilters = computed(() =>
    Object.values(this.selectedFilters()).some(
      (values) => values.length > 0
    ) || this.searchKeyword().trim().length > 0
  );

  // ---------- Lifecycle ----------

  ngOnInit(): void {
    this.productService.getProducts().subscribe({
      next: (products) => {
        console.log('Danh sách sản phẩm:', products);

        this.products.set(products);
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
      occasion: [],
      filling: [],
      cakeType: [],
      price: []
    });

    this.searchKeyword.set('');
    this.currentPage.set(1);
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

  // ---------- Cart ----------

  onAddToCart(product: BuyerProduct): void {
    this.cart.add(product as Product);

    this.toastMessage.set(
      `Đã thêm "${product.name}" vào giỏ hàng`
    );

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, 2500);
  }

  // ---------- Helpers ----------

  private matches(selected: string[], value: string): boolean {
    if (selected.length === 0) {
      return true;
    }

    const parts = value.split(',').map((part) => normalizeValue(part));

    return selected.some((item) => parts.includes(normalizeValue(item)));
  }
}
