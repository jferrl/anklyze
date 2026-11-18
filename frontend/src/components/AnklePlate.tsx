import { useTranslation } from 'react-i18next';
import { CALCANEUS, FIBULA, FRACTURE, MALLEOLUS, TALUS, TIBIA } from './anatomy/frontBones';

const SOURCE_URL = 'https://commons.wikimedia.org/wiki/File:Weber_Classification_-_latin.svg';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

const at = (ms: number) => ({ '--at': `${ms}ms` }) as React.CSSProperties;

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
        {/* Drawn once on load, pen order: tibia, fibula and its malleolus, talus, calcaneus (--at). */}
        <g stroke="currentColor" strokeWidth="1.1" className="text-white/70">
          <path d={CALCANEUS} pathLength={1} className="plate-draw" style={at(400)} />
          <path d={TALUS} pathLength={1} className="plate-draw" style={at(300)} />
          <path d={TIBIA} pathLength={1} className="plate-draw" style={at(0)} />
          <path d={FIBULA} pathLength={1} className="plate-draw" style={at(100)} />
          <path d={MALLEOLUS} pathLength={1} className="plate-draw" style={at(200)} />
        </g>

        {/* Answers 1 and 2 of the example path, in step with .path-answer: the lateral malleolus,
            then the transsyndesmotic fracture and its fragment. */}
        <path d={MALLEOLUS} fill="white" fillOpacity="0.14" className="plate-fade" style={at(840)} />
        <path d={MALLEOLUS} fill="none" stroke="white" strokeWidth="1.4" pathLength={1} className="plate-draw" style={at(600)} />
        <path d={FRACTURE} fill="none" stroke="white" strokeWidth="1.4" pathLength={1} className="plate-draw" style={at(720)} />

        <g fill="none" stroke="currentColor" strokeWidth="0.7" className="plate-fade text-white/50" style={at(960)}>
          <path d="M222,165 H243" />
          <path d="M214,247 H226" />
          <path d="M388,242 H381" />
          <path d="M388,290 H350" />
        </g>

        <g fill="currentColor" className="plate-fade" style={at(960)}>
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
