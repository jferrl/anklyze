import { useTranslation } from 'react-i18next';

// Adapted from "Weber Classification - latin.svg" by DrFO.Tn, Wikimedia Commons, CC BY 4.0
// (credited in the landing figure's sources and in NOTICE). Changes: only the Weber B panel;
// colour fills, gradients, ligaments, texture marks, the lower calcaneus, the arrow and the label
// removed; bones and cartilage redrawn as flat tint and outline; the talus outline spur and
// the tibial tubercle lobe (hidden under ligaments in the original) smoothed; coordinates rounded
// to 1 decimal. Source units, cropped by the viewBox.
const TIBIA =
  'M288.4,12.4 C288.1,36.7 288.6,59.3 287.3,81 C287.3,103.4 283.8,124.9 281.2,146.7 L273,196.3 C274.6,210 275.8,224 276.9,237.7 L291.6,245.2 C294.1,246.6 297.9,246.7 302.4,246 C307,244.6 311.5,243.7 321.4,242.6 C324,242.4 333.3,245.5 338,250.2 L344.7,253.4 L358.7,256 L366.9,251 L377.7,250.2 C379.4,244.5 379.9,238.5 379.9,232.4 L366,200.9 C354.5,172.3 347.2,141.9 343.2,109.8 C340.1,80.8 338.8,45.7 338.7,12 Z';
const TALUS =
  'M271,262.1 C264,262.6 257.6,264.4 252.6,266.3 C254.3,271.9 262.4,293.4 262.4,293.4 C278,272.8 302.7,276.4 332.7,314 C345.1,318.1 359.8,316.1 358.5,297.5 C350.1,291 341.7,276.7 346.5,274.1 C348.2,264.2 349.2,262.1 352.3,256.1 C356.7,240.5 345.6,254.7 342.7,253.6 C335.7,265.8 336.1,281.2 325.6,272.2 C318,266.7 309,259.7 300.5,258 C290.1,255.5 278.9,263.3 271,262.1 Z';
// Upper calcaneus, cropped by the viewBox; it seats the talus.
const CALCANEUS =
  'M262.1,292.7 C262.5,296 265,296.1 268.9,300.4 C272.5,305.5 266.8,322.1 258.1,322.8 C259.8,328.5 263.3,343.1 263.3,343.1 C278.9,322.5 295.5,311.2 300.7,315.5 C312.5,311.5 318.1,315.5 329.2,337 C327.8,314.4 333.9,317.1 332.6,308 C325.2,298.6 308.8,282.5 304.1,283.4 C301.4,281.7 299,282.5 293.3,279.5 C289.4,279.4 285.3,279.4 279.3,281.4 C276.1,279.7 275.1,284 273.4,283.2 C270,283.7 265.6,288.8 262.1,292.7 Z';
// Articular cartilage of the mortise, between the plafond and the talar dome.
const CARTILAGE =
  'M275.7,236.8 L267.2,244.6 C267.4,249.9 267.6,255.3 269.7,260 C270.8,261.5 271.3,263 275,264.5 L287.4,258.4 C291.7,256.8 296.7,257.8 301.8,257.4 C306.1,259.1 310.2,260.6 314.8,263.8 C318,267.7 322,269.4 325.8,273.9 L330.9,274.9 C332.9,274.2 334.3,273.5 335.2,273 C336.6,267.9 337.8,260.8 343.2,253 C341.9,253.3 332.5,246 325.8,243.5 C319.7,241.3 314.6,242.8 306.3,245.1 C301,245.9 296,247 290.7,245.3 C285.2,243.3 280.9,240.2 275.7,236.8 Z';
// Proximal fibula, ending in the fracture.
const FIBULA =
  'M237.1,15.4 C239.2,39.1 243.8,65.4 242.5,87.1 C244.5,153.3 245.2,152.1 241.8,187.3 C242.9,193.5 242.1,187.2 243.3,194.7 C246.7,196.3 244.4,193.7 247.8,197.6 C250.5,198 247.6,201.1 247.2,204.7 L252.1,207 L257.3,223.8 L271.5,239.7 C263,231.1 260.3,222.4 260.1,211.8 C263.5,210.1 263.5,209.3 267.1,207.4 L272.7,196.1 C268,166 266.6,135.5 266.9,105.8 C267.8,76.9 267.2,41.7 267.2,8 C258.3,7.5 249.7,8 237.1,15.4 Z';
// Distal fragment: the lateral malleolus below the transsyndesmotic fracture.
const MALLEOLUS =
  'M237.8,203.4 C234.5,215.1 226.4,236.6 226.4,252 C227.7,256.8 229.1,265.2 232.5,269.1 C235.6,265.4 246,263.4 252.7,265.7 L254.1,263.5 C256,259 262.7,247.2 266.9,247.7 L266.5,243.9 C261.2,238.8 257.8,233.9 254.6,226.8 C250.4,224.7 249.9,224.2 247.1,223.1 L246.3,212.1 C243.1,210.4 244,209.9 242.3,209.1 C238.9,209.6 241.6,202.7 237.8,203.4 Z';
