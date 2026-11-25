
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';

import {
  CustomizationOption,
  ProductCustomization,
} from '@core/services/api.service';

// ========================================
// INTERFACES
// ========================================

export interface CakeSizeOption {
  name: string;
  surcharge: number;
  maxMessageLength: number;
}

export interface AccessoryVariantOption {
  id: string;
  label: string;
}

export interface AccessoryOption {
  id: string;
  name: string;
  price: number;
  variants: AccessoryVariantOption[];
}

export interface CakeCustomization {
  size: string;
  base: string;
  filling: string;
  frostingColor: string;
  sweetness: string;
  message: string;
  accessories: string[];
  accessoryVariants: Record<string, string[]>;
  basePrice: number;
  sizeSurcharge: number;
  accessoryTotal: number;
  estimatedPrice: number;
}

type CakeCustomizerForm = FormGroup<{
  size: FormControl<string>;
  base: FormControl<string>;
  filling: FormControl<string>;
  frostingColor: FormControl<string>;
  sweetness: FormControl<string>;
  message: FormControl<string>;
  accessories: FormControl<string[]>;
}>;

@Component({
  selector: 'app-cake-customizer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cake-customizer.html',
  styleUrl: './cake-customizer.scss',
})
export class CakeCustomizer implements OnInit, OnChanges {

  @Input() basePrice = 0;
  @Input() promotionPrice: number | null = null;
  @Input() isPromotionValid = false;

  @Input() accessoryOptions: AccessoryOption[] = [];

  @Input() customizationConfig: ProductCustomization | null = null;

  @Input() productAvailableSizes: string[] = [];
  @Input() productAvailableFillings: string[] = [];

  @Output() customizationChange =
    new EventEmitter<CakeCustomization>();

  readonly form: CakeCustomizerForm;

  maxMessageLength = 30;
  sizeSurcharge = 0;
  accessoryTotal = 0;
  estimatedPrice = 0;

