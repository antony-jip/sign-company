// Fonts via @remotion/google-fonts (geen handmatige font-loading).
// Afgeknepen tot de gewichten/subset die we echt gebruiken: scheelt tientallen
// font-requests t.o.v. de default (alle gewichten + subsets). Zie
// DOEN-VIDEO-FRAMEWORK.md: Bricolage 800 koppen, Inter body, DM Mono cijfers.
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadDMMono } from "@remotion/google-fonts/DMMono";

const bricolage = loadBricolage("normal", {
  weights: ["800"],
  subsets: ["latin"],
});
const inter = loadInter("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const dmMono = loadDMMono("normal", {
  weights: ["500"],
  subsets: ["latin"],
});

export const fonts = {
  kop: bricolage.fontFamily,
  body: inter.fontFamily,
  mono: dmMono.fontFamily,
} as const;
