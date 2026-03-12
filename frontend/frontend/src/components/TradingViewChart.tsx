import { useEffect, useRef } from 'react'

type TradingViewChartProps = {
  symbol: string
  height?: number
}

declare global {
  interface Window {
    TradingView?: any
  }
}

export function TradingViewChart({ symbol, height = 400 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const widgetSymbol = symbol

    const createWidget = () => {
      if (typeof window.TradingView === 'undefined') {
        return
      }

      // eslint-disable-next-line no-new
      new window.TradingView.widget({
        symbol: widgetSymbol,
        interval: 'D',
        theme: 'dark',
        autosize: true,
        container_id: container.id,
        hide_top_toolbar: false,
        hide_legend: false,
      })
    }

    if (typeof window.TradingView === 'undefined') {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = createWidget
      document.body.appendChild(script)

      return () => {
        document.body.removeChild(script)
      }
    } else {
      createWidget()
    }
  }, [symbol])

  return <div id="tradingview_chart_container" ref={containerRef} style={{ width: '100%', height }} />
}

