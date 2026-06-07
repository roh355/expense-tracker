import { Component, inject, OnInit, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { AnalyticsRange, AnalyticsSummary, DailyAnalytics, MonthlyAnalytics, MonthlyPeriod } from '../../core/models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { formatINR } from '../../core/utils/currency';
import { PeriodButtonGroupComponent } from '../../shared/period-button-group/period-button-group.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [BaseChartDirective, PeriodButtonGroupComponent],
  template: `
    <div class="header">
      <h2>Analytics</h2>
      <app-period-button-group
        [options]="rangeOptions"
        [value]="range()"
        (valueChange)="setRange($event)"
      />
    </div>

    <div class="cards">
      <div class="card">
        <span class="label">Total Expenditure</span>
        <span class="value expense">{{ formatINR(summary()?.totalExpenditure ?? 0) }}</span>
      </div>
      <div class="card">
        <span class="label">Total Income</span>
        <span class="value income">{{ formatINR(summary()?.totalIncome ?? 0) }}</span>
      </div>
      @if (summary()?.monthlyBudget != null) {
        <div class="card budget-card">
          <span class="label">Budget (this month)</span>
          <div class="budget-bar">
            <div
              class="budget-fill"
              [style.width.%]="Math.min(summary()!.budgetUsedPercent ?? 0, 100)"
              [class.warn]="(summary()!.budgetUsedPercent ?? 0) >= 75 && (summary()!.budgetUsedPercent ?? 0) < 100"
              [class.over]="(summary()!.budgetUsedPercent ?? 0) >= 100"
            ></div>
          </div>
          <span class="budget-text">
            {{ formatINR(summary()!.currentMonthSpend ?? 0) }} / {{ formatINR(summary()!.monthlyBudget!) }}
            ({{ summary()!.budgetUsedPercent }}%)
          </span>
        </div>
      }
    </div>

    <div class="charts-stack">
      <div class="chart-card">
        <h3>Spending by Category</h3>
        <div class="chart-area doughnut-area">
          <canvas baseChart [data]="doughnutData" [options]="doughnutOptions" type="doughnut"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Spending over time</h3>
        <div class="chart-area">
          <canvas baseChart [data]="lineData" [options]="lineOptions" type="line"></canvas>
        </div>
      </div>
    </div>

    <div class="histogram-section">
      <div class="header">
        <h3>Monthly Spend vs Budget</h3>
        <app-period-button-group
          [options]="periodOptions"
          [value]="period()"
          (valueChange)="setPeriod($event)"
        />
      </div>
      <div class="chart-card">
        <div class="chart-area histogram-area">
          <canvas baseChart [data]="barData" [options]="barOptions" type="bar"></canvas>
        </div>
      </div>
    </div>
  `,
  styles: `
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 8px;
    }
    h2, h3 {
      margin: 0;
      font-size: 16px;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }
    .label {
      display: block;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .value {
      font-size: 18px;
      font-weight: 600;
    }
    .value.expense { color: var(--expense); }
    .value.income { color: var(--income); }
    .budget-bar {
      height: 8px;
      background: var(--bg);
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0 4px;
    }
    .budget-fill {
      height: 100%;
      background: var(--income);
      border-radius: 4px;
      transition: width 0.3s;
    }
    .budget-fill.warn { background: #f59e0b; }
    .budget-fill.over { background: var(--expense); }
    .budget-text { font-size: 11px; color: var(--muted); }
    .charts-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }
    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }
    .chart-area {
      position: relative;
      height: 220px;
      margin-top: 10px;
    }
    .doughnut-area {
      height: 200px;
      max-width: 480px;
      margin-inline: auto;
    }
    .histogram-area {
      height: 260px;
    }
    .histogram-section .header { margin-bottom: 8px; }
  `,
})
export class AnalyticsComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  formatINR = formatINR;
  Math = Math;

  range = signal<AnalyticsRange>('this_month');
  period = signal<MonthlyPeriod>('current_year');
  summary = signal<AnalyticsSummary | null>(null);

  rangeOptions = [
    { value: 'this_month' as AnalyticsRange, label: 'This Month' },
    { value: '7d' as AnalyticsRange, label: '7d' },
    { value: '1m' as AnalyticsRange, label: '1m' },
    { value: '3m' as AnalyticsRange, label: '3m' },
    { value: 'all' as AnalyticsRange, label: 'All Time' },
  ];

  periodOptions = [
    { value: 'current_year' as MonthlyPeriod, label: 'Current Year' },
    { value: '1y' as MonthlyPeriod, label: '1Y' },
    { value: '3y' as MonthlyPeriod, label: '3Y' },
    { value: '5y' as MonthlyPeriod, label: '5Y' },
    { value: 'all' as MonthlyPeriod, label: 'All' },
  ];

  doughnutData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  lineData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  barData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } } },
  };

  lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: (v) => formatINR(Number(v)) } },
    },
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      annotation: { annotations: {} },
    },
    scales: {
      y: { ticks: { callback: (v) => formatINR(Number(v)) } },
    },
  };

  ngOnInit(): void {
    this.loadSummary();
    this.loadDaily();
    this.loadMonthly();
  }

  setRange(r: AnalyticsRange): void {
    this.range.set(r);
    this.loadSummary();
    this.loadDaily();
  }

  setPeriod(p: MonthlyPeriod): void {
    this.period.set(p);
    this.loadMonthly();
  }

  private loadSummary(): void {
    this.analyticsService.getSummary(this.range()).subscribe((s) => {
      this.summary.set(s);
      this.doughnutData = {
        labels: s.categoryBreakdown.map((c) => c.name),
        datasets: [{
          data: s.categoryBreakdown.map((c) => c.total),
          backgroundColor: s.categoryBreakdown.map((c) => c.color),
        }],
      };
    });
  }

  private loadDaily(): void {
    this.analyticsService.getDaily(this.range()).subscribe((d: DailyAnalytics) => {
      this.lineData = {
        labels: d.points.map((p) => p.date),
        datasets: [{
          label: 'Spending',
          data: d.points.map((p) => p.total),
          borderColor: '#4338ca',
          backgroundColor: 'rgba(67,56,202,0.08)',
          fill: true,
          tension: 0.3,
        }],
      };
    });
  }

  private loadMonthly(): void {
    this.analyticsService.getMonthly(this.period()).subscribe((m: MonthlyAnalytics) => {
      const colors = m.months.map((mo) => (mo.overBudget ? '#dc2626' : '#16a34a'));
      this.barData = {
        labels: m.months.map((mo) => mo.month),
        datasets: [{
          label: 'Spend',
          data: m.months.map((mo) => mo.spend),
          backgroundColor: colors,
        }],
      };

      if (m.monthlyBudget != null) {
        this.barOptions = {
          ...this.barOptions,
          plugins: {
            ...this.barOptions?.plugins,
            annotation: {
              annotations: {
                budgetLine: {
                  type: 'line',
                  yMin: m.monthlyBudget,
                  yMax: m.monthlyBudget,
                  borderColor: '#6b7280',
                  borderWidth: 2,
                  borderDash: [6, 4],
                },
              },
            },
          },
        };
      }
    });
  }
}
