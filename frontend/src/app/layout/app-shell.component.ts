import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { LucideMoon, LucidePlus, LucideSettings, LucideSun } from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { TransactionDialogComponent } from '../shared/dialogs/transaction-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatMenuModule,
    MatButtonModule,
    LucidePlus,
    LucideSettings,
    LucideMoon,
    LucideSun,
  ],
  template: `
    <header class="topbar">
      <nav class="nav">
        <a routerLink="/transactions" routerLinkActive="active">Transactions</a>
        <a routerLink="/analytics" routerLinkActive="active">Analytics</a>
        <button type="button" class="add-btn" (click)="openAdd()">
          <svg lucidePlus [size]="14"></svg>
          Add
        </button>
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
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="auth.logout()">Logout</button>
        </mat-menu>
      </div>
    </header>
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    .topbar {
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 0 var(--shadow);
      position: sticky;
      top: 0;
      z-index: 10;
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
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 10px;
      margin-left: 4px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: background 0.15s;
    }
    .add-btn:hover {
      background: var(--accent-hover);
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
  private dialog = inject(MatDialog);

  initial = () => (this.auth.currentUser()?.name?.[0] ?? '?').toUpperCase();

  openAdd(): void {
    this.dialog.open(TransactionDialogComponent, {
      width: '380px',
      panelClass: 'sharp-dialog',
      data: {},
      autoFocus: 'first-tapable',
    });
  }
}
