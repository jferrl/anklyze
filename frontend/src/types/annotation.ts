// Annotation tool types
export type ToolType =
  | 'select'
  | 'marker'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'measurement'
  | 'angle'
  | 'text'
  | 'pan';

// Base annotation interface
export interface BaseAnnotation {
  id: string;
  type: Exclude<ToolType, 'select' | 'pan'>;
  color: string;
  x: number;
  y: number;
}

// Point/Marker annotation
export interface MarkerAnnotation extends BaseAnnotation {
  type: 'marker';
  label?: string;
}

// Circle annotation
export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  radius: number;
  strokeWidth: number;
}

// Arrow annotation
export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  strokeWidth: number;
}

// Line annotation
export interface LineAnnotation extends BaseAnnotation {
  type: 'line';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  strokeWidth: number;
}

// Distance measurement annotation
export interface MeasurementAnnotation extends BaseAnnotation {
  type: 'measurement';
  points: [number, number, number, number]; // [x1, y1, x2, y2]
  strokeWidth: number;
  pixelDistance: number;
}

// Angle measurement annotation
export interface AngleAnnotation extends BaseAnnotation {
  type: 'angle';
  // Three points: start, vertex, end
  points: [number, number, number, number, number, number];
  strokeWidth: number;
  angleDegrees: number;
}

// Text label annotation
export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: number;
}

// Union type for all annotations
export type Annotation =
  | MarkerAnnotation
  | CircleAnnotation
  | ArrowAnnotation
  | LineAnnotation
  | MeasurementAnnotation
  | AngleAnnotation
  | TextAnnotation;

// Annotation state
export interface AnnotationState {
  image: HTMLImageElement | null;
  imageUrl: string | null;
  annotations: Annotation[];
  selectedId: string | null;
  activeTool: ToolType;
  activeColor: string;
  zoom: number;
  stagePosition: { x: number; y: number };
}

// Annotation actions
export type AnnotationAction =
  | { type: 'SET_IMAGE'; payload: { image: HTMLImageElement; url: string } }
  | { type: 'CLEAR_IMAGE' }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SELECT_ANNOTATION'; payload: string | null }
  | { type: 'SET_TOOL'; payload: ToolType }
  | { type: 'SET_COLOR'; payload: string }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_STAGE_POSITION'; payload: { x: number; y: number } }
  | { type: 'CLEAR_ALL' };

// Default annotation colors
export const ANNOTATION_COLORS = [
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ffffff', // White
] as const;

// Default values
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_COLOR = ANNOTATION_COLORS[0];
