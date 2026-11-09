import React from 'react';

export function TitleEmblemSvg() {
  return (
    <svg
      viewBox="0 0 520 150"
      className="w-full max-w-[480px] h-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
      role="img"
      aria-label="Cozy Chai Tapri — Roadside Tea Stall Simulation"
    >
      {/* Ornate Indian Brass & Terracotta Plaque Frame */}
      <rect
        x="8"
        y="12"
        width="504"
        height="126"
        rx="22"
        fill="#2C160C"
        stroke="#F59E0B"
        strokeWidth="4"
      />
      <rect
        x="16"
        y="20"
        width="488"
        height="110"
        rx="16"
        fill="#431E0F"
        stroke="#FDE68A"
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />

      {/* Left Decorative Steaming Kulhad Teacup Icon with Continuous CSS Steam */}
      <g transform="translate(36, 48)">
        {/* Continuous CSS-animated steam wisps */}
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
        {/* Kulhad Clay Cup */}
        <path
          d="M8 14 L42 14 L36 58 C35 62, 15 62, 14 58 Z"
          fill="#C85A32"
          stroke="#231109"
          strokeWidth="3"
        />
        <ellipse cx="25" cy="14" rx="17" ry="5" fill="#D97706" stroke="#231109" strokeWidth="2.5" />
        <path d="M11 26 L39 26 M13 40 L37 40" stroke="#FDE68A" strokeWidth="2" />
      </g>

      {/* Right Decorative Brass Teapot Icon with Continuous CSS Steam */}
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

      {/* Main Title Typography inside SVG */}
      <text
        x="260"
        y="74"
        textAnchor="middle"
        fill="#FFFBEB"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="700"
        fontSize="40"
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
        fontSize="16"
        letterSpacing="2.5"
      >
        ROADSIDE TEA STALL SIMULATION
      </text>
    </svg>
  );
}

export function MortarSvgIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      {/* Pestle */}
      <path
        d="M14.5 3.5L18.5 7.5L13 13L9 9L14.5 3.5Z"
        fill="#FDE047"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Mortar Bowl */}
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
      {/* Steam */}
      <path
        d="M9 5C9 3.5 10.5 3.5 10.5 2M14.5 5C14.5 3.5 16 3.5 16 2"
        stroke="#FEF08A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Brass Patila Vessel */}
      <path
        d="M5 8H19L20 13C20 16.5 16.5 18.5 12 18.5C7.5 18.5 4 16.5 4 13L5 8Z"
        fill="#F59E0B"
        stroke="#231109"
        strokeWidth="1.8"
      />
      {/* Stove Flame Base */}
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
      {/* Kulhad Cup */}
      <path
        d="M5 6H13L11.8 16.5C11.6 17.5 6.4 17.5 6.2 16.5L5 6Z"
        fill="#C85A32"
        stroke="#231109"
        strokeWidth="1.8"
      />
      {/* Samosa Triangle beside cup */}
      <path
        d="M14 16.5L17.5 9.5L21 16.5H14Z"
        fill="#F59E0B"
        stroke="#231109"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Serving Tray */}
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
