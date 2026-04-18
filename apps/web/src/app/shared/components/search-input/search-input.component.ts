import { Component, input, output, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'gonok-search-input',
  standalone: true,
  imports: [FormsModule],
  template: `
    <input
      class="form-input"
      type="text"
      [placeholder]="placeholder()"
      [(ngModel)]="value"
      (ngModelChange)="onInput($event)"
      name="search"
    />
  `,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
  `,
})
export class SearchInputComponent implements OnDestroy {
  placeholder = input('Search...');
  searchChange = output<string>();

  value = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  onInput(value: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.searchChange.emit(value.trim());
    }, 250);
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }
}
