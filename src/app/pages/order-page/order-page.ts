import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OrderItem {
  id: string;
  name: string;
  size: string;
  sweetness: string;
  customMessage?: string;
  price: number;
  image: string;
}

export interface Order {
  _id: string;
  code: string; // VD: #SWC-2026-9041
  createdAt: string;
  status: string;
  statusText: string;
  totalAmount: number;
  deliveryType: string;
  deliveryTime: string;
  receiverName: string;
  receiverPhone: string;
  address?: string;
  items: OrderItem[];
  realPhoto?: string; // Ảnh thực tế từ xưởng (chỉ có khi >= DaXong)
  chefName?: string;
  completedAt?: string;
}

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-page.html',
  styleUrls: ['./order-page.css']
})
export class OrderPageComponent implements OnInit, OnDestroy {
  activeTab: 'dang-xuly' | 'lich-su' = 'dang-xuly';
  
  // Dành cho Guest tra cứu
  trackCode: string = '';
  trackPhone: string = '';
  searchedOrder: Order | null = null;

  // Dành cho Buyer danh sách đơn hàng
  processingOrders: Order[] = [];
  historyOrders: Order[] = [];
  selectedOrder: Order | null = null;

  // Biến điều khiển Modal Mua lại (Repurchase Modal)
  showRepurchaseModal: boolean = false;

  private pollInterval: any;

  ngOnInit(): void {
    this.loadBuyerOrders();
    // Cơ chế Polling ngầm mỗi 30 giây cập nhật trạng thái thời gian thực
    this.pollInterval = setInterval(() => {
      this.refreshActiveOrderData();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  // Tra cứu nhanh cho Guest (POST /orders/track)
  onTrackOrder() {
    if (!this.trackCode || !this.trackPhone) {
      alert('Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại!');
      return;
    }
    this.searchedOrder = {
      _id: 'ord_9041',
      code: this.trackCode,
      createdAt: '28/06/2026 - 08:30',
      status: 'DangLamBanh',
      statusText: 'Đang làm bánh',
      totalAmount: 480000,
      deliveryType: 'Giao tận nơi',
      deliveryTime: '15:00 Hôm nay',
      receiverName: 'Nguyễn Lan Phương',
      receiverPhone: this.trackPhone,
      address: 'Căn hộ 12.04 Origami, Vinhomes Grand Park, TP. Thủ Đức',
      items: [
        {
          id: 'item_1',
          name: 'Bánh Mousse Dâu Tây Đà Lạt',
          size: 'Size 18cm (6 - 8 người)',
          sweetness: 'Độ ngọt: 30% (đường organic)',
          customMessage: 'Mừng sinh nhật Bé An',
          price: 450000,
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80'
        }
      ]
    };
  }

  // Load danh sách đơn hàng của Buyer (GET /orders)
  loadBuyerOrders() {
    this.processingOrders = [
      {
        _id: 'ord_9041',
        code: '#SWC-2026-9041',
        createdAt: '28/06/2026 - 09:15',
        status: 'DangLamBanh',
        statusText: 'Đang làm bánh',
        totalAmount: 480000,
        deliveryType: 'Giao tận nơi',
        deliveryTime: 'Định kiến 15:00 Hôm nay',
        receiverName: 'Nguyễn Lan Phương',
        receiverPhone: '0912345678',
        items: [{
          id: 'item_1',
          name: 'Bánh Mousse Dâu Tây Đà Lạt',
          size: 'Size 18cm',
          sweetness: '30% đường',
          price: 450000,
          image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80'
        }]
      }
    ];

    this.historyOrders = [
      {
        _id: 'ord_8892',
        code: '#SWC-2026-8892',
        createdAt: '27/06/2026 - 15:40',
        status: 'DaXong', // Đã xong, hiển thị ảnh thực tế
        statusText: 'Đã giao thành công',
        totalAmount: 580000,
        deliveryType: 'Nhận tại tiệm',
        deliveryTime: '18:30 - 27/06/2026',
        receiverName: 'Nguyễn Lan Phương',
        receiverPhone: '0912345678',
        realPhoto: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        chefName: 'Nguyễn Văn A',
        completedAt: '13:45 - 27/06/2026',
        items: [{
          id: 'item_2',
          name: 'Bánh Kem Phô Mai Dubai Hoàng Gia',
          size: 'Size 18cm',
          sweetness: 'Vừa chuẩn',
          price: 520000,
          image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=300&q=80'
        }]
      }
    ];

    if (this.processingOrders.length > 0) {
      this.selectedOrder = this.processingOrders[0];
    }
  }

  refreshActiveOrderData() {
    if (this.selectedOrder) {
      console.log('Polling: Đang đồng bộ trạng thái đơn hàng', this.selectedOrder.code);
    }
  }

  selectOrder(order: Order) {
    this.selectedOrder = order;
  }

  // Quản lý Modal Mua Lại (Repurchase Modal)
  openRepurchaseModal() {
    this.showRepurchaseModal = true;
  }

  confirmRepurchase() {
    alert('Đã thêm sản phẩm từ đơn hàng cũ vào giỏ hàng thành công!');
    this.showRepurchaseModal = false;
  }
}