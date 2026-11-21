import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HeaderComponent }
  from '../../components/header/header.component';

import { FooterComponent }
  from '../../components/footer/footer.component';

@Component({
  selector: 'app-buyer-layout',
  standalone: true,

  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent
  ],

  templateUrl: './buyer-layout.component.html',

  styleUrl: './buyer-layout.component.css'
})
export class BuyerLayoutComponent {}