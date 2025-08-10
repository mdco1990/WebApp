import React from 'react';
import { Pie } from 'react-chartjs-2';

export type Item = { name: string; amount_cents: number };

type Props = {
  isDarkMode: boolean;
  items: Item[];
  formatCurrency: (cents: number) => string;
};

const OutcomeBreakdownChart: React.FC<Props> = ({ isDarkMode, items, formatCurrency }) => {
  const labels = items.map((s) => s.name);
  const values = items.map((s) => s.amount_cents / 100);

  const paletteBg = [
    'rgba(255, 99, 132, 0.6)',
    'rgba(255, 159, 64, 0.6)',
    'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)',
    'rgba(54, 162, 235, 0.6)',
    'rgba(153, 102, 255, 0.6)',
    'rgba(231, 76, 60, 0.6)',
    'rgba(230, 126, 34, 0.6)',
    'rgba(241, 196, 15, 0.6)',
    'rgba(46, 204, 113, 0.6)',
    'rgba(52, 152, 219, 0.6)',
    'rgba(155, 89, 182, 0.6)',
    'rgba(149, 165, 166, 0.6)',
    'rgba(192, 57, 43, 0.6)',
    'rgba(211, 84, 0, 0.6)',
  ];
  const paletteBorder = [
    'rgba(255, 99, 132, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(231, 76, 60, 1)',
    'rgba(230, 126, 34, 1)',
    'rgba(241, 196, 15, 1)',
    'rgba(46, 204, 113, 1)',
    'rgba(52, 152, 219, 1)',
    'rgba(155, 89, 182, 1)',
    'rgba(149, 165, 166, 1)',
    'rgba(192, 57, 43, 1)',
    'rgba(211, 84, 0, 1)',
  ];

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: values.map((_, i) => paletteBg[i % paletteBg.length]),
        borderColor: values.map((_, i) => paletteBorder[i % paletteBorder.length]),
        borderWidth: 2,
      },
    ],
  };

  return (
    <Pie
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: isDarkMode ? '#fff' : '#333', padding: 10 },
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
      }}
    />
  );
};

export default OutcomeBreakdownChart;
