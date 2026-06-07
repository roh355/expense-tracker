import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnalyticsRange,
  AnalyticsSummary,
  DailyAnalytics,
  MonthlyAnalytics,
  MonthlyPeriod,
} from '../models';
import { AuthService } from './auth.service';
import { cachedGet$ } from './cached-http';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  getSummary(range: AnalyticsRange): Observable<AnalyticsSummary> {
    const userId = this.auth.currentUser()!.id;
    return cachedGet$<AnalyticsSummary>(this.http, userId, '/api/analytics/summary', { range });
  }

  getDaily(range: AnalyticsRange): Observable<DailyAnalytics> {
    const userId = this.auth.currentUser()!.id;
    return cachedGet$<DailyAnalytics>(this.http, userId, '/api/analytics/daily', { range });
  }

  getMonthly(period: MonthlyPeriod): Observable<MonthlyAnalytics> {
    const userId = this.auth.currentUser()!.id;
    return cachedGet$<MonthlyAnalytics>(this.http, userId, '/api/analytics/monthly', { period });
  }
}
