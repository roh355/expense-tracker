import { Injectable, signal, WritableSignal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SessionStateService {
  /** Signal backed by sessionStorage — similar to a React useSessionState hook. */
  sessionSignal<T>(key: string, initial: T): WritableSignal<T> {
    const storageKey = `et:${key}`;
    const state = signal<T>(this.read(storageKey, initial));

    effect(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(state()));
      } catch {
        /* quota exceeded — ignore */
      }
    });

    return state;
  }

  get<T>(key: string, initial: T): T {
    return this.read(`et:${key}`, initial);
  }

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(`et:${key}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }

  private read<T>(storageKey: string, initial: T): T {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw) as T;
      return typeof parsed === 'object' && parsed !== null
        ? { ...(initial as object), ...(parsed as object) } as T
        : parsed;
    } catch {
      return initial;
    }
  }
}
