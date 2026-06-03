import { useMemo, useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../context/ThemeContext'

function useChartTheme() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  return useMemo(() => ({
    axis: isDark ? '#222' : '#d0d5dd',
    axisLabel: isDark ? '#888' : '#888',
    splitLine: isDark ? '#1a1a1a' : '#e0e4ea',
    tooltipBg: isDark ? '#181818' : '#ffffff',
    tooltipBorder: isDark ? '#333' : '#d0d5dd',
    tooltipText: isDark ? '#fff' : '#1a1a2e',
    legendText: isDark ? '#a8a8a8' : '#4a4a5a',
    nameText: isDark ? '#888' : '#888',
  }), [isDark])
}

const COLORS = ['#33d17a', '#00d4ff', '#7b3aed', '#f59e0b', '#ff4d4d', '#0007cd', '#0891b2', '#be185d']

export default function QpsChart({ data, height = '350px' }) {
  const chartRef = useRef(null)
  const colors = useChartTheme()

  useEffect(() => {
    const handleResize = () => chartRef.current?.getEchartsInstance()?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!data) return null

  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640

  if (Array.isArray(data)) {
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.tooltipText, fontSize: 13 },
        formatter: (params) => {
          const p = params[0]
          return `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px">
            ${p.axisValue}<br/>
            <span style="color:#33d17a">●</span> QPS: <strong>${p.value}</strong>
          </div>`
        }
      },
      grid: { left: isSmall ? 8 : 60, right: isSmall ? 8 : 20, top: 10, bottom: isSmall ? 20 : 30 },
      xAxis: {
        type: 'category',
        data: data.map(d => {
          const t = d.ts ? new Date(d.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
          return t
        }),
        boundaryGap: false,
        axisLine: { lineStyle: { color: colors.axis } },
        axisLabel: { fontSize: isSmall ? 9 : 11, color: colors.axisLabel },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: isSmall ? '' : 'QPS',
        nameTextStyle: { color: colors.nameText, fontSize: 11 },
        axisLabel: { fontSize: isSmall ? 9 : 11, color: colors.axisLabel },
        splitLine: { lineStyle: { color: colors.splitLine, type: 'dashed' } }
      },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.qps) || 0),
        lineStyle: { color: '#33d17a', width: isSmall ? 1.5 : 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(51,209,122,0.2)' },
              { offset: 1, color: 'rgba(51,209,122,0)' }
            ]
          }
        }
      }]
    }
    return <ReactECharts ref={chartRef} option={option} style={{ height }} />
  }

  // Multi-server mode
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

  const legendData = [...Object.keys(dnsdistSeries), ...Object.keys(resolverSeries)]

  const allSeries = [
    ...Object.entries(dnsdistSeries).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: isSmall ? 1.5 : 2, color: COLORS[i % COLORS.length] },
      areaStyle: { opacity: 0.08 }
    })),
    ...Object.entries(resolverSeries).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none', data: d.values,
      lineStyle: { width: isSmall ? 1.5 : 2, type: 'dashed', color: COLORS[(i + Object.keys(dnsdistSeries).length) % COLORS.length] },
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
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 13 }
    },
    legend: {
      type: 'scroll',
      data: legendData,
      bottom: 0,
      textStyle: { color: colors.legendText, fontSize: isSmall ? 10 : 12 },
      icon: isSmall ? 'circle' : 'roundRect',
      itemWidth: isSmall ? 8 : 16,
      itemHeight: isSmall ? 8 : 8,
      pageIconSize: isSmall ? 10 : 12,
      pageButtonItemGap: isSmall ? 0 : 5,
    },
    grid: { left: isSmall ? 8 : 60, right: isSmall ? 8 : 20, top: 14, bottom: isSmall ? 36 : 44 },
    xAxis: {
      type: 'category',
      data: allTimes.length > 0 ? allTimes : undefined,
      axisLabel: { fontSize: isSmall ? 9 : 11, color: colors.axisLabel },
      axisLine: { lineStyle: { color: colors.axis } },
      splitLine: { show: false },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: isSmall ? '' : 'QPS',
      nameTextStyle: { color: colors.nameText, fontSize: 11 },
      axisLabel: { fontSize: isSmall ? 9 : 11, color: colors.axisLabel },
      splitLine: { lineStyle: { color: colors.splitLine, type: 'dashed' } }
    },
    series: allSeries
  }

  return <ReactECharts ref={chartRef} option={option} style={{ height }} />
}
