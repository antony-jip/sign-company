export interface AppWeergaveInstellingen {
  id: string;
  user_id: string;
  font_family: string;
  updated_at: string;
}

export interface BeschikbaarFont {
  readonly value: string;
  readonly label: string;
  readonly beschrijving: string;
}

export const BESCHIKBARE_FONTS: readonly BeschikbaarFont[] = [
  { value: 'Manrope', label: 'Manrope', beschrijving: 'Modern & geometrisch' },
  { value: 'Inter', label: 'Inter', beschrijving: 'Neutraal & veelzijdig' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', beschrijving: 'Vriendelijk & modern' },
  { value: 'DM Sans', label: 'DM Sans', beschrijving: 'Clean & compact' },
  { value: 'Nunito Sans', label: 'Nunito Sans', beschrijving: 'Afgerond & leesbaar' },
  { value: 'Outfit', label: 'Outfit', beschrijving: 'Strak & minimalistisch' },
  { value: 'Poppins', label: 'Poppins', beschrijving: 'Rond & populair' },
  { value: 'Raleway', label: 'Raleway', beschrijving: 'Elegant & dun' },
  { value: 'Source Sans 3', label: 'Source Sans 3', beschrijving: 'Adobe classic' },
  { value: 'Work Sans', label: 'Work Sans', beschrijving: 'Optimaal voor UI' },
] as const;

export const DEFAULT_FONT = 'Manrope';
