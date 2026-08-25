import { useState, useRef, useCallback, useEffect } from 'react';

export const useCanvas = ({ socket, isConnected, currentRole }) => {
  // Elements state (array of shapes/strokes)
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // History stacks for Undo / Redo
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  // Active Tool & Styling state
  const [activeTool, setActiveTool] = useState('pencil'); // pencil, brush, highlighter, laser, select, hand, eraser, rectangle, rounded-rect, circle, triangle, star, line, arrow, text, sticky
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeStyle, setStrokeStyle] = useState('solid'); // 'solid' | 'dashed' | 'dotted'
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [eraserSize, setEraserSize] = useState(20); // 10 (small), 20 (medium), 36 (large)
  const [backgroundColor, setBackgroundColor] = useState('#12131c');
  const [gridType, setGridType] = useState('dots'); // 'dots' | 'grid' | 'none'
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Viewport Transform (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Remote elements & streaming active strokes from other users
  // Map of socketId -> { tool, strokeColor, strokeWidth, points: [] }
  const [remoteStreamingStrokes, setRemoteStreamingStrokes] = useState({});
  // Map of socketId -> { username, avatarColor, selectedElementIds }
  const [remoteSelections, setRemoteSelections] = useState({});
  // Laser trails from other users and self: array of { x, y, time, color }
  const [laserTrails, setLaserTrails] = useState([]);

  // Local interaction refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const isDraggingElementRef = useRef(false);
  const isTransformingRef = useRef(false);
  const transformHandleRef = useRef(null); // 'tl', 'tr', 'bl', 'br', 'rot', etc.
  const currentElementRef = useRef(null);
  const startPointRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const dragStartElementsRef = useRef([]);

  // Inline text editing state
  const [editingText, setEditingText] = useState(null); // { id, text, x, y, width, height, fontSize, strokeColor }

  // Convert Screen Coordinates (Mouse Event) to World Coordinates (Canvas Space)
  const screenToWorld = useCallback((screenX, screenY) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Convert World Coordinates to Screen Coordinates
  const worldToScreen = useCallback((worldX, worldY) => {
    return {
      x: worldX * zoom + pan.x,
      y: worldY * zoom + pan.y,
    };
  }, [pan, zoom]);

  // Helper to record an undo action
  const pushUndo = useCallback((prevElements) => {
    undoStackRef.current.push([...prevElements]);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = []; // Clear redo stack on new action
  }, []);

  // Undo action
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0 || currentRole === 'viewer') return;
    const previousState = undoStackRef.current.pop();
    redoStackRef.current.push([...elements]);
    setElements(previousState);

    // Broadcast full sync
    if (socket && isConnected) {
      socket.emit('sync-all-elements', { elements: previousState, backgroundColor });
    }
  }, [elements, currentRole, socket, isConnected, backgroundColor]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0 || currentRole === 'viewer') return;
    const nextState = redoStackRef.current.pop();
    undoStackRef.current.push([...elements]);
    setElements(nextState);

    // Broadcast full sync
    if (socket && isConnected) {
      socket.emit('sync-all-elements', { elements: nextState, backgroundColor });
    }
  }, [elements, currentRole, socket, isConnected, backgroundColor]);

  // Clear canvas
  const handleClear = useCallback(() => {
    if (currentRole === 'viewer') return;
    pushUndo(elements);
    setElements([]);
    setSelectedIds([]);
    if (socket && isConnected) {
      socket.emit('canvas-clear');
    }
  }, [elements, currentRole, pushUndo, socket, isConnected]);

  // Delete selected element(s)
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0 || currentRole === 'viewer') return;
    pushUndo(elements);
    const newElements = elements.filter((el) => !selectedIds.includes(el.id));
    setElements(newElements);
    const deletedIds = [...selectedIds];
    setSelectedIds([]);

    if (socket && isConnected) {
      socket.emit('element-delete', { elementIds: deletedIds });
    }
  }, [selectedIds, elements, currentRole, pushUndo, socket, isConnected]);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.15, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Laser trail cleaner
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLaserTrails((prev) => prev.filter((p) => now - p.time < 1200));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return {
    elements,
    setElements,
    selectedIds,
    setSelectedIds,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    strokeStyle,
    setStrokeStyle,
    opacity,
    setOpacity,
    fontSize,
    setFontSize,
    eraserSize,
    setEraserSize,
    backgroundColor,
    setBackgroundColor,
    gridType,
    setGridType,
    snapToGrid,
    setSnapToGrid,
    zoom,
    setZoom,
    pan,
    setPan,
    remoteStreamingStrokes,
    setRemoteStreamingStrokes,
    remoteSelections,
    setRemoteSelections,
    laserTrails,
    setLaserTrails,
    canvasRef,
    isDrawingRef,
    isPanningRef,
    isDraggingElementRef,
    isTransformingRef,
    transformHandleRef,
    currentElementRef,
    startPointRef,
    panStartRef,
    dragStartElementsRef,
    editingText,
    setEditingText,
    screenToWorld,
    worldToScreen,
    pushUndo,
    handleUndo,
    handleRedo,
    handleClear,
    handleDeleteSelected,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    undoCount: undoStackRef.current.length,
    redoCount: redoStackRef.current.length,
  };
};
