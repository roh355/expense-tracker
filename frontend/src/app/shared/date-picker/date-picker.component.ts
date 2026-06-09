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

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [LucideCalendar, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="calendar-picker">
      <button
        #trigger
        type="button"
        class="calendar-picker__trigger"
        [class.calendar-picker__trigger--block]="blockTrigger()"
        (click)="toggle()"
      >
        <svg lucideCalendar [size]="14"></svg>
        <span class="calendar-picker__trigger-text">{{ displayLabel() }}</span>
      </button>

      @if (open()) {
        <div #panel class="calendar-picker__panel">
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
                  [class.calendar-picker__cell--selected]="cell.dateStr === selected()"
                  [class.calendar-picker__cell--today]="cell.isToday"
                  (click)="pickDate(cell.dateStr)"
                >{{ cell.day }}</button>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }
  `,
})
export class DatePickerComponent {
  @ViewChild('trigger') triggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') panelRef?: ElementRef<HTMLDivElement>;

  date = input.required<string>();
  blockTrigger = input(false);
  dateChange = output<string>();

  open = signal(false);
  selected = signal('');
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());
  weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  displayLabel = computed(() => {
    const value = this.selected() || this.date();
    if (!value) return 'Pick a date';
    const d = new Date(value + 'T12:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

    const cells: {
      key: string;
      day: number;
      dateStr: string;
      isToday: boolean;
    }[] = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ key: `pad-${i}`, day: 0, dateStr: '', isToday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateLocal(new Date(year, month, d));
      cells.push({
        key: dateStr,
        day: d,
        dateStr,
        isToday: dateStr === today,
      });
    }

    return cells;
  });

  constructor(private el: ElementRef) {
    effect(() => {
      const value = this.date();
      this.selected.set(value);
      if (value) {
        const anchor = new Date(value + 'T12:00:00');
        this.viewYear.set(anchor.getFullYear());
        this.viewMonth.set(anchor.getMonth());
      }
    });

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

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) {
      const anchor = this.selected() || this.date();
      const d = anchor ? new Date(anchor + 'T12:00:00') : new Date();
      this.viewYear.set(d.getFullYear());
      this.viewMonth.set(d.getMonth());
    }
  }

  private repositionPanel(): void {
    const panel = this.panelRef?.nativeElement;
    if (!panel) return;
    positionCalendarPanel(this.triggerRef.nativeElement, panel);
  }

  pickDate(dateStr: string): void {
    this.selected.set(dateStr);
    this.dateChange.emit(dateStr);
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
}
