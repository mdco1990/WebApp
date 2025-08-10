import React from 'react'
import { Line } from 'react-chartjs-2'

type Props = {
  isDarkMode: boolean
  year: number
  monthIndex0: number // 0-based month index
  bankAmount: number
  itemsTotal: number
}

const ManualBudgetDailyChart: React.FC<Props> = ({ isDarkMode, year, monthIndex0, bankAmount, itemsTotal }) => {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1))
  const seriesBank = Array.from({ length: daysInMonth }, () => bankAmount)
  const seriesItems = Array.from({ length: daysInMonth }, () => itemsTotal)
  const seriesRemaining = Array.from({ length: daysInMonth }, () => bankAmount + itemsTotal)

  const data = {
    labels,
    datasets: [
      {
        label: 'Bank',
        data: seriesBank,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.2,
        fill: false
      },
      {
        label: 'Items Total',
        data: seriesItems,
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        tension: 0.2,
        fill: false
      },
      {
        label: 'Remaining',
        data: seriesRemaining,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.2,
        fill: false
      }
    ]
  }

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: isDarkMode ? '#fff' : '#333' } } },
        scales: {
          x: { ticks: { color: isDarkMode ? '#fff' : '#333' }, grid: { color: isDarkMode ? '#555' : '#ddd' } },
          y: { ticks: { color: isDarkMode ? '#fff' : '#333' }, grid: { color: isDarkMode ? '#555' : '#ddd' } }
        }
      }}
    />
  )
}

export default ManualBudgetDailyChart
