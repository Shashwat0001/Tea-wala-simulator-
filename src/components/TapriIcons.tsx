import React from 'react';
import { CupType, SnackType, SpiceType, SugarLevel } from '../game/rules';

export function TitleEmblemSvg() {
  return (
    <svg
      viewBox="0 0 520 150"
      className="w-full max-w-[460px] h-auto drop-shadow-[0_8px_20px_rgba(0,0,0,0.65)]"
      role="img"
      aria-label="Cozy Chai Tapri"
    >
      <rect
        x="8"
        y="12"
        width="504"
        height="126"
        rx="26"
        fill="#241108"
        stroke="#F59E0B"
        strokeWidth="3.5"
      />
      <rect
        x="16"
        y="20"
        width="488"
        height="110"
        rx="20"
        fill="#3B1A0C"
        stroke="#FDE68A"
        strokeWidth="1.2"
        strokeDasharray="6 4"
      />

      {/* Left Steaming Kulhad Teacup */}
      <g transform="translate(36, 48)">
        <path
          className="steam-wisp-1"
          d="M15 8 C11 -2, 21 -8, 17 -18"
          stroke="#FFFBEB"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="steam-wisp-2"
          d="M25 10 C21 0, 31 -6, 27 -16"
          stroke="#FDE68A"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="steam-wisp-3"
          d="M35 8 C31 -2, 41 -8, 37 -18"
          stroke="#FFFBEB"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M8 14 L42 14 L36 58 C35 62, 15 62, 14 58 Z"
          fill="#C85A32"
          stroke="#231109"
          strokeWidth="3"
        />
        <ellipse cx="25" cy="14" rx="17" ry="5" fill="#D97706" stroke="#231109" strokeWidth="2.5" />
        <path d="M11 26 L39 26 M13 40 L37 40" stroke="#FDE68A" strokeWidth="2" />
      </g>

      {/* Right Brass Teapot */}
      <g transform="translate(432, 48)">
        <path
          className="steam-wisp-2"
          d="M22 6 C18 -4, 28 -10, 24 -20"
          stroke="#FFFBEB"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          className="steam-wisp-1"
          d="M32 8 C28 -2, 38 -8, 34 -18"
          stroke="#FDE68A"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="24" cy="38" rx="18" ry="16" fill="#F59E0B" stroke="#231109" strokeWidth="3" />
        <rect x="14" y="16" width="20" height="8" rx="3" fill="#FDE047" stroke="#231109" strokeWidth="2.5" />
        <path d="M40 34 L50 22 L46 42 Z" fill="#FDE047" stroke="#231109" strokeWidth="2.5" />
        <path d="M8 28 C0 28, 0 46, 8 46" stroke="#FDE047" strokeWidth="3.5" fill="none" />
      </g>

      <text
        x="260"
        y="78"
        textAnchor="middle"
        fill="#FFFBEB"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="700"
        fontSize="42"
        letterSpacing="0.5"
      >
        Cozy Chai Tapri
      </text>
      <text
        x="260"
        y="108"
        textAnchor="middle"
        fill="#FCD34D"
        fontFamily="Plus Jakarta Sans, sans-serif"
        fontWeight="600"
        fontSize="14"
        letterSpacing="3"
      >
        3D ROADSIDE TEA STALL
      </text>
    </svg>
  );
}

/**
 * Curved Circular SVG Progress Ring that wraps around World-Space Station Nodes
 */
export function CurvedProgressRingSvg({
  progress,
  size = 68,
  strokeWidth = 5,
  color = '#FACC15',
  trackColor = 'rgba(255, 251, 235, 0.2)',
}: {
  progress: number; // 0..100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0 -rotate-90 pointer-events-none"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        className="transition-all duration-150"
      />
    </svg>
  );
}

