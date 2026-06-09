import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
  ColumnDef,
  createAngularTable,
  getCoreRowModel,
} from '@tanstack/angular-table';
import { LucideCheck, LucideColumns, LucidePencil, LucidePlus, LucideTrash2, LucideX } from '@lucide/angular';
import { debounceTime, Subject } from 'rxjs';
import { Category, Transaction, TransactionType } from '../../core/models';
import { ConfigService } from '../../core/services/config.service';
import { TransactionService } from '../../core/services/transaction.service';
import { SessionStateService } from '../../core/services/session-state.service';
import { formatINR } from '../../core/utils/currency';
import { formatDisplayDate, getCurrentMonthRange } from '../../core/utils/dates';
import { TransactionDrawerPanelComponent } from '../../shared/drawers/transaction-drawer-panel.component';
import { DateRangePickerComponent, DateRange } from '../../shared/date-range-picker/date-range-picker.component';
import { DatePickerComponent } from '../../shared/date-picker/date-picker.component';

interface EditDraft {
  amount: number;
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string;
}

interface TransactionsFilterState {
  searchText: string;
  from: string;
  to: string;
  typeFilter: string;
  sort: string;
  order: 'asc' | 'desc';
  columnVisibility: Record<string, boolean>;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    FormsModule,
    MatMenuModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSidenavModule,
    LucidePlus,
    LucideColumns,
    LucidePencil,
    LucideTrash2,
    LucideCheck,
    LucideX,
    DateRangePickerComponent,
    DatePickerComponent,
    TransactionDrawerPanelComponent,
  ],
  template: `
    <mat-sidenav-container class="page-layout" autosize>
      <mat-sidenav
        #drawer
        mode="side"
        position="start"
        [opened]="drawerOpen()"
        class="txn-drawer"
      >
        <app-transaction-drawer-panel
          [formKey]="drawerFormKey()"
          [transaction]="drawerTransaction()"
          (saved)="onDrawerSaved()"
          (cancelled)="closeDrawer()"
        />
      </mat-sidenav>

      <mat-sidenav-content class="page-content" [class.drawer-open]="drawerOpen()">
        <div class="toolbar">
          <button type="button" class="add-btn" (click)="openAdd()">
            <svg lucidePlus [size]="14"></svg>
            Add
          </button>
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
          <select class="field-select" [(ngModel)]="typeFilter" (ngModelChange)="onTypeFilterChange()">
            <option value="">All types</option>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
          <button type="button" class="icon-btn" [matMenuTriggerFor]="colMenu">
            <svg lucideColumns [size]="16"></svg>
          </button>
          <mat-menu #colMenu="matMenu">
            @for (col of columnMenu; track col.id) {
              <button mat-menu-item (click)="$event.stopPropagation()">
                <mat-checkbox
                  [checked]="columnVisibility()[col.id]"
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
              @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
                <tr>
                  @for (header of headerGroup.headers; track header.id) {
                    <th
                      [class.sortable]="header.column.id !== 'actions'"
                      (click)="onHeaderClick(header.column.id)"
                    >
                      {{ columnLabel(header.column.id) }}
                      @if (sort === header.column.id) {
                        {{ order === 'desc' ? ' ↓' : ' ↑' }}
                      }
                    </th>
                  }
                </tr>
              }
            </thead>
            <tbody>
              @for (row of table().getRowModel().rows; track row.id) {
                <tr [class.editing]="editingId() === row.original.id">
                  @for (cell of row.getVisibleCells(); track cell.id) {
                    <td>
                      @if (editingId() === row.original.id && cell.column.id !== 'actions') {
                        @switch (cell.column.id) {
                          @case ('date') {
                            <app-date-picker
                              class="cell-date-picker"
                              [date]="editDraft()!.date"
                              (dateChange)="patchDraft('date', $event)"
                            />
                          }
                          @case ('type') {
                            <div class="cell-segmented">
                              <button
                                type="button"
                                [class.active]="editDraft()!.type === 'EXPENSE'"
                                (click)="onDraftTypeChange('EXPENSE')"
                              >Expense</button>
                              <button
                                type="button"
                                [class.active]="editDraft()!.type === 'INCOME'"
                                (click)="onDraftTypeChange('INCOME')"
                              >Income</button>
                            </div>
                          }
                          @case ('category') {
                            <select
                              class="cell-select"
                              [ngModel]="editDraft()!.categoryId"
                              (ngModelChange)="patchDraft('categoryId', $event)"
                            >
                              @for (cat of categoriesForDraft(); track cat.id) {
                                <option [value]="cat.id">{{ cat.name }}</option>
                              }
                            </select>
                          }
                          @case ('description') {
                            <textarea
                              class="cell-textarea"
                              [ngModel]="editDraft()!.description"
                              (ngModelChange)="patchDraft('description', $event)"
                            ></textarea>
                          }
                          @case ('amount') {
                            <input
                              class="cell-input"
                              type="number"
                              min="1"
                              [ngModel]="editDraft()!.amount"
                              (ngModelChange)="patchDraft('amount', $event)"
                            />
                          }
                        }
                      } @else if (cell.column.id === 'actions') {
                        @if (editingId() === row.original.id) {
                          <div class="actions">
                            <button type="button" (click)="saveRow()" title="Save" [disabled]="savingRow()">
                              <svg lucideCheck [size]="14"></svg>
                            </button>
                            <button type="button" (click)="cancelEdit()" title="Cancel">
                              <svg lucideX [size]="14"></svg>
                            </button>
                          </div>
                        } @else {
                          <div class="actions">
                            <button type="button" (click)="startEdit(row.original)" title="Edit">
                              <svg lucidePencil [size]="14"></svg>
                            </button>
                            <button type="button" (click)="deleteTx(row.original)" title="Delete">
                              <svg lucideTrash2 [size]="14"></svg>
                            </button>
                          </div>
                        }
                      } @else if (cell.column.id === 'date') {
                        {{ formatDisplayDate(row.original.date) }}
                      } @else if (cell.column.id === 'type') {
                        {{ row.original.type === 'EXPENSE' ? 'Expense' : 'Income' }}
                      } @else if (cell.column.id === 'category') {
                        <span class="dot" [style.background]="row.original.categoryColor"></span>
                        {{ row.original.categoryName }}
                      } @else if (cell.column.id === 'description') {
                        {{ row.original.description || '—' }}
                      } @else if (cell.column.id === 'amount') {
                        <span
                          [class.amount-expense]="row.original.type === 'EXPENSE'"
                          [class.amount-income]="row.original.type === 'INCOME'"
                        >
                          {{ formatINR(row.original.amount) }}
                        </span>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
            @if (items().length > 0) {
              <tfoot>
                <tr class="total-row">
                  @for (col of visibleColumnOrder(); track col.id) {
                    @switch (col.id) {
                      @case ('date') {
                        <td class="total-label">Total</td>
                      }
                      @case ('amount') {
                        <td
                          [class.amount-expense]="totals().net < 0"
                          [class.amount-income]="totals().net >= 0"
                        >
                          {{ formatINR(totals().net) }}
                        </td>
                      }
                      @case ('description') {
                        <td class="total-meta">
                          {{ formatINR(totals().expense) }} exp · {{ formatINR(totals().income) }} inc
                        </td>
                      }
                      @default {
                        <td></td>
                      }
                    }
                  }
                </tr>
              </tfoot>
            }
          </table>
          @if (loading()) {
            <p class="status">Loading...</p>
          }
          @if (!loading() && items().length === 0) {
            <p class="status">No transactions found</p>
          }
          <div #sentinel class="sentinel"></div>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .page-layout {
      min-height: calc(100vh - 76px);
      background: transparent;
      margin: 8px 0 16px;
    }
    :host ::ng-deep .mat-drawer.txn-drawer {
      top: 8px;
      bottom: 16px;
      height: auto;
      max-height: 80vh;
      border-radius: var(--radius);
      display: flex;
      flex-direction: column;
    }
    :host ::ng-deep .mat-drawer.txn-drawer .mat-drawer-inner-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
    .txn-drawer {
      width: 360px;
      max-height: 80vh;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: 0 4px 16px var(--shadow);
      overflow: hidden;
    }
    .page-content {
      padding: 8px 0;
      transition: padding 0.2s ease;
    }
    .page-content.drawer-open {
      padding-left: 16px;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;
    }
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 34px;
      padding: 0 12px;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.02em;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .add-btn:hover {
      background: var(--accent-hover);
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
      margin-top: 4px;
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
      vertical-align: top;
    }
    th {
      height: 34px;
      vertical-align: middle;
    }
    tbody tr:not(.editing) td {
      height: 34px;
      vertical-align: middle;
    }
    tr.editing td {
      padding-top: 8px;
      padding-bottom: 8px;
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
    .actions button:hover:not(:disabled) {
      color: var(--text);
    }
    .actions button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .cell-input,
    .cell-select {
      width: 100%;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text);
      font-size: 12px;
      font-family: var(--font-sans);
    }
    .cell-segmented {
      display: flex;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--input-bg);
    }
    .cell-segmented button {
      flex: 1;
      height: 30px;
      border: none;
      background: transparent;
      color: var(--muted);
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 0 6px;
    }
    .cell-segmented button + button {
      border-left: 1px solid var(--border);
    }
    .cell-segmented button.active {
      background: var(--accent);
      color: #fff;
    }
    .cell-date-picker {
      display: block;
      min-width: 148px;
    }
    .cell-textarea {
      width: 100%;
      height: 30px;
      min-height: 0;
      padding: 6px 8px;
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text);
      font-size: 12px;
      resize: vertical;
      line-height: 1.3;
      field-sizing: content;
    }
    .total-row td {
      font-weight: 700;
      background: var(--bg);
      border-bottom: none;
    }
    .total-label {
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 11px;
      color: var(--muted);
    }
    .total-meta {
      font-size: 11px;
      color: var(--muted);
      font-weight: 500;
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
  private configService = inject(ConfigService);
  private session = inject(SessionStateService);

  private defaultFilters(): TransactionsFilterState {
    const range = getCurrentMonthRange();
    return {
      searchText: '',
      from: range.from,
      to: range.to,
      typeFilter: '',
      sort: 'date',
      order: 'desc',
      columnVisibility: {
        date: true,
        type: true,
        category: true,
        description: true,
        amount: true,
        actions: true,
      },
    };
  }

  private filters = this.session.sessionSignal<TransactionsFilterState>(
    'transactions.filters',
    this.defaultFilters()
  );

  @ViewChild('sentinel') sentinel!: ElementRef<HTMLDivElement>;

  items = signal<Transaction[]>([]);
  loading = signal(false);
  hasMore = signal(true);
  nextCursor = signal<string | null>(null);
  categories = signal<Category[]>([]);

  drawerOpen = signal(false);
  drawerTransaction = signal<Transaction | undefined>(undefined);
  drawerFormKey = signal(0);

  editingId = signal<string | null>(null);
  editDraft = signal<EditDraft | null>(null);
  savingRow = signal(false);

  formatINR = formatINR;
  formatDisplayDate = formatDisplayDate;

  columnMenu = [
    { id: 'date', label: 'Date' },
    { id: 'type', label: 'Type' },
    { id: 'category', label: 'Category' },
    { id: 'description', label: 'Description' },
    { id: 'amount', label: 'Amount' },
    { id: 'actions', label: 'Actions' },
  ];

  columnVisibility = computed(() => this.filters().columnVisibility);

  visibleColumnOrder = computed(() =>
    this.columnMenu.filter((col) => this.columnVisibility()[col.id])
  );

  totals = computed(() => {
    const items = this.items();
    let expense = 0;
    let income = 0;
    for (const t of items) {
      if (t.type === 'EXPENSE') expense += t.amount;
      else income += t.amount;
    }
    return { expense, income, net: income - expense };
  });

  categoriesForDraft = computed(() => {
    const draft = this.editDraft();
    if (!draft) return [];
    return this.categories().filter((c) => c.type === draft.type);
  });

  searchText = '';
  private search$ = new Subject<void>();
  from = getCurrentMonthRange().from;
  to = getCurrentMonthRange().to;
  typeFilter = '';
  sort = 'date';
  order: 'asc' | 'desc' = 'desc';

  constructor() {
    const saved = this.filters();
    this.searchText = saved.searchText;
    this.from = saved.from;
    this.to = saved.to;
    this.typeFilter = saved.typeFilter;
    this.sort = saved.sort;
    this.order = saved.order;
  }

  private columnDefs: ColumnDef<Transaction>[] = [
    {
      id: 'date',
      accessorKey: 'date',
      header: 'Date',
      cell: (info) => this.formatDisplayDate(info.row.original.date),
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      cell: (info) => (info.row.original.type === 'EXPENSE' ? 'Expense' : 'Income'),
    },
    {
      id: 'category',
      accessorKey: 'categoryName',
      header: 'Category',
      cell: (info) => info.row.original.categoryName,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => info.row.original.description || '—',
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      cell: (info) => this.formatINR(info.row.original.amount),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: () => '',
      enableSorting: false,
    },
  ];

  table = createAngularTable(() => ({
    data: this.items(),
    columns: this.columnDefs,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility: this.columnVisibility(),
    },
    onColumnVisibilityChange: (updater) => {
      const prev = this.columnVisibility();
      const next = typeof updater === 'function' ? updater(prev) : updater;
      this.patchFilters({ columnVisibility: next });
    },
  }));

  private patchFilters(patch: Partial<TransactionsFilterState>): void {
    this.filters.update((current) => ({ ...current, ...patch }));
  }

  private persistFilterFields(): void {
    this.patchFilters({
      searchText: this.searchText,
      from: this.from,
      to: this.to,
      typeFilter: this.typeFilter,
      sort: this.sort,
      order: this.order,
    });
  }

  ngOnInit(): void {
    this.configService.getConfig().subscribe((config) => {
      this.categories.set(config.categories);
    });
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

  openAdd(): void {
    this.drawerTransaction.set(undefined);
    this.drawerFormKey.update((k) => k + 1);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.drawerTransaction.set(undefined);
  }

  onDrawerSaved(): void {
    this.closeDrawer();
    this.reload();
  }

  onSearchChange(): void {
    this.persistFilterFields();
    this.search$.next();
  }

  onRangeChange(range: DateRange): void {
    this.from = range.from;
    this.to = range.to;
    this.persistFilterFields();
    this.reload();
  }

  onTypeFilterChange(): void {
    this.persistFilterFields();
    this.reload();
  }

  onHeaderClick(columnId: string): void {
    if (columnId === 'actions') return;
    this.setSort(columnId);
  }

  setSort(col: string): void {
    if (this.sort === col) {
      this.order = this.order === 'desc' ? 'asc' : 'desc';
    } else {
      this.sort = col;
      this.order = 'desc';
    }
    this.persistFilterFields();
    this.reload();
  }

  toggleColumn(id: string, visible: boolean): void {
    this.patchFilters({
      columnVisibility: { ...this.columnVisibility(), [id]: visible },
    });
  }

  columnLabel(id: string): string {
    return this.columnMenu.find((col) => col.id === id)?.label ?? id;
  }

  startEdit(tx: Transaction): void {
    this.editingId.set(tx.id);
    this.editDraft.set({
      amount: tx.amount,
      type: tx.type,
      categoryId: tx.categoryId,
      description: tx.description,
      date: tx.date.slice(0, 10),
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set(null);
  }

  patchDraft<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    const draft = this.editDraft();
    if (!draft) return;
    this.editDraft.set({ ...draft, [key]: value });
  }

  onDraftTypeChange(type: TransactionType): void {
    const draft = this.editDraft();
    if (!draft || draft.type === type) return;
    const cats = this.categories().filter((c) => c.type === type);
    const categoryId = cats[0]?.id ?? '';
    this.editDraft.set({ ...draft, type, categoryId });
  }

  saveRow(): void {
    const id = this.editingId();
    const draft = this.editDraft();
    if (!id || !draft || draft.amount < 1 || !draft.categoryId) return;

    this.savingRow.set(true);
    this.transactionService
      .update(id, {
        amount: Number(draft.amount),
        type: draft.type,
        categoryId: draft.categoryId,
        description: draft.description ?? '',
        date: new Date(draft.date + 'T12:00:00').toISOString(),
      })
      .subscribe({
        next: () => {
          this.savingRow.set(false);
          this.cancelEdit();
          this.reload();
        },
        error: () => this.savingRow.set(false),
      });
  }

  reload(): void {
    this.cancelEdit();
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

  deleteTx(tx: Transaction): void {
    if (confirm('Delete this transaction?')) {
      this.transactionService.delete(tx.id).subscribe(() => this.reload());
    }
  }
}
