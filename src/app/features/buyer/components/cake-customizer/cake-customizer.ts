
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  PLATFORM_ID,
  inject,
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

interface MessagePreference {
  occasion: string;
  style: string;
}

interface MessageOption {
  value: string;
  label: string;
}

type CakeCustomizerForm = FormGroup<{
  size: FormControl<string>;
  base: FormControl<string>;
  filling: FormControl<string>;
  frostingColor: FormControl<string>;
  sweetness: FormControl<string>;
  message: FormControl<string>;
  accessories: FormControl<string[]>;
  occasion: FormControl<string>;
  messageStyle: FormControl<string>;
  recipientName: FormControl<string>;
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

  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'sweetcake_message_preferences';

  maxMessageLength = 30;
  sizeSurcharge = 0;
  accessoryTotal = 0;
  estimatedPrice = 0;

  selectedAccessoryVariants: Record<string, string[]> = {};

  // Danh sách lời chúc đang hiển thị.
  messageSuggestions: string[] = [];

  readonly occasionOptions: MessageOption[] = [
    { value: 'birthday', label: 'Sinh nhật' },
    { value: 'anniversary', label: 'Kỷ niệm' },
    { value: 'thanks', label: 'Cảm ơn' },
    { value: 'congratulations', label: 'Chúc mừng' },
    { value: 'love', label: 'Tình yêu' },
    { value: 'encouragement', label: 'Động viên' },
    { value: 'other', label: 'Dịp đặc biệt' },
  ];

  readonly messageStyleOptions: MessageOption[] = [
    { value: 'sweet', label: 'Ngọt ngào' },
    { value: 'elegant', label: 'Tinh tế' },
    { value: 'funny', label: 'Vui nhộn' },
    { value: 'warm', label: 'Ấm áp' },
  ];

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

      // Không mặc định chọn dịp tặng hoặc phong cách.
      occasion: [''],
      messageStyle: [''],
      recipientName: [''],
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
  // MESSAGE PERSONALIZATION
  // ========================================

  get recipientName(): string {
    return this.form.controls.recipientName.value.trim();
  }

  /**
   * Tạo danh sách lời chúc ngẫu nhiên.
   *
   * - Không chọn dịp: lấy mẫu từ tất cả các dịp.
   * - Không chọn phong cách: lấy mẫu từ tất cả phong cách.
   * - Có chọn thông tin nào: lọc theo thông tin đó.
   * - Chỉ lấy lời chúc không vượt quá giới hạn ký tự.
   */
  private refreshMessageSuggestions(): void {
    const occasion = this.form.controls.occasion.value;
    const style = this.form.controls.messageStyle.value;
    const name = this.recipientName;

    const messages: Record<string, Record<string, string[]>> = {
      birthday: {
        sweet: [
          'Chúc {name} tuổi mới thật ngọt ngào!',
          'Mãi xinh tươi và hạnh phúc nhé {name}!',
          'Tuổi mới, niềm vui mới, yêu thương thật nhiều!',
          'Chúc mọi điều ước của {name} thành hiện thực!',
          'Một ngày sinh nhật tràn đầy yêu thương nhé!',
        ],
        elegant: [
          'Chúc {name} tuổi mới an nhiên và rạng rỡ.',
          'Một tuổi mới với thật nhiều điều tốt đẹp.',
          'Chúc {name} luôn thành công và hạnh phúc.',
          'Thêm tuổi mới, thêm những hành trình đáng nhớ.',
          'Chúc ngày đặc biệt của {name} thật trọn vẹn.',
        ],
        funny: [
          'Chúc mừng sinh nhật, trẻ mãi không già nhé!',
          'Thêm tuổi mới, thêm nhiều tiền nha {name}!',
          'Hôm nay cứ ăn bánh, chuyện khác tính sau!',
          'Chúc {name} tuổi mới vui hết cỡ!',
          'Sinh nhật vui vẻ, quà đâu chưa thấy bánh đây!',
        ],
        warm: [
          'Chúc {name} luôn bình an và được yêu thương.',
          'Mong tuổi mới mang đến thật nhiều niềm vui.',
          'Cảm ơn vì đã luôn tuyệt vời như thế.',
          'Chúc {name} có một ngày thật đáng nhớ.',
          'Mong mọi điều dịu dàng sẽ đến bên {name}.',
        ],
      },

      anniversary: {
        sweet: [
          'Mong chúng ta luôn bên nhau thật lâu.',
          'Thêm một chặng đường, thêm nhiều yêu thương.',
          'Mỗi ngày bên nhau đều là một món quà.',
          'Cùng nhau viết tiếp những ngày thật đẹp.',
          'Gửi {name} tất cả yêu thương của mình.',
        ],
        elegant: [
          'Trân trọng từng khoảnh khắc bên nhau.',
          'Một hành trình đẹp, một tình yêu bền lâu.',
          'Chúc chúng ta luôn đồng hành và thấu hiểu.',
          'Mong những điều tốt đẹp luôn ở phía trước.',
          'Kỷ niệm đẹp được viết nên từ hai chúng ta.',
        ],
        funny: [
          'Cảm ơn vì vẫn chịu đựng nhau đến hôm nay!',
          'Thêm một năm đồng hành, vẫn chưa chán nhau!',
          'Mãi bên nhau, bánh thì nhớ chia đều nhé!',
          'Yêu nhau lâu dài, ăn bánh lâu hơn nữa!',
          'Chúng ta đúng là một cặp thật tuyệt!',
        ],
        warm: [
          'Cảm ơn vì luôn là một phần đặc biệt.',
          'Mong chúng ta luôn có nhau trong mọi hành trình.',
          'Thật hạnh phúc vì được đồng hành cùng nhau.',
          'Chúc những yêu thương luôn được gìn giữ.',
          'Cùng nhau lưu giữ thêm thật nhiều kỷ niệm.',
        ],
      },

      thanks: {
        sweet: [
          'Cảm ơn {name} vì tất cả những điều tốt đẹp!',
          'Một chút ngọt ngào thay lời cảm ơn.',
          'Thật may mắn khi có {name} bên cạnh.',
          'Cảm ơn vì đã luôn quan tâm và sẻ chia.',
          'Gửi đến {name} thật nhiều yêu thương.',
        ],
        elegant: [
          'Trân trọng và biết ơn những điều bạn đã làm.',
          'Xin gửi lời cảm ơn chân thành nhất.',
          'Cảm ơn vì sự tận tâm và chu đáo.',
          'Một món quà nhỏ thay lời tri ân.',
          'Thật trân quý những điều tốt đẹp bạn mang đến.',
        ],
        funny: [
          'Cảm ơn nhiều nha, bánh này là quà đó!',
          'Công ơn này xin trả bằng một chiếc bánh!',
          'Cảm ơn {name}, bạn đúng là tuyệt nhất!',
          'Nhận bánh rồi nhớ nhận luôn lời cảm ơn nhé!',
          'Cảm ơn thật nhiều, ăn bánh thật vui nha!',
        ],
        warm: [
          'Cảm ơn vì đã luôn ở đây.',
          'Sự tử tế của bạn luôn được trân trọng.',
          'Mong chút ngọt ngào này thay lời cảm ơn.',
          'Biết ơn vì đã mang đến những điều tốt đẹp.',
          'Chúc {name} luôn nhận lại thật nhiều yêu thương.',
        ],
      },

      congratulations: {
        sweet: [
          'Chúc mừng {name}, bạn thật tuyệt vời!',
          'Thành công hôm nay, rực rỡ ngày mai!',
          'Tự hào về những gì bạn đã đạt được!',
          'Chúc niềm vui này còn kéo dài mãi!',
          'Một cột mốc đáng nhớ, một khởi đầu mới!',
        ],
        elegant: [
          'Chúc mừng thành tựu xứng đáng của bạn.',
          'Chúc {name} tiếp tục vững bước và tỏa sáng.',
          'Một dấu mốc đẹp trên hành trình thành công.',
          'Chúc những mục tiêu tiếp theo đều thành hiện thực.',
          'Thành công hôm nay mở ra nhiều cơ hội mới.',
        ],
        funny: [
          'Đỉnh quá {name} ơi, bánh thưởng đây!',
          'Chúc mừng nhé, khao bánh thôi nào!',
          'Thành công rực rỡ, ăn bánh hết mình!',
          'Bạn làm được rồi, quá là xuất sắc!',
          'Hôm nay bạn là nhân vật chính!',
        ],
        warm: [
          'Chúc mừng {name}, mọi nỗ lực đều xứng đáng.',
          'Mong bạn luôn tự hào về chính mình.',
          'Chúc hành trình phía trước thật nhiều niềm vui.',
          'Thành quả ngọt ngào dành cho bạn.',
          'Luôn tin tưởng và chúc bạn thành công.',
        ],
      },

      love: {
        sweet: [
          'Gửi {name} ngàn điều yêu thương.',
          'Bạn là điều ngọt ngào nhất của mình.',
          'Thế giới của mình đẹp hơn khi có bạn.',
          'Mỗi ngày đều muốn dành điều tốt đẹp cho bạn.',
          'Thương {name} thật nhiều!',
        ],
        elegant: [
          'You are my sweetest moment.',
          'Một tình yêu, muôn vàn điều trân quý.',
          'Cảm ơn vì đã làm cuộc sống thêm đẹp.',
          'Bên bạn, mọi khoảnh khắc đều đáng nhớ.',
          'Gửi người đặc biệt nhất của mình.',
        ],
        funny: [
          'Yêu bạn nhiều hơn cả chiếc bánh này!',
          'Bạn là gu, bánh là phụ!',
          'Đã yêu là phải có bánh nhé!',
          'Tim mình thuộc về bạn, bánh thì chia đôi!',
          'Cảnh báo: chiếc bánh này có vị yêu thương!',
        ],
        warm: [
          'Mong luôn được cùng bạn sẻ chia mọi điều.',
          'Cảm ơn vì đã đến và ở lại.',
          'Bạn luôn là điều đặc biệt trong tim mình.',
          'Chúc chúng ta luôn bình yên bên nhau.',
          'Gửi bạn một chiếc bánh và thật nhiều thương mến.',
        ],
      },

      encouragement: {
        sweet: [
          'Cố lên {name}, bạn làm được mà!',
          'Mọi chuyện rồi sẽ tốt đẹp hơn.',
          'Gửi bạn một chút ngọt ngào và động lực.',
          'Tin vào bản thân nhé!',
          'Ngày mai sẽ là một ngày thật tươi sáng.',
        ],
        elegant: [
          'Kiên trì hôm nay, thành quả ngày mai.',
          'Chúc {name} luôn vững vàng trên hành trình.',
          'Mỗi bước tiến đều đáng được trân trọng.',
          'Hãy tin vào khả năng của chính mình.',
          'Những điều tốt đẹp đang chờ phía trước.',
        ],
        funny: [
          'Buồn thì ăn bánh, vui cũng ăn bánh!',
          'Nạp đường rồi chiến tiếp nhé {name}!',
          'Bạn mạnh mẽ hơn chiếc deadline nhiều!',
          'Cố lên, bánh đang chờ bạn!',
          'Không gì là không thể, trừ việc nhịn bánh!',
        ],
        warm: [
          'Mong bạn luôn tìm thấy bình yên.',
          'Bạn không đơn độc trên hành trình này.',
          'Hãy nhẹ nhàng với bản thân một chút nhé.',
          'Chúc {name} sớm vượt qua mọi khó khăn.',
          'Gửi bạn thật nhiều năng lượng tích cực.',
        ],
      },

      other: {
        sweet: [
          'Chúc {name} luôn ngập tràn niềm vui!',
          'Một ngày đặc biệt thật ngọt ngào nhé!',
          'Mong mọi điều tốt đẹp sẽ đến với bạn.',
          'Gửi bạn một chiếc bánh đầy yêu thương.',
          'Chúc ngày hôm nay thật đáng nhớ!',
        ],
        elegant: [
          'Chúc bạn luôn hạnh phúc và thành công.',
          'Mong những điều tốt đẹp luôn đồng hành.',
          'Một dịp đặc biệt, một món quà chân thành.',
          'Chúc mọi dự định đều thuận lợi.',
          'Trân trọng những khoảnh khắc đáng nhớ.',
        ],
        funny: [
          'Có bánh là có niềm vui!',
          'Hôm nay cứ vui, chuyện khác để mai!',
          'Chúc bạn vui như lúc mở hộp bánh!',
          'Một chiếc bánh, vạn niềm vui!',
          'Ăn bánh trước, tính tiếp sau nhé!',
        ],
        warm: [
          'Chúc bạn luôn được yêu thương và trân trọng.',
          'Mong hôm nay mang đến nhiều niềm vui.',
          'Gửi bạn những điều chân thành nhất.',
          'Chúc mọi khoảnh khắc đều thật ý nghĩa.',
          'Mong nụ cười luôn ở trên môi bạn.',
        ],
      },
    };

    const candidates: string[] = [];

    // Duyệt qua tất cả dịp phù hợp với lựa chọn hiện tại.
    for (const [occasionKey, styles] of Object.entries(messages)) {
      if (occasion && occasionKey !== occasion) {
        continue;
      }

      // Duyệt qua tất cả phong cách phù hợp.
      for (const [styleKey, templates] of Object.entries(styles)) {
        if (style && styleKey !== style) {
          continue;
        }

        candidates.push(...templates);
      }
    }

    // Thay tên người nhận và chỉ giữ lời chúc đủ điều kiện.
    const validMessages = [
      ...new Set(
        candidates
          .map(message =>
            message.replaceAll('{name}', name || 'bạn').trim()
          )
          .filter(message =>
            message.length > 0 &&
            message.length <= this.maxMessageLength
          )
      ),
    ];

    // Xáo trộn ngẫu nhiên các lời chúc hợp lệ.
    for (let i = validMessages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [validMessages[i], validMessages[j]] = [
        validMessages[j],
        validMessages[i],
      ];
    }

    // Chỉ hiển thị tối đa 5 lời chúc.
    this.messageSuggestions = validMessages.slice(0, 5);
  }

  applyMessageSuggestion(message: string): void {
    // Kiểm tra lại giới hạn trước khi điền vào ô lời nhắn.
    if (message.length > this.maxMessageLength) {
      return;
    }

    this.form.controls.message.setValue(message);
    this.form.controls.message.markAsDirty();
    this.form.controls.message.markAsTouched();
  }

  /**
   * Lưu lựa chọn gần nhất trên thiết bị.
   * Không tự động khôi phục lựa chọn này vào form khi mở trang.
   */
  private saveMessagePreferences(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const preference: MessagePreference = {
        occasion: this.form.controls.occasion.value,
        style: this.form.controls.messageStyle.value,
      };

      localStorage.setItem(
        this.storageKey,
        JSON.stringify(preference)
      );
    } catch {
      // Không làm gián đoạn thao tác tùy chỉnh nếu storage không khả dụng.
    }
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
        this.refreshMessageSuggestions();
        this.calculatePrice();
        this.saveMessagePreferences();
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
    this.refreshMessageSuggestions();
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

    const currentMessage = messageControl.value;

    if (currentMessage.length > this.maxMessageLength) {
      messageControl.setValue(
        currentMessage.slice(0, this.maxMessageLength),
        { emitEvent: false }
      );
    }

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
