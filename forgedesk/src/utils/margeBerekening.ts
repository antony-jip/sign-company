// Markup-berekeningen: winst t.o.v. inkoopprijs (signmaker-conventie)

export function berekenMarkupPercentage(inkoop: number, verkoop: number): number {
  if (inkoop <= 0) return 0;
  return ((verkoop - inkoop) / inkoop) * 100;
}

export function berekenWinst(inkoop: number, verkoop: number, aantal: number = 1): number {
  return (verkoop - inkoop) * aantal;
}

export function berekenVerkoopVanMarkup(inkoop: number, markup: number): number {
  return inkoop * (1 + markup / 100);
}
