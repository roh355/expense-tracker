import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideColumns, LucidePencil, LucideTrash2 } from '@lucide/angular';
import { debounceTime, Subject } from 'rxjs';
import { Transaction, TransactionType } from '../../core/models';
import { TransactionService } from '../../core/services/transaction.service';
import { formatINR } from '../../core/utils/currency';
import { formatDisplayDate, getCurrentMonthRange } from '../../core/utils/dates';
import { TransactionDialogComponent } from '../../shared/dialogs/transaction-dialog.component';
import { DateRangePickerComponent, DateRange } from '../../shared/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    FormsModule,
    MatMenuModule,
    MatButtonModule,
    MatCheckboxModule,
    LucideColumns,
    LucidePencil,
    LucideTrash2,
    DateRangePickerComponent,
  ],
  template: `
    <div class="toolbar">
      <input
        class="field-input search"
        placeholder="Search..."
        [(ngModel)]="searchText"
        (ngModelChange)="onSearchChange()"
      />
      <app-date-range-picker
        [from]="from"
        [to]="to"
        (rangeChange)="onRangeChange($event)"
      />
      <select class="field-select" [(ngModel)]="typeFilter" (ngModelChange)="reload()">
        <option value="">All types</option>
        <option value="EXPENSE">Expense</option>
        <option value="INCOME">Income</option>
      </select>
      <button type="button" class="icon-btn" [matMenuTriggerFor]="colMenu">
        <svg lucideColumns [size]="16"></svg>
      </button>
      <mat-menu #colMenu="matMenu">
        @for (col of columns; track col.id) {
          <button mat-menu-item (click)="$event.stopPropagation()">
            <mat-checkbox
              [checked]="visibleColumns()[col.id]"
              (change)="toggleColumn(col.id, $event.checked)"
            >
              {{ col.label }}
            </mat-checkbox>
          </button>
        }
      </mat-menu>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            @if (visibleColumns()['date']) {
              <th class="sortable" (click)="setSort('date')">
                Date @if (sort === 'date') { {{ order === 'desc' ? '↓' : '↑' }} }
              </th>
            }
            @if (visibleColumns()['type']) {
              <th class="sortable" (click)="setSort('type')">
                Type @if (sort === 'type') { {{ order === 'desc' ? '↓' : '↑' }} }
              </th>
            }
            @if (visibleColumns()['category']) {
              <th class="sortable" (click)="setSort('category')">
                Category @if (sort === 'category') { {{ order === 'desc' ? '↓' : '↑' }} }
              </th>
            }
            @if (visibleColumns()['description']) {
              <th class="sortable" (click)="setSort('description')">
                Description @if (sort === 'description') { {{ order === 'desc' ? '↓' : '↑' }} }
              </th>
            }
            @if (visibleColumns()['amount']) {
              <th class="sortable" (click)="setSort('amount')">
                Amount @if (sort === 'amount') { {{ order === 'desc' ? '↓' : '↑' }} }
              </th>
            }
            @if (visibleColumns()['actions']) {
              <th>Actions</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (tx of items(); track tx.id) {
            <tr>
              @if (visibleColumns()['date']) {
                <td>{{ formatDisplayDate(tx.date) }}</td>
              }
              @if (visibleColumns()['type']) {
                <td>{{ tx.type === 'EXPENSE' ? 'Expense' : 'Income' }}</td>
              }
              @if (visibleColumns()['category']) {
                <td>
                  <span class="dot" [style.background]="tx.categoryColor"></span>
                  {{ tx.categoryName }}
                </td>
              }
              @if (visibleColumns()['description']) {
                <td>{{ tx.description || '—' }}</td>
              }
              @if (visibleColumns()['amount']) {
                <td [class.amount-expense]="tx.type === 'EXPENSE'" [class.amount-income]="tx.type === 'INCOME'">
                  {{ formatINR(tx.amount) }}
                </td>
              }
              @if (visibleColumns()['actions']) {
                <td class="actions">
                  <button type="button" (click)="edit(tx)" title="Edit">
                    <svg lucidePencil [size]="14"></svg>
                  </button>
                  <button type="button" (click)="deleteTx(tx)" title="Delete">
                    <svg lucideTrash2 [size]="14"></svg>
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
      @if (loading()) {
        <p class="status">Loading...</p>
      }
      @if (!loading() && items().length === 0) {
        <p class="status">No transactions found</p>
      }
      <div #sentinel class="sentinel"></div>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .search {
      flex: 1;
      min-width: 180px;
    }
    .icon-btn {
      border: 1px solid var(--border);
      background: var(--input-bg);
      border-radius: var(--radius-sm);
      padding: 7px;
      cursor: pointer;
      color: var(--text);
      height: 34px;
      display: flex;
      align-items: center;
    }
    .table-wrap {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      height: 34px;
    }
    th.sortable {
      cursor: pointer;
      user-select: none;
    }
    th:hover { background: var(--bg); }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .amount-expense { color: var(--expense); font-weight: 500; }
    .amount-income { color: var(--income); font-weight: 500; }
    .actions {
      display: flex;
      gap: 4px;
    }
    .actions button {
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--muted);
      padding: 2px;
    }
    .status {
      text-align: center;
      padding: 16px;
      color: var(--muted);
    }
    .sentinel { height: 1px; }
  `,
})
export class TransactionsComponent implements OnInit, AfterViewInit {
  private transactionService = inject(TransactionService);
  private dialog = inject(MatDialog);

