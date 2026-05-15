import { useEffect, useState } from 'react'

export interface WeatherSnapshot {
  temperature: number
  weatherCode: number
  isRaining: boolean
  label: string
  iconKey: WeatherIconKey
}

export type WeatherIconKey =
  | 'sun'
  | 'cloud-sun'
  | 'cloud'
  | 'cloud-fog'
  | 'cloud-drizzle'
  | 'cloud-rain'
  | 'cloud-snow'
  | 'cloud-lightning'

interface Coords {
  lat: number
  lon: number
}

const DEFAULT_COORDS: Coords = { lat: 52.704, lon: 5.292 } // Enkhuizen
const STALE_MS = 30 * 60 * 1000 // 30 min

function classify(code: number): { label: string; iconKey: WeatherIconKey; isRaining: boolean } {
  if (code === 0) return { label: 'Helder', iconKey: 'sun', isRaining: false }
  if (code >= 1 && code <= 2) return { label: 'Wisselend bewolkt', iconKey: 'cloud-sun', isRaining: false }
  if (code === 3) return { label: 'Bewolkt', iconKey: 'cloud', isRaining: false }
  if (code === 45 || code === 48) return { label: 'Mist', iconKey: 'cloud-fog', isRaining: false }
  if (code >= 51 && code <= 57) return { label: 'Motregen', iconKey: 'cloud-drizzle', isRaining: true }
  if (code >= 61 && code <= 67) return { label: 'Regen', iconKey: 'cloud-rain', isRaining: true }
  if (code >= 71 && code <= 77) return { label: 'Sneeuw', iconKey: 'cloud-snow', isRaining: false }
  if (code >= 80 && code <= 82) return { label: 'Buien', iconKey: 'cloud-rain', isRaining: true }
  if (code >= 85 && code <= 86) return { label: 'Sneeuwbuien', iconKey: 'cloud-snow', isRaining: false }
  if (code >= 95) return { label: 'Onweer', iconKey: 'cloud-lightning', isRaining: true }
  return { label: 'Bewolkt', iconKey: 'cloud', isRaining: false }
}

export function useWeather(coords: Coords = DEFAULT_COORDS): WeatherSnapshot | null {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false

    const cacheKey = `doen_weather_${coords.lat.toFixed(2)}_${coords.lon.toFixed(2)}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as { ts: number; data: WeatherSnapshot }
        if (Date.now() - parsed.ts < STALE_MS) {
          setWeather(parsed.data)
          return
        }
      }
    } catch {
      // localStorage unavailable or corrupt — fetch fresh
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=Europe/Amsterdam`

    fetch(url)
      .then(r => r.json())
      .then((data: { current?: { temperature_2m?: number; weather_code?: number } }) => {
        if (cancelled || !data?.current) return
        const code = data.current.weather_code ?? 3
        const { label, iconKey, isRaining } = classify(code)
        const snapshot: WeatherSnapshot = {
          temperature: Math.round(data.current.temperature_2m ?? 0),
          weatherCode: code,
          isRaining,
          label,
          iconKey,
        }
        setWeather(snapshot)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: snapshot }))
        } catch {
          // ignore quota / unavailable
        }
      })
      .catch(() => {
        // silent — hero just won't show weather
      })

    return () => {
      cancelled = true
    }
  }, [coords.lat, coords.lon])

  return weather
}
