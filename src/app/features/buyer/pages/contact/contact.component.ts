
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  // Dữ liệu form liên hệ
  contact = {
    fullName: '',
    email: '',
    phone: '',
    message: ''
  };

  // Thông tin cửa hàng
  readonly stores = [
    {
      name: 'SweetCake Thủ Đức',
      address: '669 Đỗ Mười, Phường Linh Xuân, TP.HCM',
      phone: '028 7300 1234',
      hours: [
        'T2 - T6: 07:00 - 21:00',
        'T7 - CN: 08:00 - 22:00'
      ]
    },
    {
      name: 'SweetCake Quận 1',
      address: '45 Lê Lợi, Phường Bến Nghé, TP.HCM',
      phone: '028 7300 5678',
      hours: [
        'Hằng ngày: 08:00 - 21:30'
      ]
    }
  ];

  // Gallery hình ảnh
  readonly gallery = [
    {
      title: 'Tủ trưng bày bánh SweetCake',
      image: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=400'
    },
    {
      title: 'Bàn gỗ với bánh sừng trâu',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400'
    },
    {
      title: 'Mặt tiền cửa hàng SweetCake',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400'
    },
    {
      title: 'Trang trí bánh kem thủ công',
      image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?q=80&w=400'
    }
  ];

  // Xử lý gửi liên hệ
  onSubmit(form: any): void {
    if (form.invalid) {
      return;
    }

    const name = this.contact.fullName.trim() || 'bạn';

    alert(
      `Cảm ơn ${name}! SweetCake đã nhận được lời nhắn và sẽ phản hồi sớm nhất.`
    );

    form.resetForm();

    this.contact = {
      fullName: '',
      email: '',
      phone: '',
      message: ''
    };
  }
}
