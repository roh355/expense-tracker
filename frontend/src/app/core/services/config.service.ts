import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Category, UserConfig } from '../models';
import { AuthService } from './auth.service';
import { cachedGet$ } from './cached-http';
import { invalidatePrefix } from '../cache/indexed-db-cache';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getConfig(): Observable<UserConfig> {
    const userId = this.auth.currentUser()!.id;
    return cachedGet$<UserConfig>(this.http, userId, '/api/config');
  }

  updateCategories(categories: Category[]): Observable<UserConfig> {
    return this.http.put<UserConfig>('/api/config/categories', { categories }).pipe(
      tap(() => this.invalidate())
    );
  }

  updateBudget(monthlyBudget: number | null): Observable<UserConfig> {
    return this.http.put<UserConfig>('/api/config/budget', { monthlyBudget }).pipe(
      tap(() => this.invalidate())
    );
  }

  private async invalidate(): Promise<void> {
    const userId = this.auth.currentUser()!.id;
    await invalidatePrefix(`${userId}:/api/config`);
    await invalidatePrefix(`${userId}:/api/analytics`);
  }
}
