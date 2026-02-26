'use client';

import React, { useState } from 'react';
import { BESCHIKBARE_FONTS, DEFAULT_FONT, BESCHIKBARE_FONT_SIZES, DEFAULT_FONT_SIZE } from '@/types/weergave';
import type { FontSize } from '@/types/weergave';
import { useFontPreference } from '@/hooks/useFontPreference';

export const FontSelector: React.FC = () => {
  const {
    fontFamily,
    fontSize,
    isLoaded,
    previewFont,
    previewFontSize,
    saveFont,
    saveFontSize,
    resetAll,
  } = useFontPreference();

  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<FontSize | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const activeFont = selectedFont ?? fontFamily;
  const activeSize = selectedSize ?? fontSize;

  function showSavedToast(message: string) {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  function handleSelectFont(font: string) {
    setSelectedFont(font);
    previewFont(font);
  }

  function handleSelectSize(size: FontSize) {
    setSelectedSize(size);
    previewFontSize(size);
  }

  function handleSave() {
    if (selectedFont) saveFont(selectedFont);
    if (selectedSize) saveFontSize(selectedSize);
    if (!selectedFont && !selectedSize) {
      saveFont(activeFont);
      saveFontSize(activeSize);
    }
    setSelectedFont(null);
    setSelectedSize(null);
    showSavedToast('Instellingen opgeslagen');
  }

  function handleReset() {
    setSelectedFont(null);
    setSelectedSize(null);
    resetAll();
    showSavedToast('Instellingen hersteld naar standaard');
  }

  if (!isLoaded) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Weergave</h2>
      <p className="text-gray-600 mb-6">Pas het lettertype en de lettergrootte aan naar jouw voorkeur.</p>

      {/* Font Family Selector */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Lettertype</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {BESCHIKBARE_FONTS.map((font) => {
          const isActive = activeFont === font.value;
          return (
            <button
              key={font.value}
              type="button"
              onClick={() => handleSelectFont(font.value)}
              className={`relative text-left p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {isActive && (
                <span className="absolute top-3 right-3 text-primary-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
              <span
                className="block text-lg font-semibold text-gray-900 mb-1"
                style={{ fontFamily: `'${font.value}', sans-serif` }}
              >
                {font.label}
              </span>
              <span
                className="block text-2xl text-gray-700 mb-2"
                style={{ fontFamily: `'${font.value}', sans-serif` }}
              >
                Aa Bb 123
              </span>
              <span className="block text-sm text-gray-500">
                {font.beschrijving}
              </span>
            </button>
          );
        })}
      </div>

      {/* Font Size Selector */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Lettergrootte</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {BESCHIKBARE_FONT_SIZES.map((size) => {
          const isActive = activeSize === size.value;
          return (
            <button
              key={size.value}
              type="button"
              onClick={() => handleSelectSize(size.value)}
              className={`relative text-left p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {isActive && (
                <span className="absolute top-2 right-2 text-primary-600">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
              <span
                className="block font-semibold text-gray-900 mb-1"
                style={{ fontSize: size.cssValue }}
              >
                Aa
              </span>
              <span className="block text-sm font-medium text-gray-700">
                {size.label}
              </span>
              <span className="block text-xs text-gray-500">
                {size.beschrijving}
              </span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={handleSave}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Opslaan
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Reset naar standaard
        </button>
        {(activeFont !== DEFAULT_FONT || activeSize !== DEFAULT_FONT_SIZE) && (
          <span className="text-sm text-gray-500">
            Huidig: {activeFont}, {BESCHIKBARE_FONT_SIZES.find((s) => s.value === activeSize)?.label ?? activeSize}
          </span>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default FontSelector;
