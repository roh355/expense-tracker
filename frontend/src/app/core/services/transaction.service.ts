import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Transaction, TransactionListResponse, TransactionType } from '../models';
import { AuthService } from './auth.service';
import { cachedGet$ } from './cached-http';
import { invalidatePrefix } from '../cache/indexed-db-cache';

export interface TransactionQuery {
  limit?: number;
  cursor?: string;
  from?: string;
  to?: string;
  q?: string;
  type?: TransactionType;
  categoryId?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  readonly refresh$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  list(query: TransactionQuery): Observable<TransactionListResponse> {
    const userId = this.auth.currentUser()!.id;
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params[k] = String(v);
    }
    return cachedGet$<TransactionListResponse>(this.http, userId, '/api/transactions', params);
  }

  create(data: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    description?: string;
    date: string;
  }): Observable<Transaction> {
    return this.http.post<Transaction>('/api/transactions', data).pipe(
      tap(() => this.invalidate())
    );
  }

  update(id: string, data: Partial<{
    amount: number;
    type: TransactionType;
    categoryId: string;
    description: string;
    date: string;
  }>): Observable<Transaction> {
    return this.http.put<Transaction>(`/api/transactions/${id}`, data).pipe(
      tap(() => this.invalidate())
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/transactions/${id}`).pipe(
      tap(() => this.invalidate())
    );
  }

  private async invalidate(): Promise<void> {
    const userId = this.auth.currentUser()!.id;
    await invalidatePrefix(`${userId}:/api/transactions`);
    await invalidatePrefix(`${userId}:/api/analytics`);
    this.refresh$.next();
  }
}
