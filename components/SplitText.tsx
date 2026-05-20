"use client";

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

// IMPORTANTE: Si no tienes la versión paga de GSAP (Club GSAP), 
// SplitText no funcionará desde 'gsap/SplitText'.
// Para esta versión, usaremos una lógica compatible.
// @ts-ignore
import { SplitText as GSAPSplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: 'chars' | 'words' | 'lines';
  animationFrom?: any;
  animationTo?: any;
  threshold?: number;
  rootMargin?: string;
  textAlign?: "center" | "left" | "right" | "inherit" | "justify";
  tag?: React.ElementType;
  onLetterAnimationComplete?: () => void;
  style?: React.CSSProperties; // Añadido para poder pasar el tamaño de fuente
}

const SplitText = ({
  text,
  className = '',
  delay = 50,
  duration = 0.8,
  ease = 'power3.out',
  splitType = 'chars',
  animationFrom = { opacity: 0, y: 40 },
  animationTo = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'center',
  tag = 'p',
  onLetterAnimationComplete,
  style
}: SplitTextProps) => {
  const ref = useRef<any>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      if (animationCompletedRef.current) return;
      const el = ref.current;

      // Intentar usar SplitText de GSAP
      let splitInstance: any;
      try {
        splitInstance = new GSAPSplitText(el, {
          type: splitType,
          linesClass: 'split-line',
          wordsClass: 'split-word',
          charsClass: 'split-char',
        });

        const targets = splitType === 'chars' ? splitInstance.chars : (splitType === 'words' ? splitInstance.words : splitInstance.lines);

        gsap.fromTo(
          targets,
          { ...animationFrom },
          {
            ...animationTo,
            duration,
            ease,
            stagger: delay / 1000,
            scrollTrigger: {
              trigger: el,
              start: `top 80%`,
              once: true,
            },
            onComplete: () => {
              animationCompletedRef.current = true;
              onCompleteRef.current?.();
            },
          }
        );
      } catch (e) {
        console.error("Error: SplitText es un plugin premium de GSAP. Si no tienes la licencia, este efecto no se verá.");
      }

      return () => {
        if (splitInstance) splitInstance.revert();
      };
    },
    { dependencies: [text, fontsLoaded], scope: ref }
  );

  const Tag = tag as any;

  return (
    <Tag 
      ref={ref} 
      className={className}
      style={{ 
        ...style, 
        textAlign, 
        display: 'inline-block', 
        willChange: 'transform, opacity' 
      }}
    >
      {text}
    </Tag>
  );
};

export default SplitText;