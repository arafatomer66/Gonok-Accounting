import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { StorefrontApiService } from '../../services/storefront-api.service';
import { BusinessHeaderComponent } from '../../components/business-header/business-header.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CategoryFilterComponent } from '../../components/category-filter/category-filter.component';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import type {
  IStorefrontBusiness,
  IStorefrontProduct,
  IStorefrontCategory,
} from '@org/shared-types';

@Component({
  selector: 'sf-catalog-page',
  standalone: true,
  imports: [
    BusinessHeaderComponent,
    ProductCardComponent,
    CategoryFilterComponent,
    SearchBarComponent,
  ],
  template: `
    <sf-business-header [business]="business()" />

    <div class="catalog">
      <!-- Toolbar -->
      <div class="catalog__toolbar">
        <sf-search-bar (searchChange)="onSearch($event)" />
        @if (categories().length > 0) {
          <sf-category-filter
            [categories]="categories()"
            [selectedUuid]="selectedCategory()"
            (categoryChange)="onCategoryChange($event)"
          />
        }
      </div>

      <!-- Results info -->
      <div class="catalog__info">
        <span>{{ total() }} product{{ total() === 1 ? '' : 's' }}</span>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="catalog__loading">
          <div class="spinner"></div>
          <p>Loading products...</p>
        </div>
      }

      <!-- Product grid -->
      @if (!loading()) {
        @if (products().length > 0) {
          <div class="catalog__grid">
            @for (product of products(); track product.uuid) {
              <sf-product-card [product]="product" />
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="catalog__pagination">
              <button
                class="pagination-btn"
                [disabled]="page() <= 1"
                (click)="goToPage(page() - 1)"
              >
                Previous
              </button>
              <span class="pagination-info">
                Page {{ page() }} of {{ totalPages() }}
              </span>
              <button
                class="pagination-btn"
                [disabled]="page() >= totalPages()"
                (click)="goToPage(page() + 1)"
              >
                Next
              </button>
            </div>
          }
        } @else {
          <div class="catalog__empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 4-6 5 7" />
            </svg>
            <p>No products found</p>
          </div>
        }
      }

      <!-- Error -->
      @if (error()) {
        <div class="catalog__error">
          <p>{{ error() }}</p>
          <button class="pagination-btn" (click)="loadProducts()">Try Again</button>
        </div>
      }
    </div>
  `,
  styles: `
    .catalog {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    .catalog__toolbar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .catalog__info {
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 1rem;
    }
    .catalog__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .catalog__loading {
      text-align: center;
      padding: 4rem 1rem;
      color: #888;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #eee;
      border-top-color: #1a73e8;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .catalog__empty {
      text-align: center;
      padding: 4rem 1rem;
      color: #aaa;
    }
    .catalog__empty p {
      margin-top: 1rem;
      font-size: 1.1rem;
    }
    .catalog__error {
      text-align: center;
      padding: 2rem;
      color: #c62828;
    }
    .catalog__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
      padding: 1rem 0;
    }
    .pagination-btn {
      padding: 0.5rem 1.25rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pagination-btn:hover:not(:disabled) {
      border-color: #1a73e8;
      color: #1a73e8;
    }
    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination-info {
      font-size: 0.9rem;
      color: #666;
    }
    @media (max-width: 600px) {
      .catalog { padding: 1rem; }
      .catalog__grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
    }
  `,
})
export class CatalogPage implements OnInit {
  @Input() businessSlug!: string;

  private api = inject(StorefrontApiService);

  business = signal<IStorefrontBusiness | null>(null);
  products = signal<IStorefrontProduct[]>([]);
  categories = signal<IStorefrontCategory[]>([]);
  total = signal(0);
  page = signal(1);
  limit = signal(24);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedCategory = signal<string | undefined>(undefined);
  searchTerm = signal('');

  totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  ngOnInit() {
    this.loadBusiness();
    this.loadCategories();
    this.loadProducts();
  }

  loadBusiness() {
    this.api.getBusiness(this.businessSlug).subscribe({
      next: (biz) => this.business.set(biz),
      error: (err) => this.error.set(err.message || 'Store not found'),
    });
  }

  loadCategories() {
    this.api.getCategories(this.businessSlug).subscribe({
      next: (cats) => this.categories.set(cats),
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getProducts(this.businessSlug, {
        page: this.page(),
        limit: this.limit(),
        category: this.selectedCategory(),
        search: this.searchTerm() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.products.set(res.products);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message || 'Failed to load products');
          this.loading.set(false);
        },
      });
  }

  onSearch(term: string) {
    this.searchTerm.set(term);
    this.page.set(1);
    this.loadProducts();
  }

  onCategoryChange(uuid: string | undefined) {
    this.selectedCategory.set(uuid);
    this.page.set(1);
    this.loadProducts();
  }

  goToPage(p: number) {
    this.page.set(p);
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
