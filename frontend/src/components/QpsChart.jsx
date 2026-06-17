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

  // Multi-server mode — bucket per minute for alignment
  const dnsdistSeries = {}
  const resolverSeries = {}

  const fmtWIB = (ts) => {
    const d = new Date(ts)
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
    const hh = String(wib.getUTCHours()).padStart(2, '0')
    const mm = String(wib.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const bucketByMin = (items, store) => {
    ;(items || []).forEach(item => {
      if (!item.ts) return
      const min = fmtWIB(item.ts) // "HH:MM" dalam WIB
      if (!store[item.hostname]) store[item.hostname] = {}
      store[item.hostname][min] = (store[item.hostname][min] || 0) + (Number(item.qps) || 0)
    })
  }
  bucketByMin(data.dnsdist, dnsdistSeries)
  bucketByMin(data.resolvers, resolverSeries)

  // Flatten: { hostname: { "HH:MM": qps } } -> { hostname: { times: [], values: [] } }
  const flatten = (obj) => {
    const result = {}
    Object.entries(obj).forEach(([name, buckets]) => {
      result[name] = { times: [], values: [] }
      Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).forEach(([min, qps]) => {
        result[name].times.push(min)
        result[name].values.push(qps)
      })
    })
    return result
  }

  const dnsdistFlat = flatten(dnsdistSeries)
  const resolverFlat = flatten(resolverSeries)

  const legendData = [...Object.keys(dnsdistFlat), ...Object.keys(resolverFlat)]

  // Build unified timeline from all unique minute buckets
  const allTimestamps = new Set()
  Object.values(dnsdistFlat).forEach(s => s.times.forEach(t => allTimestamps.add(t)))
  Object.values(resolverFlat).forEach(s => s.times.forEach(t => allTimestamps.add(t)))
  const allTimes = [...allTimestamps].sort()

  const mapToTimeline = (series) => {
    return allTimes.map(t => {
      const idx = series.times.indexOf(t)
      return idx !== -1 ? series.values[idx] : null
    })
  }

  const alignedSeries = [
    ...Object.entries(dnsdistFlat).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none',
      data: mapToTimeline(d),
      lineStyle: { width: isSmall ? 1.5 : 2, color: COLORS[i % COLORS.length] },
      areaStyle: { opacity: 0.08 },
      connectNulls: true
    })),
    ...Object.entries(resolverFlat).map(([name, d], i) => ({
      name, type: 'line', smooth: true, symbol: 'none',
      data: mapToTimeline(d),
      lineStyle: { width: isSmall ? 1.5 : 2, type: 'dashed', color: COLORS[(i + Object.keys(dnsdistFlat).length) % COLORS.length] },
      areaStyle: { opacity: 0.04 },
      connectNulls: true
    }))
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
    series: alignedSeries
  }

  return <ReactECharts ref={chartRef} option={option} style={{ height }} />
}
