
/** Loại sản phẩm */
export type ProductKind = 'cake' | 'accessory';

/** Trạng thái sản phẩm */
export type ProductStatus = 'visible' | 'hidden';

/** Thông tin ảnh sản phẩm từ Backend */
export interface ProductImageDto {
  _id?: string;
  id?: string;
  url?: string;
  alt?: string;
}

/** Sản phẩm dùng trong giao diện */
export interface Product {
  createdAt: number;
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  category: string;
  occasion: string;
  flavor: string;
  type: string;
  bestSeller: boolean;

  /** Phân biệt bánh kem và phụ kiện */
  kind: ProductKind;

  /** Trạng thái hiển thị */
  status: ProductStatus;
}

/** Cấu trúc biến thể sản phẩm từ Backend */
export interface ProductVariantDto {
  _id?: string;
  label?: string;
  attributes?: Record<string, unknown>;
  active?: boolean;
}

/** Cấu trúc sản phẩm Backend trả về */
export interface ProductDto {
  _id?: string;
  id?: string | number;

  name?: string;
  type?: string;
  kind?: ProductKind;
  status?: ProductStatus;

  category?: string;
  occasions?: string[];
  description?: string;

  basePrice?: number;
  salePrice?: number | null;

  availableSizes?: string[];
  availableFillings?: string[];

  variants?: ProductVariantDto[];

  imageIds?: Array<string | ProductImageDto>;

  images?: Array<string | ProductImageDto>;
  thumbnail?: string;
  image?: string;

  featured?: boolean;

  rating?: number;
  reviewCount?: number;

  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
}
