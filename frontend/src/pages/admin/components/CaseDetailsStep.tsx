import { useTranslation } from 'react-i18next';
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
  titleError?: string | null;
}

export function CaseDetailsStep({
  title,
  description,
  deadline,
  canEdit,
  canEditAlways,
  onUpdateField,
  titleError,
}: CaseDetailsStepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.cases.details')}</CardTitle>
          <CardDescription>{t('admin.cases.detailsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('cases.title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onUpdateField('title', e.target.value)}
              placeholder={t('admin.cases.titlePlaceholder')}
              disabled={!canEdit}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? 'title-error' : undefined}
            />
            {titleError && (
              <p id="title-error" className="text-sm text-destructive">{titleError}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">
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
            <Label htmlFor="deadline">
              {t('cases.deadline')}
              <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => onUpdateField('deadline', e.target.value)}
              disabled={!canEditAlways}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
