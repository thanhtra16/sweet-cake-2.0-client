import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccountService } from '../../../../../../core/services/account.service';
import { parseApiError } from '../../../../../../core/services/api-error';
import { Address, AddressPayload } from '../../../../../../shared/models/user.model';
import { isValidPhone, normalizePhone } from '../../../../../../shared/validators/auth.validators';

type Field = 'recipientName' | 'phone' | 'district' | 'ward' | 'street' | 'form';

@Component({
  selector: 'app-address-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './address-tab.component.html',
  styleUrl: './address-tab.component.css'
})
export class AddressTabComponent {
  readonly account = inject(AccountService);

  /** Sweet Cake hiện chỉ giao tại TP.HCM (Backend cố định giá trị này) */
  readonly city = 'TP.HCM';

  // ----- Modal thêm / sửa -----
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editingIsDefault = signal(false);

  readonly recipientName = signal('');
  readonly phone = signal('');
  readonly district = signal('');
  readonly ward = signal('');
  readonly street = signal('');
  readonly isDefault = signal(false);

  readonly errors = signal<Partial<Record<Field, string>>>({});
  readonly saving = signal(false);

  // ----- Xóa / đặt mặc định -----
  readonly deleteTarget = signal<Address | null>(null);
  readonly busyId = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen()) this.closeModal();
    else if (this.deleteTarget()) this.deleteTarget.set(null);
  }

  // ==================== MODAL ====================

  openAdd(): void {
    this.editingId.set(null);
    this.editingIsDefault.set(false);
    // Địa chỉ đầu tiên tự động là mặc định (Backend cũng làm vậy)
    const isFirst = (this.account.user()?.addresses.length ?? 0) === 0;
    this.fill('', '', '', '', '', isFirst);
    this.modalOpen.set(true);
  }

  openEdit(a: Address): void {
    this.editingId.set(a._id);
    this.editingIsDefault.set(a.isDefault);
    this.fill(a.recipientName, a.phone, a.district, a.ward, a.street, a.isDefault);
    this.modalOpen.set(true);
  }

  private fill(name: string, phone: string, district: string, ward: string, street: string, isDefault: boolean): void {
    this.recipientName.set(name);
    this.phone.set(phone);
    this.district.set(district);
    this.ward.set(ward);
    this.street.set(street);
    this.isDefault.set(isDefault);
    this.errors.set({});
  }

  closeModal(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  clearError(field: Field): void {
    if (this.errors()[field] || this.errors().form) {
      this.errors.update((e) => ({ ...e, [field]: undefined, form: undefined }));
    }
  }

  private validate(): boolean {
    const errors: Partial<Record<Field, string>> = {};

    if (!this.recipientName().trim()) errors.recipientName = 'Vui lòng nhập họ tên người nhận.';

    if (!this.phone().trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
    else if (!isValidPhone(this.phone())) errors.phone = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng số 0.';

    if (!this.district().trim()) errors.district = 'Vui lòng nhập Quận/Huyện.';
    if (!this.ward().trim()) errors.ward = 'Vui lòng nhập Phường/Xã.';
    if (!this.street().trim()) errors.street = 'Vui lòng nhập số nhà, tên đường.';

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  save(): void {
    if (this.saving() || !this.validate()) return;

    const payload: AddressPayload = {
      recipientName: this.recipientName().trim(),
      phone: normalizePhone(this.phone()),
      district: this.district().trim(),
      ward: this.ward().trim(),
      street: this.street().trim(),
      ...(this.isDefault() ? { isDefault: true } : {})
    };

    const id = this.editingId();
    const request = id ? this.account.updateAddress(id, payload) : this.account.addAddress(payload);

    this.saving.set(true);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.account.notify('success', id ? 'Cập nhật địa chỉ thành công.' : 'Thêm địa chỉ thành công.');
      },
      error: (err) => {
        this.errors.set({ form: parseApiError(err, 'Không thể lưu địa chỉ, vui lòng thử lại.').message });
        this.saving.set(false);
      }
    });
  }

  // ==================== ĐẶT MẶC ĐỊNH ====================

  setDefault(a: Address): void {
    if (a.isDefault || this.busyId()) return;
    this.busyId.set(a._id);

    this.account.updateAddress(a._id, { isDefault: true }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.account.notify('success', 'Đã đặt làm địa chỉ mặc định.');
      },
      error: (err) => {
        this.busyId.set(null);
        this.account.notify('error', parseApiError(err, 'Không thể đặt địa chỉ mặc định.').message);
      }
    });
  }

  // ==================== XÓA ====================

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.busyId()) return;
    this.busyId.set(target._id);

    this.account.deleteAddress(target._id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.deleteTarget.set(null);
        this.account.notify('success', 'Xóa địa chỉ thành công.');
      },
      error: (err) => {
        this.busyId.set(null);
        this.deleteTarget.set(null);
        this.account.notify('error', parseApiError(err, 'Không thể xóa địa chỉ.').message);
      }
    });
  }
}
