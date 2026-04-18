import { ApplicationConfig, provideBrowserGlobalErrorListeners, APP_INITIALIZER, inject, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { StorageService } from './core/services/storage.service';
import { AuthStore, Business } from './core/stores/auth.store';
import { ApiService } from './core/services/api.service';
import { PouchDbService } from './core/services/pouchdb.service';
import { SyncBootstrapService } from './core/services/sync-bootstrap.service';
import { ETables } from '@org/shared-types';

function initializeApp(): () => Promise<void> {
  const authStore = inject(AuthStore);
  const translate = inject(TranslateService);
  const storage = inject(StorageService);
  const api = inject(ApiService);
  const pouchDb = inject(PouchDbService);
  const syncBootstrap = inject(SyncBootstrapService);

  return async () => {
    // Set up i18n
    translate.addLangs(['en', 'bn']);
    translate.setDefaultLang('en');
    translate.use(storage.getLanguage());

    // Restore auth session
    authStore.restoreSession();

    // If authenticated, start sync in background, then load businesses
    if (authStore.isAuthenticated()) {
      syncBootstrap.start();
      try {
        const businesses = await firstValueFrom(api.get<Business[]>('/businesses'));
        authStore.setBusinesses(businesses);
      } catch {
        // API unavailable — load businesses from PouchDB (may have synced data)
        try {
          const db = pouchDb.getDatabase();
          const result = await db.allDocs({ include_docs: true, startkey: ETables.BUSINESS + '::', endkey: ETables.BUSINESS + '::\ufff0' });
          const bizDocs = result.rows
            .filter((r) => r.doc && !(r.doc as any)._deleted)
            .map((r) => r.doc as unknown as Business);
          if (bizDocs.length > 0) {
            authStore.setBusinesses(bizDocs);
          }
        } catch {
          // PouchDB also failed — businesses stay empty
        }
      }
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTranslateService(),
    provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
