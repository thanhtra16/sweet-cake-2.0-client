import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  ApiService,
  ProductCustomization,
  ProductPayload,
  ProductVariant,
} from '../../../../../core/services/api.service';
import { ToastService } from '../../../../../core/services/toast.service';

const MAX_IMAGES = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface AttrRow {
  key: string;
  value: string;
  orig?: unknown;
}

interface VariantRow {
  _id?: string;
  label: string;
  active: boolean;
  attrs: AttrRow[];
}

interface NewImage {
  file: File;
  url: string;
}

/** Giá khuyến mãi không được cao hơn giá gốc. */
function salePriceRule(group: AbstractControl): ValidationErrors | null {
  const base = group.get('basePrice')?.value;
  const sale = group.get('salePrice')?.value;

  if (
    sale === null ||
    sale === '' ||
    sale === undefined ||
    base === null ||
    base === ''
  ) {
    return null;
  }

  return Number(sale) > Number(base) ? { saleTooHigh: true } : null;
}

const notBlank = (c: AbstractControl): ValidationErrors | null =>
  typeof c.value === 'string' && !c.value.trim() ? { blank: true } : null;

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './admin-product-form.html',
  styleUrls: ['../../../styles/admin-page.css', './admin-product-form.css'],
})
export class AdminProductFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly productId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = !!this.productId;
  readonly maxImages = MAX_IMAGES;

  private configSub?: Subscription;
  private productSub?: Subscription;
  private saveSub?: Subscription;
  private uploadSub?: Subscription;

  loading = false;
  loadError = '';
  saving = false;
  imageError = '';

  config: ProductCustomization | null = null;

  selectedSizes = new Set<string>();
  selectedFillings = new Set<string>();

  variants: VariantRow[] = [];

  existingImageIds: string[] = [];
  newImages: NewImage[] = [];

  form = this.fb.group(
    {
      name: ['', [Validators.required, notBlank]],
      kind: ['cake', Validators.required],
      category: ['', [Validators.required, notBlank]],
      occasionsText: [''],
      description: [''],
      basePrice: [null as number | null, [Validators.required, Validators.min(0)]],
      salePrice: [null as number | null, [Validators.min(0)]],
      status: ['visible', Validators.required],
      featured: [false],
    },
    { validators: salePriceRule }
  );

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.loadCustomization();

    if (this.productId) {
      this.loadProduct(this.productId);
    }
  }

  ngOnDestroy(): void {
    this.configSub?.unsubscribe();
    this.productSub?.unsubscribe();
    this.saveSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.revokeAllNewImages();
  }

  private revokeAllNewImages(): void {
    this.newImages.forEach((image) => {
      URL.revokeObjectURL(image.url);
    });
  }

  private loadCustomization(): void {
    this.configSub?.unsubscribe();
    this.configSub = this.api.getProductCustomization().subscribe({
      next: (c) => {
        this.config = c;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.config = null;
        console.error('Không tải được cấu hình tùy biến:', err);
        this.toast.error(
          err?.error?.message || 'Không tải được cấu hình tùy biến.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  private loadProduct(id: string): void {
    this.productSub?.unsubscribe();
    this.loading = true;
    this.loadError = '';
    this.cdr.markForCheck();

    this.productSub = this.api.getAdminProductById(id).subscribe({
      next: (p) => {
        this.form.patchValue({
          name: p.name,
          kind: p.kind,
          category: p.category,
          occasionsText: (p.occasions ?? []).join(', '),
          description: p.description ?? '',
          basePrice: p.basePrice,
          salePrice: p.salePrice ?? null,
          status: p.status,
          featured: !!p.featured,
        });

        this.selectedSizes = new Set(p.availableSizes ?? []);
        this.selectedFillings = new Set(p.availableFillings ?? []);
        this.variants = (p.variants ?? []).map((v) => this.toRow(v));
        this.existingImageIds = p.imageIds ?? [];

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.loadError =
          err?.status === 404
            ? 'Không tìm thấy sản phẩm.'
            : err?.error?.message ||
              'Không tải được sản phẩm. Vui lòng thử lại.';
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Tên option từ cấu hình và các giá trị cũ
   * của sản phẩm chưa còn trong cấu hình.
   */
  optionNames(group: 'sizes' | 'fillings'): string[] {
    const fromConfig = (this.config?.[group] ?? [])
      .filter((option) => option.active)
      .map((option) => option.name);

    const selected =
      group === 'sizes' ? this.selectedSizes : this.selectedFillings;

    return [...new Set([...fromConfig, ...selected])];
  }

  toggleOption(set: Set<string>, name: string): void {
    set.has(name) ? set.delete(name) : set.add(name);
  }

  private display(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  private toRow(v: ProductVariant): VariantRow {
    return {
      _id: v._id,
      label: v.label,
      active: v.active !== false,
      attrs: Object.entries(v.attributes ?? {}).map(([key, orig]) => ({
        key,
        value: this.display(orig),
        orig,
      })),
    };
  }

  addVariant(): void {
    this.variants.push({
      label: '',
      active: true,
      attrs: [],
    });
  }

  addAttr(v: VariantRow): void {
    v.attrs.push({
      key: '',
      value: '',
    });
  }

  private rowToVariant(row: VariantRow): ProductVariant {
    const attributes: Record<string, unknown> = {};

    for (const attr of row.attrs) {
      const key = attr.key.trim();
      if (!key) continue;

      attributes[key] =
        attr.orig !== undefined &&
        typeof attr.orig !== 'string' &&
        attr.value === this.display(attr.orig)
          ? attr.orig
          : attr.value;
    }

    const variant: ProductVariant = {
      label: row.label.trim(),
      attributes,
      active: row.active,
    };

    if (row._id) {
      variant._id = row._id;
    }

    return variant;
  }

  get totalImages(): number {
    return this.existingImageIds.length + this.newImages.length;
  }

  imageUrl(id: unknown): string {
    const cleanId =
      typeof id === 'string'
        ? id
        : (id as { _id?: string; id?: string } | null)?.['_id'] ??
          (id as { _id?: string; id?: string } | null)?.['id'] ??
          '';
    return cleanId ? this.api.getProductImageUrl(cleanId) : '';
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);

    this.imageError = '';

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        this.imageError =
          `“${file.name}” không đúng định dạng. ` +
          'Chỉ nhận JPG, PNG hoặc WebP.';
        continue;
      }

      if (file.size > MAX_BYTES) {
        this.imageError = `“${file.name}” vượt quá 5MB.`;
        continue;
      }

      if (this.totalImages >= MAX_IMAGES) {
        this.imageError = `Mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh.`;
        break;
      }

      this.newImages.push({
        file,
        url: URL.createObjectURL(file),
      });
    }

    input.value = '';
  }

  removeNewImage(index: number): void {
    const image = this.newImages[index];
    if (!image) return;

    URL.revokeObjectURL(image.url);
    this.newImages.splice(index, 1);
    this.imageError = '';
  }

  hasError(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private buildPayload(): ProductPayload {
    const v = this.form.getRawValue();
    const isCake = v.kind === 'cake';
    const sale = v.salePrice as number | null | '';

    return {
      name: (v.name ?? '').trim(),
      kind: v.kind as 'cake' | 'accessory',
      category: (v.category ?? '').trim(),
      occasions: (v.occasionsText ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: v.description ?? '',
      basePrice: Number(v.basePrice),
      salePrice: sale === null || sale === '' ? null : Number(sale),
      status: v.status as 'visible' | 'hidden',
      featured: !!v.featured,
      availableSizes: isCake ? [...this.selectedSizes] : [],
      availableFillings: isCake ? [...this.selectedFillings] : [],
      variants: this.variants.map((row) => this.rowToVariant(row)),
    };
  }

  submit(): void {
    if (this.saving) return;

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toast.error('Vui lòng kiểm tra lại các trường được đánh dấu.');
      return;
    }

    if (this.variants.some((row) => !row.label.trim())) {
      this.toast.error('Mỗi biến thể cần có tên.');
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    const payload = this.buildPayload();

    this.saveSub?.unsubscribe();
    const request$ = this.productId
      ? this.api.updateAdminProduct(this.productId, payload)
      : this.api.createAdminProduct(payload);

    this.saveSub = request$.subscribe({
      next: (product) => {
        const savedId = product?._id || this.productId || '';
        this.cdr.markForCheck();
        this.afterSave(savedId);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(
          err?.error?.message ||
            'Không lưu được sản phẩm. Vui lòng thử lại.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Backend tách API sản phẩm và API ảnh:
   * lưu sản phẩm trước, sau đó mới tải ảnh.
   */
  private afterSave(id: string): void {
    if (!id || this.newImages.length === 0) {
      this.finish();
      return;
    }

    this.uploadSub?.unsubscribe();
    this.uploadSub = this.api
      .uploadProductImages(
        id,
        this.newImages.map((image) => image.file)
      )
      .subscribe({
        next: () => {
          this.finish();
        },
        error: (err) => {
          this.saving = false;
          this.toast.warning(
            `Sản phẩm đã được lưu nhưng tải ảnh thất bại: ${
              err?.error?.message || 'lỗi không xác định'
            }. Bạn có thể thêm ảnh lại ở trang chỉnh sửa.`
          );
          this.cdr.markForCheck();

          if (!this.isEdit) {
            this.router.navigate(['/admin/products', id, 'edit']);
          }
        },
      });
  }

  private finish(): void {
    this.saving = false;
    this.toast.success(
      this.isEdit ? 'Đã cập nhật sản phẩm.' : 'Đã thêm sản phẩm.'
    );
    this.cdr.markForCheck();
    this.router.navigate(['/admin/products']);
  }
}