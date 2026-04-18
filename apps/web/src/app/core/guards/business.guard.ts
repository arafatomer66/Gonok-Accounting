import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

/** Redirects to /create-business if user has no businesses */
export const businessGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.businesses().length > 0) {
    return true;
  }

  router.navigate(['/create-business']);
  return false;
};
