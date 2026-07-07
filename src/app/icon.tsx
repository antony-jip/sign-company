import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

// "d." mark: the d glyph and flame punt from public/logos/doen-logo.svg,
// white on a petrol tile so it stays legible in light and dark tabs.
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="76 180 156 156">
  <path fill="#FFFFFF" d="M170.03,198.76v90.76c0,7.28,0,14.65.15,21.97h-21.28c-.44-2.4-.87-6.53-1.01-8.35-3.86,6.29-10.74,10.2-22.68,10.2-20.21,0-33.07-16.23-33.07-41.17s13.67-42.48,36.31-42.48c11.5,0,17.68,4.06,19.45,7.64v-38.58h22.13ZM114.87,271.6c0,15.58,6.07,24.02,16.9,24.02,15.22,0,16.97-12.69,16.97-24.18,0-13.67-1.93-24.01-16.4-24.01-11.62,0-17.48,9.07-17.48,24.17Z"/>
  <circle fill="#DF5C36" cx="200.2" cy="294.08" r="18.03"/>
</svg>`

export default function Icon() {
  const markSrc = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2B535C',
          borderRadius: 96,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markSrc} alt="" width={400} height={400} />
      </div>
    ),
    size
  )
}
