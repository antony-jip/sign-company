'use client';

import { motion } from 'framer-motion';

interface LetterRevealProps {
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p';
}

const containerVariants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: {
      staggerChildren: 0.03,
      delayChildren: delay,
    },
  }),
};

const letterVariants = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function LetterReveal({
  text,
  className = '',
  delay = 0,
  as: Tag = 'span',
}: LetterRevealProps) {
  const words = text.split(' ');

  return (
    <motion.span
      className={`inline ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden">
          {word.split('').map((char, ci) => (
            <motion.span
              key={`${wi}-${ci}`}
              className="inline-block"
              variants={letterVariants}
              aria-hidden="true"
            >
              {char}
            </motion.span>
          ))}
          {wi < words.length - 1 && (
            <span className="inline-block" style={{ width: '0.3em' }} />
          )}
        </span>
      ))}
    </motion.span>
  );
}
