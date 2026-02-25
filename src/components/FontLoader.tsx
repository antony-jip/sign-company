'use client';

import { useEffect } from 'react';
import { getWeergaveInstellingen } from '@/services/weergaveService';

export function FontLoader() {
  useEffect(() => {
    const instellingen = getWeergaveInstellingen();
    document.documentElement.style.setProperty(
      '--font-family',
      `'${instellingen.font_family}'`
    );
  }, []);

  return null;
}
