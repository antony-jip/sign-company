// Laad opgeslagen grootte-instelling direct om FOUC te voorkomen
document.documentElement.style.setProperty('--font-family', "'DM Sans'");
try {
  const s = JSON.parse(localStorage.getItem('forgedesk_weergave_instellingen') || '{}');
  const sizes = { klein: '14px', normaal: '16px', groot: '18px', 'extra-groot': '20px' };
  if (s.font_size && sizes[s.font_size]) document.documentElement.style.setProperty('--font-size', sizes[s.font_size]);
} catch(e) {}
