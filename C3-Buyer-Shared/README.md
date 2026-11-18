# C3 – Buyer Layout & Shared Components (Sweet Cake)

Bộ source Angular độc lập để tích hợp vào dự án website đặt bánh. 
## 1. Yêu cầu

- Angular có hỗ trợ standalone components (Angular  standalone API).
- `styles.css` của nhóm đã được khai báo trong `angular.json` hoặc import trong `src/styles.css`.
- Bộ component không phụ thuộc thư viện UI bên ngoài.

> Lưu ý: Bộ source này dùng standalone component, `@Input()` / `@Output()` và RxJS `BehaviorSubject` để dễ tích hợp. Nếu dự án đang dùng Angular cũ hoặc NgModule-based, cần điều chỉnh cách khai báo/import.

## 2. Cấu trúc đề xuất

```text
src/app/
├── core/
│   └── services/
│       └── toast.service.ts
├── layouts/
│   └── buyer-layout/
│       ├── buyer-layout.component.ts
│       ├── buyer-layout.component.html
│       └── buyer-layout.component.css
└── shared/
    ├── components/
    │   ├── header/
    │   ├── footer/
    │   ├── product-card/
    │   ├── status-badge/
    │   ├── confirm-modal/
    │   ├── toast-container/
    │   ├── loading-empty/
    │   └── pagination/
    ├── pipes/vnd.pipe.ts
    └── directives/character-count.directive.ts
```

## 3. Tích hợp

### Bước 1 – CSS

Đưa file CSS thiết kế chung của nhóm vào `src/styles.css` (hoặc giữ nguyên vị trí hiện tại nếu đã được khai báo trong `angular.json`). Các component trong bộ này dùng các class như `sc-card`, `sc-btn`, `sc-badge`, `sc-modal`, `sc-toast`, `sc-loading`, `sc-pagination` và các biến `--sc-*`.

### Bước 2 – Khai báo Buyer Layout trong routes

Ví dụ trong `app.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { BuyerLayoutComponent } from './layouts/buyer-layout/buyer-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: BuyerLayoutComponent,
    children: [
      // Thay bằng component thật của nhóm:
      // { path: '', component: HomeComponent },
      // { path: 'products', component: ProductListComponent },
      // { path: 'cart', component: CartComponent },
    ],
  },
];
```

Nếu dự án đã có routes, chỉ cần đặt các route dành cho Buyer làm `children` của `BuyerLayoutComponent`, không ghi đè toàn bộ routes hiện tại.

### Bước 3 – Product Card

```html
<app-product-card
  [product]="product"
  (viewDetail)="openProduct(product)"
  (addToCart)="addProductToCart(product)"
></app-product-card>
```

Dữ liệu `product` cần có dạng:

```ts
{
  _id: '...',
  name: 'Bánh kem dâu',
  price: 250000,
  image: 'assets/images/cake.jpg',
  description: 'Bánh kem tươi vị dâu'
}
```

Nếu API của nhóm dùng tên field khác (ví dụ `thumbnail`, `productName`, `sellingPrice`), hãy map dữ liệu API sang interface của component hoặc đổi interface tương ứng. Component không tự gọi API và không tự thêm vào giỏ hàng; trang cha xử lý nghiệp vụ.

### Bước 4 – VND Pipe

```html
{{ product.price | vnd }}
```

Ví dụ: `250000` hiển thị thành `250.000 ₫`.

### Bước 5 – Status Badge

```html
<app-status-badge status="paid" label="Đã thanh toán"></app-status-badge>
```

Các status hỗ trợ: `success`, `warning`, `danger`, `info`, `neutral`, `pink`. Có thể truyền `label` tùy nghiệp vụ.

### Bước 6 – Modal xác nhận

```html
<app-confirm-modal
  [visible]="showCancelModal"
  title="Hủy đơn hàng?"
  message="Bạn có chắc chắn muốn hủy đơn hàng này không?"
  confirmText="Xác nhận hủy"
  cancelText="Không"
  (confirmed)="cancelOrder()"
  (closed)="showCancelModal = false"
></app-confirm-modal>
```

Modal chỉ hiển thị và phát sự kiện. Trang cha chịu trách nhiệm thực hiện hành động sau khi xác nhận.

### Bước 7 – Toast

Đặt `<app-toast-container></app-toast-container>` trong layout (đã được thêm sẵn trong Buyer Layout). Gọi từ bất kỳ component/service nào:

```ts
constructor(private toast: ToastService) {}

this.toast.success('Đã thêm bánh vào giỏ hàng.');
this.toast.error('Không thể tải dữ liệu. Vui lòng thử lại.');
this.toast.warning('Vui lòng kiểm tra thông tin.');
this.toast.info('Đơn hàng đang được xử lý.');
```

### Bước 8 – Loading / Empty

```html
<app-loading-empty
  [loading]="isLoading"
  [isEmpty]="products.length === 0"
  loadingText="Đang tải danh sách bánh..."
  emptyTitle="Chưa có sản phẩm"
  emptyMessage="Hiện chưa có sản phẩm phù hợp."
></app-loading-empty>
```

Chỉ hiển thị component khi trang thực sự ở trạng thái loading hoặc empty. Nếu có dữ liệu, hiển thị danh sách ở nhánh `else` của trang cha.

### Bước 9 – Pagination

```html
<app-pagination
  [currentPage]="page"
  [totalPages]="totalPages"
  (pageChange)="changePage($event)"
></app-pagination>
```

`currentPage` bắt đầu từ 1. Trang cha cập nhật page và gọi API khi nhận `pageChange`.

### Bước 10 – Directive đếm ký tự

```html
<textarea
  appCharacterCount
  [characterLimit]="200"
  (characterCountChange)="noteLength = $event"
  class="sc-textarea"
  maxlength="200"
  placeholder="Nhập lời chúc..."
></textarea>
<p class="sc-help-text">{{ noteLength }}/200 ký tự</p>
```

Directive đếm độ dài nội dung và phát `characterCountChange`. `maxlength` vẫn nên được đặt trên input/textarea để chặn nhập vượt giới hạn ở giao diện.

## 4. Các route / nghiệp vụ cần nhóm tự điều chỉnh

- Đường dẫn menu trong Header: `/`, `/products`, `/about`, `/contact`, `/cart`, `/login`.
- Tên field sản phẩm theo API/database thật.
- Danh sách trạng thái đơn hàng/thanh toán chính thức của nhóm.
- Nội dung liên hệ, địa chỉ và chính sách ở Footer.
- Các component trang Buyer thực tế trong `children` routes.

## 5. Kiểm tra sau khi tích hợp

1. Chạy `ng serve` hoặc lệnh start của dự án.
2. Mở một route Buyer có component con để kiểm tra Header/Footer và `router-outlet`.
3. Kiểm tra Product Card với dữ liệu mẫu.
4. Kiểm tra VND Pipe với `150000`, `2500000`.
5. Kiểm tra modal mở/đóng và sự kiện xác nhận.
6. Gọi thử `toast.success(...)`.
7. Kiểm tra loading, empty, phân trang và directive bằng textarea.
8. Chạy `ng build` để kiểm tra lỗi biên dịch.

## 6. Phạm vi bàn giao

Đây là bộ component giao diện dùng chung, chưa bao gồm kết nối API, xác thực, giỏ hàng thực tế, xử lý đơn hàng hoặc route trang nghiệp vụ. Những phần đó do component trang / service nghiệp vụ của nhóm tích hợp.
