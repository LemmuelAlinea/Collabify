import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const fallbackColors = ['#1463ff', '#24d2ff', '#20e681', '#f59e0b', '#ef4444', '#8b5cf6']

function formatValue(value, suffix) {
  if (value === null || value === undefined) return '0'
  const rounded = Number.isInteger(Number(value)) ? Number(value) : Number(value).toFixed(1)
  return `${rounded}${suffix ?? ''}`
}

function ChartTooltip({ active, payload, label, valueSuffix }) {
  if (!active || !payload?.length) return null

  return (
    <div className="analytics-chart-tooltip">
      <div className="analytics-chart-tooltip-label">{label ?? payload[0]?.name}</div>
      {payload.map((item) => (
        <div className="analytics-chart-tooltip-row" key={item.dataKey}>
          <span className="analytics-chart-dot" style={{ background: item.payload?.fill ?? item.color }} />
          <span>{item.name}</span>
          <strong>{formatValue(item.value, valueSuffix)}</strong>
        </div>
      ))}
    </div>
  )
}

function ChartLegend({ series }) {
  return (
    <div className="analytics-chart-legend">
      {series.map((item, index) => (
        <span className="analytics-chart-legend-item" key={item.dataKey}>
          <span style={{ background: item.color ?? fallbackColors[index % fallbackColors.length] }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function AnalyticsChart({
  data = [],
  max = 100,
  series = [],
  stacked = false,
  title,
  type = 'bar',
  valueSuffix = '%',
  xKey = 'label',
}) {
  const chartSeries = series.map((item, index) => ({
    ...item,
    color: item.color ?? fallbackColors[index % fallbackColors.length],
  }))
  const ChartPrimitive = type === 'line' ? LineChart : BarChart
  const hasData = data.length > 0

  if (type === 'pie') {
    const pieData = data.filter((item) => Number(item.value) > 0)

    return (
      <div className="analytics-chart analytics-pie-chart">
        <div className="analytics-chart-heading">
          <h3>{title}</h3>
        </div>
        <div className="analytics-chart-body analytics-pie-body">
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={230} minWidth={1} minHeight={1}>
              <PieChart>
                <Tooltip content={<ChartTooltip valueSuffix={valueSuffix} />} />
                <Pie
                  cornerRadius={8}
                  data={pieData}
                  dataKey="value"
                  innerRadius={38}
                  nameKey="label"
                  outerRadius={86}
                  paddingAngle={4}
                  stroke="none"
                >
                  {pieData.map((item, index) => (
                    <Cell fill={item.fill ?? fallbackColors[index % fallbackColors.length]} key={item.key ?? item.label} />
                  ))}
                  <LabelList
                    dataKey="value"
                    fill="currentColor"
                    fontSize={12}
                    fontWeight={800}
                    stroke="none"
                    formatter={(value) => `${value}`}
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">No chart data</div>
          )}
        </div>
        <ChartLegend series={pieData.map((item) => ({ dataKey: item.key ?? item.label, label: item.label, color: item.fill }))} />
      </div>
    )
  }

  return (
    <div className="analytics-chart">
      <div className="analytics-chart-heading">
        <h3>{title}</h3>
      </div>
      <div className="analytics-chart-body">
        {hasData ? (
          <ResponsiveContainer width="100%" height={210} minWidth={1} minHeight={1}>
            <ChartPrimitive data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="4 8" vertical={false} />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} interval={0} minTickGap={10} />
              <YAxis axisLine={false} tickLine={false} domain={[0, max]} tickFormatter={(value) => formatValue(value, valueSuffix)} />
              <Tooltip cursor={{ fill: 'rgba(36, 210, 255, 0.08)' }} content={<ChartTooltip valueSuffix={valueSuffix} />} />
              {chartSeries.map((item) => (
                type === 'line' ? (
                  <Line
                    activeDot={{ r: 4 }}
                    dataKey={item.dataKey}
                    dot={false}
                    key={item.dataKey}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={2.5}
                    type="monotone"
                  />
                ) : (
                  <Bar
                    dataKey={item.dataKey}
                    fill={item.color}
                    key={item.dataKey}
                    name={item.label}
                    radius={stacked ? 0 : [5, 5, 0, 0]}
                    stackId={stacked ? 'task-status' : undefined}
                  />
                )
              ))}
            </ChartPrimitive>
          </ResponsiveContainer>
        ) : (
          <div className="analytics-chart-empty">No chart data</div>
        )}
      </div>
      <ChartLegend series={chartSeries} />
    </div>
  )
}
