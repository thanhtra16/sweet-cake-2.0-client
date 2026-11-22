export interface TimeSlot { id: string; label: string; capacity: number; used: number; status: 'open' | 'full' | 'closed'; }
export interface PublicSettings { deliveryFee: number; deliveryCity: string; branches: Array<{ _id?: string; name: string; address: string; phone?: string }>; qrExpireMinutes: number; hotline: string; refundPolicy: Record<string, number>; }
export interface CheckoutItem { productId: string; qty: number; config?: Record<string, unknown>; variant?: Record<string, unknown> | null; }
export interface QuoteRequest { items: CheckoutItem[]; voucherCode?: string; receiveMethod: 'delivery' | 'pickup'; }
export interface OrderQuote { items: Array<Record<string, unknown>>; subtotal: number; discount: number; deliveryFee: number; total: number; voucher?: Record<string, unknown> | null; }
export interface CreateOrderRequest extends QuoteRequest { receiver: { fullName: string; phone: string }; slotId: string; pickupBranch?: string; shippingAddress?: Record<string, unknown>; note?: string; expectedTotal: number; }
export interface CreatedOrderResponse { order: { _id: string; code: string; total: number; payment: { attempts: Array<{ qrDataUrl: string; qrPayload: string; expiresAt: string }> } }; trackToken: string; }
