import { Injectable, inject, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { concat, interval } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    // Listen for new version available
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        const update = confirm(
          'A new version of Gonok is available.\n\nWould you like to update now?'
        );
        if (update) {
          this.swUpdate.activateUpdate().then(() => document.location.reload());
        }
      });

    // Poll for updates every 30 minutes once app is stable
    const appIsStable$ = this.appRef.isStable.pipe(first((stable) => stable));
    const every30Min$ = interval(30 * 60 * 1000);

    concat(appIsStable$, every30Min$).subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {
        // Silently ignore check failures (offline, etc.)
      });
    });
  }
}
