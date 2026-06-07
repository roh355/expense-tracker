import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-panel">
        <div class="brand">
          <span class="brand-mark">₹</span>
          <div>
            <h1>Expense Tracker</h1>
            <p>Sign in to manage your finances</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <div class="field">
            <label class="field-label" for="email">Email</label>
            <input id="email" class="field-input" type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="field">
            <label class="field-label" for="password">Password</label>
            <input id="password" class="field-input" type="password" formControlName="password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          @if (error) {
            <p class="form-error">{{ error }}</p>
          }
          <button class="btn btn-primary btn-block" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="footer-link">No account? <a routerLink="/signup">Create one</a></p>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-soft), transparent),
        var(--bg);
    }
    .auth-panel {
      width: 100%;
      max-width: 360px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 28px 24px 22px;
      box-shadow: 0 8px 32px var(--shadow);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .brand-mark {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent);
      color: #fff;
      border-radius: var(--radius-sm);
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }
    h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand p {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--muted);
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .footer-link {
      margin: 18px 0 0;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }
    .footer-link a {
      font-weight: 600;
    }
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/transactions']),
      error: () => {
        this.error = 'Invalid email or password';
        this.loading = false;
      },
    });
  }
}
