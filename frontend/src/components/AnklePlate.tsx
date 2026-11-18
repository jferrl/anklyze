import { useTranslation } from 'react-i18next';
import ankle320 from '@/assets/landing/ankle-320.webp';
import ankle640 from '@/assets/landing/ankle-640.webp';
import lateral320 from '@/assets/landing/ankle-lateral-320.webp';
import lateral640 from '@/assets/landing/ankle-lateral-640.webp';

// Pre-rendered stills of the BodyParts3D right ankle the classifier draws (credited in the
// figure's sources and in NOTICE): anterolateral view, yaw 35°, pitch 8°. The second still adds
// the lateral malleolus tint. Marks below are in the stills' pixel space, 1520 x 1420.
const IMG = { w: 1520, h: 1420 };
const SIZES = '(min-width: 640px) 16rem, 40vw';
const srcSet = (a: string, b: string) => `${a} 320w, ${b} 640w`;

// Syndesmosis: from the tibial plafond up to the top of the tibiofibular contact (23 mm).
const SYND = { top: 217, bottom: 685, x: 110 };
const BRACKET = `M${SYND.x + 18},${SYND.top} H${SYND.x} V${SYND.bottom} H${SYND.x + 18} M0,451 H${SYND.x}`;
// Weber B spiral line on the fibula: low anterior (at the plafond) to high posterior.
const FRACTURE = 'M492,640 C430,600 300,470 196,318';

// Leader targets: [x, y] on the still.
const LEFT = { fibula: [309, 142], syndesmosis: [SYND.x, 451], lateral: [250, 1000] } as const;
const RIGHT = { tibia: [930, 200], medial: [1395, 600], talus: [1110, 1120] } as const;

const at = (ms: number) => ({ '--at': `${ms}ms` }) as React.CSSProperties;
const top = (y: number) => ({ top: `${(y / IMG.h) * 100}%` });

/** StepBadge numbers an answer and its mark on the plate; it fills in when that answer lands. */
export function StepBadge({ n, atMs }: { n: number; atMs: number }) {
  return (
    <span className="relative inline-grid size-5 shrink-0 place-items-center border border-field-ink/40 text-xs font-semibold tabular-nums text-sheet-muted">
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
  const leftLabel = 'absolute right-2 flex -translate-y-1/2 items-center gap-1.5 text-right';
  const rightLabel = 'absolute left-2 -translate-y-1/2';
  const leaders = [
    ...Object.values(LEFT).filter(([x]) => x !== SYND.x).map(([x, y]) => `M0,${y} H${x}`),
    ...Object.values(RIGHT).map(([x, y]) => `M${IMG.w},${y} H${x}`),
  ].join(' ');
  const dots = [LEFT.fibula, LEFT.lateral, ...Object.values(RIGHT)];

  return (
    <div className="landing-plate grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,1fr)] text-xs leading-tight text-sheet-ink sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] sm:text-sm">
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
        <img
          src={ankle640}
          srcSet={srcSet(ankle320, ankle640)}
          sizes={SIZES}
          width={IMG.w}
          height={IMG.h}
          alt=""
          fetchPriority="high"
          data-plate-image
          className="block h-auto w-full"
        />
        <img
          src={lateral640}
          srcSet={srcSet(lateral320, lateral640)}
          sizes={SIZES}
          width={IMG.w}
          height={IMG.h}
          alt=""
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
          {/* A paper halo under each leader keeps it legible where it crosses bone. */}
          <path d={leaders} className="stroke-(--plate-halo)" strokeWidth="3.5" vectorEffect="non-scaling-stroke" />
          <path d={leaders} className="stroke-(--bone-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

          {/* 2: the level, then the fracture line along its length. */}
          <path d={BRACKET} className="stroke-(--bone-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={BRACKET} className="fig-in stroke-(--hl)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" style={at(levelAt)} />
          <path d={FRACTURE} pathLength={1} className="fig-draw stroke-(--plate-halo)" strokeWidth="5" vectorEffect="non-scaling-stroke" style={at(levelAt + 60)} />
          <path d={FRACTURE} pathLength={1} className="fig-draw stroke-(--hl)" strokeWidth="2.25" vectorEffect="non-scaling-stroke" style={at(levelAt + 60)} />

          <g className="fill-(--sheet-ink) stroke-(--plate-halo)" strokeWidth="1.5">
            {dots.map(([x, y]) => (
              <circle key={`${x},${y}`} cx={x} cy={y} r="16" />
            ))}
          </g>
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