// Both fracture edges, each from the joint level up to the lateral cortex, the way a Weber B line runs.
const FRACTURE = [
  'M266.7,243.7 L254.6,237.6 L254.6,226.6 L247.6,222.5 L246.8,212.1 L241.7,209.6 L238.4,203',
  'M271.1,239.8 L257.1,223.2 L251.6,206.6 L247.1,204.1 L247.7,196.2 L243,194.8 L241.8,187.5',
];

// Viewport over the source panel; labels sit outside it, positioned in the same units.
const VB = { x: 206, y: 138, w: 192, h: 160 };
// Syndesmosis level: from the tibial plafond up to the top of the tibiofibular contact.
const SYND = { top: 196, bottom: 246, x: 216 };
const BRACKET = `M${SYND.x + 4},${SYND.top} H${SYND.x} V${SYND.bottom} H${SYND.x + 4} M${VB.x},221 H${SYND.x}`;

const at = (ms: number) => ({ '--at': `${ms}ms` }) as React.CSSProperties;
const top = (y: number) => ({ top: `${((y - VB.y) / VB.h) * 100}%` });

/** StepBadge numbers an answer and its mark on the plate; it fills in when that answer lands. */
export function StepBadge({ n, atMs }: { n: number; atMs: number }) {
  return (
    <span className="relative inline-grid size-[18px] shrink-0 place-items-center border border-field-ink/40 text-[11px] font-semibold tabular-nums text-sheet-muted">
      {n}
      <span aria-hidden className="fig-in absolute -inset-px grid place-items-center bg-field-ink text-sheet" style={at(atMs)}>
        {n}
      </span>
    </span>
  );
}

const DOT = 1.7;

/** AnklePlate is the Weber B ankle of the landing figure; it marks answers 1 and 2 as they land. */
export function AnklePlate({ lateralAt, levelAt }: { lateralAt: number; levelAt: number }) {
  const { t } = useTranslation();
  const leftLabel = 'absolute right-1.5 flex -translate-y-1/2 items-center gap-1.5 text-right';
  const rightLabel = 'absolute left-1.5 -translate-y-1/2';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] text-[11px] leading-tight text-sheet-ink sm:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)_minmax(0,1fr)] sm:text-[13px]">
      <div className="relative">
        <span className={leftLabel} style={top(166)}>{t('landing.figure.fibula')}</span>
        <span className={leftLabel} style={top(221)}>
          {t('landing.figure.syndesmosis')}
          <StepBadge n={2} atMs={levelAt} />
        </span>
        <span className={leftLabel} style={top(256)}>
          {t('landing.figure.lateral')}
          <StepBadge n={1} atMs={lateralAt} />
        </span>
      </div>

      <svg
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        role="img"
        aria-label={t('landing.figure.label')}
        className="block w-full"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Back to front; the opaque tint hides what lies behind, as in the original. */}
        <g className="fill-(--bone) stroke-(--bone-line)" strokeWidth="1.5">
          {[CALCANEUS, TALUS].map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={CARTILAGE} className="fill-(--cartilage) stroke-none" />
          {[TIBIA, FIBULA, MALLEOLUS].map((d) => (
            <path key={d} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        {/* 1: the lateral malleolus comes into emphasis. */}
        <path
          d={MALLEOLUS}
          className="fig-in fill-(--hl-fill) stroke-(--hl)"
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
          style={at(lateralAt)}
        />

        {/* 2: the level, then the fracture line along its length. */}
        <g fill="none" strokeWidth="1">
          <path d={BRACKET} className="stroke-(--bone-line)" vectorEffect="non-scaling-stroke" />
          <path
            d={BRACKET}
            className="fig-in stroke-(--hl)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            style={at(levelAt)}
          />
        </g>
        {FRACTURE.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            pathLength={1}
            className="fig-draw stroke-(--hl)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            style={at(levelAt + 60)}
          />
        ))}

        <g fill="none" className="stroke-(--bone-line)" strokeWidth="1">
          <path d={`M${VB.x},166 H255 M${VB.x},256 H236 M${VB.x + VB.w},175 H330 M${VB.x + VB.w},243 H371 M${VB.x + VB.w},284 H336`} vectorEffect="non-scaling-stroke" />
        </g>
        <g className="fill-(--sheet-ink)">
          {[[255, 166], [236, 256], [330, 175], [371, 243], [336, 284]].map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={DOT} />
          ))}
        </g>
      </svg>

      <div className="relative">
        <span className={rightLabel} style={top(175)}>{t('landing.figure.tibia')}</span>
        <span className={rightLabel} style={top(243)}>{t('landing.figure.medial')}</span>
        <span className={rightLabel} style={top(284)}>{t('landing.figure.talus')}</span>
      </div>
    </div>
  );
}