  @ViewChild('sentinel') sentinel!: ElementRef<HTMLDivElement>;

  items = signal<Transaction[]>([]);
  loading = signal(false);
  hasMore = signal(true);
  nextCursor = signal<string | null>(null);

  formatINR = formatINR;
  formatDisplayDate = formatDisplayDate;

  columns = [
    { id: 'date', label: 'Date' },
    { id: 'type', label: 'Type' },
    { id: 'category', label: 'Category' },
    { id: 'description', label: 'Description' },
    { id: 'amount', label: 'Amount' },
    { id: 'actions', label: 'Actions' },
  ];

  visibleColumns = signal<Record<string, boolean>>({
    date: true,
    type: true,
    category: true,
    description: true,
    amount: true,
    actions: true,
  });

  searchText = '';
  private search$ = new Subject<void>();
  from = getCurrentMonthRange().from;
  to = getCurrentMonthRange().to;
  typeFilter = '';
  sort = 'date';
  order: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe(() => this.reload());
    this.transactionService.refresh$.subscribe(() => this.reload());
    this.reload();
  }

  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && this.hasMore() && !this.loading()) {
          this.loadMore();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(this.sentinel.nativeElement);
  }

  onSearchChange(): void {
    this.search$.next();
  }

  onRangeChange(range: DateRange): void {
    this.from = range.from;
    this.to = range.to;
    this.reload();
  }

  setSort(col: string): void {
    if (this.sort === col) {
      this.order = this.order === 'desc' ? 'asc' : 'desc';
    } else {
      this.sort = col;
      this.order = 'desc';
    }
    this.reload();
  }

  toggleColumn(id: string, visible: boolean): void {
    this.visibleColumns.update((v) => ({ ...v, [id]: visible }));
  }

  reload(): void {
    this.items.set([]);
    this.nextCursor.set(null);
    this.hasMore.set(true);
    this.fetchPage();
  }

  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.fetchPage();
  }

  private fetchPage(): void {
    this.loading.set(true);
    this.transactionService
      .list({
        limit: 30,
        cursor: this.nextCursor() ?? undefined,
        from: this.from,
        to: this.to,
        q: this.searchText || undefined,
        type: (this.typeFilter as TransactionType) || undefined,
        sort: this.sort,
        order: this.order,
      })
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.items]);
          this.nextCursor.set(res.nextCursor);
          this.hasMore.set(res.hasMore);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  edit(tx: Transaction): void {
    const ref = this.dialog.open(TransactionDialogComponent, {
      width: '380px',
      panelClass: 'sharp-dialog',
      data: { transaction: tx },
      autoFocus: 'first-tapable',
    });
    ref.afterClosed().subscribe((ok) => ok && this.reload());
  }

  deleteTx(tx: Transaction): void {
    if (confirm('Delete this transaction?')) {
      this.transactionService.delete(tx.id).subscribe(() => this.reload());
    }
  }
}
