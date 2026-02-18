import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Settings, Target, GitBranch } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Switch } from '../../../components/ui/switch';
import type { ClassificationResult, FractureInput } from '@/types';

export interface CaseSettingsStepProps {
  referenceClassification: ClassificationResult | undefined;
  referenceInput: FractureInput | undefined;
  showReferenceAfterSubmit: boolean;
  allowMultipleResponses: boolean;
  canEdit: boolean;
  onUpdateForm: (updates: Record<string, unknown>) => void;
  onOpenGoldStandard: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CaseSettingsStep({
  referenceClassification,
  referenceInput,
  showReferenceAfterSubmit,
  allowMultipleResponses,
  canEdit,
  onUpdateForm,
  onOpenGoldStandard,
  onPrev,
  onNext,
}: CaseSettingsStepProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in">
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.validationSettings', 'Validation Settings')}</CardTitle>
              <CardDescription>
                {t('admin.cases.validationSettingsDescription', 'Configure how this case validates responses')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reference Classification */}
          <div className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mt-0.5">
                <Target className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {t('admin.cases.referenceClassification', 'Reference Classification (Gold Standard)')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('admin.cases.referenceClassificationDescription',
                    'Set the correct classification to compare against participant responses')}
                </p>
              </div>
            </div>

            {referenceClassification ? (
              <div className="ml-11 space-y-3">
                <div className="p-3 rounded-lg bg-background border border-border/50">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {referenceClassification.danis_weber && (
                      <div>
                        <span className="text-muted-foreground">Danis-Weber:</span>{' '}
                        <span className="font-medium">{referenceClassification.danis_weber.type}</span>
                      </div>
                    )}
                    {referenceClassification.lauge_hansen && (
                      <div>
                        <span className="text-muted-foreground">Lauge-Hansen:</span>{' '}
                        <span className="font-medium">{referenceClassification.lauge_hansen.type}</span>
                      </div>
                    )}
                    {referenceClassification.ao_ota && (
                      <div>
                        <span className="text-muted-foreground">AO/OTA:</span>{' '}
                        <span className="font-medium">{referenceClassification.ao_ota.code}</span>
                      </div>
                    )}
                    {referenceClassification.bartonicek && (
                      <div>
                        <span className="text-muted-foreground">Bartonicek:</span>{' '}
                        <span className="font-medium">{referenceClassification.bartonicek.type}</span>
                      </div>
                    )}
                  </div>
                  {referenceInput && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <GitBranch className="w-3 h-3" />
                        <span>{t('admin.cases.decisionPathConfigured', 'Decision path configured for divergence analysis')}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenGoldStandard}
                    disabled={!canEdit}
                    className="gap-1"
                  >
                    <GitBranch className="w-4 h-4" />
                    {t('admin.cases.changeReference', 'Change')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onUpdateForm({ referenceClassification: undefined, referenceInput: undefined });
                    }}
                    disabled={!canEdit}
                  >
                    <X className="w-4 h-4 mr-1" />
                    {t('admin.cases.clearReference', 'Clear')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="ml-11">
                <Button
                  type="button"
                  onClick={onOpenGoldStandard}
                  disabled={!canEdit}
                  className="gap-2"
                >
                  <Target className="w-4 h-4" />
                  {t('admin.cases.setReference', 'Set Reference Classification')}
                </Button>
              </div>
            )}
          </div>

          {/* Response Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">
              {t('admin.cases.responseOptions', 'Response Options')}
            </h3>

            {/* Allow Multiple Responses */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="allowMultiple" className="font-medium cursor-pointer">
                  {t('admin.cases.allowMultipleResponses', 'Allow Multiple Responses')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.cases.allowMultipleResponsesDescription',
                    'When disabled, each participant can only submit one response')}
                </p>
              </div>
              <Switch
                id="allowMultiple"
                checked={allowMultipleResponses}
                onCheckedChange={(v) => onUpdateForm({ allowMultipleResponses: v })}
                disabled={!canEdit}
              />
            </div>

            {/* Show Reference After Submit */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="showReference" className="font-medium cursor-pointer">
                  {t('admin.cases.showReferenceAfterSubmit', 'Show Reference After Submit')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('admin.cases.showReferenceAfterSubmitDescription',
                    'Display the correct classification after participants submit their response')}
                </p>
              </div>
              <Switch
                id="showReference"
                checked={showReferenceAfterSubmit}
                onCheckedChange={(v) => onUpdateForm({ showReferenceAfterSubmit: v })}
                disabled={!canEdit || !referenceClassification}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          {t('common.previous')}
        </Button>
        <Button onClick={onNext} className="gap-2">
          {t('common.next')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
