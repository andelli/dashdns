import ReactECharts from 'echarts-for-react'

export default function QpsChart({ data, title, height = '350px' }) {
  if (!data) return null

  // Simple array format (single server history)
  if (Array.isArray(data)) {
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 60, 114, 0.9)',
        borderColor: 'transparent',
        textStyle: { color: '#fff' }
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => d.ts ? new Date(d.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''),
        boundaryGap: false,
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        name: 'QPS',
        axisLabel: { fontSize: 11 }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.qps) || 0),
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
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

  const allSeries = [
    ...Object.entries(dnsdistSeries).map(([name, d]) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: 2 }, areaStyle: { opacity: 0.1 }
    })),
    ...Object.entries(resolverSeries).map(([name, d]) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: 2, type: 'dashed' }, areaStyle: { opacity: 0.05 }
    }))
  ]

  const allTimes = [
    ...Object.values(dnsdistSeries)[0]?.times || [],
    ...Object.values(resolverSeries)[0]?.times || []
  ]

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 60, 114, 0.9)',
      borderColor: 'transparent',
      textStyle: { color: '#fff' }
    },
    legend: {
      data: [...Object.keys(dnsdistSeries), ...Object.keys(resolverSeries)],
      bottom: 0
    },
    grid: { left: 60, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: allTimes.length > 0 ? allTimes : undefined,
      axisLabel: { fontSize: 11 },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: 'QPS',
      axisLabel: { fontSize: 11 }
    },
    series: allSeries,
    color: ['#2a5298', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
  }

  return <ReactECharts option={option} style={{ height }} />
}