  // Mỗi phụ kiện có thể chọn nhiều biến thể.
  selectedAccessoryVariants: Record<string, string[]> = {};

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly destroyRef: DestroyRef
  ) {
    this.form = this.formBuilder.nonNullable.group({
      size: ['', Validators.required],
      base: ['', Validators.required],
      filling: ['', Validators.required],
      frostingColor: ['', Validators.required],
      sweetness: ['', Validators.required],
      message: ['', Validators.maxLength(140)],
      accessories: this.formBuilder.nonNullable.control<string[]>([]),
    });
  }

  // ========================================
  // CONFIGURATION OPTIONS
  // ========================================

  get sizeOptions(): CakeSizeOption[] {
    const configuredSizes = this.customizationConfig?.sizes ?? [];

    return configuredSizes
      .filter(option =>
        this.productAvailableSizes.length === 0 ||
        this.productAvailableSizes.includes(option.name)
      )
      .map(option => ({
        name: option.name,
        surcharge: option.priceDiff,
        maxMessageLength: option.maxChars ?? 30,
      }));
  }

  get baseOptions(): string[] {
    return (this.customizationConfig?.bases ?? [])
      .map(option => option.name);
  }

  get fillingOptions(): string[] {
    const configuredFillings =
      this.customizationConfig?.fillings ?? [];

    return configuredFillings
      .filter(option =>
        this.productAvailableFillings.length === 0 ||
        this.productAvailableFillings.includes(option.name)
      )
      .map(option => option.name);
  }

  get frostingOptions(): { name: string; value: string }[] {
    return (this.customizationConfig?.frostingColors ?? [])
      .map(option => ({
        name: option.name,
        value: this.getFrostingColor(option.name),
      }));
  }

  get sweetnessOptions(): { label: string; value: string }[] {
    return (this.customizationConfig?.sweetnessLevels ?? [])
      .map(option => ({
        label: option.name,
        value: option.name,
      }));
  }

  private getFrostingColor(name: string): string {
    const colors: Record<string, string> = {
      'Trắng': '#fffaf7',
      'Hồng': '#f2b8c6',
      'Hồng đậm': '#d98ba2',
      'Xanh dương': '#a8c8e8',
      'Xanh': '#a8c8b5',
      'Vàng': '#f5dc91',
      'Nâu': '#8b604b',
    };

    return colors[name] ?? '#e8dfe2';
  }

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.updateMessageLimit();
        this.calculatePrice();
        this.emitCustomization();
      });

    if (this.customizationConfig) {
      this.syncConfigurationToForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['customizationConfig'] ||
      changes['productAvailableSizes'] ||
      changes['productAvailableFillings']
    ) {
      this.syncConfigurationToForm();
    }

    if (
      changes['basePrice'] ||
      changes['promotionPrice'] ||
      changes['isPromotionValid'] ||
      changes['accessoryOptions']
    ) {
      this.calculatePrice();
      this.emitCustomization();
    }
  }

  // ========================================
  // SYNC CONFIGURATION
  // ========================================

  private syncConfigurationToForm(): void {
    if (!this.customizationConfig) {
      return;
    }

    const sizeOptions = this.sizeOptions;
    const baseOptions = this.baseOptions;
    const fillingOptions = this.fillingOptions;
    const frostingOptions = this.frostingOptions;
    const sweetnessOptions = this.sweetnessOptions;

    const current = this.form.getRawValue();
    const config = this.customizationConfig;

    const getDefault = (
      options: CustomizationOption[],
      availableNames: string[],
      currentValue: string
    ): string => {
      if (availableNames.includes(currentValue)) {
        return currentValue;
      }

      return (
        options.find(option =>
          option.isDefault && availableNames.includes(option.name)
        )?.name ??
        availableNames[0] ??
        ''
      );
    };

    this.form.patchValue(
      {
        size: getDefault(
          config.sizes ?? [],
          sizeOptions.map(option => option.name),
          current.size
        ),
        base: getDefault(
          config.bases ?? [],
          baseOptions,
          current.base
        ),
        filling: getDefault(
          config.fillings ?? [],
          fillingOptions,
          current.filling
        ),
        frostingColor: getDefault(
          config.frostingColors ?? [],
          frostingOptions.map(option => option.name),
          current.frostingColor
        ),
        sweetness: getDefault(
          config.sweetnessLevels ?? [],
          sweetnessOptions.map(option => option.value),
          current.sweetness
        ),
      },
      { emitEvent: false }
    );

    this.updateMessageLimit();
    this.calculatePrice();
    this.emitCustomization();
  }

  // ========================================
  // PRICE
  // ========================================

  get appliedBasePrice(): number {
    const originalPrice = Number(this.basePrice);

    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
      return 0;
    }

    const salePrice = Number(this.promotionPrice);

    const hasValidPromotion =
      this.isPromotionValid &&
      this.promotionPrice !== null &&
      Number.isFinite(salePrice) &&
      salePrice >= 0 &&
      salePrice < originalPrice;

    return hasValidPromotion ? salePrice : originalPrice;
  }

  private calculatePrice(): void {
    const selectedSize = this.form.controls.size.value;

    const sizeOption = this.sizeOptions.find(
      option => option.name === selectedSize
    );

    this.sizeSurcharge = sizeOption?.surcharge ?? 0;

    const selectedIds = this.selectedAccessories;

    // Mỗi loại phụ kiện được tính giá một lần,
    // không phụ thuộc số biến thể được chọn.
    this.accessoryTotal = this.accessoryOptions
      .filter(option => selectedIds.includes(option.id))
      .reduce((total, option) => {
        const price = Number(option.price);

        return total + (
          Number.isFinite(price) && price >= 0 ? price : 0
        );
      }, 0);

    this.estimatedPrice = Math.round(
      this.appliedBasePrice +
      this.sizeSurcharge +
      this.accessoryTotal
    );
  }

  // ========================================
  // MESSAGE LIMIT
  // ========================================

  private updateMessageLimit(): void {
    const selectedSize = this.form.controls.size.value;

    const sizeOption = this.sizeOptions.find(
      option => option.name === selectedSize
    );

    this.maxMessageLength = sizeOption?.maxMessageLength ?? 30;

    const messageControl = this.form.controls.message;

    messageControl.setValidators([
      Validators.maxLength(this.maxMessageLength),
    ]);

    messageControl.updateValueAndValidity({
      emitEvent: false,
    });
  }

  get messageLength(): number {
    return this.form.controls.message.value.length;
  }

  get remainingCharacters(): number {
    return Math.max(
      0,
      this.maxMessageLength - this.messageLength
    );
  }

  // ========================================
  // ACCESSORIES
  // ========================================

  get selectedAccessories(): string[] {
    return this.form.controls.accessories.value;
  }

  isAccessorySelected(id: string): boolean {
    return this.selectedAccessories.includes(id);
  }

  getSelectedVariantIds(accessoryId: string): string[] {
    return [...(this.selectedAccessoryVariants[accessoryId] ?? [])];
  }

  getSelectedVariantLabels(accessory: AccessoryOption): string[] {
    const selectedIds = this.getSelectedVariantIds(accessory.id);

    return accessory.variants
      .filter(variant => selectedIds.includes(variant.id))
      .map(variant => variant.label);
  }

  isVariantSelected(accessoryId: string, variantId: string): boolean {
    return (
      this.selectedAccessoryVariants[accessoryId]?.includes(variantId) ??
      false
    );
  }

  toggleAccessory(id: string, checked: boolean): void {
    const current = this.selectedAccessories;

    const next = checked
      ? (current.includes(id) ? current : [...current, id])
      : current.filter(item => item !== id);

    if (!checked) {
      const nextVariants = { ...this.selectedAccessoryVariants };
      delete nextVariants[id];

      this.selectedAccessoryVariants = nextVariants;
    }

    this.form.controls.accessories.setValue(next);
  }

  onAccessoryVariantChange(
    accessoryId: string,
    variantId: string,
    checked: boolean
  ): void {
    const current = this.getSelectedVariantIds(accessoryId);

    const next = checked
      ? (
          current.includes(variantId)
            ? current
            : [...current, variantId]
        )
      : current.filter(id => id !== variantId);

    this.selectedAccessoryVariants = {
      ...this.selectedAccessoryVariants,
      [accessoryId]: next,
    };

    this.calculatePrice();
    this.emitCustomization();
  }

  // ========================================
  // EMIT CUSTOMIZATION
  // ========================================

  private emitCustomization(): void {
    const values = this.form.getRawValue();

    const accessoryVariants: Record<string, string[]> = {};

    for (const [accessoryId, variantIds] of Object.entries(
      this.selectedAccessoryVariants
    )) {
      accessoryVariants[accessoryId] = [...variantIds];
    }

    this.customizationChange.emit({
      size: values.size,
      base: values.base,
      filling: values.filling,
      frostingColor: values.frostingColor,
      sweetness: values.sweetness,
      message: values.message,
      accessories: [...values.accessories],
      accessoryVariants,
      basePrice: this.appliedBasePrice,
      sizeSurcharge: this.sizeSurcharge,
      accessoryTotal: this.accessoryTotal,
      estimatedPrice: this.estimatedPrice,
    });
  }
}
