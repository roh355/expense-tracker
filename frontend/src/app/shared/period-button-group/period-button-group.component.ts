import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-period-button-group',
  standalone: true,
  template: `
    <div class="period-group">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="period-btn"
          [class.active]="value() === opt.value"
          (click)="valueChange.emit(opt.value)"
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .period-group {
      display: flex;
      gap: 0;
      flex-wrap: wrap;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--input-bg);
    }
    .period-btn {
      padding: 5px 11px;
      border: none;
      border-right: 1px solid var(--border);
      background: transparent;
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .period-btn:last-child {
      border-right: none;
    }
    .period-btn.active {
      background: var(--accent);
      color: #fff;
    }
    .period-btn:not(.active):hover {
      background: var(--bg);
      color: var(--text);
    }
  `,
})
export class PeriodButtonGroupComponent<T extends string> {
  options = input.required<{ value: T; label: string }[]>();
  value = input.required<T>();
  valueChange = output<T>();
}
