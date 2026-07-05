// Laad opgeslagen grootte-instelling direct om FOUC te voorkomen
document.documentElement.style.setProperty('--font-family', "'DM Sans'");
try {
  const s = JSON.parse(localStorage.getItem('forgedesk_weergave_instellingen') || '{}');
  const sizes = { klein: '14px', normaal: '16px', groot: '18px', 'extra-groot': '20px' };
  if (s.font_size && sizes[s.font_size]) document.documentElement.style.setProperty('--font-size', sizes[s.font_size]);
} catch(e) {}

// Dark-class vóór de eerste paint, anders zien dark-users een lichte flits
// tot React mount. Klant-facing publieke routes zijn light-only; de
// waardes ('dark'/'normaal') spiegelen PaletteContext.
try {
  const lightOnly = ['/offerte-bekijken', '/betalen', '/betaald', '/boeken', '/portaal', '/formulier', '/goedkeuring'];
  const isLightOnly = lightOnly.some((p) => location.pathname.indexOf(p) === 0);
  const theme = localStorage.getItem('doen_app_theme');
  const dark = theme === 'dark' || (theme !== 'normaal' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark && !isLightOnly) document.documentElement.classList.add('dark');
} catch(e) {}
