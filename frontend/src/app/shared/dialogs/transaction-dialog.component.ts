import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category, Transaction, TransactionType } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { TransactionService } from '../../core/services/transaction.service';
import { formatDateLocal } from '../../core/utils/dates';

export interface TransactionDialogData {
  transaction?: Transaction;
}

@Component({
  selector: 'app-transaction-dialog',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="dialog">
      <div class="dialog-header">
        <h2>{{ isEdit ? 'Edit transaction' : 'New transaction' }}</h2>
      </div>

      <div class="dialog-body">
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
            <select id="tx-category" class="field-select" formControlName="categoryId">
              @if (filteredCategories().length === 0) {
                <option value="" disabled>No categories</option>
              }
              @for (cat of filteredCategories(); track cat.id) {
                <option [value]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label class="field-label" for="tx-date">Date</label>
            <input id="tx-date" class="field-input" type="date" formControlName="date" />
          </div>

          <div class="field">
            <label class="field-label" for="tx-desc">Description <span class="optional">optional</span></label>
            <input id="tx-desc" class="field-input" formControlName="description" placeholder="Add a note" />
          </div>
        </form>
      </div>

      <div class="dialog-footer">
        <button type="button" class="btn btn-ghost" (click)="dialogRef.close()">Cancel</button>
        <button
          type="button"
          class="btn btn-primary submit-btn"
          [disabled]="form.invalid || saving"
          (click)="save()"
        >
          {{ saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add transaction') }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .dialog {
      width: 100%;
      color: var(--text);
    }
    .dialog-header {
      padding: 16px 18px 0;
    }
    h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .dialog-body {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
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
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--border);
    }
    .submit-btn {
      min-width: 120px;
      color: #fff !important;
    }
    .field-select {
      cursor: pointer;
      appearance: auto;
    }
  `,
})
export class TransactionDialogComponent implements OnInit {
  private rawData = inject<TransactionDialogData>(MAT_DIALOG_DATA, { optional: true });
  data: TransactionDialogData = this.rawData ?? {};
  dialogRef = inject(MatDialogRef<TransactionDialogComponent>);
  private fb = inject(FormBuilder);
  private configService = inject(ConfigService);
  private transactionService = inject(TransactionService);

  isEdit = !!this.data.transaction;
  categories = signal<Category[]>([]);
  selectedType = signal<TransactionType>('EXPENSE');
  saving = false;

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

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config) => {
      this.categories.set(config.categories);

      if (this.data.transaction) {
        const t = this.data.transaction;
        this.selectedType.set(t.type);
        this.form.patchValue({
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
          date: t.date.slice(0, 10),
          description: t.description,
        });
      } else {
        this.setType('EXPENSE');
      }
    });

    this.form.get('type')!.valueChanges.subscribe((type) => {
      if (type) this.selectedType.set(type);
    });
  }

  setType(type: TransactionType): void {
    this.selectedType.set(type);
    this.form.patchValue({ type });
    const cats = this.filteredCategories();
    const current = this.form.value.categoryId;
    if (!cats.find((c) => c.id === current)) {
      this.form.patchValue({ categoryId: cats[0]?.id ?? '' });
    }
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

    const req = this.data.transaction
      ? this.transactionService.update(this.data.transaction.id, payload)
      : this.transactionService.create(payload);

    req.subscribe({
      next: () => this.dialogRef.close(true),
      error: () => (this.saving = false),
    });
  }
}
