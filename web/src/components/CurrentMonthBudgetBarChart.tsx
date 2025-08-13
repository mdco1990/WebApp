import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CurrentMonthBudgetBarChartProps {
  isDarkMode: boolean;
  data: number[];
  labels: string[];
  legendLabel: string;
}

const CurrentMonthBudgetBarChart = React.memo<CurrentMonthBudgetBarChartProps>(
  ({ isDarkMode, data, labels, legendLabel }) => {
    const options = React.useMemo(
      () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              color: isDarkMode ? '#ffffff' : '#000000',
            },
          },
          title: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDarkMode ? '#333333' : '#ffffff',
            titleColor: isDarkMode ? '#ffffff' : '#000000',
            bodyColor: isDarkMode ? '#ffffff' : '#000000',
            borderColor: isDarkMode ? '#666666' : '#cccccc',
            borderWidth: 1,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: isDarkMode ? '#ffffff' : '#000000',
              callback: function (value: string | number) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(Number(value));
              },
            },
            grid: {
              color: isDarkMode ? '#444444' : '#e0e0e0',
            },
          },
          x: {
            ticks: {
              color: isDarkMode ? '#ffffff' : '#000000',
            },
            grid: {
              color: isDarkMode ? '#444444' : '#e0e0e0',
            },
          },
        },
      }),
      [isDarkMode]
    );

    const chartData = React.useMemo(
      () => ({
        labels,
        datasets: [
          {
            label: legendLabel,
            data,
            backgroundColor: [
              'rgba(75, 192, 192, 0.7)',
              'rgba(255, 99, 132, 0.7)',
              'rgba(54, 162, 235, 0.7)',
              'rgba(255, 205, 86, 0.7)',
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 205, 86, 1)',
            ],
            borderWidth: 2,
            borderRadius: 4,
          },
        ],
      }),
      [data, labels, legendLabel]
    );

    return <Bar data={chartData} options={options} />;
  }
);

CurrentMonthBudgetBarChart.displayName = 'CurrentMonthBudgetBarChart';

export default CurrentMonthBudgetBarChart;
