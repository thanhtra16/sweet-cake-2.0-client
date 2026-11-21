import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiService } from './api.service';

export interface FaqItem {
  question: string;
  answer: string;
  isSpecialty?: boolean;
  isOpen?: boolean;
}

/** Một câu hỏi đúng như Backend trả về (GET /api/faqs). */
interface FaqDto {
  question: string;
  answer: string;
  isSpecialty?: boolean;
  order?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FaqService {
  private readonly api = inject(ApiService);

  /** Lấy danh sách câu hỏi (Backend đã sắp xếp theo `order`). */
  getFaqs(): Observable<FaqItem[]> {
    return this.api.get<{ faqs: FaqDto[] }>('/faqs').pipe(
      map(({ faqs }) =>
        faqs.map((f) => ({
          question: f.question,
          answer: f.answer,
          isSpecialty: !!f.isSpecialty
        }))
      )
    );
  }
}