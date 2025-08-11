import React from 'react';
import { Line } from 'react-chartjs-2';

type Props = {
  isDarkMode: boolean;
  year: number;
  monthIndex0: number; // 0-based month index
  bankAmount: number;
  itemsTotal: number;
  legendBank: string;
  legendItemsTotal: string;
  legendRemaining: string;
};

const ManualBudgetDailyChart = React.memo<Props>(
  ({
    isDarkMode,
    year,
    monthIndex0,
    bankAmount,
    itemsTotal,
    legendBank,
    legendItemsTotal,
    legendRemaining,
  }) => {
    const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
    const labels = React.useMemo(
      () => Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
      [daysInMonth]
    );
    const seriesBank = React.useMemo(
      () => Array.from({ length: daysInMonth }, () => bankAmount),
      [daysInMonth, bankAmount]
    );
    const seriesItems = React.useMemo(
      () => Array.from({ length: daysInMonth }, () => itemsTotal),
      [daysInMonth, itemsTotal]
    );
    const seriesRemaining = React.useMemo(
      () => Array.from({ length: daysInMonth }, () => bankAmount + itemsTotal),
      [daysInMonth, bankAmount, itemsTotal]
    );

    const data = React.useMemo(
      () => ({
        labels,
        datasets: [
          {
            label: legendBank,
            data: seriesBank,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.2,
            fill: false,
          },
          {
            label: legendItemsTotal,
            data: seriesItems,
            borderColor: 'rgba(255, 159, 64, 1)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
            tension: 0.2,
            fill: false,
          },
          {
            label: legendRemaining,
            data: seriesRemaining,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.2,
            fill: false,
          },
        ],
      }),
      [
        labels,
        seriesBank,
        seriesItems,
        seriesRemaining,
        legendBank,
        legendItemsTotal,
        legendRemaining,
      ]
    );

    return (
      <Line
        data={data}
        options={React.useMemo(
          () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: isDarkMode ? '#fff' : '#333' } } },
            scales: {
              x: {
                ticks: { color: isDarkMode ? '#fff' : '#333' },
                grid: { color: isDarkMode ? '#555' : '#ddd' },
              },
              y: {
                ticks: { color: isDarkMode ? '#fff' : '#333' },
                grid: { color: isDarkMode ? '#555' : '#ddd' },
              },
            },
          }),
          [isDarkMode]
        )}
      />
    );
  }
);
ManualBudgetDailyChart.displayName = 'ManualBudgetDailyChart';

export default ManualBudgetDailyChart;
