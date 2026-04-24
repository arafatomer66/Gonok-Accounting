import {
  Component,
  Output,
  EventEmitter,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'sf-search-bar',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="search-bar">
      <svg class="search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        class="search-bar__input"
        type="text"
        placeholder="Search products..."
        [(ngModel)]="term"
        (ngModelChange)="onInput($event)"
      />
      @if (term) {
        <button class="search-bar__clear" (click)="clear()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      }
    </div>
  `,
  styles: `
    .search-bar {
      position: relative;
      width: 100%;
      max-width: 400px;
    }
    .search-bar__icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #999;
      pointer-events: none;
    }
    .search-bar__input {
      width: 100%;
      padding: 0.6rem 2.5rem 0.6rem 2.5rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .search-bar__input:focus {
      border-color: #1a73e8;
    }
    .search-bar__clear {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      padding: 2px;
      display: flex;
    }
  `,
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Output() searchChange = new EventEmitter<string>();

  term = '';
  private input$ = new Subject<string>();

  ngOnInit() {
    this.input$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((val) => {
      this.searchChange.emit(val);
    });
  }

  ngOnDestroy() {
    this.input$.complete();
  }

  onInput(value: string) {
    this.input$.next(value);
  }

  clear() {
    this.term = '';
    this.input$.next('');
  }
}
