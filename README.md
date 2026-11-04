# SWEET CAKE 2.0 – CLIENT

## 1. Giới thiệu

Đây là repository chứa mã nguồn giao diện người dùng (Frontend) của dự án **Sweet Cake 2.0 – Website bán bánh**.

- **Repository:** [sweet-cake-2.0-client](https://github.com/thanhtra16/sweet-cake-2.0-client)
- **Công nghệ:** Angular.
- **Vai trò:** Xây dựng giao diện khách hàng và giao diện quản trị cho website Sweet Cake 2.0.

## 2. Yêu cầu môi trường

Các công cụ cần thiết để cài đặt và chạy dự án:

- Node.js (phiên bản phù hợp với phiên bản Angular của dự án).
- npm.
- Git.
- Visual Studio Code (khuyến nghị).

Kiểm tra phiên bản Node.js và npm:

```bash
node -v
npm -v
```

## 3. Cài đặt dự án

**Bước 1: Clone repository**

```bash
git clone https://github.com/thanhtra16/sweet-cake-2.0-client.git
```

**Bước 2: Di chuyển vào thư mục dự án**

```bash
cd sweet-cake-2.0-client
```

**Bước 3: Cài đặt thư viện**

```bash
npm install
```

## 4. Chạy dự án

Khởi chạy dự án bằng lệnh:

```bash
npm start
```

Nếu dự án chưa khai báo script `start`, có thể sử dụng:

```bash
npx ng serve
```

Mở trình duyệt

## 5. Quy ước làm việc với Git

### 5.1. Quy ước đặt tên nhánh (Branch Naming)

Nhóm sử dụng các nhánh với mục đích như sau:

- `main`: Chứa phiên bản ổn định của dự án.
- `dev`: Nhánh tích hợp code của các thành viên.
- `feature/ten-chuc-nang`: Nhánh phát triển chức năng mới.
- `fix/ten-loi`: Nhánh sửa lỗi.
- `docs/ten-tai-lieu`: Nhánh cập nhật tài liệu.

**Ví dụ:**

```text
feature/giao-dien-dang-nhap
feature/danh-sach-san-pham
feature/gio-hang
fix/bo-cuc-header
docs/cap-nhat-readme
```

### 5.2. Quy ước Commit Message

Nhóm sử dụng quy ước **Conventional Commits** để thống nhất nội dung commit.

**Cấu trúc:**

```text
type(scope): description
```

Trong đó:

- `type`: Loại công việc thực hiện.
- `scope`: Phần chức năng được thay đổi.
- `description`: Mô tả ngắn gọn nội dung thay đổi.

**Các loại commit:**

- `feat`: Thêm chức năng mới.

  Ví dụ: `feat(auth): tao giao dien dang nhap`

- `fix`: Sửa lỗi.

  Ví dụ: `fix(cart): sua loi cap nhat so luong san pham`

- `docs`: Cập nhật tài liệu.

  Ví dụ: `docs(readme): cap nhat huong dan cai dat`

- `style`: Chỉnh sửa định dạng code hoặc giao diện.

  Ví dụ: `style(header): cap nhat giao dien thanh dieu huong`

- `refactor`: Tái cấu trúc code.

  Ví dụ: `refactor(auth): toi uu xu ly dang nhap`

- `test`: Thêm hoặc sửa kiểm thử.

  Ví dụ: `test(auth): them kiem thu dang nhap`

- `chore`: Cấu hình hoặc bảo trì dự án.

  Ví dụ: `chore(deps): cap nhat thu vien du an`

**Ví dụ commit trong dự án Sweet Cake 2.0:**

```text
feat(auth): tao giao dien dang nhap
feat(product): tao danh sach san pham
feat(cart): them chuc nang gio hang
feat(order): tao giao dien quan ly don hang
fix(header): sua loi bo cuc thanh dieu huong
docs(readme): cap nhat huong dan cai dat
```

**Quy định:**

- Mỗi commit phải mô tả đúng nội dung thay đổi.
- Ưu tiên sử dụng tiếng Việt không dấu trong phần mô tả commit.
- Không sử dụng nội dung chung chung như `update`, `test`, `fix bug`, `code`.
- Không gộp nhiều công việc không liên quan vào cùng một commit.

### 5.3. Quy trình Pull Request

**Quy trình thực hiện:**

1. Cập nhật code mới nhất từ nhánh `dev`.
2. Tạo nhánh chức năng và tiến hành phát triển.
3. Commit và push code lên GitHub.
4. Tạo Pull Request từ nhánh chức năng vào `dev`.
5. Kiểm tra các thay đổi và tiến hành merge.

**Quy định:**

- Không push trực tiếp lên nhánh `main` hoặc `dev`.
- Đảm bảo code hoạt động đúng trước khi merge.

### 5.4. Ví dụ quy trình làm việc

Ví dụ: Phát triển giao diện đăng nhập.

**Bước 1: Cập nhật nhánh dev**

```bash
git checkout dev
git pull origin dev
```

**Bước 2: Tạo nhánh chức năng**

```bash
git checkout -b feature/giao-dien-dang-nhap
```

**Bước 3: Thực hiện code và commit**

```bash
git add .
git commit -m "feat(auth): tao giao dien dang nhap"
```

**Bước 4: Push nhánh lên GitHub**

```bash
git push -u origin feature/giao-dien-dang-nhap
```

**Bước 5: Tạo Pull Request trên GitHub**

- **Base:** `dev`
- **Compare:** `feature/giao-dien-dang-nhap`

Sau khi kiểm tra các thay đổi, tiến hành merge Pull Request vào nhánh `dev`.

## 6. Quy tắc chung

- Không đưa mật khẩu, token hoặc thông tin bí mật lên GitHub.
- Không commit thư mục `node_modules`.
- Kiểm tra giao diện và chức năng trước khi tạo Pull Request.
- Tuân thủ quy ước đặt tên branch và commit message.
- Không push trực tiếp lên nhánh `main` và `dev`.
- Thống nhất với nhóm trước khi thay đổi cấu trúc dự án.

---

**Sweet Cake 2.0 – Client**

*Frontend source code for the Sweet Cake 2.0 project.*
