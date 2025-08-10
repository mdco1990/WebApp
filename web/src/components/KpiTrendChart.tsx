import React from 'react';
import { Line } from 'react-chartjs-2';

type Props = {
  isDarkMode: boolean;
  labels: string[];
  incomeSeries: number[];
  outcomeSeries: number[];
  legendIncome: string;
  legendOutcome: string;
};

const KpiTrendChart = React.memo<Props>(({ isDarkMode, labels, incomeSeries, outcomeSeries, legendIncome, legendOutcome }) => {
  const data = React.useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: legendIncome,
          data: incomeSeries,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
        },
        {
          label: legendOutcome,
          data: outcomeSeries,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
        },
      ],
    }),
    [labels, incomeSeries, outcomeSeries, legendIncome, legendOutcome]
  );

  return (
    <Line
      data={data}
      options={React.useMemo(() => ({
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
      }), [isDarkMode])}
    />
  );
});
KpiTrendChart.displayName = 'KpiTrendChart';

export default KpiTrendChart;
