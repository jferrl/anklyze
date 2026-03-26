import { useTranslation } from 'react-i18next';
import { FileText, Images, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'details' | 'images';

interface CaseEditorStepperProps {
  steps: Step[];
  isEditing: boolean;
  currentStep: Step;
  title: string;
  totalImages: number;
  onStepClick: (step: Step) => void;
}

export function CaseEditorStepper({ steps, currentStep, title, totalImages, onStepClick }: CaseEditorStepperProps) {
  const { t } = useTranslation();
  const currentStepIndex = steps.indexOf(currentStep);

  const getStatus = (step: Step) => {
    const idx = steps.indexOf(step);
    if (idx < currentStepIndex) return 'completed';
    if (idx === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const stepConfig: Record<Step, { icon: React.ElementType; label: string }> = {
    details: { icon: FileText, label: t('admin.cases.details') },
    images: { icon: Images, label: t('admin.cases.images') },
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStatus(step);
          const { icon: Icon, label } = stepConfig[step];
          const isLast = index === steps.length - 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <button
                onClick={() => onStepClick(step)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                  status === 'current' && 'bg-primary/10 ring-2 ring-primary/20',
                  status === 'completed' && 'bg-emerald-500/10 hover:bg-emerald-500/15',
                  status === 'upcoming' && 'opacity-50 hover:opacity-70'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                  status === 'current' && 'bg-primary text-primary-foreground',
                  status === 'completed' && 'bg-emerald-500 text-white',
                  status === 'upcoming' && 'bg-muted text-muted-foreground'
                )}>
                  {status === 'completed' ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="hidden sm:block text-left">
                  <p className={cn(
                    'text-sm font-medium',
                    status === 'current' && 'text-primary',
                    status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
                    status === 'upcoming' && 'text-muted-foreground'
                  )}>{label}</p>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    {status === 'completed'
                      ? step === 'details' ? (title || '-')
                        : step === 'images' ? `${totalImages} ${t('cases.imagesCount')}`
                        : '-'
                      : '-'}
                  </p>
                </div>
              </button>
              {!isLast && (
                <div className={cn('flex-1 h-0.5 mx-2 rounded-full transition-colors',
                  status === 'completed' ? 'bg-emerald-500' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
