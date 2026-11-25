import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css',
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  email = '';

  submitEmail(): void {
    const emailValue = this.email.trim();

    if (!emailValue) {
      alert('Vui lòng nhập email của bạn!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailValue)) {
      alert('Email không hợp lệ!');
      return;
    }

    alert('Cảm ơn bạn đã đăng ký nhận tin!');

    this.email = '';
  }
}