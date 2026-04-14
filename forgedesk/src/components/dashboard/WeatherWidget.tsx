import { useState, useEffect } from 'react'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
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
  if (code === 2 || code === 3) return <Cloud className={`${size} text-muted-foreground/60`} />
  if (code === 45 || code === 48) return <CloudFog className={`${size} text-muted-foreground/60`} />
  if (code >= 51 && code <= 55) return <CloudDrizzle className={`${size} text-blue-400`} />
  if (code >= 61 && code <= 65) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-sky-300`} />
  if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />
  if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-sky-300`} />
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
          const days: DailyForecast[] = data.daily.time.slice(1).map((t: string, i: number) => ({
            date: new Date(t),
            maxTemp: Math.round(data.daily.temperature_2m_max[i + 1]),
            minTemp: Math.round(data.daily.temperature_2m_min[i + 1]),
            weatherCode: data.daily.weather_code[i + 1],
            precipitationProbability: data.daily.precipitation_probability_max[i + 1],
          }))
          setForecast(days)
        }
      } catch (err) {
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
      <Card className="h-full rounded-2xl border-0 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin text-[#9B9B95]" />
        </div>
      </Card>
    )
  }

  if (error || !current) {
    return null
  }

  const workCondition = isGoodWorkWeather(current.weatherCode, current.windSpeed)
  const conditionLabels = {
    goed: 'Goed werkweer',
    matig: 'Matig werkweer',
    slecht: 'Slecht werkweer',
  }
  const conditionTextColor = {
    goed: '#3A7D52',
    matig: '#8A7A4A',
    slecht: '#C0451A',
  }

  return (
    <Card
      className="h-full rounded-2xl border-0 bg-white overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#9B9B95]">
            Weer
          </span>
          <span className="text-[11px] text-[#9B9B95] flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />{location}
          </span>
        </div>

        <div className="flex items-start justify-between mt-4 gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[44px] font-mono font-bold text-[#1A1A1A] tracking-tight leading-none">
                {current.temperature}°
              </span>
              {getWeatherIcon(current.weatherCode, 'h-7 w-7')}
            </div>
            <p className="text-[13px] text-[#6B6B66] mt-2 truncate">
              {WMO_DESCRIPTIONS[current.weatherCode] || 'Onbekend'}
            </p>
          </div>
        </div>

        <div className="mt-3 text-[13px]" style={{ color: conditionTextColor[workCondition] }}>
          <span className="font-medium">{conditionLabels[workCondition]}</span>
          <span className="text-[#F15025]">.</span>
        </div>

        <div className="mt-4 pt-4 border-t border-[#EBEBEB] grid grid-cols-3 gap-2 text-[11px] text-[#6B6B66]">
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wider text-[#9B9B95] text-[10px]">Voelt</span>
            <span className="font-mono text-[#1A1A1A] text-[13px]">{current.apparentTemperature}°</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wider text-[#9B9B95] text-[10px]">Wind</span>
            <span className="font-mono text-[#1A1A1A] text-[13px]">{current.windSpeed}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="uppercase tracking-wider text-[#9B9B95] text-[10px]">Vocht</span>
            <span className="font-mono text-[#1A1A1A] text-[13px]">{current.humidity}%</span>
          </div>
        </div>

        {forecast.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#EBEBEB] grid grid-cols-4 gap-1.5 flex-1">
            {forecast.slice(0, 4).map((day) => (
              <div key={day.date.toISOString()} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#9B9B95]">
                  {DAY_NAMES[day.date.getDay()]}
                </span>
                {getWeatherIcon(day.weatherCode, 'h-4 w-4')}
                <span className="font-mono text-[12px] text-[#1A1A1A]">{day.maxTemp}°</span>
              </div>
            ))}
          </div>
        )}

        {sunrise && sunset && (
          <div className="mt-3 pt-3 border-t border-[#EBEBEB] flex items-center justify-between text-[11px] text-[#9B9B95]">
            <span className="flex items-center gap-1"><Sunrise className="h-3 w-3" /><span className="font-mono">{sunrise}</span></span>
            <span className="flex items-center gap-1"><Sunset className="h-3 w-3" /><span className="font-mono">{sunset}</span></span>
          </div>
        )}
      </div>
    </Card>
  )
}
