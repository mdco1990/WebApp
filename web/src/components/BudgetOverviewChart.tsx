import React from 'react';
import { Bar } from 'react-chartjs-2';

type Props = {
  isDarkMode: boolean;
  labels: string[];
  data: number[];
};

const BudgetOverviewChart: React.FC<Props> = ({ isDarkMode, labels, data }) => {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: 'Amount',
            data,
            backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
            borderWidth: 1,
          },
        ],
      }}
      options={{
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
            labels: {
              color: isDarkMode ? '#fff' : '#333',
            },
          },
        },
      }}
    />
  );
};

export default BudgetOverviewChart;
