import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { cn } from '@/lib/utils';
import type { CaseImage, ImageCategory } from '@/types';
import { ImageGrid } from '../components/CaseImageGrid';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  preview: string;
}

interface CaseImagesStepProps {
  existingImages: CaseImage[];
  pendingUploads: PendingUpload[];
  canEdit: boolean;
  caseId?: string;
  onRemovePending: (id: string) => void;
  onDeleteExisting: (imageId: string) => void;
  onDrop: (category: ImageCategory) => (files: File[]) => void;
  onPrev: () => void;
  onNext?: () => void;
}

export function CaseImagesStep({
  existingImages,
  pendingUploads,
  canEdit,
  caseId,
  onRemovePending,
  onDeleteExisting,
  onDrop,
  onPrev,
  onNext,
}: CaseImagesStepProps) {
  const { t } = useTranslation();

  const xrayImages = existingImages.filter((img) => img.category === 'xray');
  const tacImages = existingImages.filter((img) => img.category === 'tac');
  const pendingXray = pendingUploads.filter((u) => u.category === 'xray');
  const pendingTac = pendingUploads.filter((u) => u.category === 'tac');

  const dropzoneConfig = {
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxSize: 10 * 1024 * 1024,
  };

  const xrayDropzone = useDropzone({
    ...dropzoneConfig,
    onDrop: onDrop('xray'),
  });

  const tacDropzone = useDropzone({
    ...dropzoneConfig,
    onDrop: onDrop('tac'),
  });

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.cases.images')}</CardTitle>
          <CardDescription>{t('admin.cases.imagesDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* X-ray Section */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{t('cases.images.xray')}</h3>
              <p className="text-sm tabular-nums text-muted-foreground">
                {xrayImages.length + pendingXray.length} {t('cases.imagesCount')}
              </p>
            </div>

            {/* X-ray Dropzone */}
            {canEdit && (
              <div
                {...xrayDropzone.getRootProps()}
                className={cn(
                  'cursor-pointer rounded-md border border-dashed p-6 transition-colors duration-150 hover:bg-muted',
                  xrayDropzone.isDragActive ? 'border-primary bg-accent' : 'border-input'
                )}
              >
                <input {...xrayDropzone.getInputProps()} />
                <div className="flex items-center justify-center gap-3">
                  <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {xrayDropzone.isDragActive
                        ? t('admin.cases.dropHere')
                        : t('admin.cases.dragOrClick')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.cases.maxFileSize')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* X-ray Images Grid */}
            <ImageGrid
              existingImages={xrayImages}
              pendingUploads={pendingXray}
              onRemovePending={onRemovePending}
              onDeleteExisting={onDeleteExisting}
              canEdit={canEdit}
              caseId={caseId}
            />
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* CT Scan Section */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{t('cases.images.tac')}</h3>
              <p className="text-sm tabular-nums text-muted-foreground">
                {tacImages.length + pendingTac.length} {t('cases.imagesCount')}
              </p>
            </div>

            {/* CT Scan Dropzone */}
            {canEdit && (
              <div
                {...tacDropzone.getRootProps()}
                className={cn(
                  'cursor-pointer rounded-md border border-dashed p-6 transition-colors duration-150 hover:bg-muted',
                  tacDropzone.isDragActive ? 'border-primary bg-accent' : 'border-input'
                )}
              >
                <input {...tacDropzone.getInputProps()} />
                <div className="flex items-center justify-center gap-3">
                  <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {tacDropzone.isDragActive
                        ? t('admin.cases.dropHere')
                        : t('admin.cases.dragOrClick')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('admin.cases.maxFileSize')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CT Scan Images Grid */}
            <ImageGrid
              existingImages={tacImages}
              pendingUploads={pendingTac}
              onRemovePending={onRemovePending}
              onDeleteExisting={onDeleteExisting}
              canEdit={canEdit}
              caseId={caseId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft />
          {t('common.previous')}
        </Button>
        {onNext && (
          <Button onClick={onNext}>
            {t('common.next')}
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
