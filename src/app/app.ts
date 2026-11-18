import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  template: `
    <!-- Thẻ RouterOutlet là bắt buộc để Angular hiển thị các component theo route -->
    <router-outlet></router-outlet>
  `,
})
export class App {
  protected readonly title = signal('my-client');
}