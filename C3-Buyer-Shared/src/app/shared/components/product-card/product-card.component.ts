import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VndPipe } from '../../pipes/vnd.pipe';

export interface BuyerProduct {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, VndPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: BuyerProduct;
  @Input() showAddToCart = true;

  @Output() viewDetail = new EventEmitter<BuyerProduct>();
  @Output() addToCart = new EventEmitter<BuyerProduct>();

  onViewDetail(): void {
    this.viewDetail.emit(this.product);
  }

  onAddToCart(): void {
    this.addToCart.emit(this.product);
  }
}
