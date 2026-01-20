import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotations } from '@/hooks/useAnnotations';
import { ImageUploader } from './ImageUploader';
import { AnnotationToolbar } from './AnnotationToolbar';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

export function ImageAnnotator() {
  const { t } = useTranslation();
  const {
    state,
    setImage,
    clearImage,
    addAnnotation,
    updateAnnotation,
    selectAnnotation,
    setTool,
    setColor,
    setZoom,
    setStagePosition,
    clearAll,
    deleteSelected,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useAnnotations();

  const [error, setError] = useState<string | null>(null);

  // Handle image load
  const handleImageLoad = useCallback(
    (image: HTMLImageElement, url: string) => {
      setImage(image, url);
      setError(null);
    },
    [setImage]
  );

  // Handle error
  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  // Handle clear image with confirmation
  const handleClearImage = useCallback(() => {
    if (state.annotations.length > 0) {
      if (confirm(t('annotation.confirm.clearImage'))) {
        clearImage();
      }
    } else {
      clearImage();
    }
  }, [state.annotations.length, clearImage, t]);

  // Handle clear all with confirmation
  const handleClearAll = useCallback(() => {
    if (confirm(t('annotation.confirm.clearAll'))) {
      clearAll();
    }
  }, [clearAll, t]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!state.image) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'm':
          setTool('marker');
          break;
        case 'c':
          setTool('circle');
          break;
        case 'a':
          setTool('arrow');
          break;
        case 'l':
          setTool('line');
          break;
        case 'r':
          setTool('measurement');
          break;
        case 'g':
          setTool('angle');
          break;
        case 't':
          setTool('text');
          break;
        case 'h':
          setTool('pan');
          break;
        case 'delete':
        case 'backspace':
          if (state.selectedId) {
            e.preventDefault();
            deleteSelected();
          }
          break;
        case '=':
        case '+':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            resetZoom();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.image,
    state.selectedId,
    setTool,
    deleteSelected,
    zoomIn,
    zoomOut,
    resetZoom,
  ]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (state.imageUrl) {
        URL.revokeObjectURL(state.imageUrl);
      }
    };
  }, [state.imageUrl]);

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!state.image ? (
        <ImageUploader onImageLoad={handleImageLoad} onError={handleError} />
      ) : (
        <>
          <AnnotationToolbar
            activeTool={state.activeTool}
            activeColor={state.activeColor}
            zoom={state.zoom}
            hasAnnotations={state.annotations.length > 0}
            hasSelection={state.selectedId !== null}
            onToolChange={setTool}
            onColorChange={setColor}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={resetZoom}
            onDeleteSelected={deleteSelected}
            onClearAll={handleClearAll}
            onClearImage={handleClearImage}
          />

          <AnnotationCanvas
            image={state.image}
            annotations={state.annotations}
            selectedId={state.selectedId}
            activeTool={state.activeTool}
            activeColor={state.activeColor}
            zoom={state.zoom}
            stagePosition={state.stagePosition}
            onAddAnnotation={addAnnotation}
            onUpdateAnnotation={updateAnnotation}
            onSelectAnnotation={selectAnnotation}
            onZoomChange={setZoom}
            onPositionChange={setStagePosition}
          />

          <p className="text-xs text-muted-foreground text-center">
            {t('form.keyboardHint')} | V/M/C/A/L/R/G/T/H
          </p>
        </>
      )}
    </div>
  );
}
