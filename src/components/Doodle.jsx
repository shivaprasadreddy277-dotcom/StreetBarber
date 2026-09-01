import React from 'react';

export default function Doodle({
  name,
  className = '',
  rotation = 0,
  size = 48,
  color = 'navy',
  animate = false,
  ...props
}) {
  // Color presets mapping to Tailwind theme classes
  const colorMap = {
    navy: 'text-navy',
    orange: 'text-orange',
    mustard: 'text-mustard',
    white: 'text-white'
  };

  const textColorClass = colorMap[color] || color;

  // Base style handling dynamic rotation so that CSS floats still preserve the base rotation angle
  const baseStyle = {
    width: `${size}px`,
    height: `${size}px`,
    '--doodle-rot-base': `${rotation}deg`,
    transform: `rotate(${rotation}deg)`
  };

  const animationClass = animate 
    ? (Math.abs(rotation) % 2 === 0 ? 'animate-float-slow' : 'animate-float-medium')
    : '';

  // Render wobbly wavelike hand-drawn SVGs
  const renderSvg = () => {
    switch (name) {
      case 'scissors':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Left handle loop */}
            <path d="M 28 72 C 22 75, 12 68, 15 58 C 18 48, 28 50, 32 58 C 34 62, 32 68, 28 72 Z" />
            {/* Right handle loop */}
            <path d="M 72 72 C 78 75, 88 68, 85 58 C 82 48, 72 50, 68 58 C 66 62, 68 68, 72 72 Z" />
            {/* Scissor center pivot */}
            <circle cx="50" cy="45" r="3.5" fill="currentColor" />
            {/* Scissor Blades */}
            <path d="M 38 52 L 50 45 L 56 12" />
            <path d="M 62 52 L 50 45 L 44 12" />
            {/* Small sketchy details */}
            <path d="M 45 30 L 48 30" strokeWidth="2" />
            <path d="M 52 25 L 55 25" strokeWidth="2" />
          </svg>
        );

      case 'razor':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Handle / scale of straight razor */}
            <path d="M 25 75 C 30 70, 75 35, 85 45 C 90 50, 50 85, 30 85 C 22 85, 20 80, 25 75 Z" />
            {/* Pivot pin */}
            <circle cx="28" cy="78" r="2" fill="currentColor" />
            {/* Tang and Blade */}
            <path d="M 28 78 C 24 70, 20 50, 18 45 C 16 40, 22 25, 45 15 C 55 10, 65 12, 60 22 C 55 32, 35 55, 28 78 Z" />
            {/* Blade edge line */}
            <path d="M 20 42 C 28 28, 48 18, 56 15" strokeWidth="2" />
            {/* Star sparkle next to blade */}
            <path d="M 72 15 L 75 22 L 82 25 L 75 28 L 72 35 L 69 28 L 62 25 L 69 22 Z" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'comb':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Comb Spine */}
            <path d="M 12 35 C 18 32, 82 32, 88 35 C 90 36, 88 40, 85 40 L 15 40 C 12 40, 10 36, 12 35 Z" />
            {/* Teeth - sketchy vertical lines */}
            <path d="M 18 40 L 18 72 M 24 40 L 24 72 M 30 40 L 30 72 M 36 40 L 36 72 M 42 40 L 42 72 M 48 40 L 48 72 M 54 40 L 54 72 M 60 40 L 60 72 M 66 40 L 66 72 M 72 40 L 72 72 M 78 40 L 78 72 M 84 40 L 84 72" />
            {/* Small handle tail */}
            <path d="M 12 37 C 5 39, 2 45, 5 48 C 8 50, 11 43, 15 40" strokeWidth="2" />
          </svg>
        );

      case 'barber-pole':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Top and bottom metal caps */}
            <path d="M 38 18 C 38 10, 62 10, 62 18 Z" fill="currentColor" />
            <path d="M 38 82 C 38 90, 62 90, 62 82 Z" fill="currentColor" />
            {/* Main glass cylinder outline */}
            <path d="M 40 18 L 40 82 M 60 18 L 60 82" />
            {/* Spiral Stripes */}
            <path d="M 40 30 C 48 32, 52 28, 60 30" strokeWidth="4" />
            <path d="M 40 45 C 48 47, 52 43, 60 45" strokeWidth="4" stroke="currentColor" />
            <path d="M 40 60 C 48 62, 52 58, 60 60" strokeWidth="4" />
            <path d="M 40 75 C 48 77, 52 73, 60 75" strokeWidth="4" />
            {/* Wall mounting bracket */}
            <path d="M 40 28 L 25 32 L 25 68 L 40 72" strokeWidth="2" />
            <path d="M 25 50 L 15 50" strokeWidth="2" />
          </svg>
        );

      case 'hair-dryer':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Body */}
            <path d="M 22 25 C 22 20, 62 15, 68 25 C 72 32, 68 45, 52 48" />
            {/* Nozzle */}
            <path d="M 22 25 L 20 42 L 28 42 L 30 31" />
            {/* Back air filter cap */}
            <path d="M 66 20 C 72 20, 78 28, 75 35 C 72 40, 68 38, 66 32" />
            {/* Handle */}
            <path d="M 52 48 L 58 78 C 59 82, 50 85, 48 80 L 44 50" />
            {/* Cord loop */}
            <path d="M 54 78 C 54 88, 42 92, 45 82" strokeWidth="1.5" />
            {/* Air flow lines coming out */}
            <path d="M 12 28 C 8 28, 5 30, 8 32" strokeWidth="2" />
            <path d="M 12 35 C 6 35, 4 38, 7 40" strokeWidth="2" />
          </svg>
        );

      case 'mustache':
        return (
          <svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Symmetrical wobbly hand-drawn mustache */}
            <path d="M 50 52 C 45 42, 28 40, 18 45 C 10 49, 8 58, 14 62 C 22 66, 38 58, 48 54 C 49 53, 50 53, 50 53 C 50 53, 51 53, 52 54 C 62 58, 78 66, 86 62 C 92 58, 90 49, 82 45 C 72 40, 55 42, 50 52 Z" />
          </svg>
        );

      case 'hair-strands':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M 20 40 C 35 25, 45 65, 65 30" />
            <path d="M 35 55 C 50 40, 60 70, 78 45" />
            <path d="M 15 25 C 28 12, 50 35, 55 18" />
          </svg>
        );

      case 'stars':
        return (
          <svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Large hand-drawn star */}
            <path d="M 50 15 L 59 34 L 80 37 L 65 52 L 68 73 L 50 63 L 32 73 L 35 52 L 20 37 L 41 34 Z" />
            {/* Small offset sparkle */}
            <path d="M 78 65 L 80 70 L 85 71 L 80 73 L 78 78 L 76 73 L 71 71 L 76 70 Z" />
            <path d="M 24 18 L 25 21 L 28 22 L 25 23 L 24 26 L 23 23 L 20 22 L 23 21 Z" />
          </svg>
        );

      case 'lightning-bolt':
        return (
          <svg viewBox="0 0 100 100" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Zigzag lightning */}
            <path d="M 58 12 L 25 52 L 48 52 L 35 88 L 72 44 L 48 44 Z" />
          </svg>
        );

      case 'arrow':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Curved arrow shaft */}
            <path d="M 15 45 C 35 25, 65 32, 80 55" />
            {/* Arrow head */}
            <path d="M 68 55 L 82 57 L 83 43" />
            {/* Small sketchy lines */}
            <path d="M 22 35 L 26 40" strokeWidth="2" />
            <path d="M 30 31 L 34 36" strokeWidth="2" />
          </svg>
        );

      case 'circle':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Scribbled circle that doesn't quite close */}
            <path d="M 52 14 C 76 16, 88 42, 85 64 C 82 84, 52 88, 32 82 C 14 74, 12 44, 25 25 C 34 12, 54 8, 70 18" />
          </svg>
        );

      case 'underline':
        return (
          <svg viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" {...props} preserveAspectRatio="none">
            {/* Double-marker stroke underline */}
            <path d="M 5 8 C 35 4, 75 7, 95 6" />
            <path d="M 12 14 C 40 11, 68 13, 88 12" strokeWidth="2.5" />
          </svg>
        );

      case 'sparkles':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Set of 3 small doodles */}
            <path d="M 50 15 L 50 35 M 40 25 L 60 25" />
            <path d="M 22 55 L 22 71 M 14 63 L 30 63" strokeWidth="2" />
            <path d="M 75 48 L 75 62 M 68 55 L 82 55" strokeWidth="2" />
            <circle cx="50" cy="50" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="35" cy="38" r="1" fill="currentColor" stroke="none" />
            <circle cx="65" cy="65" r="1" fill="currentColor" stroke="none" />
          </svg>
        );

      case 'man-avatar':
        return (
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {/* Wobbly head outline */}
            <path d="M 32 45 C 32 30, 68 30, 68 45 C 68 55, 60 62, 50 62 C 40 62, 32 55, 32 45 Z" />
            {/* Cool wobbly marker hairstyle */}
            <path d="M 30 40 C 26 28, 48 10, 68 18 C 76 22, 70 36, 68 40 M 34 32 C 42 22, 60 22, 66 32" strokeWidth="3.5" />
            {/* Neck and collar */}
            <path d="M 44 61 L 44 72 M 56 61 L 56 72" />
            <path d="M 40 72 L 50 78 L 60 72" />
            {/* Shoulders wobbly line */}
            <path d="M 20 88 C 30 78, 70 78, 80 88" strokeWidth="2.5" />
            {/* Small styling details: sideburn line */}
            <path d="M 35 42 L 35 48" strokeWidth="2" />
            <path d="M 65 42 L 65 48" strokeWidth="2" />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={baseStyle}
      className={`inline-block ${textColorClass} ${animationClass} ${className} transition-transform duration-300 pointer-events-none select-none`}
    >
      {renderSvg()}
    </div>
  );
}
