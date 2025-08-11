import React from 'react';
import { Bar } from 'react-chartjs-2';

type Props = {
  isDarkMode: boolean;
  labels: string[];
  data: number[];
  legendLabel: string;
};

const BudgetOverviewChart = React.memo<Props>(({ isDarkMode, labels, data, legendLabel }) => {
  const chartData = React.useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: legendLabel,
          data,
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1,
        },
      ],
    }),
    [labels, data, legendLabel]
  );
  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: { color: isDarkMode ? '#fff' : '#333' },
          grid: { color: isDarkMode ? '#555' : '#ddd' },
        },
        x: {
          ticks: { color: isDarkMode ? '#fff' : '#333' },
          grid: { color: isDarkMode ? '#555' : '#ddd' },
        },
      },
      plugins: {
        legend: {
          labels: { color: isDarkMode ? '#fff' : '#333' },
        },
      },
    }),
    [isDarkMode]
  );
  return <Bar data={chartData} options={options} />;
});
BudgetOverviewChart.displayName = 'BudgetOverviewChart';

export default BudgetOverviewChart;
