import { Route } from '@angular/router';

export const CRM_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./crm.component').then((m) => m.CrmComponent),
  },
  {
    path: 'interactions',
    loadComponent: () =>
      import('./interactions/interactions.component').then(
        (m) => m.InteractionsComponent,
      ),
  },
  {
    path: 'follow-ups',
    loadComponent: () =>
      import('./follow-ups/follow-ups.component').then(
        (m) => m.FollowUpsComponent,
      ),
  },
  {
    path: 'pipeline',
    loadComponent: () =>
      import('./pipeline/pipeline.component').then(
        (m) => m.PipelineComponent,
      ),
  },
  {
    path: 'notes',
    loadComponent: () =>
      import('./notes/notes.component').then((m) => m.NotesComponent),
  },
];
