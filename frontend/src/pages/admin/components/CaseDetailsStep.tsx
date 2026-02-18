import { useTranslation } from 'react-i18next';
import {
  FileText,
  ChevronRight,
  Type,
  AlignLeft,
  Calendar,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

export interface CaseDetailsStepProps {
  title: string;
  description: string;
  deadline: string;
  canEdit: boolean;
  canEditAlways: boolean;
  onUpdateField: (field: string, value: string) => void;
  onNext: () => void;
}

export function CaseDetailsStep({
  title,
  description,
  deadline,
  canEdit,
  canEditAlways,
  onUpdateField,
  onNext,
}: CaseDetailsStepProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in">
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.details')}</CardTitle>
              <CardDescription>{t('admin.cases.detailsDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              {t('cases.title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              placeholder={t('admin.cases.titlePlaceholder')}
              disabled={!canEdit}
              className="h-12 text-base"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              {t('cases.description')}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onUpdateField('description', e.target.value)}
              placeholder={t('admin.cases.descriptionPlaceholder')}
              rows={4}
              disabled={!canEditAlways}
              className="resize-none"
            />
          </div>

          {/* Deadline Field */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {t('cases.deadline')}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => onUpdateField('deadline', e.target.value)}
              disabled={!canEditAlways}
              className="h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end mt-6">
        <Button onClick={onNext} className="gap-2">
          {t('common.next')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
