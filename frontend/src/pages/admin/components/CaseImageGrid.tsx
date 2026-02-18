import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  X,
  Image as ImageIcon,
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

  if (existingImages.length === 0 && pendingUploads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">{t('admin.cases.noImages')}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t('admin.cases.dragOrClick')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {/* Existing images */}
      {existingImages.map((image, index) => {
        if (!imageUrls[image.id]) {
          fetchImageUrl(image);
        }
        return (
          <div
            key={image.id}
            className="relative group animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="aspect-square rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 transition-all group-hover:ring-primary/30 group-hover:shadow-lg">
              {imageUrls[image.id] ? (
                <img
                  src={imageUrls[image.id]}
                  alt={image.filename}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={() => onDeleteExisting(image.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}

      {/* Pending uploads */}
      {pendingUploads.map((upload, index) => (
        <div
          key={upload.id}
          className="relative group animate-fade-in"
          style={{ animationDelay: `${(existingImages.length + index) * 50}ms` }}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-muted ring-2 ring-dashed ring-primary/50">
            <img
              src={upload.preview}
              alt="Pending upload"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <Badge className="bg-primary/90 text-primary-foreground shadow-lg">
                <Upload className="w-3 h-3 mr-1" />
                {t('admin.cases.pending')}
              </Badge>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 shadow-lg"
            onClick={() => onRemovePending(upload.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
