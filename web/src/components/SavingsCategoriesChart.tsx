import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { SavingsCategory } from '../hooks/useBudgetState';

interface SavingsCategoriesChartProps {
  isDarkMode: boolean;
  categories: SavingsCategory[];
  formatCurrency: (cents: number) => string;
}

const SavingsCategoriesChart: React.FC<SavingsCategoriesChartProps> = ({
  isDarkMode,
  categories,
  formatCurrency,
}) => {
  // Filter out categories with no amount or name
  const validCategories = categories.filter((cat) => cat.name.trim() && cat.amount > 0);

  // No data case
  if (validCategories.length === 0) {
    return (
      <div
        className={`d-flex justify-content-center align-items-center ${isDarkMode ? 'text-light' : 'text-muted'}`}
        style={{ height: '300px' }}
      >
        <div className="text-center">
          <div className="fs-5 mb-2">📊</div>
          <div>No categories with amounts to display</div>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: validCategories.map((cat) => cat.name),
    datasets: [
      {
        label: 'Amount',
        data: validCategories.map((cat) => cat.amount),
        backgroundColor: validCategories.map((cat) => cat.color),
        borderColor: validCategories.map((cat) => cat.color),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Savings Categories Breakdown',
        color: isDarkMode ? '#ffffff' : '#333333',
        font: { size: 16 },
      },
      legend: {
        display: false, // Hide legend since colors are already shown in table
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#333333' : '#ffffff',
        titleColor: isDarkMode ? '#ffffff' : '#333333',
        bodyColor: isDarkMode ? '#ffffff' : '#333333',
        borderColor: isDarkMode ? '#555555' : '#cccccc',
        borderWidth: 1,
        callbacks: {
          label: (tooltipItem: { dataset: { label?: string }; parsed: { y: number } }) => {
            const value = tooltipItem.parsed.y;
            const label = tooltipItem.dataset.label || 'Amount';
            return `${label}: ${formatCurrency(Math.round(value * 100))}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDarkMode ? '#cccccc' : '#666666',
          maxRotation: 45,
          minRotation: 0,
        },
        grid: {
          color: isDarkMode ? '#444444' : '#e0e0e0',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: isDarkMode ? '#cccccc' : '#666666',
          callback: (value: string | number) => formatCurrency(Math.round(Number(value) * 100)),
        },
        grid: {
          color: isDarkMode ? '#444444' : '#e0e0e0',
        },
      },
    },
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default SavingsCategoriesChart;
