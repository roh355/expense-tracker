import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  input,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { formatDateLocal } from '../../core/utils/dates';
import { positionCalendarPanel } from '../calendar/calendar-overlay';

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
    <div class="calendar-picker">
      <button #trigger type="button" class="calendar-picker__trigger" (click)="toggle()">
        <svg lucideCalendar [size]="14"></svg>
        <span class="calendar-picker__trigger-text">{{ displayLabel() }}</span>
      </button>

      @if (open()) {
        <div #panel class="calendar-picker__panel">
          <div class="calendar-picker__presets">
            @for (p of presets; track p.label) {
              <button type="button" class="calendar-picker__preset" (click)="applyPreset(p)">{{ p.label }}</button>
            }
          </div>

          <div class="calendar-picker__header">
            <button type="button" class="calendar-picker__nav" (click)="prevMonth()">
              <svg lucideChevronLeft [size]="14"></svg>
            </button>
            <span class="calendar-picker__month">{{ monthLabel() }}</span>
            <button type="button" class="calendar-picker__nav" (click)="nextMonth()">
              <svg lucideChevronRight [size]="14"></svg>
            </button>
          </div>

          <div class="calendar-picker__weekdays">
            @for (d of weekdays; track d) {
              <span>{{ d }}</span>
            }
          </div>

          <div class="calendar-picker__grid">
            @for (cell of calendarCells(); track cell.key) {
              @if (cell.day === 0) {
                <span class="calendar-picker__cell calendar-picker__cell--empty"></span>
              } @else {
                <button
                  type="button"
                  class="calendar-picker__cell"
                  [class.calendar-picker__cell--other-month]="!cell.inMonth"
                  [class.calendar-picker__cell--in-range]="cell.inRange"
                  [class.calendar-picker__cell--range-start]="cell.isStart"
                  [class.calendar-picker__cell--range-end]="cell.isEnd"
                  [class.calendar-picker__cell--today]="cell.isToday"
                  (click)="pickDate(cell.dateStr)"
                >{{ cell.day }}</button>
              }
            }
          </div>

          <div class="calendar-picker__footer">
            <span class="calendar-picker__hint">{{ pickHint() }}</span>
            <div class="calendar-picker__footer-actions">
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
    .calendar-picker__trigger-text {
      max-width: 200px;
    }
  `,
})
export class DateRangePickerComponent {
  @ViewChild('trigger') triggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') panelRef?: ElementRef<HTMLDivElement>;

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

  constructor(private el: ElementRef) {
    effect(() => {
      if (this.open()) {
        requestAnimationFrame(() => this.repositionPanel());
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.open()) this.repositionPanel();
  }

  private repositionPanel(): void {
    const panel = this.panelRef?.nativeElement;
    if (!panel) return;
    positionCalendarPanel(this.triggerRef.nativeElement, panel);
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
    requestAnimationFrame(() => this.repositionPanel());
  }

  nextMonth(): void {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
    requestAnimationFrame(() => this.repositionPanel());
  }

  private fmt(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
