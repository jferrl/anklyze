import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { caseApi } from '@/services';
import type { CaseImage } from '@/types';

interface PendingUpload {
  id: string;
  file: File;
  category: string;
  preview: string;
}

export interface ImageGridProps {
  existingImages: CaseImage[];
  pendingUploads: PendingUpload[];
  onRemovePending: (id: string) => void;
  onDeleteExisting: (imageId: string) => void;
  canEdit: boolean;
  caseId?: string;
}

export function ImageGrid({
  existingImages,
  pendingUploads,
  onRemovePending,
  onDeleteExisting,
  canEdit,
  caseId,
}: ImageGridProps) {
  const { t } = useTranslation();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fetchImageUrl = async (image: CaseImage) => {
    if (!caseId || imageUrls[image.id]) return;
    try {
      const url = await caseApi.getAdminImageUrl(caseId, image.id);
      setImageUrls((prev) => ({ ...prev, [image.id]: url }));
    } catch (error) {
      console.error('Failed to fetch image URL:', error);
    }
  };

  // The section's count and dropzone already say there are no images.
  if (existingImages.length === 0 && pendingUploads.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {/* Existing images */}
      {existingImages.map((image) => {
        if (!imageUrls[image.id]) {
          fetchImageUrl(image);
        }
        return (
          <div
            key={image.id}
            className="group relative"
          >
            <div className="aspect-square overflow-hidden rounded-md border bg-muted">
              {imageUrls[image.id] ? (
                <img
                  src={imageUrls[image.id]}
                  alt={image.filename}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {canEdit && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onDeleteExisting(image.id)}
                aria-label={t('admin.cases.deleteImage')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}

      {/* Pending uploads */}
      {pendingUploads.map((upload) => (
        <div
          key={upload.id}
          className="relative"
        >
          <div className="relative aspect-square overflow-hidden rounded-md border border-dashed border-primary bg-muted">
            <img
              src={upload.preview}
              alt={t('admin.cases.pendingUpload')}
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Badge>
                <Upload />
                {t('admin.cases.pending')}
              </Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => onRemovePending(upload.id)}
            aria-label={t('admin.cases.removeUpload')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
