import { Component, inject, OnInit, input, output, signal, computed, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { Category, Transaction, TransactionType } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { TransactionService } from '../../core/services/transaction.service';
import { formatDateLocal } from '../../core/utils/dates';
import { DatePickerComponent } from '../date-picker/date-picker.component';

@Component({
  selector: 'app-transaction-drawer-panel',
  standalone: true,
  imports: [ReactiveFormsModule, DatePickerComponent, LucideX],
  template: `
    <div class="panel">
      <div class="panel-header">
        <h2>{{ isEdit() ? 'Edit transaction' : 'New transaction' }}</h2>
        <button type="button" class="close-btn" (click)="cancelled.emit()" title="Close">
          <svg lucideX [size]="16"></svg>
        </button>
      </div>

      <div class="panel-body">
        <div class="segmented">
          <button
            type="button"
            [class.active]="selectedType() === 'EXPENSE'"
            (click)="setType('EXPENSE')"
          >Expense</button>
          <button
            type="button"
            [class.active]="selectedType() === 'INCOME'"
            (click)="setType('INCOME')"
          >Income</button>
        </div>

        <form [formGroup]="form" class="form">
          <div class="field">
            <label class="field-label" for="tx-amount">Amount (₹)</label>
            <input
              id="tx-amount"
              class="field-input"
              type="number"
              formControlName="amount"
              min="1"
              placeholder="Enter amount"
            />
          </div>

          <div class="field">
            <label class="field-label" for="tx-category">Category</label>
            <select
              id="tx-category"
              class="field-select"
              formControlName="categoryId"
              [attr.data-type]="selectedType()"
            >
              @if (filteredCategories().length === 0) {
                <option value="" disabled>No categories</option>
              }
              @for (cat of filteredCategories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <span class="field-label">Date</span>
            <app-date-picker
              [date]="selectedDate()"
              (dateChange)="onDateChange($event)"
              [blockTrigger]="true"
            />
          </div>

          <div class="field">
            <label class="field-label" for="tx-desc">Description <span class="optional">optional</span></label>
            <textarea
              id="tx-desc"
              class="field-textarea"
              formControlName="description"
              placeholder="Add a note"
              rows="3"
            ></textarea>
          </div>
        </form>
      </div>

      <div class="panel-footer">
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancel</button>
        <button
          type="button"
          class="btn btn-primary submit-btn"
          [disabled]="form.invalid || saving"
          (click)="save()"
        >
          {{ saving ? 'Saving…' : (isEdit() ? 'Save changes' : 'Add transaction') }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 80vh;
      min-height: 0;
    }
    .panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      color: var(--text);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 0;
      flex-shrink: 0;
    }
    h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .close-btn {
      border: none;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--radius-sm);
    }
    .close-btn:hover {
      background: var(--bg);
      color: var(--text);
    }
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 0;
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .optional {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      opacity: 0.6;
    }
    .panel-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
      margin-top: auto;
      background: var(--surface);
    }
    .submit-btn {
      min-width: 120px;
      color: #fff !important;
    }
    .field-select {
      cursor: pointer;
      appearance: auto;
      width: 100%;
    }
  `,
})
export class TransactionDrawerPanelComponent implements OnInit {
  transaction = input<Transaction>();
  saved = output<void>();
  cancelled = output<void>();

  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  private transactionService = inject(TransactionService);

  isEdit = computed(() => !!this.transaction());
  categories = signal<Category[]>([]);
  selectedType = signal<TransactionType>('EXPENSE');
  saving = false;
  categoriesReady = false;

  selectedDate = signal(formatDateLocal(new Date()));

  formKey = input(0);

  filteredCategories = computed(() =>
    this.categories().filter((c) => c.type === this.selectedType())
  );

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    type: ['EXPENSE' as TransactionType, Validators.required],
    categoryId: ['', Validators.required],
    date: [formatDateLocal(new Date()), Validators.required],
    description: [''],
  });

  constructor() {
    effect(() => {
      this.formKey();
      const tx = this.transaction();
      if (tx) {
        this.selectedType.set(tx.type);
        this.selectedDate.set(tx.date.slice(0, 10));
        this.form.patchValue({
          amount: tx.amount,
          type: tx.type,
          categoryId: tx.categoryId,
          date: tx.date.slice(0, 10),
          description: tx.description,
        }, { emitEvent: false });
        if (this.categoriesReady) {
          this.syncCategoryForCurrentType(tx.categoryId);
        }
      } else {
        this.resetForm();
      }
    });

    effect(() => {
      const type = this.selectedType();
      const cats = this.categories().filter((c) => c.type === type);
      const current = this.form.get('categoryId')?.value;
      if (!cats.length) {
        if (current) {
          this.form.patchValue({ categoryId: '' }, { emitEvent: false });
        }
        return;
      }
      if (!cats.some((c) => c.id === current)) {
        this.form.patchValue({ categoryId: cats[0].id }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config) => {
      this.categories.set(config.categories);
      this.categoriesReady = true;
      this.syncCategoryForCurrentType();
      if (this.transaction()) {
        this.syncCategoryForCurrentType(this.transaction()!.categoryId);
      }
    });
  }

  onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.form.patchValue({ date });
  }

  setType(type: TransactionType | string): void {
    if (type !== 'EXPENSE' && type !== 'INCOME') return;
    if (type === this.selectedType()) return;

    this.selectedType.set(type);
    this.form.patchValue({ type }, { emitEvent: false });

    const cats = this.categories().filter((c) => c.type === type);
    this.form.patchValue({ categoryId: cats[0]?.id ?? '' }, { emitEvent: false });
  }

  private syncCategoryForCurrentType(preferredId?: string): void {
    const type = this.selectedType();
    const cats = this.categories().filter((c) => c.type === type);
    const current = this.form.value.categoryId;
    const next =
      cats.find((c) => c.id === (preferredId ?? current))?.id ??
      cats[0]?.id ??
      '';
    if (next !== current) {
      this.form.patchValue({ categoryId: next }, { emitEvent: false });
    }
  }

  resetForm(): void {
    const today = formatDateLocal(new Date());
    this.selectedType.set('EXPENSE');
    this.selectedDate.set(today);
    this.form.reset({
      amount: null,
      type: 'EXPENSE',
      categoryId: '',
      date: today,
      description: '',
    });
    this.syncCategoryForCurrentType();
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();
    const payload = {
      amount: Number(v.amount),
      type: v.type!,
      categoryId: v.categoryId!,
      description: v.description ?? '',
      date: new Date(v.date! + 'T12:00:00').toISOString(),
    };

    const tx = this.transaction();
    const req = tx
      ? this.transactionService.update(tx.id, payload)
      : this.transactionService.create(payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
      },
      error: () => (this.saving = false),
    });
  }
}
