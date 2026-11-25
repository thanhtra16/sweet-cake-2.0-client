
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  Subject,
  switchMap,
  takeUntil,
  tap,
  map,
  catchError,
  of,
  finalize
} from 'rxjs';

import {
  BlogPost,
  BlogService
} from '../../../../../core/services/blog.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css'
})
export class BlogDetailComponent implements OnInit, OnDestroy {

  blog?: BlogPost;
  relatedBlogs: BlogPost[] = [];

  isLoading = true;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private blogService: BlogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(

      tap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        this.blog = undefined;
        this.relatedBlogs = [];
      }),

      switchMap(params => {
        const slug = params.get('slug') || '';

        if (!slug) {
          return of({
            blog: undefined,
            related: [] as BlogPost[],
            error: 'Không tìm thấy đường dẫn bài viết.'
          });
        }

        return this.blogService.getBlogBySlug(slug).pipe(

          switchMap(blog =>
            this.blogService.getRelatedBlogs(
              blog.slug,
              blog.category,
              3
            ).pipe(
              catchError(error => {
                console.error(
                  'Lỗi tải bài viết liên quan:',
                  error
                );

                return of([] as BlogPost[]);
              }),

              map(related => ({
                blog,
                related,
                error: ''
              }))
            )
          ),

          catchError(error => {
            console.error(
              'Lỗi tải chi tiết blog:',
              error
            );

            return of({
              blog: undefined,
              related: [] as BlogPost[],
              error: error.status === 404
                ? 'Bài viết không tồn tại hoặc đã bị ẩn.'
                : 'Không thể tải nội dung bài viết.'
            });
          })
        );
      }),

      takeUntil(this.destroy$),

      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })

    ).subscribe(result => {

      this.blog = result.blog;
      this.relatedBlogs = result.related;
      this.errorMessage = result.error;

      if (result.blog) {
        document.title = `${result.blog.title} - SweetCake`;
      }

      this.isLoading = false;

      // Yêu cầu Angular cập nhật giao diện
      this.cdr.detectChanges();

    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatDate(date: string): string {
    if (!date) return '';

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(new Date(date));
  }
}
