import React, { useState, useEffect } from 'react'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Loader2,
  MapPin,
} from 'lucide-react'

interface WeatherData {
  temperature: number
  apparentTemperature: number
  weatherCode: number
  windSpeed: number
  humidity: number
  isDay: boolean
}

interface DailyForecast {
  date: Date
  maxTemp: number
  minTemp: number
  weatherCode: number
  precipitationProbability: number
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Helder',
  1: 'Overwegend helder',
  2: 'Half bewolkt',
  3: 'Bewolkt',
  45: 'Mistig',
  48: 'Rijpmist',
  51: 'Lichte motregen',
  53: 'Motregen',
  55: 'Zware motregen',
  61: 'Lichte regen',
  63: 'Regen',
  65: 'Zware regen',
  71: 'Lichte sneeuw',
  73: 'Sneeuw',
  75: 'Zware sneeuw',
  80: 'Lichte buien',
  81: 'Buien',
  82: 'Zware buien',
  85: 'Sneeuwbuien',
  86: 'Zware sneeuwbuien',
  95: 'Onweer',
  96: 'Onweer met hagel',
  99: 'Zwaar onweer',
}

function getWeatherIcon(code: number, size: string = 'h-5 w-5') {
  if (code === 0 || code === 1) return <Sun className={`${size} text-amber-500`} />
  if (code === 2 || code === 3) return <Cloud className={`${size} text-muted-foreground/60`} />
  if (code === 45 || code === 48) return <CloudFog className={`${size} text-muted-foreground/60`} />
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${size} text-blue-400`} />
  if (code >= 61 && code <= 65) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-blue-200`} />
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-blue-200`} />
  if (code >= 95) return <CloudLightning className={`${size} text-yellow-500`} />
  return <Sun className={`${size} text-amber-500`} />
}

function isGoodWorkWeather(code: number, windSpeed: number): 'goed' | 'matig' | 'slecht' {
  if (code >= 65 || code >= 95 || windSpeed > 50) return 'slecht'
  if (code >= 51 || code >= 80 || windSpeed > 30) return 'matig'
  return 'goed'
}

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export function WeatherWidget() {
  const [current, setCurrent] = useState<WeatherData | null>(null)
  const [forecast, setForecast] = useState<DailyForecast[]>([])
  const [location, setLocation] = useState('Nederland')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchWeather(lat: number, lon: number) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FAmsterdam&forecast_days=5`
        )
        if (!res.ok) throw new Error('Weather fetch failed')
        const data = await res.json()

        if (!cancelled) {
          setCurrent({
            temperature: Math.round(data.current.temperature_2m),
            apparentTemperature: Math.round(data.current.apparent_temperature),
            weatherCode: data.current.weather_code,
            windSpeed: Math.round(data.current.wind_speed_10m),
            humidity: data.current.relative_humidity_2m,
            isDay: data.current.is_day === 1,
          })

          const days: DailyForecast[] = data.daily.time.slice(1).map((t: string, i: number) => ({
            date: new Date(t),
            maxTemp: Math.round(data.daily.temperature_2m_max[i + 1]),
            minTemp: Math.round(data.daily.temperature_2m_min[i + 1]),
            weatherCode: data.daily.weather_code[i + 1],
            precipitationProbability: data.daily.precipitation_probability_max[i + 1],
          }))
          setForecast(days)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Try geolocation, fallback to Amsterdam
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!cancelled) {
            fetchWeather(pos.coords.latitude, pos.coords.longitude)
            setLocation('Huidige locatie')
          }
        },
        () => {
          if (!cancelled) {
            fetchWeather(52.37, 4.89)
            setLocation('Amsterdam')
          }
        },
        { timeout: 3000 }
      )
    } else {
      fetchWeather(52.37, 4.89)
      setLocation('Amsterdam')
    }
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !current) {
    return null
  }

  const workCondition = isGoodWorkWeather(current.weatherCode, current.windSpeed)
  const conditionColors = {
    goed: 'text-[var(--color-sage-text)] bg-[var(--color-sage)]',
    matig: 'text-[var(--color-cream-text)] bg-[var(--color-cream)]',
    slecht: 'text-[var(--color-coral-text)] bg-[var(--color-coral)]',
  }
  const conditionLabels = {
    goed: 'Goed werkweer',
    matig: 'Matig werkweer',
    slecht: 'Niet geschikt voor buitenwerk',
  }

  return (
    <div className="space-y-3">
      {/* Current weather */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {getWeatherIcon(current.weatherCode, 'h-8 w-8')}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{current.temperature}°</span>
              <span className="text-sm text-muted-foreground">
                {WMO_DESCRIPTIONS[current.weatherCode] || 'Onbekend'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Voelt als {current.apparentTemperature}°
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" />
                {current.windSpeed} km/u
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {current.humidity}%
              </span>
            </div>
          </div>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${conditionColors[workCondition]}`}>
            {conditionLabels[workCondition]}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <MapPin className="h-2.5 w-2.5" />{location}
          </span>
        </div>
      </div>

      {/* 4-day forecast */}
      <div className="grid grid-cols-4 gap-2">
        {forecast.map((day) => (
          <div
            key={day.date.toISOString()}
            className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="text-[11px] font-medium text-muted-foreground">
              {DAY_NAMES[day.date.getDay()]}
            </span>
            {getWeatherIcon(day.weatherCode, 'h-4 w-4')}
            <div className="flex items-center gap-1 text-xs">
              <span className="font-semibold text-foreground">{day.maxTemp}°</span>
              <span className="text-muted-foreground">{day.minTemp}°</span>
            </div>
            {day.precipitationProbability > 20 && (
              <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                <Droplets className="h-2.5 w-2.5" />
                {day.precipitationProbability}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
