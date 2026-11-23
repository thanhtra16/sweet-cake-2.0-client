export interface TimeSlotItem {
  _id: string;
  /** YYYY-MM-DD (theo ngày Việt Nam) */
  date: string;
  label: string;
  capacity: number;
  /** Số chỗ đã dùng, đã bao gồm chỗ đang giữ. */
  used: number;
  remaining: number;
  closed: boolean;
}

export interface TimeSlotSummary {
  totalCapacity: number;
  totalUsed: number;
  open: number;
  closed: number;
}

export interface TimeSlotDay {
  date: string;
  items: TimeSlotItem[];
  summary: TimeSlotSummary;
  /** Khung giờ mẫu (Settings.slotTemplates); capacity = null khi chưa có mẫu và chỉ gợi ý nhãn. */
  templates: SlotTemplate[];
}

export interface SlotTemplate {
  label: string;
  capacity: number | null;
}

export interface CreateFromTemplatesResult {
  created: number;
  skipped: number;
  items: TimeSlotItem[];
}

export interface CreateTimeSlotPayload {
  date: string;
  label: string;
  capacity: number;
}

export interface UpdateTimeSlotPayload {
  capacity?: number;
  closed?: boolean;
}
