import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap, tap } from 'rxjs';
import { getCache, setCache } from '../cache/indexed-db-cache';

export function cachedGet$<T>(
  http: HttpClient,
  userId: string,
  path: string,
  params?: Record<string, string>
): Observable<T> {
  const query = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const key = `${userId}:${path}${query}`;

  return from(getCache(key)).pipe(
    switchMap((cached) => {
      if (cached !== null) {
        return new Observable<T>((sub) => {
          sub.next(cached as T);
          sub.complete();
        });
      }
      return http.get<T>(`${path}${query}`).pipe(
        tap((data) => setCache(key, data))
      );
    })
  );
}
