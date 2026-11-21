
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  BlogPost,
  BlogService
} from '../../../../../core/services/blog.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.css'
})
export class BlogListComponent implements OnInit {
  blogs: BlogPost[] = [];
  filteredBlogs: BlogPost[] = [];

  featuredBlog?: BlogPost;

  categories = [
    'Tất cả bài viết',
    'Công thức',
    'Sự kiện',
    'Mùa lễ'
  ];

  selectedCategory = 'Tất cả bài viết';
  searchKeyword = '';

  isLoading = true;
  errorMessage = '';

  currentPage = 1;
  pageSize = 6;

  constructor(
    private blogService: BlogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBlogs();
  }

  // Tải danh sách Blog
  loadBlogs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    console.log('Bắt đầu tải Blog...');

    this.blogService.getBlogs().subscribe({
      next: (data) => {
        console.log('Dữ liệu Blog nhận được:', data);
        console.log('Số lượng bài viết:', data.length);

        this.blogs = data.sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        );

        this.featuredBlog = this.blogs[0];

        this.applyFilters();

        this.isLoading = false;

        console.log('isLoading:', this.isLoading);
        console.log('featuredBlog:', this.featuredBlog);
        console.log('displayedBlogs:', this.displayedBlogs);

        // Cập nhật giao diện sau khi nhận dữ liệu
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Lỗi tải danh sách blog:', error);

        this.errorMessage =
          'Không thể tải dữ liệu blog. Vui lòng thử lại sau.';

        this.isLoading = false;

        // Cập nhật giao diện khi xảy ra lỗi
        this.cdr.detectChanges();
      },

      complete: () => {
        console.log('Hoàn tất request Blog.');
      }
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    this.filteredBlogs = this.blogs.filter((blog) => {
      const matchesCategory =
        this.selectedCategory === 'Tất cả bài viết' ||
        blog.category === this.selectedCategory;

      const matchesKeyword =
        !keyword ||
        blog.title.toLowerCase().includes(keyword) ||
        blog.excerpt.toLowerCase().includes(keyword) ||
        blog.category.toLowerCase().includes(keyword);

      return matchesCategory && matchesKeyword;
    });
  }

  get displayedBlogs(): BlogPost[] {
    const blogs = this.filteredBlogs.filter(
      (blog) => blog.slug !== this.featuredBlog?.slug
    );

    const startIndex = (this.currentPage - 1) * this.pageSize;

    return blogs.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    const blogs = this.filteredBlogs.filter(
      (blog) => blog.slug !== this.featuredBlog?.slug
    );

    return Math.max(1, Math.ceil(blogs.length / this.pageSize));
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;

    this.currentPage = page;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  }

  trackBySlug(index: number, blog: BlogPost): string {
    return blog.slug;
  }
}
