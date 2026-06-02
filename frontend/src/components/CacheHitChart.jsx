import ReactECharts from 'echarts-for-react'

export default function CacheHitChart({ data, title = 'Cache Hit Ratio', height = '300px' }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No data available</div>
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 60, 114, 0.9)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' },
      formatter: (params) => {
        return params.map(p =>
          `${p.marker} ${p.seriesName}: ${Number(p.value).toFixed(1)}%`
        ).join('<br/>')
      }
    },
    legend: {
      bottom: 0
    },
    grid: {
      left: 50,
      right: 20,
      top: 20,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.ts ? new Date(d.ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' }
    },
    series: [
      {
        name: 'Cache Hit Ratio',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.cache_hit_ratio || 0)),
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height }} />
}
