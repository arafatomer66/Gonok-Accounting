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
      padding: 2rem 1.5rem 3rem;
    }
    .catalog__toolbar {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .catalog__info {
      font-size: 0.82rem;
      color: #8b8fa3;
      margin-bottom: 0.5rem;
      font-weight: 500;
      letter-spacing: 0.02em;
    }
    .catalog__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
    }
    .catalog__loading {
      text-align: center;
      padding: 5rem 1rem;
      color: #8b8fa3;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #e8eaf0;
      border-top-color: #4361ee;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .catalog__empty {
      text-align: center;
      padding: 5rem 1rem;
      color: #b0b3c0;
    }
    .catalog__empty svg {
      opacity: 0.5;
    }
    .catalog__empty p {
      margin-top: 1.25rem;
      font-size: 1.1rem;
      font-weight: 500;
      color: #6b7085;
    }
    .catalog__error {
      text-align: center;
      padding: 3rem;
      color: #ef4444;
      background: #fef2f2;
      border-radius: 16px;
      margin-top: 1rem;
    }
    .catalog__pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 3rem;
      padding: 1.25rem 0;
    }
    .pagination-btn {
      padding: 0.6rem 1.5rem;
      border: 1.5px solid #e8eaf0;
      border-radius: 12px;
      background: #fff;
      font-size: 0.88rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(.4,0,.2,1);
      font-family: inherit;
      color: #1a1a2e;
    }
    .pagination-btn:hover:not(:disabled) {
      border-color: #4361ee;
      color: #4361ee;
      box-shadow: 0 2px 8px rgba(67,97,238,0.12);
    }
    .pagination-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .pagination-info {
      font-size: 0.88rem;
      color: #6b7085;
      font-weight: 500;
    }
    @media (max-width: 600px) {
      .catalog { padding: 1.25rem 1rem 2rem; }
      .catalog__grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.85rem;
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
