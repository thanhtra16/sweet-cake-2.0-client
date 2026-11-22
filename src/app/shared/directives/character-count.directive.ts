import { Directive, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';

@Directive({
  selector: '[appCharacterCount]',
  standalone: true,
})
export class CharacterCountDirective implements OnInit {
  @Input() characterLimit?: number;
  @Output() characterCountChange = new EventEmitter<number>();

  constructor(private readonly elementRef: ElementRef<HTMLInputElement | HTMLTextAreaElement>) {}

  ngOnInit(): void {
    this.emitCount();
  }

  @HostListener('input')
  onInput(): void {
    this.emitCount();
  }

  private emitCount(): void {
    const value = this.elementRef.nativeElement.value ?? '';
    this.characterCountChange.emit(Array.from(value).length);
  }
}
