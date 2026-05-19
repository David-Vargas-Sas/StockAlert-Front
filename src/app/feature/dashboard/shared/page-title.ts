import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-title',
  imports: [],
  template: `
    <div class="page-header">
      <div>
        <span class="eyebrow">StockAlert</span>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
    </div>
  `,
})
export class PageTitle {
  @Input() title = '';
  @Input() subtitle = '';
}
