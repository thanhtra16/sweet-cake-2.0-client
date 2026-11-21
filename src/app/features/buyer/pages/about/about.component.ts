import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  readonly features = [
    {
      icon: 'fa-solid fa-pen-ruler',
      title: 'Custom Designs',
      description: 'Bánh độc bản theo yêu cầu. Chúng tôi hiện thực hóa mọi ý tưởng thiết kế độc đáo của bạn cho ngày trọng đại.'
    },
    {
      icon: 'fa-solid fa-heart',
      title: 'Low-sweet & Healthy',
      description: 'Công thức giảm đường độc quyền, sử dụng nguyên liệu tự nhiên, trái cây tươi sạch, tốt cho sức khỏe.'
    },
    {
      icon: 'fa-solid fa-bread-slice',
      title: 'Freshly Baked',
      description: 'Nướng mới mỗi ngày, tuyệt đối nói không với chất bảo quản. Đảm bảo độ tươi ngon nhất khi đến tay bạn.'
    }
  ];
}