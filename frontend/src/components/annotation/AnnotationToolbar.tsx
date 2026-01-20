import { useTranslation } from 'react-i18next';
import {
  MousePointer2,
  MapPin,
  Circle,
  MoveRight,
  Minus,
  Ruler,
  Triangle,
  Type,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import type { ToolType } from '@/types/annotation';
import { ANNOTATION_COLORS } from '@/types/annotation';

interface AnnotationToolbarProps {
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  hasAnnotations: boolean;
  hasSelection: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onClearImage: () => void;
}

const TOOLS: { type: ToolType; icon: typeof MousePointer2; shortcut?: string }[] = [
  { type: 'select', icon: MousePointer2, shortcut: 'V' },
  { type: 'marker', icon: MapPin, shortcut: 'M' },
  { type: 'circle', icon: Circle, shortcut: 'C' },
  { type: 'arrow', icon: MoveRight, shortcut: 'A' },
  { type: 'line', icon: Minus, shortcut: 'L' },
  { type: 'measurement', icon: Ruler, shortcut: 'R' },
  { type: 'angle', icon: Triangle, shortcut: 'G' },
  { type: 'text', icon: Type, shortcut: 'T' },
  { type: 'pan', icon: Hand, shortcut: 'H' },
];

export function AnnotationToolbar({
  activeTool,
  activeColor,
  zoom,
  hasAnnotations,
  hasSelection,
  onToolChange,
  onColorChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onDeleteSelected,
  onClearAll,
  onClearImage,
}: AnnotationToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/50 rounded-lg mb-2">
      {/* Tool buttons */}
      <div className="flex items-center gap-1">
        {TOOLS.map(({ type, icon: Icon, shortcut }) => (
          <Button
            key={type}
            type="button"
            variant={activeTool === type ? 'default' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onToolChange(type)}
            title={`${t(`annotation.tools.${type}`)}${shortcut ? ` (${shortcut})` : ''}`}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color picker */}
      <div className="flex items-center gap-1">
        {ANNOTATION_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform',
              activeColor === color
                ? 'border-foreground scale-110'
                : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onZoomOut}
          title={t('annotation.actions.zoomOut')}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="text-xs font-mono w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onZoomIn}
          title={t('annotation.actions.zoomIn')}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onZoomReset}
          title={t('annotation.actions.zoomFit')}
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {hasSelection && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={onDeleteSelected}
            title={t('annotation.actions.delete')}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="text-xs">{t('annotation.actions.delete')}</span>
          </Button>
        )}

        {hasAnnotations && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onClearAll}
            title={t('annotation.actions.clearAll')}
          >
            <span className="text-xs">{t('annotation.actions.clearAll')}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={onClearImage}
          title={t('annotation.actions.clearImage')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
