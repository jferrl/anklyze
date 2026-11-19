import { useTranslation } from 'react-i18next';
import ankle320 from '@/assets/landing/ankle-320.webp';
import ankle640 from '@/assets/landing/ankle-640.webp';
import lateral320 from '@/assets/landing/ankle-lateral-320.webp';
import lateral640 from '@/assets/landing/ankle-lateral-640.webp';

// Pre-rendered stills of the BodyParts3D right ankle the classifier draws (credited in the
// figure's sources and in NOTICE): anterolateral view, yaw 35°, pitch 8°. The second still tints
// the distal fibular fragment up to FRACTURE. Marks below are in the stills' pixel space.
const IMG = { w: 1460, h: 1673 };
const SIZES = '(min-width: 640px) 18rem, 45vw';
const srcSet = (a: string, b: string) => `${a} 320w, ${b} 640w`;

// Syndesmosis: from the tibial plafond up to the top of the tibiofibular contact (23 mm).
const SYND = { top: 420, bottom: 888, x: 80 };
const BRACKET = `M${SYND.x + 18},${SYND.top} H${SYND.x} V${SYND.bottom} H${SYND.x + 18} M0,654 H${SYND.x}`;
// Weber B spiral, from the medial cortex at the plafond (anteroinferior) to the lateral cortex
// about 18 mm up (posterosuperior). The same points clip the tint in the lateral still.
const FRACTURE =
  'M465,853 L438,831 L404,799 L376,766 L349,739 L322,702 L291,667 L263,629 L236,599 L211,569 L186,546 L158,519';

// Leader targets: [x, y] on the still.
const LEFT = { fibula: [275, 203], syndesmosis: [SYND.x, 654], lateral: [220, 1203] } as const;
const RIGHT = { tibia: [910, 263], medial: [1330, 953], talus: [1160, 1190] } as const;

const at = (ms: number) => ({ '--at': `${ms}ms` }) as React.CSSProperties;
const top = (y: number) => ({ top: `${(y / IMG.h) * 100}%` });

/** StepBadge numbers an answer and its mark on the plate; it fills in when that answer lands. */
export function StepBadge({ n, atMs }: { n: number; atMs: number }) {
  return (
    <span className="relative inline-grid size-[18px] shrink-0 place-items-center border border-field-ink/40 text-xs font-semibold tabular-nums text-sheet-muted sm:size-5">
      {n}
      <span aria-hidden className="fig-in absolute -inset-px grid place-items-center bg-field-ink text-sheet" style={at(atMs)}>
        {n}
      </span>
    </span>
  );
}

/** AnklePlate is the rendered ankle of the landing figure; it marks answers 1 and 2 as they land. */
export function AnklePlate({ lateralAt, levelAt }: { lateralAt: number; levelAt: number }) {
  const { t } = useTranslation();
  const leftLabel = 'absolute right-1 flex -translate-y-1/2 items-center gap-1 text-right sm:right-2 sm:gap-1.5';
  const rightLabel = 'absolute left-1 -translate-y-1/2 sm:left-2';
  const leaders = [
    ...[LEFT.fibula, LEFT.lateral].map(([x, y]) => `M0,${y} H${x}`),
    ...Object.values(RIGHT).map(([x, y]) => `M${IMG.w},${y} H${x}`),
  ].join(' ');
  const dots = [LEFT.fibula, LEFT.lateral, ...Object.values(RIGHT)];
  const image = { sizes: SIZES, width: IMG.w, height: IMG.h, alt: '' };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)] text-xs leading-tight text-sheet-ink sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,0.8fr)] sm:text-[15px]">
      <div className="relative">
        <span className={leftLabel} style={top(LEFT.fibula[1])}>{t('landing.figure.fibula')}</span>
        <span className={leftLabel} style={top(LEFT.syndesmosis[1])}>
          {t('landing.figure.syndesmosis')}
          <StepBadge n={2} atMs={levelAt} />
        </span>
        <span className={leftLabel} style={top(LEFT.lateral[1])}>
          {t('landing.figure.lateral')}
          <StepBadge n={1} atMs={lateralAt} />
        </span>
      </div>

      <div className="relative">
        <img {...image} src={ankle640} srcSet={srcSet(ankle320, ankle640)} fetchPriority="high" data-plate-image className="block h-auto w-full" />
        <img
          {...image}
          src={lateral640}
          srcSet={srcSet(lateral320, lateral640)}
          className="fig-in absolute inset-0 block h-auto w-full"
          style={at(lateralAt)}
        />
        <svg
          viewBox={`0 0 ${IMG.w} ${IMG.h}`}
          role="img"
          aria-label={t('landing.figure.label')}
          className="absolute inset-0 size-full overflow-visible"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={leaders} className="stroke-(--sheet-ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <g className="fill-(--sheet-ink)">
            {dots.map(([x, y]) => (
              <circle key={`${x},${y}`} cx={x} cy={y} r="16" />
            ))}
          </g>

          {/* 2: the level in annotation navy, then the fracture itself in ink along its length. */}
          <path d={BRACKET} className="stroke-(--bone-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={BRACKET} className="fig-in stroke-(--hl)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={at(levelAt)} />
          <path d={FRACTURE} pathLength={1} className="fig-draw stroke-(--sheet-ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={at(levelAt + 60)} />
        </svg>
      </div>

      <div className="relative">
        <span className={rightLabel} style={top(RIGHT.tibia[1])}>{t('landing.figure.tibia')}</span>
        <span className={rightLabel} style={top(RIGHT.medial[1])}>{t('landing.figure.medial')}</span>
        <span className={rightLabel} style={top(RIGHT.talus[1])}>{t('landing.figure.talus')}</span>
      </div>
    </div>
  );
}
