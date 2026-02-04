import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';

/**
 * Image data structure
 */
export interface ImageData {
  id: string;
  url: string;
  category: 'xray' | 'ct';
  filename: string;
  size: number;
}

/**
 * Form data for the Images step
 */
export interface ImagesFormData {
  xrayImages: ImageData[];
  ctImages: ImageData[];
}

/**
 * Props for the ImagesStep component
 */
export interface ImagesStepProps {
  /** Current form data */
  formData: ImagesFormData;

  /** Callback when form data changes */
  onChange: (data: Partial<ImagesFormData>) => void;

  /** Callback for file upload */
  onUpload: (files: File[], category: 'xray' | 'ct') => Promise<void>;

  /** Callback to remove an image */
  onRemove: (imageId: string, category: 'xray' | 'ct') => void;

  /** Whether the form is disabled */
  disabled?: boolean;

  /** Custom CSS class */
  className?: string;
}

/**
 * ImagesStep component
 *
 * Step 3 of the case editor: Image upload and categorization interface
 *
 * Note: This is a simplified placeholder. Full implementation should include:
 * - ImageUploader component with drag-and-drop
 * - ImagePreviewGrid component
 * - Category selection
 * - Upload progress indicators
 *
 * @example
 * ```tsx
 * <ImagesStep
 *   formData={images}
 *   onChange={(updates) => setImages({ ...images, ...updates })}
 *   onUpload={handleImageUpload}
 *   onRemove={handleImageRemove}
 *   disabled={!canEdit}
 * />
 * ```
 */
export function ImagesStep({
  formData,
  onChange: _onChange,
  onUpload: _onUpload,
  onRemove: _onRemove,
  disabled: _disabled = false,
  className = '',
}: ImagesStepProps) {
  const { t } = useTranslation();

  return (
    <div className={`animate-fade-in ${className}`}>
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Images className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.images')}</CardTitle>
              <CardDescription>
                {t('admin.cases.imagesDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* TODO: Implement ImageUploader and ImagePreviewGrid components */}
          <div className="text-center p-8 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">
              Image upload interface to be implemented
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              X-ray images: {formData.xrayImages.length} | CT images:{' '}
              {formData.ctImages.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
