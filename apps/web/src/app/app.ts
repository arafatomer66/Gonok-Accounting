import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'gonok-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App implements OnInit {
  private pwaUpdate = inject(PwaUpdateService);

  ngOnInit(): void {
    this.pwaUpdate.init();
  }
}
