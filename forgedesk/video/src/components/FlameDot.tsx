import { merk } from "../brand";

// Flame-punt direct achter een statuswoord: verstuurd. betaald. gedaan.
// Zie DOEN-VIDEO-FRAMEWORK.md.
export const FlameDot: React.FC = () => (
  <span style={{ color: merk.flame }}>.</span>
);
