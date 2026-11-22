
/** Sản phẩm dùng trong giao diện. */
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
}

/** Cấu trúc sản phẩm Backend trả về. */
export interface ProductDto {
  _id?: string;
  id?: string | number;
  name?: string;
  basePrice?: number;
  salePrice?: number | null;
  category?: string;
  occasions?: string[];
  availableFillings?: string[];
  type?: string;
  createdAt?: string | number | Date;
  imageIds?: {
    _id?: string;
    url?: string;
    alt?: string;
  }[];
  featured?: boolean;
  status?: string;
}
