import React from 'react';
import { Pie } from 'react-chartjs-2';

export type Item = { name: string; amount_cents: number };

type Props = {
  isDarkMode: boolean;
  items: Item[];
  formatCurrency: (cents: number) => string;
};

const IncomeBreakdownChart = React.memo<Props>(({ isDarkMode, items, formatCurrency }) => {
  const labels = React.useMemo(() => items.map((s) => s.name), [items]);
  const values = React.useMemo(() => items.map((s) => s.amount_cents / 100), [items]);
  const data = React.useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
          ],
          borderWidth: 1,
        },
      ],
    }),
    [labels, values]
  );

  return (
    <Pie
      data={data}
      options={React.useMemo(
        () => ({
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: isDarkMode ? '#fff' : '#333' },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const dataset = ctx.dataset;
                  const arr = Array.isArray(dataset.data) ? dataset.data : [];
                  const total =
                    arr.reduce(
                      (a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0),
                      0
                    ) || 1;
                  const value = ctx.parsed;
                  const pct = ((value / total) * 100).toFixed(1) + '%';
                  const label = ctx.label || '';
                  return `${label}: ${formatCurrency(Math.round(value * 100))} (${pct})`;
                },
              },
            },
          },
        }),
        [isDarkMode, formatCurrency]
      )}
    />
  );
});
IncomeBreakdownChart.displayName = 'IncomeBreakdownChart';

export default IncomeBreakdownChart;
