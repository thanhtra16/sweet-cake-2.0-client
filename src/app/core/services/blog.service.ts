import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BlogPost {
  _id?: string;
  id: number;
  title: string;
  slug: string;
  category: string;
  readingTime: string;
  author: string;
  authorPosition: string;
  excerpt: string;
  publishedAt: string;
  thumbnail: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private readonly apiUrl = `${environment.apiUrl}/blogs`;

  constructor(private http: HttpClient) {}

  // Lấy danh sách bài viết đã xuất bản
  getBlogs(): Observable<BlogPost[]> {
    return this.http.get<BlogPost[]>(this.apiUrl).pipe(
      map((response) => (Array.isArray(response) ? response : [])),
      map((blogs) => blogs.filter((blog) => blog.status === 'published')),
    );
  }

  // Lấy chi tiết bài viết theo slug
  getBlogBySlug(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.apiUrl}/${encodeURIComponent(slug)}`);
  }

  // Lấy bài viết liên quan
  getRelatedBlogs(currentSlug: string, category: string, limit = 3): Observable<BlogPost[]> {
    return this.getBlogs().pipe(
      map((blogs) =>
        blogs
          .filter((blog) => blog.slug !== currentSlug)
          .sort((a, b) => {
            const aSameCategory = a.category === category ? 1 : 0;
            const bSameCategory = b.category === category ? 1 : 0;

            return bSameCategory - aSameCategory;
          })
          .slice(0, limit),
      ),
    );
  }
}
