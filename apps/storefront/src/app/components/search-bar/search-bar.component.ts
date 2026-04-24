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
      max-width: 480px;
    }
    .search-bar__icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #a0a3b1;
      pointer-events: none;
      transition: color 0.2s;
    }
    .search-bar:focus-within .search-bar__icon {
      color: #4361ee;
    }
    .search-bar__input {
      width: 100%;
      padding: 0.85rem 2.75rem 0.85rem 2.85rem;
      border: 2px solid #e8eaf0;
      border-radius: 14px;
      font-size: 0.92rem;
      outline: none;
      transition: all 0.25s cubic-bezier(.4,0,.2,1);
      box-sizing: border-box;
      background: #fff;
      color: #1a1a2e;
      font-family: inherit;
    }
    .search-bar__input::placeholder {
      color: #b0b3c0;
    }
    .search-bar__input:focus {
      border-color: #4361ee;
      box-shadow: 0 0 0 4px rgba(67,97,238,0.1);
    }
    .search-bar__clear {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: #f0f2f8;
      border: none;
      cursor: pointer;
      color: #6b7085;
      padding: 4px;
      display: flex;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .search-bar__clear:hover {
      background: #e0e2ee;
      color: #1a1a2e;
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
