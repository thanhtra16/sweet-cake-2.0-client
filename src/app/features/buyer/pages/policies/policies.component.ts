import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.css'
})
export class PoliciesComponent implements AfterViewInit, OnDestroy {
  activeSection = 'doi-tra-hoan-tien';

  private observer?: IntersectionObserver;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    const sections = this.elementRef.nativeElement
      .querySelectorAll('.khoi-chinh-sach[id]');

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.activeSection = (entry.target as HTMLElement).id;
          }
        });
      },
      {
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0
      }
    );

    sections.forEach((section: Element) => {
      this.observer?.observe(section);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
scrollToSection(sectionId: string): void {
  const section = this.elementRef.nativeElement
    .querySelector(`#${sectionId}`);

  if (section) {
    section.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    this.activeSection = sectionId;
  }
}  
}