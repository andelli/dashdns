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
  }), [isDark])
}

export default function CacheHitChart({ data, title = 'Cache Hit Ratio', height = '300px' }) {
  const chartRef = useRef(null)
  const colors = useChartTheme()

  useEffect(() => {
    const handleResize = () => chartRef.current?.getEchartsInstance()?.resize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        No data available
      </div>
    )
  }

  const isSmall = typeof window !== 'undefined' && window.innerWidth < 640

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.tooltipText, fontSize: 13 },
      formatter: (params) => {
        return params.map(p =>
          `<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px">
            ${p.axisValue}<br/>
            ${p.marker} ${p.seriesName}: <strong>${Number(p.value).toFixed(1)}%</strong>
          </div>`
        ).join('')
      }
    },
    grid: {
      left: isSmall ? 8 : 50,
      right: isSmall ? 8 : 20,
      top: 14,
      bottom: isSmall ? 36 : 44
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d.ts ? new Date(d.ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''),
      boundaryGap: false,
      axisLine: { lineStyle: { color: colors.axis } },
      axisLabel: { fontSize: isSmall ? 9 : 11, color: colors.axisLabel },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: colors.axisLabel, fontSize: isSmall ? 9 : 11 },
      splitLine: { lineStyle: { color: colors.splitLine, type: 'dashed' } }
    },
    series: [
      {
        name: 'Cache Hit Ratio',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: data.map(d => Number(d.cache_hit_ratio || 0)),
        lineStyle: { color: '#33d17a', width: isSmall ? 1.5 : 2 },
        itemStyle: { color: '#33d17a' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(51,209,122,0.2)' },
              { offset: 1, color: 'rgba(51,209,122,0)' }
            ]
          }
        }
      }
    ]
  }

  return <ReactECharts ref={chartRef} option={option} style={{ height }} />
}
