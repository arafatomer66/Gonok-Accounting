import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: { uuid: string; name: string; phone: string };
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private api = inject(ApiService);

  register(phone: string, name: string): Observable<{ message: string }> {
    return this.api.post('/auth/register', { phone, name });
  }

  login(phone: string): Observable<{ message: string }> {
    return this.api.post('/auth/login', { phone });
  }

  verifyOtp(phone: string, otp: string): Observable<AuthTokens> {
    return this.api.post('/auth/verify-otp', { phone, otp });
  }

  refreshToken(refresh_token: string): Observable<{ access_token: string; refresh_token: string }> {
    return this.api.post('/auth/refresh-token', { refresh_token });
  }

  logout(userUuid: string): Observable<{ message: string }> {
    return this.api.post('/auth/logout', { user_uuid: userUuid });
  }
}
