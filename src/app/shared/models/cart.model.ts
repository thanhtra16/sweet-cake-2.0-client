import { CakeCustomization } from '../../features/buyer/product/components/cake-customizer/cake-customizer';

export interface CartAccessory {
  id: string;
  name: string;
  price: number;

  // ID biến thể do Backend cung cấp; null nếu không có biến thể.
  variantId?: string | null;

  // Tên biến thể dùng để hiển thị trong giỏ hàng.
  variantLabel?: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productKind: 'cake' | 'accessory';
  imageUrl: string | null;

  // Giá của một sản phẩm, đã bao gồm các khoản phụ thu.
  unitPrice: number;
  quantity: number;

  // Cấu hình bánh; null nếu sản phẩm không phải bánh.
  customization: CakeCustomization | null;

  // Lưu thông tin phụ kiện và biến thể đã chọn.
  accessories: CartAccessory[];

  // Khóa dùng để nhận diện các sản phẩm có cùng cấu hình.
  configurationKey: string;
}
