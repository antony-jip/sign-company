'use client';

import React, { useState } from 'react';
import { BESCHIKBARE_FONTS, DEFAULT_FONT } from '@/types/weergave';
import { useFontPreference } from '@/hooks/useFontPreference';

export const FontSelector: React.FC = () => {
  const { fontFamily, isLoaded, previewFont, saveFont, resetFont } = useFontPreference();
  const [selectedFont, setSelectedFont] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const activeFont = selectedFont ?? fontFamily;

  function handleSelectFont(font: string) {
    setSelectedFont(font);
    previewFont(font);
  }

  function handleSave() {
    saveFont(activeFont);
    setSelectedFont(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  function handleReset() {
    setSelectedFont(null);
    resetFont();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  if (!isLoaded) {
    return null;
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Weergave</h2>
      <p className="text-gray-600 mb-6">App lettertype</p>

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

      <div className="flex gap-3">
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
        {activeFont !== DEFAULT_FONT && (
          <span className="self-center text-sm text-gray-500">
            Huidig: {activeFont}
          </span>
        )}
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          Lettertype opgeslagen
        </div>
      )}
    </div>
  );
};

export default FontSelector;
