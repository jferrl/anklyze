import { useTranslation } from 'react-i18next';
import { Loader2, Plus, PlusCircle, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { cn } from '@/lib/utils';
import type { Case, CaseStatus } from '@/types';

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

function getCaseStatusBadge(status: CaseStatus, t: (key: string) => string) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="text-xs">{t('cases.status.draft')}</Badge>;
    case 'published':
      return <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">{t('cases.status.published')}</Badge>;
    case 'closed':
      return <Badge variant="secondary" className="text-xs">{t('cases.status.closed')}</Badge>;
  }
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
    <div className="animate-fade-in">
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>{t('admin.studies.cases', 'Study Cases')}</CardTitle>
              <CardDescription>
                {t('admin.studies.casesDesc', 'Add published cases to this study for multi-rater analysis')}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {totalCases} {totalCases === 1 ? t('admin.studies.case') : t('admin.studies.cases_plural')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add case form - only for draft studies */}
          {canEdit && (
            <div className="flex gap-3 mb-6">
              <Select
                value={selectedCaseId}
                onValueChange={onSelectCase}
              >
                <SelectTrigger className="flex-1 h-12">
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
                className="h-12 gap-2"
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
                  className="h-12 gap-2"
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
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                {t('admin.studies.noCases', 'No cases in this study yet')}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t('admin.studies.addCasesHint', 'Add published cases to get started')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {studyCases.map((caseItem, index) => (
                <div
                  key={caseItem.id}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl',
                    'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50',
                    'transition-all duration-200 group'
                  )}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary font-medium text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {caseItem.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {getCaseStatusBadge(caseItem.status, t)}
                      <span className="text-xs text-muted-foreground">
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
                      className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
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
