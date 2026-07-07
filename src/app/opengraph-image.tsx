import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'

export const alt = 'doen. — software voor signmakers en reclamebedrijven'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public/logos/doen-logo.svg'))
  const logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5F4F1',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width={560} height={194} />
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            letterSpacing: '-0.5px',
            color: '#1A535C',
          }}
        >
          Van offerte tot factuur. Zo gedaan.
        </div>
      </div>
    ),
    size
  )
}
