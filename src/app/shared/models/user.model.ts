
/** Địa chỉ nhận hàng */
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

/** Dữ liệu thêm/sửa địa chỉ */
export interface AddressPayload {
  recipientName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city?: string;
  isDefault?: boolean;
}

/** Thông tin tài khoản */
export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  role: string;
  addresses: Address[];
}

/** Cập nhật hồ sơ */
export interface UpdateProfilePayload {
  fullName: string;
  email: string | null;
  birthday: string | null;
}

/** Đổi mật khẩu */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/* =====================================
   ADMIN USER MANAGEMENT
===================================== */

export type UserStatus = 'active' | 'locked';

export type UserStatusFilter = 'all' | UserStatus;

export type UserSort = 'newest' | 'oldest' | 'name';

/** Tài khoản người dùng trả về từ API quản trị */
export interface UserAccount {
  id: string;
  _id?: string;
  fullName: string;
  phone: string;
  email: string | null;
  birthday?: string | null;
  role: string;
  isLocked: boolean;
  origin?: string;
  createdAt: string | null;
}

/** Tham số tìm kiếm người dùng */
export interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatusFilter;
  sort?: UserSort;
}

/** Phân trang */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Thống kê khách hàng */
export interface CustomerStats {
  total: number;
  active: number;
  locked: number;
  newThisMonth: number;
}

/** Dữ liệu danh sách khách hàng từ Backend */
export interface UserListData {
  users: UserAccount[];
  pagination: Pagination;
  stats?: CustomerStats;
}

/** Response danh sách khách hàng */
export interface UserListResponse {
  success: boolean;
  message?: string;
  data: UserListData;
}

/** Response chung từ Backend */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
