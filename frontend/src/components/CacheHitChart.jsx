import ReactECharts from 'echarts-for-react'

export default function CacheHitChart({ data, title = 'Cache Hit Ratio', height = '300px' }) {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: 14 }}>No data available</div>
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#181818',
      borderColor: '#333',
      textStyle: { color: '#fff', fontSize: 13 },
      formatter: (params) => {
        return params.map(p =>
          `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px">
            ${p.axisValue}<br/>
            ${p.marker} ${p.seriesName}: <strong>${Number(p.value).toFixed(1)}%</strong>
          </div>`
        ).join('')
      }
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#a8a8a8', fontSize: 12 }
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
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#222' } },
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: '#888', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1a1a1a', type: 'dashed' } }
    },
    series: [
      {
        name: 'Cache Hit Ratio',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.cache_hit_ratio || 0)),
        lineStyle: { color: '#33d17a', width: 2 },
        itemStyle: { color: '#33d17a' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(51,209,122,0.15)' }, { offset: 1, color: 'rgba(51,209,122,0)' }] } }
      }
    ]
  }

  return <ReactECharts option={option} style={{ height }} />
}
