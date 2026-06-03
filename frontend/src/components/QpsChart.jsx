import ReactECharts from 'echarts-for-react'

export default function QpsChart({ data, title, height = '350px' }) {
  if (!data) return null

  // Simple array format (single server history)
  if (Array.isArray(data)) {
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#181818',
        borderColor: '#333',
        textStyle: { color: '#fff', fontSize: 13 },
        formatter: (params) => {
          const p = params[0]
          return `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px">
            ${p.axisValue}<br/>
            <span style="color:#33d17a">●</span> QPS: <strong>${p.value}</strong>
          </div>`
        }
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.ts ? new Date(d.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''),
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#222' } },
        axisLabel: { fontSize: 11, color: '#888' },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: 'QPS',
        nameTextStyle: { color: '#888', fontSize: 11 },
        axisLabel: { fontSize: 11, color: '#888' },
        splitLine: { lineStyle: { color: '#1a1a1a', type: 'dashed' } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.qps) || 0),
        lineStyle: { color: '#33d17a', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(51,209,122,0.15)' }, { offset: 1, color: 'rgba(51,209,122,0)' }] } }
      }]
    }
    return <ReactECharts option={option} style={{ height }} />
  }

  // Multi-server format (dashboard overview)
  const dnsdistSeries = {}
  const resolverSeries = {}

  if (data.dnsdist) {
    data.dnsdist.forEach(item => {
      if (!dnsdistSeries[item.hostname]) {
        dnsdistSeries[item.hostname] = { times: [], values: [] }
      }
      dnsdistSeries[item.hostname].times.push(item.ts ? new Date(item.ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '')
      dnsdistSeries[item.hostname].values.push(Number(item.qps) || 0)
    })
  }

  if (data.resolvers) {
    data.resolvers.forEach(item => {
      if (!resolverSeries[item.hostname]) {
        resolverSeries[item.hostname] = { times: [], values: [] }
      }
      resolverSeries[item.hostname].times.push(item.ts ? new Date(item.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '')
      resolverSeries[item.hostname].values.push(Number(item.qps) || 0)
    })
  }

  const colors = ['#33d17a', '#00d4ff', '#7b3aed', '#f59e0b', '#ff4d4d', '#0007cd']

  const allSeries = [
    ...Object.entries(dnsdistSeries).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: 2, color: colors[i % colors.length] },
      areaStyle: { opacity: 0.08 }
    })),
    ...Object.entries(resolverSeries).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: 2, type: 'dashed', color: colors[(i + Object.keys(dnsdistSeries).length) % colors.length] },
      areaStyle: { opacity: 0.04 }
    }))
  ]

  const allTimes = [
    ...Object.values(dnsdistSeries)[0]?.times || [],
    ...Object.values(resolverSeries)[0]?.times || []
  ]

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#181818',
      borderColor: '#333',
      textStyle: { color: '#fff', fontSize: 13 }
    },
    legend: {
      data: [...Object.keys(dnsdistSeries), ...Object.keys(resolverSeries)],
      bottom: 0,
      textStyle: { color: '#a8a8a8', fontSize: 12 }
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: allTimes.length > 0 ? allTimes : undefined,
      axisLabel: { fontSize: 11, color: '#888' },
      axisLine: { lineStyle: { color: '#222' } },
      splitLine: { show: false },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: 'QPS',
      nameTextStyle: { color: '#888', fontSize: 11 },
      axisLabel: { fontSize: 11, color: '#888' },
      splitLine: { lineStyle: { color: '#1a1a1a', type: 'dashed' } }
    },
    series: allSeries
  }

  return <ReactECharts option={option} style={{ height }} />
}
