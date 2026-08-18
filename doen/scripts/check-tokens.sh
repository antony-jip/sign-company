#!/usr/bin/env bash
# Token-discipline check — telt forbidden patterns om design-drift te tracken.
# Niet-blocking, alleen rapportage. Draai na elke fase om voortgang te zien.
#
# Tokens leven in tailwind.config.js + src/index.css. Vervangingen:
#   rounded-[Xpx]    → rounded-button|tile|card|modal of rounded-md|lg|xl|2xl
#   text-[Xpx]       → text-tiny|caption|body|headline|title-sm|title|title-lg
#   #F15025          → var(--color-flame) of class text-flame
#   #1A535C          → var(--color-petrol) of class text-petrol

cd "$(dirname "$0")/.."

echo "═══════════════════════════════════════════════════"
echo "  doen. token-discipline check"
echo "═══════════════════════════════════════════════════"

count() {
  local label="$1"
  local n="$2"
  printf "  %-32s %5d\n" "$label" "$n"
}

count "Arbitrary rounded-[Xpx]" \
  "$(grep -rE 'rounded-\[[0-9]+px\]' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')"

count "Arbitrary text-[Xpx]" \
  "$(grep -rE 'text-\[[0-9]+px\]' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')"

count "Hardcoded #F15025 (Flame)" \
  "$(grep -rF '#F15025' src/ --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null | wc -l | tr -d ' ')"

count "Hardcoded #1A535C (Petrol)" \
  "$(grep -rF '#1A535C' src/ --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null | wc -l | tr -d ' ')"

count "Phosphor icon imports" \
  "$(grep -rF '@phosphor-icons/react' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')"

count "p-5 / p-7 / p-9 off-scale" \
  "$(grep -rE '(\b|:)p-[579]\b' src/ --include='*.tsx' --include='*.ts' 2>/dev/null | wc -l | tr -d ' ')"

echo "═══════════════════════════════════════════════════"
echo "  Lager = strakker. Vergelijk met baseline."
echo "═══════════════════════════════════════════════════"
