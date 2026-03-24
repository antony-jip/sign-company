import { useState, useEffect } from 'react'

interface WeatherDayStripProps {
  weekDays: Date[]
}

export interface DayWeather {
  date: string // YYYY-MM-DD
  maxTemp: number
  emoji: string
  precipitationProb: number // 0-100
}

function wmoToEmoji(code: number): string {
  if (code <= 1) return '☀️'
  if (code <= 3) return '⛅'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 67) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌦️'
  if (code >= 95) return '⛈️'
  return '⛅'
}

/** Hook to fetch weather data for a week — reusable by parent */
export function useWeekWeather(weekDays: Date[]) {
  const [weather, setWeather] = useState<Map<string, DayWeather>>(new Map())

  useEffect(() => {
    if (weekDays.length === 0) return

    const startDate = weekDays[0].toISOString().split('T')[0]
    const endDate = weekDays[weekDays.length - 1].toISOString().split('T')[0]

    const controller = new AbortController()

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=52.74&longitude=5.22&daily=temperature_2m_max,weathercode,precipitation_probability_max&timezone=Europe/Amsterdam&start_date=${startDate}&end_date=${endDate}`,
      { signal: controller.signal }
    )
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data?.daily) return
        const map = new Map<string, DayWeather>()
        const dates = data.daily.time as string[]
        const temps = data.daily.temperature_2m_max as number[]
        const codes = data.daily.weathercode as number[]
        const precip = (data.daily.precipitation_probability_max as number[] | undefined) || []
        dates.forEach((date: string, i: number) => {
          map.set(date, {
            date,
            maxTemp: Math.round(temps[i]),
            emoji: wmoToEmoji(codes[i]),
            precipitationProb: precip[i] ?? 0,
          })
        })
        setWeather(map)
      })
      .catch(() => {
        // Graceful fallback: toon niks
      })

    return () => controller.abort()
  }, [weekDays])

  return weather
}

/** Get weather for a specific date string (YYYY-MM-DD) */
export function getWeatherForDate(weather: Map<string, DayWeather>, day: Date): DayWeather | undefined {
  const dateStr = day.toISOString().split('T')[0]
  return weather.get(dateStr)
}

/** Legacy component — kept for backward compat */
export function WeatherDayStrip({ weekDays }: WeatherDayStripProps) {
  const weather = useWeekWeather(weekDays)

  if (weather.size === 0) return null

  return (
    <div className="flex">
      {weekDays.map((day, i) => {
        const w = getWeatherForDate(weather, day)
        if (!w) return <div key={i} className="flex-1 min-w-0" />
        return (
          <div key={i} className="flex-1 min-w-0 flex items-center justify-center gap-1 py-1 text-muted-foreground">
            <span className="text-sm leading-none">{w.emoji}</span>
            <span className="text-xs font-mono tabular-nums hidden sm:inline">{w.maxTemp}°</span>
          </div>
        )
      })}
    </div>
  )
}