export function MortarSvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M14.5 3.5L18.5 7.5L13 13L9 9L14.5 3.5Z"
        fill="#FDE047"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 11H20L18 19C17.5 20.5 15.5 21.5 12 21.5C8.5 21.5 6.5 20.5 6 19L4 11Z"
        fill="#D97706"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7 15H17" stroke="#FEF3C7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PatilaStoveSvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M9 5C9 3.5 10.5 3.5 10.5 2M14.5 5C14.5 3.5 16 3.5 16 2"
        stroke="#FEF08A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5 8H19L20 13C20 16.5 16.5 18.5 12 18.5C7.5 18.5 4 16.5 4 13L5 8Z"
        fill="#F59E0B"
        stroke="#231109"
        strokeWidth="1.8"
      />
      <path
        d="M7 21H17M9 19.5L12 21.5L15 19.5"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KulhadTraySvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M5 6H13L11.8 16.5C11.6 17.5 6.4 17.5 6.2 16.5L5 6Z"
        fill="#C85A32"
        stroke="#231109"
        strokeWidth="1.8"
      />
      <path
        d="M14 16.5L17.5 9.5L21 16.5H14Z"
        fill="#F59E0B"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="2" y="17.5" width="20" height="3" rx="1.5" fill="#78350F" stroke="#231109" strokeWidth="1.6" />
    </svg>
  );
}

export function GullakCoinSvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#FACC15" stroke="#231109" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.5" fill="#EAB308" stroke="#713F12" strokeWidth="1.2" />
      <path
        d="M9.5 9H14.5M9.5 11.5H14.5M9.5 9C11.8 9 13 10.2 13 11.5C13 12.8 11.8 14 9.5 14L13.8 16.5"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VintageRadioSvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M6 7L17 3" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="7" width="18" height="13" rx="2.5" fill="#9A3412" stroke="#231109" strokeWidth="1.8" />
      <rect x="5.5" y="9.5" width="8" height="5" rx="1" fill="#FDE68A" stroke="#231109" strokeWidth="1.4" />
      <circle cx="17" cy="12" r="2" fill="#FACC15" stroke="#231109" strokeWidth="1.4" />
      <circle cx="17" cy="16.8" r="1.5" fill="#FACC15" stroke="#231109" strokeWidth="1.4" />
      <path d="M6 17H12" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SpiceSvgIcon({
  spice,
  className = 'w-5 h-5',
}: {
  spice: SpiceType;
  className?: string;
}) {
  if (spice === 'ginger') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Ginger">
        <path
          d="M6 14C4 14 3 12 4 10C5 8 7.5 8.5 8.5 7C9.5 5.5 12 4 14 5.5C15.5 6.5 14.5 9 16.5 9.5C18.5 10 20 11.5 19.5 14C19 16.5 16.5 17 14 16.5C11.5 16 10 18 7.5 17.5C5.5 17 6 14 6 14Z"
          fill="#D69E4C"
          stroke="#231109"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (spice === 'cardamom') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Cardamom">
        <path
          d="M12 3C16.5 6.5 18 12.5 12 21C6 12.5 7.5 6.5 12 3Z"
          fill="#65A30D"
          stroke="#231109"
          strokeWidth="1.8"
        />
        <path d="M12 5V19" stroke="#ECFCCB" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Tulsi Lemon">
      <circle cx="14" cy="13" r="6" fill="#FACC15" stroke="#231109" strokeWidth="1.8" />
      <path
        d="M5 12C5 7 9 5 13 6C12 10 9 13 5 12Z"
        fill="#16A34A"
        stroke="#231109"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function BrewStepSvgIcon({
  step,
  className = 'w-6 h-6',
}: {
  step: 'water' | 'tea' | 'milk' | 'lemon' | 'spices' | 'boil' | 'done';
  className?: string;
}) {
  if (step === 'water') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M12 3C12 3 6 10.5 6 15C6 18.3 8.7 21 12 21C15.3 21 18 18.3 18 15C18 10.5 12 3 12 3Z"
          fill="#38BDF8"
          stroke="#231109"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (step === 'tea') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M6 18C6 10 12 5 19 5C19 12 14 18 6 18Z"
          fill="#78350F"
          stroke="#FDE68A"
          strokeWidth="1.8"
        />
        <path d="M6 18L15 9" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (step === 'milk') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M7 6H15L17 19C17 20 15.5 21 11 21C6.5 21 5 20 5 19L7 6Z"
          fill="#FFFBEB"
          stroke="#231109"
          strokeWidth="1.8"
        />
        <path d="M15 8H18.5C19.5 8 19.5 13 18.5 13H16" stroke="#FFFBEB" strokeWidth="2" />
      </svg>
    );
  }
  if (step === 'lemon') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M5 15C5 9.5 9.5 5 15 5L19 9C19 14.5 14.5 19 9 19L5 15Z"
          fill="#FACC15"
          stroke="#231109"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (step === 'spices') {
    return <MortarSvgIcon className={className} />;
  }
  if (step === 'boil') {
    return <PatilaStoveSvgIcon className={className} />;
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="#16A34A" stroke="#DCFCE7" strokeWidth="1.8" />
      <path d="M8 12.5L10.8 15.2L16.2 9.5" stroke="#FFFBEB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CupSvgIcon({
  cup,
  className = 'w-5 h-5',
}: {
  cup: CupType;
  className?: string;
}) {
  if (cup === 'kulhad') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Clay Kulhad">
        <path
          d="M6 5H18L16 19C15.6 20.5 8.4 20.5 8 19L6 5Z"
          fill="#C85A32"
          stroke="#231109"
          strokeWidth="1.8"
        />
        <path d="M7.5 10H16.5" stroke="#FDE68A" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Cutting Glass">
      <path
        d="M6.5 4H17.5L15.8 19.5C15.5 20.5 8.5 20.5 8.2 19.5L6.5 4Z"
        fill="#E0F2FE"
        stroke="#231109"
        strokeWidth="1.8"
      />
      <path
        d="M7.4 10H16.6L15.6 18.5H8.4L7.4 10Z"
        fill="#D97706"
      />
    </svg>
  );
}

