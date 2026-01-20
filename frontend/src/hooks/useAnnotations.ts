import { useReducer, useCallback } from 'react';
import type {
  AnnotationState,
  AnnotationAction,
  Annotation,
  ToolType,
} from '../types/annotation';
import { DEFAULT_COLOR } from '../types/annotation';

const initialState: AnnotationState = {
  image: null,
  imageUrl: null,
  annotations: [],
  selectedId: null,
  activeTool: 'select',
  activeColor: DEFAULT_COLOR,
  zoom: 1,
  stagePosition: { x: 0, y: 0 },
};

function annotationReducer(
  state: AnnotationState,
  action: AnnotationAction
): AnnotationState {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        image: action.payload.image,
        imageUrl: action.payload.url,
        annotations: [],
        selectedId: null,
        zoom: 1,
        stagePosition: { x: 0, y: 0 },
      };

    case 'CLEAR_IMAGE':
      return { ...initialState };

    case 'ADD_ANNOTATION':
      return {
        ...state,
        annotations: [...state.annotations, action.payload],
        selectedId: action.payload.id,
      };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.payload.id
            ? ({ ...a, ...action.payload.updates } as Annotation)
            : a
        ),
      };

    case 'DELETE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.payload),
        selectedId:
          state.selectedId === action.payload ? null : state.selectedId,
      };

    case 'SELECT_ANNOTATION':
      return { ...state, selectedId: action.payload };

    case 'SET_TOOL':
      return { ...state, activeTool: action.payload, selectedId: null };

    case 'SET_COLOR':
      return { ...state, activeColor: action.payload };

    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(5, action.payload)) };

    case 'SET_STAGE_POSITION':
      return { ...state, stagePosition: action.payload };

    case 'CLEAR_ALL':
      return { ...state, annotations: [], selectedId: null };

    default:
      return state;
  }
}

export function useAnnotations() {
  const [state, dispatch] = useReducer(annotationReducer, initialState);

  const setImage = useCallback((image: HTMLImageElement, url: string) => {
    dispatch({ type: 'SET_IMAGE', payload: { image, url } });
  }, []);

  const clearImage = useCallback(() => {
    dispatch({ type: 'CLEAR_IMAGE' });
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }, []);

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      dispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
    },
    []
  );

  const deleteAnnotation = useCallback((id: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: id });
  }, []);

  const selectAnnotation = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: id });
  }, []);

  const setTool = useCallback((tool: ToolType) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  const setColor = useCallback((color: string) => {
    dispatch({ type: 'SET_COLOR', payload: color });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const setStagePosition = useCallback((position: { x: number; y: number }) => {
    dispatch({ type: 'SET_STAGE_POSITION', payload: position });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const deleteSelected = useCallback(() => {
    if (state.selectedId) {
      dispatch({ type: 'DELETE_ANNOTATION', payload: state.selectedId });
    }
  }, [state.selectedId]);

  const zoomIn = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom * 1.2 });
  }, [state.zoom]);

  const zoomOut = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: state.zoom / 1.2 });
  }, [state.zoom]);

  const resetZoom = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', payload: 1 });
    dispatch({ type: 'SET_STAGE_POSITION', payload: { x: 0, y: 0 } });
  }, []);

  return {
    state,
    setImage,
    clearImage,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
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
  };
}
