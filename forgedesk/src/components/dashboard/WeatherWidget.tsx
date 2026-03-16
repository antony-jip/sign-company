import { useState, useEffect } from 'react'
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
  Sunrise,
  Sunset,
} from 'lucide-react'
import { Card } from '@/components/ui/card'

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
  if (code === 2 || code === 3) return <Cloud className={`${size} text-slate-400`} />
  if (code === 45 || code === 48) return <CloudFog className={`${size} text-slate-400`} />
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${size} text-blue-400`} />
  if (code >= 61 && code <= 65) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-sky-300`} />
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-sky-300`} />
  if (code >= 95) return <CloudLightning className={`${size} text-yellow-500`} />
  return <Sun className={`${size} text-amber-500`} />
}

function getWeatherGradient(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) {
    return isDay
      ? 'from-amber-400/30 via-orange-300/20 to-yellow-200/10'
      : 'from-indigo-600/30 via-purple-500/20 to-slate-700/10'
  }
  if (code === 2 || code === 3) return 'from-slate-400/25 via-gray-300/15 to-slate-200/10'
  if (code === 45 || code === 48) return 'from-gray-500/25 via-slate-400/15 to-gray-300/10'
  if (code >= 51 && code <= 55) return 'from-blue-400/25 via-sky-300/15 to-blue-200/10'
  if (code >= 61 && code <= 65) return 'from-blue-600/30 via-indigo-400/20 to-blue-300/10'
  if (code >= 71 && code <= 86) return 'from-sky-300/35 via-blue-200/20 to-white/15'
  if (code >= 95) return 'from-purple-600/30 via-slate-500/20 to-indigo-400/10'
  return 'from-slate-300/20 via-gray-200/15 to-transparent'
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
  const [todayForecast, setTodayForecast] = useState<DailyForecast | null>(null)
  const [location, setLocation] = useState('Nederland')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sunrise, setSunrise] = useState('')
  const [sunset, setSunset] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchWeather(lat: number, lon: number) {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Europe%2FAmsterdam&forecast_days=5`
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

          // Today's forecast
          if (data.daily.sunrise?.[0]) {
            setSunrise(data.daily.sunrise[0].split('T')[1]?.substring(0, 5) || '')
          }
          if (data.daily.sunset?.[0]) {
            setSunset(data.daily.sunset[0].split('T')[1]?.substring(0, 5) || '')
          }
          setTodayForecast({
            date: new Date(data.daily.time[0]),
            maxTemp: Math.round(data.daily.temperature_2m_max[0]),
            minTemp: Math.round(data.daily.temperature_2m_min[0]),
            weatherCode: data.daily.weather_code[0],
            precipitationProbability: data.daily.precipitation_probability_max[0],
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
      <Card className="overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    )
  }

  if (error || !current) {
    return null
  }

  const workCondition = isGoodWorkWeather(current.weatherCode, current.windSpeed)
  const conditionColors = {
    goed: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-400 dark:bg-emerald-900/30',
    matig: 'text-amber-700 bg-amber-100/80 dark:text-amber-400 dark:bg-amber-900/30',
    slecht: 'text-red-700 bg-red-100/80 dark:text-red-400 dark:bg-red-900/30',
  }
  const conditionLabels = {
    goed: 'Goed werkweer',
    matig: 'Matig werkweer',
    slecht: 'Niet geschikt voor buitenwerk',
  }
  const gradient = getWeatherGradient(current.weatherCode, current.isDay)

  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      {/* Hero section with gradient */}
      <div className={`relative bg-gradient-to-br ${gradient} p-5 pb-4`}>
        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-white/8 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-background/70 dark:bg-background/40 backdrop-blur-md shadow-sm ring-1 ring-white/10">
              {getWeatherIcon(current.weatherCode, 'h-12 w-12')}
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-[42px] font-extrabold text-foreground font-mono tracking-tighter leading-none">{current.temperature}°</span>
              </div>
              <p className="text-sm font-semibold text-foreground/70 mt-0.5">
                {WMO_DESCRIPTIONS[current.weatherCode] || 'Onbekend'}
              </p>
              <span className="text-[11px] text-muted-foreground/70 flex items-center gap-0.5 mt-1">
                <MapPin className="h-2.5 w-2.5" />{location}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm ${conditionColors[workCondition]}`}>
              {conditionLabels[workCondition]}
            </span>
            {todayForecast && (
              <span className="text-[11px] text-muted-foreground/60 font-mono">
                {todayForecast.maxTemp}° / {todayForecast.minTemp}°
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="relative flex items-center gap-5 mt-4 pt-3 border-t border-foreground/5">
          <span className="flex items-center gap-1.5 text-[13px] text-foreground/60">
            <Thermometer className="h-3.5 w-3.5" />
            Voelt als <span className="font-mono font-semibold text-foreground/80">{current.apparentTemperature}°</span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-foreground/60">
            <Wind className="h-3.5 w-3.5" />
            <span className="font-mono font-semibold text-foreground/80">{current.windSpeed}</span> km/u
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-foreground/60">
            <Droplets className="h-3.5 w-3.5" />
            <span className="font-mono font-semibold text-foreground/80">{current.humidity}%</span>
          </span>
          {sunrise && (
            <span className="flex items-center gap-1.5 text-[13px] text-foreground/60 ml-auto">
              <Sunrise className="h-3.5 w-3.5 text-amber-500/70" />
              <span className="font-mono text-foreground/50">{sunrise}</span>
              <Sunset className="h-3.5 w-3.5 text-orange-500/70 ml-2" />
              <span className="font-mono text-foreground/50">{sunset}</span>
            </span>
          )}
        </div>
      </div>

      {/* Forecast */}
      <div className="p-3 bg-card">
        <div className="grid grid-cols-4 gap-1.5">
          {forecast.map((day) => (
            <div
              key={day.date.toISOString()}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/25 hover:bg-muted/40 transition-colors"
            >
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                {DAY_NAMES[day.date.getDay()]}
              </span>
              {getWeatherIcon(day.weatherCode, 'h-6 w-6')}
              <div className="flex items-center gap-1.5 text-[13px]">
                <span className="font-bold text-foreground font-mono">{day.maxTemp}°</span>
                <span className="text-muted-foreground/50 font-mono">{day.minTemp}°</span>
              </div>
              {day.precipitationProbability > 20 && (
                <span className="text-[10px] text-blue-500/80 flex items-center gap-0.5 font-medium">
                  <Droplets className="h-2.5 w-2.5" />
                  <span className="font-mono">{day.precipitationProbability}%</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
