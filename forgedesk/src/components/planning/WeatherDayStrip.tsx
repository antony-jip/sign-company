import { useState, useEffect } from 'react'
import { Sun, CloudSun, CloudFog, CloudRain, Snowflake, CloudDrizzle, CloudLightning, type LucideIcon } from 'lucide-react'

interface WeatherDayStripProps {
  weekDays: Date[]
}

export interface DayWeather {
  date: string // YYYY-MM-DD
  maxTemp: number
  code: number // WMO weathercode
  precipitationProb: number // 0-100
}

function wmoToIcon(code: number): LucideIcon {
  if (code <= 1) return Sun
  if (code <= 3) return CloudSun
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return Snowflake
  if (code >= 80 && code <= 82) return CloudDrizzle
  if (code >= 95) return CloudLightning
  return CloudSun
}

/** Matte weer-icoon i.p.v. emoji · DOEN: geen emojis in UI */
export function WeerIcon({ code, className }: { code: number; className?: string }) {
  const Icon = wmoToIcon(code)
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />
}

/** Hook to fetch weather data for a week · reusable by parent */
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
            code: codes[i],
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

/** Legacy component · kept for backward compat */
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
            <WeerIcon code={w.code} className="w-3.5 h-3.5" />
            <span className="text-xs font-mono tabular-nums hidden sm:inline">{w.maxTemp}°</span>
          </div>
        )
      })}
    </div>
  )
}