export function SnackSvgIcon({
  snack,
  className = 'w-5 h-5',
}: {
  snack: SnackType;
  className?: string;
}) {
  if (snack === 'parle_g') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Biscuits">
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2.5"
          fill="#D99343"
          stroke="#231109"
          strokeWidth="1.8"
        />
        <circle cx="8" cy="12" r="1" fill="#231109" />
        <circle cx="12" cy="12" r="1" fill="#231109" />
        <circle cx="16" cy="12" r="1" fill="#231109" />
      </svg>
    );
  }
  if (snack === 'samosa') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Samosa">
        <path
          d="M4 18L12 4L20 18C15 19.5 9 19.5 4 18Z"
          fill="#EAB308"
          stroke="#231109"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (snack === 'pakora') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Pakora">
        <circle cx="9" cy="13" r="4.5" fill="#D97706" stroke="#231109" strokeWidth="1.6" />
        <circle cx="15" cy="14" r="4" fill="#B45309" stroke="#231109" strokeWidth="1.6" />
        <circle cx="12.5" cy="9.5" r="4" fill="#F59E0B" stroke="#231109" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-label="Mithai">
      <circle cx="12" cy="12" r="7.5" fill="#EA580C" stroke="#231109" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#FDE047" strokeWidth="1.8" />
    </svg>
  );
}

export function SugarDotsIcon({ level }: { level: SugarLevel }) {
  const count = level === 'low' ? 1 : level === 'normal' ? 2 : 3;
  return (
    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#2C160C]/15" title={`Sugar: ${level}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <span
          key={idx}
          className="w-1.5 h-1.5 rounded-xs bg-[#FFFBEB] border border-[#78350F] inline-block"
        />
      ))}
    </span>
  );
}
