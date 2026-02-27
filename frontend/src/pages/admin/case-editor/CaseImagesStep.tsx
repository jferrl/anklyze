import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import {
  Images,
  ChevronLeft,
  ChevronRight,
  Radio,
  Scan,
} from 'lucide-react';
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
    <div className="animate-fade-in">
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Images className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.images')}</CardTitle>
              <CardDescription>{t('admin.cases.imagesDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* X-ray Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{t('cases.images.xray')}</h3>
                <p className="text-sm text-muted-foreground">
                  {xrayImages.length + pendingXray.length} {t('cases.imagesCount')}
                </p>
              </div>
            </div>

            {/* X-ray Dropzone */}
            {canEdit && (
              <div
                {...xrayDropzone.getRootProps()}
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300',
                  'hover:border-blue-500/50 hover:bg-blue-500/5',
                  xrayDropzone.isDragActive
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : 'border-muted-foreground/25'
                )}
              >
                <input {...xrayDropzone.getInputProps()} />
                <div className="flex items-center justify-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                    xrayDropzone.isDragActive ? 'bg-blue-500/20 scale-110' : 'bg-muted'
                  )}>
                    <Radio className={cn(
                      'w-6 h-6 transition-colors',
                      xrayDropzone.isDragActive ? 'text-blue-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">
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
          <div className="border-t border-border/50" />

          {/* CT Scan Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{t('cases.images.tac')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tacImages.length + pendingTac.length} {t('cases.imagesCount')}
                </p>
              </div>
            </div>

            {/* CT Scan Dropzone */}
            {canEdit && (
              <div
                {...tacDropzone.getRootProps()}
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300',
                  'hover:border-emerald-500/50 hover:bg-emerald-500/5',
                  tacDropzone.isDragActive
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : 'border-muted-foreground/25'
                )}
              >
                <input {...tacDropzone.getInputProps()} />
                <div className="flex items-center justify-center gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                    tacDropzone.isDragActive ? 'bg-emerald-500/20 scale-110' : 'bg-muted'
                  )}>
                    <Scan className={cn(
                      'w-6 h-6 transition-colors',
                      tacDropzone.isDragActive ? 'text-emerald-500' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">
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
        <Button variant="outline" onClick={onPrev} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          {t('common.previous')}
        </Button>
        {onNext && (
          <Button onClick={onNext} className="gap-2">
            {t('common.next')}
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
