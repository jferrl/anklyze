import { useTranslation } from 'react-i18next';
import { Loader2, Plus, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { StatusBadge } from './StatusBadge';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { Case } from '@/types';

interface StudyCasesStepProps {
  studyCases: Case[];
  availableCases: Case[];
  selectedCaseId: string;
  canEdit: boolean;
  isAddingCase: boolean;
  isAddingAll: boolean;
  isRemovingCase: boolean;
  onSelectCase: (id: string) => void;
  onAddCase: () => void;
  onAddAllCases: () => void;
  onRemoveCase: (id: string) => void;
  studyId?: string;
}

export function StudyCasesStep({
  studyCases,
  availableCases,
  selectedCaseId,
  canEdit,
  isAddingCase,
  isAddingAll,
  isRemovingCase,
  onSelectCase,
  onAddCase,
  onAddAllCases,
  onRemoveCase,
  studyId,
}: StudyCasesStepProps) {
  const { t } = useTranslation();

  const totalCases = studyCases.length;

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.studies.cases', 'Study Cases')}</CardTitle>
          <CardDescription>
            {t('admin.studies.casesDesc', 'Add published cases to this study for multi-rater analysis')}
          </CardDescription>
          <CardAction className="text-sm tabular-nums text-muted-foreground">
            {totalCases} {totalCases === 1 ? t('admin.studies.case') : t('admin.studies.cases_plural')}
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Add case form - only for draft studies */}
          {canEdit && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <Select
                value={selectedCaseId}
                onValueChange={onSelectCase}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('admin.studies.selectCase', 'Select a case to add...')} />
                </SelectTrigger>
                <SelectContent>
                  {availableCases.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {t('admin.studies.noCasesAvailable', 'No published cases available')}
                    </div>
                  ) : (
                    availableCases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={onAddCase}
                disabled={!selectedCaseId || !studyId || isAddingCase || isAddingAll}
              >
                {isAddingCase ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {t('common.add', 'Add')}
              </Button>
              {availableCases.length > 0 && (
                <Button
                  variant="outline"
                  onClick={onAddAllCases}
                  disabled={!studyId || isAddingCase || isAddingAll}
                >
                  {isAddingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  {t('admin.studies.addAllCases', 'Add all')}
                </Button>
              )}
            </div>
          )}

          {/* Cases list */}
          {totalCases === 0 ? (
            <div className="border-t py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                {t('admin.studies.noCases', 'No cases in this study yet')}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('admin.studies.addCasesHint', 'Add published cases to get started')}
              </p>
            </div>
          ) : (
            <div className="divide-y border-t">
              {studyCases.map((caseItem, index) => (
                <div key={caseItem.id} className="flex items-center gap-3 py-3">
                  <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {caseItem.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={caseItem.status} label={t(`cases.status.${caseItem.status}`)} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {caseItem.response_count} {t('admin.studies.responses')}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveCase(caseItem.id)}
                      disabled={isRemovingCase}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {isRemovingCase ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
