
import {
  Component,
  HostListener,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';

interface Product {
  id: number | string;
  thumbnail: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  private http = inject(HttpClient);

  isMenuOpen = false;

  products: Product[] = [];

  readonly apiUrl = environment.apiUrl;

  ngOnInit(): void {
    this.loadProducts();
  }

  // Mở hoặc đóng mega menu
  toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    this.isMenuOpen = !this.isMenuOpen;
  }

  // Đóng mega menu
  closeMenu(): void {
    this.isMenuOpen = false;
  }

  // Click bên ngoài header thì đóng menu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.site-header')) {
      this.closeMenu();
    }
  }

  // Lấy danh sách sản phẩm nổi bật
  loadProducts(): void {
    this.http
      .get<Product[]>(`${this.apiUrl}/data/products`)
      .subscribe({
        next: (data) => {
          this.products = Array.isArray(data)
            ? data.slice(0, 6)
            : [];
        },
        error: (error) => {
          console.error(
            'Lỗi khi kết nối hoặc tải sản phẩm:',
            error
          );

          this.products = [];
        }
      });
  }

  // Giới hạn mô tả sản phẩm
  getShortDescription(description: string): string {
    if (!description) {
      return '';
    }

    return description.length > 55
      ? description.substring(0, 55) + '...'
      : description;
  }
}
