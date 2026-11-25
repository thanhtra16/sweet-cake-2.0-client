import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { CheckoutApiService } from '@core/services/checkout-api.service';
import { CartService } from '@shared/services/cart.service';

import {
  CreateOrderRequest,
  OrderQuote,
  PublicSettings,
  TimeSlot,
} from '@shared/models/checkout.model';

interface BuyNowData {
  source?: 'buy_now' | 'cart';
  cartItemIds?: string[];
  items: Array<{
    productId: string;
    qty: number;
    config?: {
      size: string;
      base: string;
      filling: string;
      frostingColor: string;
      sweetness: string;
      message: string;
    };
    variant?: string;
  }>;
  receiveMethod?: 'pickup' | 'delivery';
}

interface BranchOption {
  _id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

const DEFAULT_BRANCHES: BranchOption[] = [
  {
    _id: 'branch-thu-duc',
    name: 'SweetCake Thủ Đức',
    address: '669 Đỗ Mười, Phường Linh Xuân, TP.HCM',
    lat: 10.8705,
    lng: 106.7782,
  },
  {
    _id: 'branch-quan-1',
    name: 'SweetCake Quận 1',
    address: '45 Lê Lợi, Phường Bến Nghé, TP.HCM',
    lat: 10.7734,
    lng: 106.7009,
  },
];

// 102 Phường / Xã thuộc TP.HCM cũ theo Nghị quyết 1685/NQ-UBTVQH15 (không còn cấp Quận/Huyện)
const HCM_WARDS: string[] = [
  'Phường An Đông',
  'Phường An Hội Đông',
  'Phường An Hội Tây',
  'Phường An Khánh',
  'Phường An Lạc',
  'Phường An Nhơn',
  'Phường An Phú Đông',
  'Phường Bàn Cờ',
  'Phường Bảy Hiền',
  'Phường Bến Thành',
  'Phường Bình Đông',
  'Phường Bình Hưng Hòa',
  'Phường Bình Lợi Trung',
  'Phường Bình Phú',
  'Phường Bình Quới',
  'Phường Bình Tây',
  'Phường Bình Thạnh',
  'Phường Bình Thới',
  'Phường Bình Tiên',
  'Phường Bình Trị Đông',
  'Phường Bình Trưng',
  'Phường Bình Tân',
  'Phường Cát Lái',
  'Phường Cầu Kiệu',
  'Phường Cầu Ông Lãnh',
  'Phường Chánh Hưng',
  'Phường Chợ Lớn',
  'Phường Chợ Quán',
  'Phường Diên Hồng',
  'Phường Đông Hưng Thuận',
  'Phường Đức Nhuận',
  'Phường Gia Định',
  'Phường Gò Vấp',
  'Phường Hạnh Thông',
  'Phường Hiệp Bình',
  'Phường Hòa Bình',
  'Phường Hòa Hưng',
  'Phường Khánh Hội',
  'Phường Linh Xuân',
  'Phường Long Bình',
  'Phường Long Phước',
  'Phường Long Trường',
  'Phường Minh Phụng',
  'Phường Nhiêu Lộc',
  'Phường Phú Định',
  'Phường Phú Lâm',
  'Phường Phú Nhuận',
  'Phường Phú Thạnh',
  'Phường Phú Thọ',
  'Phường Phú Thọ Hòa',
  'Phường Phú Thuận',
  'Phường Phước Long',
  'Phường Sài Gòn',
  'Phường Tam Bình',
  'Phường Tăng Nhơn Phú',
  'Phường Tân Bình',
  'Phường Tân Định',
  'Phường Tân Hòa',
  'Phường Tân Hưng',
  'Phường Tân Mỹ',
  'Phường Tân Phú',
  'Phường Tân Sơn',
  'Phường Tân Sơn Hòa',
  'Phường Tân Sơn Nhất',
  'Phường Tân Sơn Nhì',
  'Phường Tân Tạo',
  'Phường Tân Thới Hiệp',
  'Phường Tân Thuận',
  'Phường Tây Thạnh',
  'Phường Thạnh Mỹ Tây',
  'Phường Thông Tây Hội',
  'Phường Thới An',
  'Phường Thủ Đức',
  'Phường Trung Mỹ Tây',
  'Phường Vĩnh Hội',
  'Phường Vườn Lài',
  'Phường Xóm Chiếu',
  'Phường Xuân Hòa',
  'Xã An Nhơn Tây',
  'Xã An Thới Đông',
  'Xã Bà Điểm',
  'Xã Bình Chánh',
  'Xã Bình Hưng',
  'Xã Bình Khánh',
  'Xã Bình Lợi',
  'Xã Bình Mỹ',
  'Xã Cần Giờ',
  'Xã Củ Chi',
  'Xã Đông Thạnh',
  'Xã Hiệp Phước',
  'Xã Hóc Môn',
  'Xã Hưng Long',
  'Xã Nhà Bè',
  'Xã Nhuận Đức',
  'Xã Phú Hòa Đông',
  'Xã Tân An Hội',
  'Xã Tân Nhựt',
  'Xã Tân Vĩnh Lộc',
  'Xã Thái Mỹ',
  'Xã Thạnh An',
  'Xã Vĩnh Lộc',
  'Xã Xuân Thới Sơn',
];

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class CheckoutPage implements OnInit {
  private readonly api = inject(CheckoutApiService);
  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly BUY_NOW_STORAGE_KEY = 'sweetcake_buy_now';

  readonly hcmWards: string[] = HCM_WARDS;

  settings?: PublicSettings;
  branches: BranchOption[] = DEFAULT_BRANCHES.map((b) => ({ ...b }));
  slots: TimeSlot[] = [];
  quote?: OrderQuote;

  loading = false;
  loadingSettings = false;
  loadingSlots = false;
  loadingQuote = false;
  locatingUser = false;
  isLoggedIn = false;

  activeDropdown: 'ward' | null = null;
  wardSearch = '';

  error = '';
  settingsError = '';
  slotsError = '';
  quoteError = '';
  voucherError = '';
  locationError = '';

  fieldErrors = {
    fullName: '',
    phone: '',
  };

  voucherCode = '';
  selectedDate = '';
  selectedSlotId = '';
  selectedBranch = DEFAULT_BRANCHES[0]._id!;
  minDate = '';
  maxDate = '';

  userCoords: { lat: number; lng: number } | null = null;
  branchMapSafeUrl!: SafeResourceUrl;

  savedBuyerProfile: {
    fullName: string;
    phone: string;
    rawAddress: string;
    ward: string;
    street: string;
  } | null = null;

  receiver = {
    fullName: '',
    phone: '',
  };

  deliveryAddress = {
    city: 'Thành phố Hồ Chí Minh',
    ward: '',
    street: '',
  };

  note = '';

  receiveMethod: 'pickup' | 'delivery' = 'pickup';

  checkoutSource: 'buy_now' | 'cart' = 'buy_now';
  selectedCartItemIds: string[] = [];
  cartItems: BuyNowData['items'] = [];

  ngOnInit(): void {
    this.minDate = this.getOffsetDateIso(1);
    this.maxDate = this.getOffsetDateIso(7);
    this.updateBranchMapUrl();

    this.checkAuthAndPrefillBuyer();
    this.restoreBuyNowData();

    if (this.cartItems.length === 0) {
      this.error =
        'Không tìm thấy sản phẩm cần đặt hàng. Vui lòng quay lại giỏ hàng hoặc trang sản phẩm.';
      return;
    }

    this.loadSettings();
    this.loadQuote();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.activeDropdown) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.sc-custom-select')) {
      this.activeDropdown = null;
    }
  }

  // ========================================
  // CHỌN CHI NHÁNH TRỰC TIẾP, BẢN ĐỒ & SO SÁNH KHOẢNG CÁCH
  // ========================================

  get selectedBranchObj(): BranchOption {
    return (
      this.branches.find((b) => (b._id || b.name) === this.selectedBranch) ||
      this.branches[0]
    );
  }

  get nearestBranchId(): string | null {
    const withDist = this.branches.filter(
      (b) => typeof b.distanceKm === 'number'
    );
    if (withDist.length < 2) return null;
    const sorted = [...withDist].sort(
      (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
    );
    return sorted[0]._id || sorted[0].name;
  }

  selectBranch(branch: BranchOption): void {
    this.selectedBranch = branch._id || branch.name;
    this.updateBranchMapUrl();
  }

  private updateBranchMapUrl(): void {
    const branch = this.selectedBranchObj;
    const query = encodeURIComponent(`${branch.name}, ${branch.address}`);
    const url = `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    this.branchMapSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getGoogleMapsDirectionUrl(branch: BranchOption): string {
    const dest = encodeURIComponent(`${branch.name}, ${branch.address}`);
    if (this.userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${this.userCoords.lat},${this.userCoords.lng}&destination=${dest}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  }

  calculateDistanceFromUser(): void {
    this.locationError = '';

    if (!navigator.geolocation) {
      this.locationError =
        'Trình duyệt của bạn không hỗ trợ định vị vị trí hiện tại.';
      return;
    }

    this.locatingUser = true;
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        this.branches = this.branches.map((branch) => ({
          ...branch,
          distanceKm: this.computeHaversineKm(
            this.userCoords!.lat,
            this.userCoords!.lng,
            branch.lat,
            branch.lng
          ),
        }));

        this.locatingUser = false;
        this.cdr.detectChanges();
      },
      (err) => {
        this.locatingUser = false;
        this.locationError =
          err.code === err.PERMISSION_DENIED
            ? 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật vị trí trên trình duyệt để đo khoảng cách.'
            : 'Không lấy được vị trí hiện tại. Vui lòng thử lại.';
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  private computeHaversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Nhân hệ số đường bộ ~1.25 để sát khoảng cách di chuyển thực tế trong nội thành
    return Math.round(R * c * 1.25 * 10) / 10;
  }

  // ========================================
  // ĐỌC THÔNG TIN TÀI KHOẢN BUYER & ĐỊA CHỈ ĐÃ ĐĂNG KÝ
  // ========================================

  private checkAuthAndPrefillBuyer(): void {
    try {
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('buyerToken') ||
        sessionStorage.getItem('accessToken') ||
        sessionStorage.getItem('token');

      const rawUser =
        localStorage.getItem('buyer') ||
        localStorage.getItem('user') ||
        localStorage.getItem('currentUser') ||
        sessionStorage.getItem('buyer') ||
        sessionStorage.getItem('user');

      this.isLoggedIn = !!(token || rawUser);

      if (!rawUser) return;

      const user = JSON.parse(rawUser);
      const fullName = (user.fullName || user.name || '').trim();
      const phone = (user.phone || user.phoneNumber || '').trim();
      const rawAddress = (
        user.address ||
        user.deliveryAddress ||
        user.shippingAddress ||
        ''
      ).trim();

      let parsedWard = (user.ward || '').trim();
      let parsedStreet = (user.street || '').trim();

      if (rawAddress && (!parsedWard || !parsedStreet)) {
        const parsed = this.parseRegisteredAddress(rawAddress);
        if (!parsedWard) parsedWard = parsed.ward;
        if (!parsedStreet) parsedStreet = parsed.street;
      }

      this.savedBuyerProfile = {
        fullName,
        phone,
        rawAddress,
        ward: parsedWard,
        street: parsedStreet,
      };

      if (fullName) this.receiver.fullName = fullName;
      if (phone) this.receiver.phone = phone;
      if (parsedWard) this.deliveryAddress.ward = parsedWard;
      if (parsedStreet) this.deliveryAddress.street = parsedStreet;
    } catch (err) {
      console.warn('[Checkout] Cannot parse buyer profile:', err);
      this.isLoggedIn = false;
    }
  }

  private parseRegisteredAddress(rawAddress: string): {
    ward: string;
    street: string;
  } {
    const normalizedRaw = this.normalizeText(rawAddress);
    const matchedWard =
      this.hcmWards.find((w) => normalizedRaw.includes(this.normalizeText(w))) ||
      '';

    const parts = rawAddress
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const streetParts = parts.filter((part) => {
      const norm = this.normalizeText(part);
      const isCity =
        norm.includes('ho chi minh') ||
        norm === 'tphcm' ||
        norm === 'tp hcm' ||
        norm === 'hcm';
      const isWard =
        matchedWard && norm === this.normalizeText(matchedWard);
      return !isCity && !isWard;
    });

    return {
      ward: matchedWard,
      street: streetParts.join(', '),
    };
  }

  restoreSavedBuyerAddress(): void {
    if (!this.savedBuyerProfile) return;
    this.deliveryAddress.ward = this.savedBuyerProfile.ward;
    this.deliveryAddress.street = this.savedBuyerProfile.street;
    this.error = '';
  }

  get hasSavedAddress(): boolean {
    return !!(
      this.savedBuyerProfile &&
      (this.savedBuyerProfile.ward || this.savedBuyerProfile.street)
    );
  }

  get isAddressModifiedFromSaved(): boolean {
    if (!this.hasSavedAddress || !this.savedBuyerProfile) return false;
    return (
      this.deliveryAddress.ward !== this.savedBuyerProfile.ward ||
      this.deliveryAddress.street.trim() !== this.savedBuyerProfile.street
    );
  }

  get filteredWards(): string[] {
    const keyword = this.normalizeText(this.wardSearch);
    if (!keyword) return this.hcmWards;
    return this.hcmWards.filter((w) =>
      this.normalizeText(w).includes(keyword)
    );
  }

  private normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  toggleDropdown(name: 'ward', event: Event): void {
    event.stopPropagation();
    if (this.loading) return;
    this.activeDropdown = this.activeDropdown === name ? null : name;
    if (this.activeDropdown === 'ward') {
      this.wardSearch = '';
    }
  }

  selectWard(ward: string): void {
    this.deliveryAddress.ward = ward;
    this.wardSearch = '';
    this.activeDropdown = null;
  }

  private getOffsetDateIso(days: number): string {
    const now = new Date();
    now.setDate(now.getDate() + days);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ========================================
  // RESTORE CHECKOUT DATA
  // ========================================

  private restoreBuyNowData(): void {
    try {
      const rawData = sessionStorage.getItem(this.BUY_NOW_STORAGE_KEY);

      if (!rawData) {
        return;
      }

      const data = JSON.parse(rawData) as BuyNowData;

      if (
        !Array.isArray(data.items) ||
        data.items.length === 0 ||
        !data.items.every(
          (item) =>
            !!item.productId && Number.isInteger(item.qty) && item.qty > 0
        )
      ) {
        this.error =
          'Thông tin sản phẩm không hợp lệ. Vui lòng thực hiện lại thao tác đặt hàng.';
        return;
      }

      this.checkoutSource = data.source === 'cart' ? 'cart' : 'buy_now';
      this.selectedCartItemIds = Array.isArray(data.cartItemIds)
        ? data.cartItemIds
        : [];
      this.cartItems = data.items;
      this.receiveMethod =
        data.receiveMethod === 'delivery' ? 'delivery' : 'pickup';
    } catch (err) {
      console.error('[Checkout] Cannot restore checkout data:', err);

      this.error =
        'Không thể đọc thông tin sản phẩm. Vui lòng thực hiện lại thao tác đặt hàng.';
    }
  }

  // ========================================
  // SETTINGS
  // ========================================

  loadSettings(): void {
    this.loadingSettings = true;
    this.settingsError = '';
    this.cdr.detectChanges();

    this.api
      .getSettings()
      .pipe(
        finalize(() => {
          this.loadingSettings = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (value: any) => {
          const payload = value?.data ?? value;
          this.settings = payload;
          this.settingsError = '';

          if (Array.isArray(payload?.branches) && payload.branches.length > 0) {
            this.branches = payload.branches.map((b: any, idx: number) => ({
              _id: b._id || DEFAULT_BRANCHES[idx]?._id || b.name,
              name: b.name,
              address: b.address,
              lat: b.lat ?? DEFAULT_BRANCHES[idx]?.lat ?? 10.7734,
              lng: b.lng ?? DEFAULT_BRANCHES[idx]?.lng ?? 106.7009,
            }));
          }

          if (
            !this.selectedBranch ||
            !this.branches.some(
              (b) => (b._id || b.name) === this.selectedBranch
            )
          ) {
            this.selectedBranch =
              this.branches[0]._id || this.branches[0].name;
          }

          this.updateBranchMapUrl();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Checkout] Cannot load settings:', err);
          // Vẫn giữ 2 chi nhánh mặc định để khách chọn được
          this.settingsError =
            err.error?.message ||
            'Không đồng bộ được cấu hình chi nhánh từ máy chủ.';
          this.cdr.detectChanges();
        },
      });
  }

  // ========================================
  // TIME SLOTS
  // ========================================

  loadSlots(): void {
    this.selectedSlotId = '';
    this.slots = [];
    this.slotsError = '';

    if (!this.selectedDate) {
      return;
    }

    if (this.selectedDate < this.minDate || this.selectedDate > this.maxDate) {
      this.slotsError = `Vui lòng chọn ngày nhận bánh trong khoảng từ ${this.formatIsoDateVi(
        this.minDate
      )} đến ${this.formatIsoDateVi(this.maxDate)}.`;
      return;
    }

    this.loadingSlots = true;
    this.cdr.detectChanges();

    this.api
      .getTimeSlots(this.selectedDate)
      .pipe(
        finalize(() => {
          this.loadingSlots = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (value: any) => {
          const payload = value?.data ?? value;
          this.slots = payload?.items || [];
          this.slotsError = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Checkout] Cannot load time slots:', err);

          this.slots = [];
          this.slotsError =
            err.error?.message ||
            'Không tải được khung giờ nhận bánh. Vui lòng thử lại.';
          this.cdr.detectChanges();
        },
      });
  }

  // ========================================
  // QUOTE
  // ========================================

  loadQuote(): void {
    if (!this.cartItems.length) {
      this.quote = undefined;
      return;
    }

    this.loadingQuote = true;
    this.quoteError = '';
    this.quote = undefined;
    this.cdr.detectChanges();

    this.api
      .quote({
        items: this.cartItems,
        voucherCode: this.voucherCode.trim() || undefined,
        receiveMethod: this.receiveMethod,
      })
      .pipe(
        finalize(() => {
          this.loadingQuote = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (value: any) => {
          const payload = value?.data ?? value;
          this.quote = payload;
          this.quoteError = '';

          if (!payload?.valid) {
            this.voucherError =
              'Một hoặc nhiều sản phẩm không còn hợp lệ. Vui lòng kiểm tra lại đơn hàng.';
            this.cdr.detectChanges();
            return;
          }

          this.voucherError = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[Checkout] Cannot calculate quote:', err);

          this.quote = undefined;
          const msg =
            err.error?.message ||
            'Không thể tính giá đơn hàng. Vui lòng thử lại.';

          if (this.voucherCode.trim() && err.status === 400) {
            this.voucherError = msg;
            this.voucherCode = '';
            this.loadQuote();
            return;
          }

          this.quoteError = msg;
          this.cdr.detectChanges();
        },
      });
  }

  // ========================================
  // VOUCHER
  // ========================================

  applyVoucher(): void {
    const code = this.voucherCode.trim();

    if (!code) {
      this.voucherError = 'Vui lòng nhập mã giảm giá.';
      return;
    }

    if (!this.quote || !this.quote.valid) {
      this.voucherError = 'Vui lòng chờ hệ thống tính giá đơn hàng trước.';
      return;
    }

    this.voucherCode = code;
    this.loadQuote();
  }

  removeVoucher(): void {
    this.voucherCode = '';
    this.voucherError = '';
    this.loadQuote();
  }

  // ========================================
  // RECEIVE METHOD
  // ========================================

  onReceiveMethodChange(): void {
    this.selectedSlotId = '';
    this.activeDropdown = null;
    this.error = '';
    this.loadQuote();

    if (this.selectedDate) {
      this.loadSlots();
    } else {
      this.slots = [];
    }
  }

  // ========================================
  // VALIDATION
  // ========================================

  validateFullNameField(): boolean {
    const name = this.receiver.fullName.trim();
    if (!name) {
      this.fieldErrors.fullName = 'Vui lòng nhập họ và tên người nhận.';
      return false;
    }
    this.fieldErrors.fullName = '';
    return true;
  }

  validatePhoneField(): boolean {
    const rawPhone = this.receiver.phone.trim().replace(/\s+/g, '');
    if (!rawPhone) {
      this.fieldErrors.phone = 'Vui lòng nhập số điện thoại người nhận.';
      return false;
    }

    const phoneRegex = /^(0[35789][0-9]{8}|\+84[35789][0-9]{8})$/;
    if (!phoneRegex.test(rawPhone)) {
      this.fieldErrors.phone =
        'Số điện thoại không hợp lệ (ví dụ: 0901234567 hoặc +84901234567).';
      return false;
    }

    this.fieldErrors.phone = '';
    return true;
  }

  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.trim().replace(/\s+/g, '');
    return cleaned.startsWith('+84') ? '0' + cleaned.slice(3) : cleaned;
  }

  private validateCheckout(): boolean {
    const isNameOk = this.validateFullNameField();
    const isPhoneOk = this.validatePhoneField();

    if (!this.cartItems.length) {
      this.error = 'Không có sản phẩm để đặt hàng.';
      return false;
    }

    if (!this.quote || !this.quote.valid || this.quoteError) {
      this.error =
        'Chưa có báo giá hợp lệ. Vui lòng bấm "Thử lại" ở phần Tóm tắt đơn hàng.';
      return false;
    }

    if (!isNameOk || !isPhoneOk) {
      this.error = 'Vui lòng kiểm tra lại thông tin người nhận bị báo đỏ.';
      return false;
    }

    if (this.receiveMethod === 'pickup' && !this.selectedBranch) {
      this.error = 'Vui lòng chọn chi nhánh nhận bánh.';
      return false;
    }

    if (this.receiveMethod === 'delivery') {
      if (!this.deliveryAddress.ward) {
        this.error = 'Vui lòng chọn Phường / Xã nhận hàng tại TP. Hồ Chí Minh.';
        return false;
      }

      if (!this.deliveryAddress.street.trim()) {
        this.error = 'Vui lòng nhập số nhà, tên đường nhận hàng.';
        return false;
      }
    }

    if (!this.selectedDate) {
      this.error = 'Vui lòng chọn ngày nhận bánh.';
      return false;
    }

    if (this.selectedDate < this.minDate || this.selectedDate > this.maxDate) {
      this.error = `Ngày nhận bánh phải nằm trong khoảng từ ${this.formatIsoDateVi(
        this.minDate
      )} đến ${this.formatIsoDateVi(this.maxDate)}.`;
      return false;
    }

    if (this.slotsError || !this.selectedSlotId) {
      this.error = 'Vui lòng chọn khung giờ nhận bánh hợp lệ.';
      return false;
    }

    return true;
  }

  // ========================================
  // CREATE ORDER & XÓA CÁC DÒNG ĐÃ ĐẶT KHỎI GIỎ
  // ========================================

  private async cleanupPurchasedCartItems(): Promise<void> {
    if (
      this.checkoutSource !== 'cart' ||
      this.selectedCartItemIds.length === 0
    ) {
      return;
    }

    for (const itemId of this.selectedCartItemIds) {
      try {
        await this.cartService.removeItem(itemId);
      } catch (err) {
        console.warn(`[Checkout] Cannot remove cart item ${itemId}:`, err);
      }
    }
  }

  onSubmit(): void {
    if (
      this.loading ||
      this.loadingQuote ||
      this.loadingSlots ||
      this.loadingSettings
    ) {
      return;
    }

    this.error = '';

    if (!this.validateCheckout()) {
      return;
    }

    const normalizedPhone = this.normalizePhoneNumber(this.receiver.phone);
    this.receiver.phone = normalizedPhone;

    const fullDeliveryAddress =
      this.receiveMethod === 'delivery'
        ? `${this.deliveryAddress.street.trim()}, ${this.deliveryAddress.ward}, ${this.deliveryAddress.city}`
        : undefined;

    const payload: CreateOrderRequest = {
      items: this.cartItems as unknown as CreateOrderRequest['items'],
      receiver: {
        fullName: this.receiver.fullName.trim(),
        phone: normalizedPhone,
      },
      receiveMethod: this.receiveMethod,
      slotId: this.selectedSlotId,
      receiveDate: this.selectedDate,
      pickupBranch:
        this.receiveMethod === 'pickup' ? this.selectedBranch : undefined,
      note: this.note.trim(),
      voucherCode: this.voucherCode.trim() || undefined,
      expectedTotal: this.quote!.total,
    };

    this.loading = true;
    this.cdr.detectChanges();

    this.api
      .createOrder(payload)
      .pipe(
        catchError((err) => {
          console.error('[Checkout] Cannot create order:', err);

          if (err.status === 409 && err.error?.code === 'PRICE_CHANGED') {
            const updatedQuote =
              err.error.errors?.currentQuote ||
              err.error.details?.currentQuote;

            if (updatedQuote) {
              this.quote = updatedQuote;
            } else {
              this.loadQuote();
            }

            this.error =
              'Giá đơn hàng vừa được cập nhật. Vui lòng kiểm tra tổng tiền mới và bấm Đặt hàng lại để xác nhận.';
          } else {
            this.error =
              err.error?.message ||
              'Không thể tạo đơn hàng. Vui lòng thử lại.';
          }

          return of(null);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe(async (result: any) => {
        if (!result) {
          return;
        }

        const resData = result?.data ?? result;
        const orderId = resData?.order?._id;
        const trackToken = resData?.trackToken;

        if (!orderId || !trackToken) {
          this.error =
            'Đơn hàng đã được phản hồi nhưng thiếu thông tin theo dõi. Vui lòng liên hệ cửa hàng.';
          this.cdr.detectChanges();
          return;
        }

        await this.cleanupPurchasedCartItems();

        sessionStorage.setItem(`track:${orderId}`, trackToken);
        sessionStorage.setItem(
          `order:${orderId}`,
          JSON.stringify(resData.order)
        );
        sessionStorage.removeItem(this.BUY_NOW_STORAGE_KEY);

        this.router.navigate(['/payment', orderId]);
      });
  }

  // ========================================
  // FORMAT
  // ========================================

  formatVnd(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  }

  private formatIsoDateVi(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  }
}