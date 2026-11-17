import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';

interface StudyDetailsStepProps {
  title: string;
  description: string;
  isReadOnly: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  titleError?: string | null;
}

export function StudyDetailsStep({
  title,
  description,
  isReadOnly,
  onTitleChange,
  onDescriptionChange,
  titleError,
}: StudyDetailsStepProps) {
  const { t } = useTranslation();

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.studies.details', 'Details')}</CardTitle>
          <CardDescription>{t('admin.studies.detailsDescription', 'Basic study information')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t('admin.studies.titleLabel', 'Title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('admin.studies.titlePlaceholder', 'Enter study title...')}
              disabled={isReadOnly}
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
              {t('admin.studies.descriptionLabel', 'Description')}
              <span className="text-muted-foreground text-xs">({t('common.optional', 'Optional')})</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('admin.studies.descriptionPlaceholder', 'Optional description...')}
              rows={4}
              disabled={isReadOnly}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
