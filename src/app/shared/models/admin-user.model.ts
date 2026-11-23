/** Mô hình dùng cho khu admin (FR-A-09). Tách riêng khỏi user.model.ts của khách. */
export type UserStatus = 'active' | 'locked';

export interface UserAccount {
  _id: string;
  fullName: string;
  phone: string;          // định danh chính của tài khoản
  email: string | null;   // khách có thể chưa có email
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  lockedAt?: string | null;
  lockReason?: string | null;
}

export interface UserListSummary {
  total: number;
  active: number;
  locked: number;
  newThisMonth: number;
}

export interface UserListQuery {
  search?: string;
  status?: UserStatus | '';
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse extends Paginated<UserAccount> {
  summary: UserListSummary;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
