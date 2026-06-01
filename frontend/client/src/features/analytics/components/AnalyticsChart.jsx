import { Chart } from 'chart.js/auto'
import { useEffect, useRef } from 'react'

export function AnalyticsChart({ data, labels, title, type = 'bar' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined

    const chart = new Chart(canvasRef.current, {
      type,
      data: {
        labels,
        datasets: [{
          label: title,
          data,
          backgroundColor: ['#1463ff', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'],
          borderColor: '#1463ff',
          tension: 0.35,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type !== 'bar' },
          title: { display: true, text: title },
        },
        scales: type === 'doughnut' ? {} : { y: { beginAtZero: true, max: 100 } },
      },
    })

    return () => chart.destroy()
  }, [data, labels, title, type])

  return (
    <div className="analytics-chart">
      <canvas ref={canvasRef} />
    </div>
  )
}
