import React from 'react'
import { Pie } from 'react-chartjs-2'

type Props = {
  isDarkMode: boolean
  currentAmount: number
  targetAmount: number
  formatCurrency: (cents: number) => string
}

const SavingsProgressChart: React.FC<Props> = ({ isDarkMode, currentAmount, targetAmount, formatCurrency }) => {
  const data = {
    labels: ['Current', 'Remaining'],
    datasets: [
      {
        data: [currentAmount, Math.max(targetAmount - currentAmount, 0)],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  }

  return (
    <Pie
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: isDarkMode ? '#fff' : '#333' } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const dataset = ctx.dataset
                const arr = Array.isArray(dataset.data) ? dataset.data : []
                const total = arr.reduce((a, b) => (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0), 0) || 1
                const value = ctx.parsed
                const pct = ((value / total) * 100).toFixed(1) + '%'
                const label = ctx.label || ''
                return `${label}: ${formatCurrency(Math.round(value * 100))} (${pct})`
              }
            }
          }
        }
      }}
    />
  )
}

export default SavingsProgressChart
