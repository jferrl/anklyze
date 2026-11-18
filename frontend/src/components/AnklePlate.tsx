import { useTranslation } from 'react-i18next';

const SOURCE_URL = 'https://commons.wikimedia.org/wiki/File:Weber_Classification_-_latin.svg';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

// Adapted from "Weber Classification - latin.svg" by DrFO.Tn, Wikimedia Commons, CC BY 4.0
// (SOURCE_URL). Changes: only the Weber B panel; colour fills, gradients, cartilage, ligaments,
// texture marks, the lower calcaneus, the arrow and the label removed; bone silhouettes restroked
// as line art; the talus outline spur and the tibial tubercle lobe (hidden under ligaments in the
// original) smoothed; coordinates rounded to 1 decimal. Source units, cropped by the viewBox.
const TIBIA =
  'M288.4,12.4 C288.1,36.7 288.6,59.3 287.3,81 C287.3,103.4 283.8,124.9 281.2,146.7 L273,196.3 C274.6,210 275.8,224 276.9,237.7 L291.6,245.2 C294.1,246.6 297.9,246.7 302.4,246 C307,244.6 311.5,243.7 321.4,242.6 C324,242.4 333.3,245.5 338,250.2 L344.7,253.4 L358.7,256 L366.9,251 L377.7,250.2 C379.4,244.5 379.9,238.5 379.9,232.4 L366,200.9 C354.5,172.3 347.2,141.9 343.2,109.8 C340.1,80.8 338.8,45.7 338.7,12 Z';
const TALUS =
  'M271,262.1 C264,262.6 257.6,264.4 252.6,266.3 C254.3,271.9 262.4,293.4 262.4,293.4 C278,272.8 302.7,276.4 332.7,314 C345.1,318.1 359.8,316.1 358.5,297.5 C350.1,291 341.7,276.7 346.5,274.1 C348.2,264.2 349.2,262.1 352.3,256.1 C356.7,240.5 345.6,254.7 342.7,253.6 C335.7,265.8 336.1,281.2 325.6,272.2 C318,266.7 309,259.7 300.5,258 C290.1,255.5 278.9,263.3 271,262.1 Z';
// Upper calcaneus, cropped by the viewBox; it seats the talus.
const CALCANEUS =
  'M262.1,292.7 C262.5,296 265,296.1 268.9,300.4 C272.5,305.5 266.8,322.1 258.1,322.8 C259.8,328.5 263.3,343.1 263.3,343.1 C278.9,322.5 295.5,311.2 300.7,315.5 C312.5,311.5 318.1,315.5 329.2,337 C327.8,314.4 333.9,317.1 332.6,308 C325.2,298.6 308.8,282.5 304.1,283.4 C301.4,281.7 299,282.5 293.3,279.5 C289.4,279.4 285.3,279.4 279.3,281.4 C276.1,279.7 275.1,284 273.4,283.2 C270,283.7 265.6,288.8 262.1,292.7 Z';
// Proximal fibula, ending in the fracture.
const FIBULA =
  'M237.1,15.4 C239.2,39.1 243.8,65.4 242.5,87.1 C244.5,153.3 245.2,152.1 241.8,187.3 C242.9,193.5 242.1,187.2 243.3,194.7 C246.7,196.3 244.4,193.7 247.8,197.6 C250.5,198 247.6,201.1 247.2,204.7 L252.1,207 L257.3,223.8 L271.5,239.7 C263,231.1 260.3,222.4 260.1,211.8 C263.5,210.1 263.5,209.3 267.1,207.4 L272.7,196.1 C268,166 266.6,135.5 266.9,105.8 C267.8,76.9 267.2,41.7 267.2,8 C258.3,7.5 249.7,8 237.1,15.4 Z';
// Distal fragment: the lateral malleolus below the transsyndesmotic fracture.
const MALLEOLUS =
  'M237.8,203.4 C234.5,215.1 226.4,236.6 226.4,252 C227.7,256.8 229.1,265.2 232.5,269.1 C235.6,265.4 246,263.4 252.7,265.7 L254.1,263.5 C256,259 262.7,247.2 266.9,247.7 L266.5,243.9 C261.2,238.8 257.8,233.9 254.6,226.8 C250.4,224.7 249.9,224.2 247.1,223.1 L246.3,212.1 C243.1,210.4 244,209.9 242.3,209.1 C238.9,209.6 241.6,202.7 237.8,203.4 Z';
// Both edges of the fracture.
const FRACTURE =
  'M238.4,203 L241.7,209.6 L246.8,212.1 L247.6,222.5 L254.6,226.6 L254.6,237.6 L266.7,243.7 M241.8,187.5 L243,194.8 L247.7,196.2 L247.1,204.1 L251.6,206.6 L257.1,223.2 L271.1,239.8';

export function AnklePlate() {
  const { t } = useTranslation();

  return (
    <figure className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
      {/* Schematic for clinical review. */}
      <svg
        viewBox="116 140 374 182"
        role="img"
        aria-label={t('landing.plate.label')}
        className="w-full max-w-[400px] text-[11.5px] lg:w-[400px] lg:shrink-0"
        fill="var(--field-navy)"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Back to front; the navy fill hides what lies behind, as in the original. */}
        <g stroke="currentColor" strokeWidth="1.1" className="text-white/70">
          <path d={CALCANEUS} />
          <path d={TALUS} />
          <path d={TIBIA} />
          <path d={FIBULA} />
          <path d={MALLEOLUS} />
        </g>

        {/* Answers 1 and 2 of the example path: the lateral malleolus, then the transsyndesmotic fracture. */}
        <path d={MALLEOLUS} fill="none" stroke="white" strokeWidth="1.4" className="plate-mark" style={{ '--step': 0 } as React.CSSProperties} />
        <g className="plate-mark" style={{ '--step': 1 } as React.CSSProperties}>
          <path d={MALLEOLUS} fill="white" fillOpacity="0.14" />
          <path d={FRACTURE} fill="none" stroke="white" strokeWidth="1.4" />
        </g>

        <g fill="none" stroke="currentColor" strokeWidth="0.7" className="text-white/50">
          <path d="M222,165 H243" />
          <path d="M214,247 H226" />
          <path d="M388,242 H381" />
          <path d="M388,290 H350" />
        </g>

        <g fill="currentColor">
          <text x="218" y="169" textAnchor="end" className="text-white/60">{t('landing.plate.fibula')}</text>
          <text x="312" y="190" textAnchor="middle" className="text-white/60">{t('landing.plate.tibia')}</text>
          <text x="392" y="294" className="text-white/60">{t('landing.plate.talus')}</text>
          <text x="210" y="251" textAnchor="end" className="font-medium text-white">{t('landing.plate.lateral')}</text>
          <text x="392" y="246" className="text-white/85">{t('landing.plate.medial')}</text>
        </g>
      </svg>
      <figcaption className="text-sm text-white/65 lg:max-w-[30ch] lg:pb-1">
        {t('landing.plate.caption')}{' '}
        <span className="mt-2 block text-xs text-white/55">
          {t('landing.plate.creditPrefix')}{' '}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 hover:decoration-white">
            ‘Weber Classification – latin.svg’
          </a>{' '}
          {t('landing.plate.creditBy')}{' '}
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 hover:decoration-white">
            CC BY 4.0
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
