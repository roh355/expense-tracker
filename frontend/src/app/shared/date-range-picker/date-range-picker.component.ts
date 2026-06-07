import {
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { formatDateLocal } from '../../core/utils/dates';

export interface DateRange {
  from: string;
  to: string;
}

interface Preset {
  label: string;
  getRange: () => DateRange;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [LucideCalendar, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="picker">
      <button type="button" class="trigger" (click)="toggle()">
        <svg lucideCalendar [size]="14"></svg>
        <span class="trigger-text">{{ displayLabel() }}</span>
      </button>

      @if (open()) {
        <div class="panel">
          <div class="presets">
            @for (p of presets; track p.label) {
              <button type="button" class="preset" (click)="applyPreset(p)">{{ p.label }}</button>
            }
          </div>

          <div class="cal-header">
            <button type="button" class="nav-btn" (click)="prevMonth()">
              <svg lucideChevronLeft [size]="14"></svg>
            </button>
            <span class="month-label">{{ monthLabel() }}</span>
            <button type="button" class="nav-btn" (click)="nextMonth()">
              <svg lucideChevronRight [size]="14"></svg>
            </button>
          </div>

          <div class="weekdays">
            @for (d of weekdays; track d) {
              <span>{{ d }}</span>
            }
          </div>

          <div class="grid">
            @for (cell of calendarCells(); track cell.key) {
              @if (cell.day === 0) {
                <span class="cell empty"></span>
              } @else {
                <button
                  type="button"
                  class="cell"
                  [class.other-month]="!cell.inMonth"
                  [class.in-range]="cell.inRange"
                  [class.range-start]="cell.isStart"
                  [class.range-end]="cell.isEnd"
                  [class.today]="cell.isToday"
                  (click)="pickDate(cell.dateStr)"
                >{{ cell.day }}</button>
              }
            }
          </div>

          <div class="panel-footer">
            <span class="hint">{{ pickHint() }}</span>
            <div class="footer-actions">
              <button type="button" class="btn btn-ghost" (click)="clear()">Clear</button>
              <button type="button" class="btn btn-primary" [disabled]="!draftFrom()" (click)="apply()">
                Apply
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .picker {
      position: relative;
    }
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .trigger:hover {
      border-color: var(--border-strong);
    }
    .trigger-text {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .panel {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      z-index: 50;
      width: 300px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 12px 36px var(--shadow-md);
      padding: 12px;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }
    .preset {
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--muted);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }
    .preset:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .cal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .month-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .nav-btn {
      width: 28px;
      height: 28px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      margin-bottom: 4px;
    }
    .weekdays span {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--muted);
      padding: 2px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .cell {
      height: 32px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
    }
    .cell.empty {
      cursor: default;
    }
    .cell.other-month {
      color: var(--muted);
      opacity: 0.45;
    }
    .cell:hover:not(.empty) {
      background: var(--accent-soft);
    }
    .cell.in-range {
      background: var(--accent-soft);
      border-radius: 0;
    }
    .cell.range-start,
    .cell.range-end {
      background: var(--accent);
      color: #fff;
      border-radius: var(--radius-sm);
    }
    .cell.today:not(.range-start):not(.range-end) {
      outline: 1px solid var(--accent);
      outline-offset: -1px;
    }
    .panel-footer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hint {
      font-size: 10px;
      color: var(--muted);
    }
    .footer-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }
  `,
})
export class DateRangePickerComponent {
  from = input.required<string>();
  to = input.required<string>();
  rangeChange = output<DateRange>();

  open = signal(false);
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());
  draftFrom = signal<string | null>(null);
  draftTo = signal<string | null>(null);
  pickingEnd = signal(false);

  weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  presets: Preset[] = [
    {
      label: 'This month',
      getRange: () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: formatDateLocal(from), to: formatDateLocal(to) };
      },
    },
    {
      label: '7 days',
      getRange: () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 6);
        return { from: formatDateLocal(from), to: formatDateLocal(to) };
      },
    },
    {
      label: '30 days',
      getRange: () => {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 29);
        return { from: formatDateLocal(from), to: formatDateLocal(to) };
      },
    },
    {
      label: '3 months',
      getRange: () => {
        const to = new Date();
        const from = new Date();
        from.setMonth(from.getMonth() - 3);
        return { from: formatDateLocal(from), to: formatDateLocal(to) };
      },
    },
  ];

  displayLabel = computed(() => {
    const f = this.from();
    const t = this.to();
    if (!f || !t) return 'Select range';
    return `${this.fmt(f)} – ${this.fmt(t)}`;
  });

  monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth(), 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  });

  calendarCells = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = formatDateLocal(new Date());
    const from = this.draftFrom();
    const to = this.draftTo();

    const cells: {
      key: string;
      day: number;
      dateStr: string;
      inMonth: boolean;
      inRange: boolean;
      isStart: boolean;
      isEnd: boolean;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ key: `pad-${i}`, day: 0, dateStr: '', inMonth: false, inRange: false, isStart: false, isEnd: false, isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateLocal(new Date(year, month, d));
      const inRange = !!(from && to && dateStr >= from && dateStr <= to);
      cells.push({
        key: dateStr,
        day: d,
        dateStr,
        inMonth: true,
        inRange,
        isStart: dateStr === from,
        isEnd: dateStr === to,
        isToday: dateStr === today,
      });
    }

    return cells;
  });

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      this.draftFrom.set(this.from());
      this.draftTo.set(this.to());
      this.pickingEnd.set(false);
      const anchor = this.from() ? new Date(this.from() + 'T12:00:00') : new Date();
      this.viewYear.set(anchor.getFullYear());
      this.viewMonth.set(anchor.getMonth());
    }
  }

  pickHint(): string {
    if (!this.draftFrom()) return 'Click a start date';
    if (!this.draftTo()) return 'Click an end date';
    return `${this.fmt(this.draftFrom()!)} → ${this.fmt(this.draftTo()!)}`;
  }

  pickDate(dateStr: string): void {
    if (!this.draftFrom() || (this.draftFrom() && this.draftTo())) {
      this.draftFrom.set(dateStr);
      this.draftTo.set(null);
      this.pickingEnd.set(true);
      return;
    }

    if (dateStr < this.draftFrom()!) {
      this.draftTo.set(this.draftFrom());
      this.draftFrom.set(dateStr);
    } else {
      this.draftTo.set(dateStr);
    }
    this.pickingEnd.set(false);
  }

  applyPreset(p: Preset): void {
    const range = p.getRange();
    this.draftFrom.set(range.from);
    this.draftTo.set(range.to);
    this.rangeChange.emit(range);
    this.open.set(false);
  }

  apply(): void {
    const from = this.draftFrom();
    const to = this.draftTo() ?? from;
    if (!from) return;
    const range = { from, to: to! };
    if (range.from > range.to) {
      range.from = to!;
      range.to = from;
    }
    this.rangeChange.emit(range);
    this.open.set(false);
  }

  clear(): void {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const range = { from: formatDateLocal(from), to: formatDateLocal(to) };
    this.draftFrom.set(range.from);
    this.draftTo.set(range.to);
    this.rangeChange.emit(range);
    this.open.set(false);
  }

  prevMonth(): void {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
  }

  private fmt(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
