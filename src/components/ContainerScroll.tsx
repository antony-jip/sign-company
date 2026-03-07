'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ContainerScrollProps {
  children: React.ReactNode;
}

export const ContainerScroll: React.FC<ContainerScrollProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(20);
  const [scale, setScale] = useState(1.05);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate how far into the viewport the element is (0 = top edge at bottom, 1 = top edge at top)
      const progress = Math.max(0, Math.min(1, 1 - rect.top / windowHeight));

      // Map progress to rotation: 20deg -> 0deg
      const newRotation = 20 * (1 - progress);
      // Map progress to scale: 1.05 -> 1
      const newScale = 1.05 - 0.05 * progress;

      setRotation(newRotation);
      setScale(newScale);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="container-scroll-wrapper">
      {/* Glow effect */}
      <div className="container-scroll-glow" />

      <div
        className="container-scroll-content"
        style={{
          transform: `perspective(1000px) rotateX(${rotation}deg) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ContainerScroll;
