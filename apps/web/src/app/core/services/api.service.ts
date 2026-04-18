import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1';

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.error || 'Request failed');
        return res.data as T;
      }),
    );
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.error || 'Request failed');
        return res.data as T;
      }),
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.error || 'Request failed');
        return res.data as T;
      }),
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`).pipe(
      map((res) => {
        if (!res.success) throw new Error(res.error || 'Request failed');
        return res.data as T;
      }),
    );
  }
}
