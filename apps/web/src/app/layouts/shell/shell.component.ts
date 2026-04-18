import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { StorageService } from '../../core/services/storage.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'gonok-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent],
  template: `
    <gonok-sidebar
      [collapsed]="sidebarCollapsed()"
      (navClicked)="mobileMenuOpen.set(false)"
    />

    @if (mobileMenuOpen()) {
      <div class="mobile-overlay" (click)="mobileMenuOpen.set(false)"></div>
    }

    <gonok-navbar
      [sidebarCollapsed]="sidebarCollapsed()"
      [currentLang]="currentLang()"
      (menuToggle)="mobileMenuOpen.set(!mobileMenuOpen())"
      (toggleLang)="toggleLanguage()"
    />

    <main class="shell__content" [class.shell__content--sidebar-collapsed]="sidebarCollapsed()">
      <router-outlet />
    </main>
  `,
})
export class ShellComponent {
  private storage = inject(StorageService);
  private translate = inject(TranslateService);

  sidebarCollapsed = signal(false);
  mobileMenuOpen = signal(false);
  currentLang = signal(this.storage.getLanguage());

  toggleLanguage(): void {
    const newLang = this.currentLang() === 'en' ? 'bn' : 'en';
    this.currentLang.set(newLang);
    this.storage.setLanguage(newLang);
    this.translate.use(newLang);
  }
}
