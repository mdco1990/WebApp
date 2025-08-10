import React from 'react'
import { Line } from 'react-chartjs-2'

type Props = {
  isDarkMode: boolean
  labels: string[]
  incomeSeries: number[]
  outcomeSeries: number[]
}

const KpiTrendChart: React.FC<Props> = ({ isDarkMode, labels, incomeSeries, outcomeSeries }) => {
  const data = {
    labels,
    datasets: [
      {
        label: 'Predicted Income',
        data: incomeSeries,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Predicted Outcomes',
        data: outcomeSeries,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
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

export default KpiTrendChart
