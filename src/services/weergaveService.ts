import type { AppWeergaveInstellingen } from '@/types/weergave';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from '@/types/weergave';

const STORAGE_KEY = 'forgedesk_weergave_instellingen';

function createDefaultInstellingen(): AppWeergaveInstellingen {
  return {
    id: crypto.randomUUID(),
    user_id: 'local',
    font_family: DEFAULT_FONT,
    font_size: DEFAULT_FONT_SIZE,
    updated_at: new Date().toISOString(),
  };
}

export function getWeergaveInstellingen(): AppWeergaveInstellingen {
  if (typeof window === 'undefined') {
    return createDefaultInstellingen();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: AppWeergaveInstellingen = JSON.parse(stored);
      if (parsed.font_family) {
        return {
          ...createDefaultInstellingen(),
          ...parsed,
          font_size: parsed.font_size ?? DEFAULT_FONT_SIZE,
        };
      }
    }
  } catch {
    // localStorage not available or invalid data
  }

  return createDefaultInstellingen();
}

export function updateWeergaveInstellingen(
  data: Partial<Pick<AppWeergaveInstellingen, 'font_family' | 'font_size'>>
): AppWeergaveInstellingen {
  const current = getWeergaveInstellingen();
  const updated: AppWeergaveInstellingen = {
    ...current,
    ...data,
    updated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available
  }

  return updated;
}
