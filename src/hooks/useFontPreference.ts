'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWeergaveInstellingen, updateWeergaveInstellingen } from '@/services/weergaveService';
import { DEFAULT_FONT } from '@/types/weergave';

function applyFont(fontFamily: string): void {
  document.documentElement.style.setProperty('--font-family', `'${fontFamily}'`);
}

export function useFontPreference() {
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const instellingen = getWeergaveInstellingen();
    setFontFamily(instellingen.font_family);
    applyFont(instellingen.font_family);
    setIsLoaded(true);
  }, []);

  const previewFont = useCallback((font: string) => {
    applyFont(font);
    setFontFamily(font);
  }, []);

  const saveFont = useCallback((font: string) => {
    applyFont(font);
    setFontFamily(font);
    updateWeergaveInstellingen({ font_family: font });
  }, []);

  const resetFont = useCallback(() => {
    applyFont(DEFAULT_FONT);
    setFontFamily(DEFAULT_FONT);
    updateWeergaveInstellingen({ font_family: DEFAULT_FONT });
  }, []);

  return {
    fontFamily,
    isLoaded,
    previewFont,
    saveFont,
    resetFont,
  };
}
