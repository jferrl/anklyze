import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Arrow, Line, Text, Group } from 'react-konva';
import type Konva from 'konva';
import type {
  Annotation,
  ToolType,
  MarkerAnnotation,
  CircleAnnotation,
  ArrowAnnotation,
  LineAnnotation,
  MeasurementAnnotation,
  AngleAnnotation,
  TextAnnotation,
} from '@/types/annotation';
import {
  DEFAULT_STROKE_WIDTH,
  DEFAULT_FONT_SIZE,
} from '@/types/annotation';

interface AnnotationCanvasProps {
  image: HTMLImageElement;
  annotations: Annotation[];
  selectedId: string | null;
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  stagePosition: { x: number; y: number };
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onSelectAnnotation: (id: string | null) => void;
  onZoomChange: (zoom: number) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}

// Helper to calculate distance between two points
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Helper to calculate angle between three points (vertex in the middle)
function calculateAngle(
  x1: number, y1: number,
  vx: number, vy: number,
  x2: number, y2: number
): number {
  const angle1 = Math.atan2(y1 - vy, x1 - vx);
  const angle2 = Math.atan2(y2 - vy, x2 - vx);
  let angle = Math.abs(angle1 - angle2) * (180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

export function AnnotationCanvas({
  image,
  annotations,
  selectedId,
  activeTool,
  activeColor,
  zoom,
  stagePosition,
  onAddAnnotation,
  onUpdateAnnotation,
  onSelectAnnotation,
  onZoomChange,
  onPositionChange,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempAnnotation, setTempAnnotation] = useState<Annotation | null>(null);
  const [anglePoints, setAnglePoints] = useState<number[]>([]);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height: Math.max(height, 400) });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stagePosition.x) / oldScale,
        y: (pointer.y - stagePosition.y) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));

      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };

      onZoomChange(clampedScale);
      onPositionChange(newPos);
    },
    [zoom, stagePosition, onZoomChange, onPositionChange]
  );

  // Get pointer position relative to stage
  const getRelativePointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stagePosition.x) / zoom,
      y: (pointer.y - stagePosition.y) / zoom,
    };
  }, [zoom, stagePosition]);

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // If clicking on stage background (not an annotation)
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';

      if (clickedOnEmpty) {
        onSelectAnnotation(null);
      }

      if (activeTool === 'select' || activeTool === 'pan') return;

      const pos = getRelativePointerPosition();
      if (!pos) return;

      if (activeTool === 'marker') {
        const annotation: MarkerAnnotation = {
          id: crypto.randomUUID(),
          type: 'marker',
          color: activeColor,
          x: pos.x,
          y: pos.y,
        };
        onAddAnnotation(annotation);
        return;
      }

      if (activeTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          const annotation: TextAnnotation = {
            id: crypto.randomUUID(),
            type: 'text',
            color: activeColor,
            x: pos.x,
            y: pos.y,
            text,
            fontSize: DEFAULT_FONT_SIZE,
          };
          onAddAnnotation(annotation);
        }
        return;
      }

      if (activeTool === 'angle') {
        const newPoints = [...anglePoints, pos.x, pos.y];
        setAnglePoints(newPoints);

        if (newPoints.length === 6) {
          // All three points collected
          const angleDegrees = calculateAngle(
            newPoints[0], newPoints[1],
            newPoints[2], newPoints[3],
            newPoints[4], newPoints[5]
          );
          const annotation: AngleAnnotation = {
            id: crypto.randomUUID(),
            type: 'angle',
            color: activeColor,
            x: newPoints[2],
            y: newPoints[3],
            points: newPoints as [number, number, number, number, number, number],
            strokeWidth: DEFAULT_STROKE_WIDTH,
            angleDegrees,
          };
          onAddAnnotation(annotation);
          setAnglePoints([]);
        }
        return;
      }

      // Start drawing for other tools
      setIsDrawing(true);
      setDrawStart(pos);

      // Create temp annotation
      const baseAnnotation = {
        id: 'temp',
        color: activeColor,
        x: pos.x,
        y: pos.y,
      };

      if (activeTool === 'circle') {
        setTempAnnotation({
          ...baseAnnotation,
          type: 'circle',
          radius: 0,
          strokeWidth: DEFAULT_STROKE_WIDTH,
        } as CircleAnnotation);
      } else if (activeTool === 'arrow') {
        setTempAnnotation({
          ...baseAnnotation,
          type: 'arrow',
          points: [pos.x, pos.y, pos.x, pos.y],
          strokeWidth: DEFAULT_STROKE_WIDTH,
        } as ArrowAnnotation);
      } else if (activeTool === 'line') {
        setTempAnnotation({
          ...baseAnnotation,
          type: 'line',
          points: [pos.x, pos.y, pos.x, pos.y],
          strokeWidth: DEFAULT_STROKE_WIDTH,
        } as LineAnnotation);
      } else if (activeTool === 'measurement') {
        setTempAnnotation({
          ...baseAnnotation,
          type: 'measurement',
          points: [pos.x, pos.y, pos.x, pos.y],
          strokeWidth: DEFAULT_STROKE_WIDTH,
          pixelDistance: 0,
        } as MeasurementAnnotation);
      }
    },
    [activeTool, activeColor, anglePoints, getRelativePointerPosition, onAddAnnotation, onSelectAnnotation]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(() => {
    if (!isDrawing || !drawStart || !tempAnnotation) return;

    const pos = getRelativePointerPosition();
    if (!pos) return;

    if (tempAnnotation.type === 'circle') {
      const radius = calculateDistance(drawStart.x, drawStart.y, pos.x, pos.y);
      setTempAnnotation({ ...tempAnnotation, radius });
    } else if (tempAnnotation.type === 'arrow' || tempAnnotation.type === 'line') {
      setTempAnnotation({
        ...tempAnnotation,
        points: [drawStart.x, drawStart.y, pos.x, pos.y],
      });
    } else if (tempAnnotation.type === 'measurement') {
      const distance = calculateDistance(drawStart.x, drawStart.y, pos.x, pos.y);
      setTempAnnotation({
        ...tempAnnotation,
        points: [drawStart.x, drawStart.y, pos.x, pos.y],
        pixelDistance: distance,
      });
    }
  }, [isDrawing, drawStart, tempAnnotation, getRelativePointerPosition]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !tempAnnotation) {
      setIsDrawing(false);
      return;
    }

    // Only add if the shape has some size
    let shouldAdd = false;

    if (tempAnnotation.type === 'circle' && tempAnnotation.radius > 5) {
      shouldAdd = true;
    } else if (
      (tempAnnotation.type === 'arrow' ||
        tempAnnotation.type === 'line' ||
        tempAnnotation.type === 'measurement') &&
      tempAnnotation.points
    ) {
      const [x1, y1, x2, y2] = tempAnnotation.points;
      const distance = calculateDistance(x1, y1, x2, y2);
      if (distance > 5) {
        shouldAdd = true;
      }
    }

    if (shouldAdd) {
      onAddAnnotation({ ...tempAnnotation, id: crypto.randomUUID() });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempAnnotation(null);
  }, [isDrawing, tempAnnotation, onAddAnnotation]);

  // Render a single annotation
  const renderAnnotation = (annotation: Annotation, isTemp = false) => {
    const isSelected = !isTemp && annotation.id === selectedId;
    const strokeWidth = (annotation as { strokeWidth?: number }).strokeWidth || DEFAULT_STROKE_WIDTH;
    const scaledStrokeWidth = strokeWidth / zoom;

    const handleSelect = () => {
      if (!isTemp && activeTool === 'select') {
        onSelectAnnotation(annotation.id);
      }
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (isTemp) return;
      onUpdateAnnotation(annotation.id, {
        x: e.target.x(),
        y: e.target.y(),
      });
    };

    switch (annotation.type) {
      case 'marker':
        return (
          <Group
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={handleDragEnd}
          >
            <Circle
              radius={8 / zoom}
              fill={annotation.color}
              stroke={isSelected ? '#fff' : undefined}
              strokeWidth={isSelected ? 2 / zoom : 0}
            />
            {annotation.label && (
              <Text
                text={annotation.label}
                fontSize={12 / zoom}
                fill={annotation.color}
                offsetX={-12 / zoom}
                offsetY={6 / zoom}
              />
            )}
          </Group>
        );

      case 'circle':
        return (
          <Circle
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            radius={annotation.radius}
            stroke={annotation.color}
            strokeWidth={scaledStrokeWidth}
            fill={isSelected ? `${annotation.color}20` : undefined}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={handleDragEnd}
          />
        );

      case 'arrow':
        return (
          <Arrow
            key={annotation.id}
            points={annotation.points}
            stroke={annotation.color}
            strokeWidth={scaledStrokeWidth}
            fill={annotation.color}
            pointerLength={10 / zoom}
            pointerWidth={10 / zoom}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => {
              if (isTemp) return;
              const dx = e.target.x();
              const dy = e.target.y();
              const [x1, y1, x2, y2] = annotation.points;
              onUpdateAnnotation(annotation.id, {
                x: annotation.x + dx,
                y: annotation.y + dy,
                points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
              });
              e.target.position({ x: 0, y: 0 });
            }}
          />
        );

      case 'line':
        return (
          <Line
            key={annotation.id}
            points={annotation.points}
            stroke={annotation.color}
            strokeWidth={scaledStrokeWidth}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => {
              if (isTemp) return;
              const dx = e.target.x();
              const dy = e.target.y();
              const [x1, y1, x2, y2] = annotation.points;
              onUpdateAnnotation(annotation.id, {
                x: annotation.x + dx,
                y: annotation.y + dy,
                points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
              });
              e.target.position({ x: 0, y: 0 });
            }}
          />
        );

      case 'measurement': {
        const [x1, y1, x2, y2] = annotation.points;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        return (
          <Group
            key={annotation.id}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => {
              if (isTemp) return;
              const dx = e.target.x();
              const dy = e.target.y();
              onUpdateAnnotation(annotation.id, {
                x: annotation.x + dx,
                y: annotation.y + dy,
                points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
              });
              e.target.position({ x: 0, y: 0 });
            }}
          >
            <Line
              points={annotation.points}
              stroke={annotation.color}
              strokeWidth={scaledStrokeWidth}
            />
            {/* End caps */}
            <Line
              points={[x1, y1 - 5 / zoom, x1, y1 + 5 / zoom]}
              stroke={annotation.color}
              strokeWidth={scaledStrokeWidth}
            />
            <Line
              points={[x2, y2 - 5 / zoom, x2, y2 + 5 / zoom]}
              stroke={annotation.color}
              strokeWidth={scaledStrokeWidth}
            />
            {/* Distance label */}
            <Text
              x={midX}
              y={midY - 16 / zoom}
              text={`${Math.round(annotation.pixelDistance)}px`}
              fontSize={12 / zoom}
              fill={annotation.color}
              offsetX={20 / zoom}
            />
          </Group>
        );
      }

      case 'angle': {
        const [x1, y1, vx, vy, x2, y2] = annotation.points;
        return (
          <Group
            key={annotation.id}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={(e) => {
              if (isTemp) return;
              const dx = e.target.x();
              const dy = e.target.y();
              onUpdateAnnotation(annotation.id, {
                x: annotation.x + dx,
                y: annotation.y + dy,
                points: [x1 + dx, y1 + dy, vx + dx, vy + dy, x2 + dx, y2 + dy],
              });
              e.target.position({ x: 0, y: 0 });
            }}
          >
            {/* Lines from vertex to each point */}
            <Line
              points={[x1, y1, vx, vy]}
              stroke={annotation.color}
              strokeWidth={scaledStrokeWidth}
            />
            <Line
              points={[vx, vy, x2, y2]}
              stroke={annotation.color}
              strokeWidth={scaledStrokeWidth}
            />
            {/* Angle arc (simplified as dots at points) */}
            <Circle x={x1} y={y1} radius={4 / zoom} fill={annotation.color} />
            <Circle x={vx} y={vy} radius={6 / zoom} fill={annotation.color} />
            <Circle x={x2} y={y2} radius={4 / zoom} fill={annotation.color} />
            {/* Angle label */}
            <Text
              x={vx + 15 / zoom}
              y={vy - 8 / zoom}
              text={`${Math.round(annotation.angleDegrees)}°`}
              fontSize={12 / zoom}
              fill={annotation.color}
            />
          </Group>
        );
      }

      case 'text':
        return (
          <Text
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize / zoom}
            fill={annotation.color}
            draggable={!isTemp && activeTool === 'select'}
            onClick={handleSelect}
            onTap={handleSelect}
            onDragEnd={handleDragEnd}
          />
        );

      default:
        return null;
    }
  };

  // Render angle points being collected
  const renderAnglePoints = () => {
    if (anglePoints.length === 0) return null;
    const points: React.ReactElement[] = [];
    for (let i = 0; i < anglePoints.length; i += 2) {
      points.push(
        <Circle
          key={`angle-point-${i}`}
          x={anglePoints[i]}
          y={anglePoints[i + 1]}
          radius={6 / zoom}
          fill={activeColor}
        />
      );
    }
    // Draw lines between points
    if (anglePoints.length >= 4) {
      points.push(
        <Line
          key="angle-line-1"
          points={anglePoints.slice(0, 4)}
          stroke={activeColor}
          strokeWidth={DEFAULT_STROKE_WIDTH / zoom}
        />
      );
    }
    return points;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[400px] bg-black/90 rounded-lg overflow-hidden"
    >
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={activeTool === 'pan'}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragEnd={(e) => {
          if (activeTool === 'pan') {
            onPositionChange({ x: e.target.x(), y: e.target.y() });
          }
        }}
        style={{
          cursor:
            activeTool === 'pan'
              ? 'grab'
              : activeTool === 'select'
              ? 'default'
              : 'crosshair',
        }}
      >
        {/* Background image layer */}
        <Layer>
          <KonvaImage
            name="background"
            image={image}
            x={0}
            y={0}
          />
        </Layer>

        {/* Annotations layer */}
        <Layer>
          {annotations.map((annotation) => renderAnnotation(annotation))}
          {tempAnnotation && renderAnnotation(tempAnnotation, true)}
          {renderAnglePoints()}
        </Layer>
      </Stage>
    </div>
  );
}
