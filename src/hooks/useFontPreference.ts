'use client';

import { useState, useEffect, useCallback } from 'react';
import { getWeergaveInstellingen, updateWeergaveInstellingen } from '@/services/weergaveService';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE, BESCHIKBARE_FONT_SIZES } from '@/types/weergave';
import type { FontSize } from '@/types/weergave';

function applyFont(fontFamily: string): void {
  document.documentElement.style.setProperty('--font-family', `'${fontFamily}'`);
}

function applyFontSize(fontSize: FontSize): void {
  const sizeConfig = BESCHIKBARE_FONT_SIZES.find((s) => s.value === fontSize);
  const cssValue = sizeConfig?.cssValue ?? '16px';
  document.documentElement.style.setProperty('--font-size', cssValue);
}

export function useFontPreference() {
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONT);
  const [fontSize, setFontSize] = useState<FontSize>(DEFAULT_FONT_SIZE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const instellingen = getWeergaveInstellingen();
    setFontFamily(instellingen.font_family);
    setFontSize(instellingen.font_size);
    applyFont(instellingen.font_family);
    applyFontSize(instellingen.font_size);
    setIsLoaded(true);
  }, []);

  const previewFont = useCallback((font: string) => {
    applyFont(font);
    setFontFamily(font);
  }, []);

  const previewFontSize = useCallback((size: FontSize) => {
    applyFontSize(size);
    setFontSize(size);
  }, []);

  const saveFont = useCallback((font: string) => {
    applyFont(font);
    setFontFamily(font);
    updateWeergaveInstellingen({ font_family: font });
  }, []);

  const saveFontSize = useCallback((size: FontSize) => {
    applyFontSize(size);
    setFontSize(size);
    updateWeergaveInstellingen({ font_size: size });
  }, []);

  const resetFont = useCallback(() => {
    applyFont(DEFAULT_FONT);
    setFontFamily(DEFAULT_FONT);
    updateWeergaveInstellingen({ font_family: DEFAULT_FONT });
  }, []);

  const resetFontSize = useCallback(() => {
    applyFontSize(DEFAULT_FONT_SIZE);
    setFontSize(DEFAULT_FONT_SIZE);
    updateWeergaveInstellingen({ font_size: DEFAULT_FONT_SIZE });
  }, []);

  const resetAll = useCallback(() => {
    applyFont(DEFAULT_FONT);
    applyFontSize(DEFAULT_FONT_SIZE);
    setFontFamily(DEFAULT_FONT);
    setFontSize(DEFAULT_FONT_SIZE);
    updateWeergaveInstellingen({ font_family: DEFAULT_FONT, font_size: DEFAULT_FONT_SIZE });
  }, []);

  return {
    fontFamily,
    fontSize,
    isLoaded,
    previewFont,
    previewFontSize,
    saveFont,
    saveFontSize,
    resetFont,
    resetFontSize,
    resetAll,
  };
}
