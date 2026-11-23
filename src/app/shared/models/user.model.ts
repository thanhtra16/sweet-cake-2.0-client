/** Địa chỉ nhận hàng (khớp addressSchema ở Backend, models/users.js). */
export interface Address {
  _id: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

/** Dữ liệu gửi lên khi thêm / sửa địa chỉ. `city` do Backend tự đặt là TP.HCM. */
export interface AddressPayload {
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  isDefault?: boolean;
}

/** Thông tin tài khoản trả về từ GET /api/users/me. */
export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  role: string;
  addresses: Address[];
}

/** Các trường Backend cho phép khách tự sửa (PATCH /api/users/me). */
export interface UpdateProfilePayload {
  fullName: string;
  email: string | null;
  birthday: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
