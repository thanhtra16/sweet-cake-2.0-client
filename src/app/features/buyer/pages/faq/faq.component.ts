import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FaqItem, FaqService } from '../../../../core/services/faq.service';

interface SearchResult {
  question: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.css'
})
export class FaqComponent implements OnInit {

  searchKeyword = '';
  searchResults: SearchResult[] = [];
  showDropdown = false;
  isAllExpanded = false;

  faqData = signal<FaqItem[]>([]);
  isLoading = signal(true);
  hasError = signal(false);

  private readonly faqService = inject(FaqService);

  ngOnInit(): void {
    this.faqService.getFaqs().subscribe({
      next: (data) => {
        this.faqData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Không thể tải danh sách câu hỏi thường gặp:', err);
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  /** Cột trái: nửa đầu danh sách (10 câu -> 5 câu). */
  get firstColumn(): FaqItem[] {
    const mid = Math.ceil(this.faqData().length / 2);
    return this.faqData().slice(0, mid);
  }

  /** Cột phải: phần còn lại. */
  get secondColumn(): FaqItem[] {
    const mid = Math.ceil(this.faqData().length / 2);
    return this.faqData().slice(mid);
  }

  onSearch(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();

    if (!keyword) {
      this.searchResults = [];
      this.showDropdown = false;
      return;
    }

    this.searchResults = this.faqData()
      .filter(faq => faq.question.toLowerCase().includes(keyword))
      .map(faq => ({ question: faq.question }));

    this.showDropdown = true;
  }

  toggleFaq(faq: FaqItem): void {
    faq.isOpen = !faq.isOpen;
  }

  toggleAll(): void {
    this.isAllExpanded = !this.isAllExpanded;

    this.faqData().forEach(faq => {
      faq.isOpen = this.isAllExpanded;
    });
  }

  selectSearchResult(result: SearchResult): void {
    const faq = this.faqData().find(
      item => item.question === result.question
    );

    if (!faq) return;

    faq.isOpen = true;
    this.searchKeyword = '';
    this.searchResults = [];
    this.showDropdown = false;

    setTimeout(() => {
      document.getElementById(this.getFaqId(faq))
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
    }, 50);
  }

  getFaqId(faq: FaqItem): string {
    return 'faq-' + this.faqData().indexOf(faq);
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  trackFaq(index: number, faq: FaqItem): string {
    return faq.question;
  }
}