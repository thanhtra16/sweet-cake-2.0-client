export type VoucherType = 'percent' | 'amount';

/** Trạng thái hiển thị do backend tính (running = đang áp dụng được). */
export type VoucherState = 'running' | 'scheduled' | 'expired' | 'exhausted' | 'inactive';

export interface Voucher {
  _id: string;
  code: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usageLimit: number | null;
  usedCount: number;
  remainingUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  description: string;
  state: VoucherState;
  createdAt: string;
}

export interface VoucherSummary {
  total: number;
  running: number;
  inactive: number;
  /** Hết hạn hoặc hết lượt. */
  ended: number;
}

export interface VoucherListQuery {
  search?: string;
  status?: VoucherState | '';
  page?: number;
  limit?: number;
}

export interface VoucherListResponse {
  items: Voucher[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: VoucherSummary;
}

export interface VoucherPayload {
  code: string;
  type: VoucherType;
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  usageLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  description: string;
}
