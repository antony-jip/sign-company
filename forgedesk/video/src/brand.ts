// Merk-tokens voor de doen.-video.
// Bron: DOEN-VIDEO-FRAMEWORK.md, met waarden geverifieerd tegen
// forgedesk src/index.css en tailwind.config.js (niet verzonnen).

// Merk-laag: doen. identiteit.
export const merk = {
  flame: "#df5c36", // accent, spaarzaam (canoniek uit logo-SVG)
  petrol: "#2b535c", // dominant (canoniek uit logo-SVG)
  offWhite: "#F8F7F5",
  ink: "#1A1A18",
} as const;

// Module-kleuren — uit forgedesk tailwind.config.js (mod-*).
export const modules = {
  projecten: { kleur: "#2b535c", light: "#E2F0F0", border: "#B8D8DA", text: "#2b535c" },
  offertes: { kleur: "#df5c36", light: "#FDE8E2", border: "#F5C4B4", text: "#C03A18" },
  facturen: { kleur: "#2D6B48", light: "#E4F0EA", border: "#C0DBCC", text: "#2D6B48" },
  klanten: { kleur: "#3A6B8C", light: "#E5ECF6", border: "#C0D0EA", text: "#2A5580" },
  planning: { kleur: "#9A5A48", light: "#F2E8E5", border: "#E0CFC8", text: "#7A4538" },
  werkbonnen: { kleur: "#C44830", light: "#FAE5E0", border: "#EDD0C5", text: "#943520" },
  team: { kleur: "#5A5A55", light: "#EEEEED", border: "#D8D8D5", text: "#4A4A45" },
  email: { kleur: "#6A5A8A", light: "#EEE8F5", border: "#D8CCE8", text: "#5A4A78" },
} as const;

// App-content-laag: FORGEdesk warm-pastel, voor de scherm-mockups in scenes.
// pageBg/card uit framework; accent = forgedesk --amber.
export const app = {
  pageBg: "#F4F3F0",
  card: "#FFFFFE",
  accent: "#CC8A3F",
} as const;

// Status-pastels — uit forgedesk src/index.css (sage/mist/coral).
export const status = {
  sage: { bg: "#E8F2EC", text: "#3A7D52", border: "#C2DFCC" },
  mist: { bg: "#E8EEF9", text: "#3A5A9A", border: "#C2D0EE" },
  coral: { bg: "#FDE8E4", text: "#C0451A", border: "#F5C4B8" },
} as const;
