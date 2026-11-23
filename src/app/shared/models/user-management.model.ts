export type CustomerStatus = 'active' | 'locked';
export type CustomerStatusFilter = 'all' | CustomerStatus;
export type CustomerSort = 'newest' | 'oldest' | 'name';

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isLocked: boolean;
  status: CustomerStatus;
  lockedAt: string | null;
  lockedReason: string | null;
  unlockedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface CustomerStats {
  total: number;
  active: number;
  locked: number;
  newThisMonth: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerQuery {
  page: number;
  limit: number;
  search: string;
  status: CustomerStatusFilter;
  sort: CustomerSort;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CustomerListData {
  items: Customer[];
  pagination: Pagination;
}

export type CustomerListResponse = ApiResponse<CustomerListData>;
