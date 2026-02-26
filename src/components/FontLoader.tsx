'use client';

import { useEffect } from 'react';
import { getWeergaveInstellingen } from '@/services/weergaveService';
import { BESCHIKBARE_FONT_SIZES } from '@/types/weergave';

export function FontLoader() {
  useEffect(() => {
    const instellingen = getWeergaveInstellingen();
    document.documentElement.style.setProperty(
      '--font-family',
      `'${instellingen.font_family}'`
    );
    const sizeConfig = BESCHIKBARE_FONT_SIZES.find((s) => s.value === instellingen.font_size);
    document.documentElement.style.setProperty(
      '--font-size',
      sizeConfig?.cssValue ?? '16px'
    );
  }, []);

  return null;
}
