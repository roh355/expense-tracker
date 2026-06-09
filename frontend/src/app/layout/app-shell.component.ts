import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { LucideLogOut, LucideMoon, LucideSettings, LucideSun } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatMenuModule,
    MatButtonModule,
    LucideSettings,
    LucideLogOut,
    LucideMoon,
    LucideSun,
  ],
  template: `
    <header class="topbar">
      <div class="topbar-inner">
        <nav class="nav">
          <a routerLink="/transactions" routerLinkActive="active">Transactions</a>
          <a routerLink="/analytics" routerLinkActive="active">Analytics</a>
        </nav>
        <div class="actions">
          <a routerLink="/settings" class="icon-btn" title="Settings">
            <svg lucideSettings [size]="18"></svg>
          </a>
          <button type="button" class="icon-btn" (click)="theme.toggle()" title="Toggle theme">
            @if (theme.theme() === 'light') {
              <svg lucideMoon [size]="18"></svg>
            } @else {
              <svg lucideSun [size]="18"></svg>
            }
          </button>
          <button type="button" class="avatar" [matMenuTriggerFor]="userMenu">
            {{ initial() }}
          </button>
          <mat-menu #userMenu="matMenu" panelClass="user-menu">
            <button mat-menu-item class="logout-item" (click)="auth.logout()">
              <span class="logout-content">
                <svg lucideLogOut [size]="16"></svg>
                Logout
              </span>
            </button>
          </mat-menu>
        </div>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 0 var(--shadow);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .topbar-inner {
      max-width: 1200px;
      margin: 0 auto;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav a {
      color: var(--muted);
      font-weight: 600;
      font-size: 12px;
      padding: 4px 0;
      letter-spacing: 0.01em;
    }
    .nav a.active {
      color: var(--accent);
      border-bottom: 2px solid var(--accent);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--text);
      border-radius: 6px;
      cursor: pointer;
    }
    .icon-btn:hover {
      background: var(--bg);
    }
    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      font-family: var(--font-sans);
      cursor: pointer;
    }
    .content {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
  `,
})
export class AppShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);

  initial = () => (this.auth.currentUser()?.name?.[0] ?? '?').toUpperCase();
}
