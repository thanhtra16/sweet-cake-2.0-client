import { ChangeDetectorRef, Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, CustomizationOption, CustomizationPayload, ProductCustomization } from '../../../../core/services/api.service';

import { ToastService } from '../../../../core/services/toast.service';
import { LoadingEmptyComponent } from '../../../../shared/components/loading-empty/loading-empty.component';

type GroupKey =
  | 'sizes'
  | 'fillings'
  | 'bases'
  | 'frostingColors'
  | 'sweetnessLevels';

type RequiredKey =
  | 'base'
  | 'frostingColor'
  | 'sweetness';

interface OptionRow {
  name: string;
  priceDiff: number | null;
  isDefault: boolean;
  active: boolean;
  maxChars: number | null;
}

@Component({
  selector: 'app-admin-customizations',
  standalone: true,
  imports: [FormsModule, LoadingEmptyComponent],
  templateUrl: './admin-customizations.html',
  styleUrls: [
    '../../styles/admin-page.css',
    './admin-customizations.css',
  ],
})
export class AdminCustomizationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly isBrowser = isPlatformBrowser(
    inject(PLATFORM_ID)
  );

  readonly groups: {
    key: GroupKey;
    label: string;
    hint: string;
    showMaxChars: boolean;
  }[] = [
    {
      key: 'sizes',
      label: 'Kích thước',
      hint: 'Phụ thu theo size và giới hạn ký tự lời nhắn trên bánh.',
      showMaxChars: true,
    },
    {
      key: 'fillings',
      label: 'Nhân bánh',
      hint: 'Các loại nhân khách có thể chọn.',
      showMaxChars: false,
    },
    {
      key: 'bases',
      label: 'Cốt bánh',
      hint: 'Các loại cốt bánh khách có thể chọn.',
      showMaxChars: false,
    },
    {
      key: 'frostingColors',
      label: 'Màu kem',
      hint: 'Màu kem phủ ngoài bánh.',
      showMaxChars: false,
    },
    {
      key: 'sweetnessLevels',
      label: 'Độ ngọt',
      hint: 'Mức độ ngọt khách có thể chọn.',
      showMaxChars: false,
    },
  ];

  readonly requiredFields: {
    key: RequiredKey;
    label: string;
  }[] = [
    { key: 'base', label: 'Cốt bánh' },
    { key: 'frostingColor', label: 'Màu kem' },
    { key: 'sweetness', label: 'Độ ngọt' },
  ];

  activeTab: GroupKey | 'rules' = 'sizes';

  loading = false;
  saving = false;
  error = '';

  rows: Record<GroupKey, OptionRow[]> = {
    sizes: [],
    fillings: [],
    bases: [],
    frostingColors: [],
    sweetnessLevels: [],
  };

  required: Record<RequiredKey, boolean> = {
    base: false,
    frostingColor: false,
    sweetness: false,
  };

  bannedWords: string[] = [];
  newWord = '';

  get currentGroup() {
    return this.groups.find(
      (g) => g.key === this.activeTab
    );
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.load();
    }
  }

  // ---------- Tải cấu hình ----------

  load(): void {
    if (this.loading || this.saving) return;

    this.loading = true;
    this.error = '';

    this.cdr.markForCheck();

    this.api.getAdminCustomization().subscribe({
      next: (c) => {
        this.apply(c);
        this.loading = false;

        this.cdr.markForCheck();
      },

      error: (err) => {
        this.loading = false;

        if (err?.status === 404) {
          // Backend chưa có cấu hình:
          // bắt đầu từ bảng trống, PUT sẽ tạo mới.
          this.apply(null);

          this.toast.info(
            'Chưa có cấu hình tùy biến. Hãy thêm tùy chọn rồi lưu.'
          );
        } else {
          this.error =
            err?.error?.message ||
            'Không tải được cấu hình tùy biến. Vui lòng thử lại.';
        }

        this.cdr.markForCheck();
      },
    });
  }

  private apply(
    c: ProductCustomization | null
  ): void {
    for (const g of this.groups) {
      this.rows[g.key] = (
        c?.[g.key] ?? []
      ).map((o: CustomizationOption) => ({
        name: o.name,
        priceDiff: o.priceDiff ?? 0,
        isDefault: !!o.isDefault,
        active: o.active !== false,
        maxChars: o.maxChars ?? null,
      }));
    }

    this.required = {
      base: !!c?.required?.base,
      frostingColor: !!c?.required?.frostingColor,
      sweetness: !!c?.required?.sweetness,
    };

    this.bannedWords = [
      ...(c?.bannedWords ?? []),
    ];
  }

  // ---------- Thao tác trên bảng ----------

  addRow(key: GroupKey): void {
    this.rows[key].push({
      name: '',
      priceDiff: 0,
      isDefault: false,
      active: true,
      maxChars: null,
    });
  }

  removeRow(
    key: GroupKey,
    index: number
  ): void {
    this.rows[key].splice(index, 1);
  }

  /** Mỗi nhóm chỉ có tối đa một tùy chọn mặc định. */
  toggleDefault(
    key: GroupKey,
    index: number
  ): void {
    const row = this.rows[key][index];

    if (!row || !row.active) return;

    const next = !row.isDefault;

    this.rows[key].forEach((r) => {
      r.isDefault = false;
    });

    row.isDefault = next;
  }

  // ---------- Thao tác từ khóa bị cấm ----------

  addWord(): void {
    const word = this.newWord
      .normalize('NFC')
      .trim();

    if (
      word &&
      !this.bannedWords.some(
        (w) => w.toLowerCase() === word.toLowerCase()
      )
    ) {
      this.bannedWords.push(word);
    }

    this.newWord = '';
  }

  removeWord(word: string): void {
    this.bannedWords = this.bannedWords.filter(
      (w) => w !== word
    );
  }

  // ---------- Kiểm tra dữ liệu ----------

  private validate(): string | null {
    for (const g of this.groups) {
      const seen = new Set<string>();

      for (const r of this.rows[g.key]) {
        const name = r.name
          .normalize('NFC')
          .trim();

        if (!name) {
          return `Nhóm “${g.label}” có tùy chọn chưa nhập tên.`;
        }

        const normalizedName = name.toLowerCase();

        if (seen.has(normalizedName)) {
          return `Nhóm “${g.label}” bị trùng tên “${name}”.`;
        }

        seen.add(normalizedName);

        if (
          r.priceDiff !== null &&
          (
            !Number.isFinite(Number(r.priceDiff)) ||
            Number(r.priceDiff) < 0
          )
        ) {
          return `Giá chênh lệch của “${name}” phải là số không âm.`;
        }

        if (
          r.maxChars !== null &&
          (
            !Number.isInteger(Number(r.maxChars)) ||
            Number(r.maxChars) < 0
          )
        ) {
          return `Giới hạn ký tự của “${name}” phải là số nguyên không âm.`;
        }
      }
    }

    return null;
  }

  // ---------- Xây dựng dữ liệu gửi API ----------

  private buildPayload(): CustomizationPayload {
    const payload: CustomizationPayload = {
      required: { ...this.required },
      bannedWords: [...this.bannedWords],
    };

    for (const g of this.groups) {
      // Chỉ gửi đúng các trường được backend hỗ trợ.
      payload[g.key] = this.rows[g.key].map((r) => ({
        name: r.name.normalize('NFC').trim(),
        priceDiff: Number(r.priceDiff ?? 0),
        isDefault: r.isDefault,
        active: r.active,
        maxChars:
          r.maxChars === null
            ? null
            : Number(r.maxChars),
      }));
    }

    return payload;
  }

  // ---------- Lưu cấu hình ----------

  save(): void {
    if (this.saving || this.loading) return;

    const problem = this.validate();

    if (problem) {
      this.toast.error(problem);
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    this.api
      .updateAdminCustomization(this.buildPayload())
      .subscribe({
        next: (saved) => {
          this.apply(saved);
          this.saving = false;

          this.toast.success(
            'Đã lưu cấu hình tùy biến.'
          );

          this.cdr.markForCheck();
        },

        error: (err) => {
          this.saving = false;

          this.toast.error(
            err?.error?.message ||
            'Không lưu được cấu hình. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        },
      });
  }
}
