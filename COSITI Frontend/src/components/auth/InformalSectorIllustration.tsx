import React from 'react';

/**
 * Illustration vectorielle du travail indépendant et du secteur informel :
 * étal du marché, vendeuse portant sa bassine, artisan menuisier, moto-taxi.
 * Palette reprise du logo COSITI (orange de la main, vert du titre, or des arcs).
 */
export const InformalSectorIllustration: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 640 520" className={className} role="img" aria-labelledby="illu-title">
    <title id="illu-title">Travailleurs du secteur informel : vendeuse au marché, artisan menuisier et conducteur de moto-taxi</title>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF8EE" />
        <stop offset="1" stopColor="#FCE3C4" />
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#EAC9A0" />
        <stop offset="1" stopColor="#DDB487" />
      </linearGradient>
      <clipPath id="dress">
        <path d="M228 298 L262 298 L282 466 L208 466 Z" />
      </clipPath>
    </defs>

    {/* ciel, soleil, arcs du logo */}
    <rect width="640" height="520" rx="28" fill="url(#sky)" />
    <circle cx="520" cy="100" r="58" fill="#F6C453" opacity="0.85" />
    <circle cx="520" cy="100" r="78" fill="none" stroke="#F6C453" strokeWidth="3" opacity="0.35" />
    <path d="M110 470 A230 230 0 1 1 560 300" fill="none" stroke="#D97F2E" strokeWidth="16" strokeLinecap="round" opacity="0.14" />
    <path d="M150 430 A190 190 0 1 1 530 280" fill="none" stroke="#E5C21E" strokeWidth="3" strokeLinecap="round" opacity="0.45" />

    {/* collines et sol */}
    <path d="M0 380 Q160 320 320 368 T640 340 V520 H0 Z" fill="#F5DDBB" />
    <rect x="0" y="440" width="640" height="80" fill="url(#ground)" />
    <ellipse cx="245" cy="470" rx="52" ry="7" fill="#C99A68" opacity="0.5" />
    <ellipse cx="365" cy="470" rx="48" ry="7" fill="#C99A68" opacity="0.5" />
    <ellipse cx="535" cy="474" rx="95" ry="8" fill="#C99A68" opacity="0.5" />

    {/* ---------- étal du marché ---------- */}
    <rect x="34" y="248" width="8" height="200" rx="2" fill="#8B5A2B" />
    <rect x="176" y="248" width="8" height="200" rx="2" fill="#8B5A2B" />
    <path d="M20 250 L198 250 L184 210 L34 210 Z" fill="#D97F2E" />
    <path d="M60 210 L72 250 M100 210 L106 250 M140 210 L142 250" stroke="#FFF3E0" strokeWidth="9" opacity="0.9" />
    {[29, 49, 69, 89, 109, 129, 149, 169, 189].map((x, i) => (
      <circle key={x} cx={x} cy="251" r="10" fill={i % 2 ? '#FFF3E0' : '#D97F2E'} />
    ))}
    <rect x="26" y="352" width="166" height="14" rx="3" fill="#A0682F" />
    <rect x="34" y="366" width="7" height="80" fill="#8B5A2B" />
    <rect x="176" y="366" width="7" height="80" fill="#8B5A2B" />
    {/* fruits et légumes */}
    {[
      [48, 340, '#F08A24'], [70, 340, '#F08A24'], [92, 340, '#F08A24'], [59, 322, '#F59E2B'], [81, 322, '#F08A24'], [70, 305, '#F59E2B'],
      [128, 342, '#C8102E'], [146, 342, '#D62839'], [164, 342, '#C8102E'], [137, 326, '#D62839'], [155, 326, '#C8102E'],
    ].map(([x, y, c]) => (
      <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r="10" fill={c as string} />
    ))}
    <path d="M108 350 Q118 318 136 312" stroke="#7DA444" strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M114 352 Q126 324 144 320" stroke="#93B95A" strokeWidth="8" fill="none" strokeLinecap="round" />
    <rect x="58" y="392" width="102" height="44" rx="6" fill="#5B8A4A" opacity="0.9" />
    <text x="109" y="420" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="15" fill="#FFF8EE">MARCHÉ</text>

    {/* ---------- vendeuse portant sa bassine ---------- */}
    <path d="M232 302 L218 252 L222 214" stroke="#6B3E26" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M258 302 L272 252 L268 214" stroke="#6B3E26" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M200 212 Q245 244 290 212 Z" fill="#9AA5AE" />
    <ellipse cx="245" cy="212" rx="45" ry="9" fill="#C4CDD3" />
    {[[222, 204, '#F08A24'], [240, 200, '#C8102E'], [258, 203, '#F08A24'], [231, 192, '#7DA444'], [250, 190, '#F59E2B'], [268, 196, '#C8102E']].map(([x, y, c]) => (
      <circle key={`b${x}-${y}`} cx={x as number} cy={y as number} r="9" fill={c as string} />
    ))}
    <rect x="239" y="272" width="12" height="16" fill="#6B3E26" />
    <circle cx="245" cy="258" r="17" fill="#6B3E26" />
    <path d="M226 252 Q228 230 247 232 Q266 234 264 254 Q256 242 245 243 Q234 244 226 252 Z" fill="#E5C21E" />
    <path d="M246 232 Q262 222 268 236" stroke="#C8102E" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M228 298 L262 298 L282 466 L208 466 Z" fill="#4F8A3F" />
    <g clipPath="url(#dress)">
      <rect x="200" y="338" width="90" height="16" fill="#C8102E" />
      <rect x="200" y="354" width="90" height="10" fill="#F2C230" />
      <rect x="200" y="408" width="90" height="12" fill="#F2C230" />
      <rect x="200" y="420" width="90" height="18" fill="#C8102E" />
      {[214, 234, 254, 274].map((x) => (
        <circle key={`m${x}`} cx={x} cy="388" r="5" fill="#F2C230" opacity="0.9" />
      ))}
    </g>
    <ellipse cx="228" cy="468" rx="12" ry="5" fill="#4A2A1A" />
    <ellipse cx="262" cy="468" rx="12" ry="5" fill="#4A2A1A" />

    {/* ---------- artisan menuisier ---------- */}
    <path d="M354 380 L352 464" stroke="#3B2A1E" strokeWidth="13" strokeLinecap="round" />
    <path d="M378 380 L382 464" stroke="#3B2A1E" strokeWidth="13" strokeLinecap="round" />
    <path d="M344 296 L388 296 L392 384 L340 384 Z" fill="#2E3A59" />
    <path d="M350 318 L382 318 L386 386 L346 386 Z" fill="#9C6A3A" />
    <path d="M386 304 L404 270 L400 246" stroke="#5A3520" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M400 250 L414 228" stroke="#7A4B23" strokeWidth="5" strokeLinecap="round" />
    <rect x="404" y="214" width="26" height="11" rx="2" fill="#4B5563" transform="rotate(-32 417 220)" />
    <path d="M346 306 L334 350 L352 388" stroke="#5A3520" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="360" y="282" width="12" height="16" fill="#5A3520" />
    <circle cx="366" cy="270" r="16" fill="#5A3520" />
    <path d="M349 266 Q350 250 367 250 Q383 250 384 264 L392 266 L384 270 Q366 262 349 268 Z" fill="#1F2937" />
    <rect x="296" y="392" width="104" height="12" rx="2" fill="#B07A3E" />
    <rect x="306" y="372" width="70" height="20" rx="2" fill="#D9A866" />
    <rect x="304" y="404" width="7" height="60" fill="#8B5A2B" />
    <rect x="386" y="404" width="7" height="60" fill="#8B5A2B" />
    {[318, 334, 350].map((x) => (
      <path key={`c${x}`} d={`M${x} 372 q4 -8 8 0`} stroke="#F6E7C8" strokeWidth="2" fill="none" />
    ))}

    {/* ---------- moto-taxi ---------- */}
    {/* roues pleines avec jantes */}
    <circle cx="468" cy="438" r="31" fill="#1F2937" />
    <circle cx="468" cy="438" r="19" fill="#9CA3AF" />
    <circle cx="468" cy="438" r="7" fill="#374151" />
    <circle cx="596" cy="438" r="31" fill="#1F2937" />
    <circle cx="596" cy="438" r="19" fill="#9CA3AF" />
    <circle cx="596" cy="438" r="7" fill="#374151" />
    {/* garde-boue, fourche, cadre */}
    <path d="M432 432 A37 37 0 0 1 502 418" stroke="#C8102E" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M562 418 A37 37 0 0 1 630 428" stroke="#C8102E" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M596 438 L578 366" stroke="#4B5563" strokeWidth="9" strokeLinecap="round" />
    <path d="M468 438 L516 428 L562 404" stroke="#1F2937" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* moteur et pot d'échappement */}
    <rect x="504" y="402" width="48" height="34" rx="8" fill="#374151" />
    <circle cx="528" cy="419" r="10" fill="#6B7280" />
    <path d="M506 434 L446 432" stroke="#D1D5DB" strokeWidth="8" strokeLinecap="round" />
    {/* selle et réservoir */}
    <path d="M478 400 Q490 386 532 388 L534 402 L482 406 Z" fill="#111827" />
    <path d="M528 386 Q552 366 584 380 L580 400 L530 402 Z" fill="#C8102E" />
    <path d="M540 382 Q556 374 572 380" stroke="#F87171" strokeWidth="3" fill="none" strokeLinecap="round" />
    {/* guidon et phare */}
    <path d="M578 366 L570 350" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" />
    <path d="M560 350 L582 346" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" />
    <circle cx="594" cy="372" r="9" fill="#F6C453" stroke="#1F2937" strokeWidth="3" />
    {/* conducteur (gilet jaune des moto-taxis) */}
    <path d="M500 392 L536 404 L528 438" stroke="#2E3A59" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <ellipse cx="530" cy="440" rx="11" ry="5" fill="#111827" />
    <path d="M490 396 Q486 344 516 320 L542 328 Q544 362 530 398 Z" fill="#F2C230" />
    <path d="M504 330 L516 392" stroke="#D97F2E" strokeWidth="4" opacity="0.8" />
    <path d="M532 336 L564 350" stroke="#4A2A1A" strokeWidth="9" strokeLinecap="round" />
    <rect x="520" y="302" width="11" height="16" fill="#4A2A1A" />
    <circle cx="528" cy="294" r="18" fill="#1F2937" />
    <path d="M532 287 L547 291 L545 302 L532 300 Z" fill="#60A5FA" opacity="0.75" />
    <path d="M513 281 Q528 270 543 281" stroke="#E5C21E" strokeWidth="3" fill="none" />
  </svg>
);
