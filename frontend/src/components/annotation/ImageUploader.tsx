import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement, url: string) => void;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/tiff',
];

export function ImageUploader({ onImageLoad, onError }: ImageUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadImage = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        onError(t('annotation.errors.invalidFormat'));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        onError(t('annotation.errors.fileTooLarge'));
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        onImageLoad(img, url);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        onError(t('annotation.errors.loadFailed'));
      };

      img.src = url;
    },
    [onImageLoad, onError, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        loadImage(file);
      }
    },
    [loadImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        loadImage(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [loadImage]
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-muted">
          {isDragging ? (
            <Upload className="h-8 w-8 text-primary" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">
            {t('annotation.upload.dragDrop')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('annotation.upload.formats')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('annotation.upload.maxSize')}
          </p>
        </div>

        <Button type="button" variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          {t('annotation.upload.title')}
        </Button>
      </div>
    </div>
  );
}
