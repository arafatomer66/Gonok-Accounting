import { Injectable } from '@angular/core';

const KEYS = {
  ACCESS_TOKEN: 'gonok_access_token',
  REFRESH_TOKEN: 'gonok_refresh_token',
  USER: 'gonok_user',
  ACTIVE_BUSINESS: 'gonok_active_business',
  LANGUAGE: 'gonok_language',
} as const;

@Injectable({ providedIn: 'root' })
export class StorageService {
  // Tokens
  getAccessToken(): string | null {
    return localStorage.getItem(KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(KEYS.REFRESH_TOKEN);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
  }

  clearTokens(): void {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
  }

  // User
  getUser(): { uuid: string; name: string; phone: string } | null {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  }

  setUser(user: { uuid: string; name: string; phone: string }): void {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  }

  clearUser(): void {
    localStorage.removeItem(KEYS.USER);
  }

  // Active business
  getActiveBusinessUuid(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_BUSINESS);
  }

  setActiveBusinessUuid(uuid: string): void {
    localStorage.setItem(KEYS.ACTIVE_BUSINESS, uuid);
  }

  // Language
  getLanguage(): string {
    return localStorage.getItem(KEYS.LANGUAGE) || 'en';
  }

  setLanguage(lang: string): void {
    localStorage.setItem(KEYS.LANGUAGE, lang);
  }

  // Clear all
  clearAll(): void {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  }
}
