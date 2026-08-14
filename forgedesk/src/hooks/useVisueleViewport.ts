import { useState, useEffect } from 'react'

export interface VisueleViewport {
  /** Verschuiving van de zichtbare viewport t.o.v. de layout-viewport. */
  top: number
  /** Hoogte van het stuk scherm dat het toetsenbord niet bedekt. */
  hoogte: number
  /** Geschatte toetsenbordhoogte · 0 wanneer het dicht is. */
  toetsenbord: number
}

/**
 * Meet de zichtbare viewport. iOS krimpt bij een openend toetsenbord niet de
 * layout-viewport maar schuift de zichtbare viewport omhoog: een balk onderin
 * verdwijnt dan achter het toetsenbord en een kop bovenin schuift het scherm
 * uit. Wie zijn venster op deze maten vastzet, houdt beide in beeld.
 *
 * `actief` staat uit als er niets te meten valt, zodat we geen listeners
 * aanhouden voor schermen die er niets mee doen.
 */
export function useVisueleViewport(actief: boolean): VisueleViewport {
  const [maten, setMaten] = useState<VisueleViewport>({ top: 0, hoogte: 0, toetsenbord: 0 })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv || !actief) return
    const meet = () => {
      setMaten({
        top: vv.offsetTop,
        hoogte: vv.height,
        toetsenbord: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      })
    }
    meet()
    vv.addEventListener('resize', meet)
    vv.addEventListener('scroll', meet)
    return () => {
      vv.removeEventListener('resize', meet)
      vv.removeEventListener('scroll', meet)
    }
  }, [actief])

  return maten
}
