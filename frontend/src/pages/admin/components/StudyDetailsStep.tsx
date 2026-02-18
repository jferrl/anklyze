import { useTranslation } from 'react-i18next';
import { FileText, Type, AlignLeft } from 'lucide-react';
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
}

export function StudyDetailsStep({
  title,
  description,
  isReadOnly,
  onTitleChange,
  onDescriptionChange,
}: StudyDetailsStepProps) {
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
              <CardTitle>{t('admin.studies.details', 'Details')}</CardTitle>
              <CardDescription>{t('admin.studies.detailsDescription', 'Basic study information')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Field */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              {t('admin.studies.titleLabel', 'Title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t('admin.studies.titlePlaceholder', 'Enter study title...')}
              disabled={isReadOnly}
              className="h-12 text-base"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
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
