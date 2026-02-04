import { useTranslation } from 'react-i18next';
import { FileText, Type, AlignLeft, Calendar } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Input,
  Textarea,
} from '@/components/ui';

/**
 * Form data for the Details step
 */
export interface DetailsFormData {
  title: string;
  description: string;
  deadline: string;
}

/**
 * Props for the DetailsStep component
 */
export interface DetailsStepProps {
  /** Current form data */
  formData: DetailsFormData;

  /** Callback when form data changes */
  onChange: (data: Partial<DetailsFormData>) => void;

  /** Whether the form is disabled */
  disabled?: boolean;

  /** Custom CSS class */
  className?: string;
}

/**
 * DetailsStep component
 *
 * Step 1 of the case editor: Case details form (title, description, deadline)
 *
 * @example
 * ```tsx
 * <DetailsStep
 *   formData={details}
 *   onChange={(updates) => setDetails({ ...details, ...updates })}
 *   disabled={!canEdit}
 * />
 * ```
 */
export function DetailsStep({
  formData,
  onChange,
  disabled = false,
  className = '',
}: DetailsStepProps) {
  const { t } = useTranslation();

  return (
    <div className={`animate-fade-in ${className}`}>
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.details')}</CardTitle>
              <CardDescription>
                {t('admin.cases.detailsDescription')}
              </CardDescription>
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
              value={formData.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder={t('admin.cases.titlePlaceholder')}
              disabled={disabled}
              className="h-12 text-base"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              {t('cases.description')}
              <span className="text-muted-foreground text-xs">
                ({t('common.optional')})
              </span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder={t('admin.cases.descriptionPlaceholder')}
              rows={4}
              disabled={disabled}
              className="resize-none"
            />
          </div>

          {/* Deadline Field */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {t('cases.deadline')}
              <span className="text-muted-foreground text-xs">
                ({t('common.optional')})
              </span>
            </Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => onChange({ deadline: e.target.value })}
              disabled={disabled}
              className="h-12"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
