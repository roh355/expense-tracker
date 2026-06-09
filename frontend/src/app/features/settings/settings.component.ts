import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideChevronDown, LucideChevronRight, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { Category, TransactionType, UserConfig } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { randomUUID } from '../../core/utils/uuid';

interface SettingsUiState {
  expenseOpen: boolean;
  incomeOpen: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    LucideChevronDown,
    LucideChevronRight,
    LucidePlus,
    LucideTrash2,
  ],
  template: `
    <div class="settings">
      <h2>Settings</h2>

      <div class="categories-grid">
        <section class="section">
          <button type="button" class="collapse-header" (click)="toggleExpenseOpen()">
            @if (uiState().expenseOpen) { <svg lucideChevronDown [size]="16"></svg> }
            @else { <svg lucideChevronRight [size]="16"></svg> }
            Expense Categories
          </button>
          @if (uiState().expenseOpen) {
            <div class="cat-list">
              @for (cat of expenseCategories(); track cat.id) {
                <div class="cat-row">
                  <span class="dot" [style.background]="cat.color"></span>
                  <input class="field-input" [(ngModel)]="cat.name" />
                  <input type="color" [(ngModel)]="cat.color" class="color-input" />
                  <button type="button" class="icon-btn" (click)="removeCategory(cat.id, 'EXPENSE')" [disabled]="expenseCategories().length <= 1">
                    <svg lucideTrash2 [size]="14"></svg>
                  </button>
                </div>
              }
              <button type="button" class="add-btn" (click)="addCategory('EXPENSE')">
                <svg lucidePlus [size]="14"></svg> Add category
              </button>
            </div>
          }
        </section>

        <section class="section">
          <button type="button" class="collapse-header" (click)="toggleIncomeOpen()">
            @if (uiState().incomeOpen) { <svg lucideChevronDown [size]="16"></svg> }
            @else { <svg lucideChevronRight [size]="16"></svg> }
            Income Categories
          </button>
          @if (uiState().incomeOpen) {
            <div class="cat-list">
              @for (cat of incomeCategories(); track cat.id) {
                <div class="cat-row">
                  <span class="dot" [style.background]="cat.color"></span>
                  <input class="field-input" [(ngModel)]="cat.name" />
                  <input type="color" [(ngModel)]="cat.color" class="color-input" />
                  <button type="button" class="icon-btn" (click)="removeCategory(cat.id, 'INCOME')" [disabled]="incomeCategories().length <= 1">
                    <svg lucideTrash2 [size]="14"></svg>
                  </button>
                </div>
              }
              <button type="button" class="add-btn" (click)="addCategory('INCOME')">
                <svg lucidePlus [size]="14"></svg> Add category
              </button>
            </div>
          }
        </section>
      </div>

      <button class="btn btn-primary save-cats" (click)="saveCategories()">Save categories</button>

      <section class="section budget-section">
        <h3>Monthly Budget</h3>
        <div class="budget-row">
          <input class="field-input budget-input" type="number" [(ngModel)]="budgetInput" placeholder="Amount in ₹" min="0" />
          <div class="budget-actions">
            <button class="btn btn-primary" (click)="saveBudget()">Save</button>
            <button class="btn" (click)="clearBudget()">Clear</button>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    .settings {
      max-width: 1200px;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    h3 {
      margin: 0 0 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--muted);
    }
    .categories-grid {
      display: grid;
      gap: 10px;
      margin-bottom: 10px;
    }
    @media (min-width: 768px) {
      .categories-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }
    .budget-section {
      margin-top: 10px;
    }
    .budget-row {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .budget-input {
      flex: 1;
      min-width: 180px;
    }
    .budget-actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    .collapse-header {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      border: none;
      background: transparent;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      color: var(--text);
      padding: 0;
    }
    .cat-list { margin-top: 10px; }
    .cat-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .cat-row .field-input {
      flex: 1;
      height: 30px;
    }
    .color-input {
      width: 30px;
      height: 30px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 2px;
      cursor: pointer;
      background: var(--input-bg);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .icon-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--muted);
      padding: 4px;
      border-radius: var(--radius-sm);
    }
    .icon-btn:hover:not(:disabled) {
      background: var(--bg);
      color: var(--expense);
    }
    .icon-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px dashed var(--border);
      background: transparent;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      margin-top: 4px;
    }
    .add-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .save-cats { margin-bottom: 10px; }
  `,
})
export class SettingsComponent implements OnInit {
  private configService = inject(ConfigService);
  private snackBar = inject(MatSnackBar);
  private session = inject(SessionStateService);

  uiState = this.session.sessionSignal<SettingsUiState>('settings.ui', {
    expenseOpen: true,
    incomeOpen: true,
  });

  categories: Category[] = [];
  budgetInput: number | null = null;

  expenseCategories = () => this.categories.filter((c) => c.type === 'EXPENSE');
  incomeCategories = () => this.categories.filter((c) => c.type === 'INCOME');

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config) => this.applyConfig(config));
  }

  toggleExpenseOpen(): void {
    this.uiState.update((s) => ({ ...s, expenseOpen: !s.expenseOpen }));
  }

  toggleIncomeOpen(): void {
    this.uiState.update((s) => ({ ...s, incomeOpen: !s.incomeOpen }));
  }

  private applyConfig(config: UserConfig): void {
    this.categories = config.categories.map((c) => ({ ...c }));
    this.budgetInput = config.monthlyBudget;
  }

  saveBudget(): void {
    const budget = this.budgetInput && this.budgetInput > 0 ? this.budgetInput : null;
    this.configService.updateBudget(budget).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.snackBar.open('Budget saved', 'OK', { duration: 2000 });
      },
    });
  }

  clearBudget(): void {
    this.budgetInput = null;
    this.configService.updateBudget(null).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.snackBar.open('Budget cleared', 'OK', { duration: 2000 });
      },
    });
  }

  addCategory(type: TransactionType): void {
    const colors = type === 'EXPENSE'
      ? ['#ef4444', '#f97316', '#8b5cf6', '#3b82f6']
      : ['#16a34a', '#22c55e', '#4ade80'];
    this.categories.push({
      id: randomUUID(),
      name: 'New Category',
      color: colors[this.categories.filter((c) => c.type === type).length % colors.length],
      type,
    });
  }

  removeCategory(id: string, type: TransactionType): void {
    const ofType = this.categories.filter((c) => c.type === type);
    if (ofType.length <= 1) return;
    this.categories = this.categories.filter((c) => c.id !== id);
  }

  saveCategories(): void {
    this.configService.updateCategories(this.categories).subscribe({
      next: (config) => {
        this.applyConfig(config);
        this.snackBar.open('Categories saved', 'OK', { duration: 2000 });
      },
      error: (err) => {
        const msg = err.error?.error ?? 'Failed to save categories';
        this.snackBar.open(typeof msg === 'string' ? msg : 'Failed to save', 'OK', { duration: 3000 });
      },
    });
  }
}
