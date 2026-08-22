import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useCanvas } from '../hooks/useCanvas';
import { CanvasHeader } from '../components/CanvasHeader';
import { CanvasToolbar } from '../components/CanvasToolbar';
import { CanvasBottomBar } from '../components/CanvasBottomBar';
import { RemoteCursors } from '../components/RemoteCursors';
import { ChatSidebar } from '../components/ChatSidebar';
import { CollaboratorsSidebar } from '../components/CollaboratorsSidebar';
import { SnapshotModal } from '../components/SnapshotModal';
import { ExportModal } from '../components/ExportModal';
import {
  renderGrid,
  renderElement,
  renderSelectionBox,
  renderRemoteSelection,
  renderLaserTrails,
  isPointInElement,
  getElementBounds,
} from '../utils/canvasRenderer';

export const CanvasPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, guestLogin } = useAuth();
  const {
    socket,
    isConnected,
    activeUsers,
    setActiveUsers,
    remoteCursors,
    setRemoteCursors,
    chatMessages,
    setChatMessages,
    typingUsers,
    setTypingUsers,
    currentRole,
    setCurrentRole,
    joinRoom,
    leaveRoom,
    sendCursorMove,
    sendStrokeChunk,
    sendElementCreate,
    sendElementUpdate,
    sendElementDelete,
    sendCanvasClear,
    sendSyncAllElements,
    sendSelectionChange,
    sendChatMessage,
    sendTypingStatus,
    updateUserRole,
  } = useSocket();

  const [room, setRoom] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [cursorThrottleTimeout, setCursorThrottleTimeout] = useState(null);

  // Hook for canvas state and tool management
  const {
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
    undoCount,
    redoCount,
  } = useCanvas({ socket, isConnected, currentRole });

  // 1. Fetch room details from API
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
          if (data.room.userRole) {
            setCurrentRole(data.room.userRole);
          }
        }
      } catch (err) {
        console.error('Error fetching room info:', err);
      }
    };

    fetchRoom();
  }, [roomId, token]);

  // 2. Auto guest session if not authenticated
  useEffect(() => {
    const ensureSession = async () => {
      if (!isAuthenticated && !user) {
        await guestLogin('Collab Guest');
      }
    };
    ensureSession();
  }, [isAuthenticated, user]);

  // 3. Socket Room Join & Real-Time Event Handlers
  useEffect(() => {
    if (!socket || !roomId) return;

    joinRoom(roomId);

    // Initial state sync from server
    socket.on('init-room-state', (data) => {
      if (data.elements) setElements(data.elements);
      if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
      if (data.activeUsers) setActiveUsers(data.activeUsers);
      if (data.role) setCurrentRole(data.role);
    });

    // Remote user joined
    socket.on('user-joined', ({ user, activeUsers }) => {
      setActiveUsers(activeUsers || []);
    });

    // Remote user left
    socket.on('user-left', ({ socketId, activeUsers }) => {
      setActiveUsers(activeUsers || []);
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
      setRemoteStreamingStrokes((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    // Remote cursor movement
    socket.on('remote-cursor-move', (cursorData) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [cursorData.socketId]: cursorData,
      }));

      // If peer is using laser pointer, record trail
      if (cursorData.tool === 'laser' && cursorData.isDrawing) {
        setLaserTrails((prev) => [
          ...prev,
          { x: cursorData.x, y: cursorData.y, time: Date.now(), color: cursorData.avatarColor || '#f43f5e' },
        ]);
      }
    });

    // Streaming freehand stroke chunk from peer
    socket.on('remote-stroke-chunk', (chunk) => {
      setRemoteStreamingStrokes((prev) => {
        const currentStroke = prev[chunk.socketId] || {
          id: chunk.id,
          type: chunk.type,
          strokeColor: chunk.strokeColor,
          strokeWidth: chunk.strokeWidth,
          opacity: chunk.opacity,
          points: [],
        };

        return {
          ...prev,
          [chunk.socketId]: {
            ...currentStroke,
            points: [...currentStroke.points, ...chunk.newPoints],
          },
        };
      });
    });

    // Peer completed element creation
    socket.on('element-created', (newElement) => {
      setElements((prev) => {
        // Prevent duplicate if already added
        if (prev.some((el) => el.id === newElement.id)) return prev;
        return [...prev, newElement];
      });

      // Clear streaming stroke for that peer
      setRemoteStreamingStrokes((prev) => {
        const next = { ...prev };
        for (const sId in next) {
          if (next[sId]?.id === newElement.id) {
            delete next[sId];
          }
        }
        return next;
      });
    });

    // Peer updated element (e.g. moved or resized shape)
    socket.on('element-updated', ({ elementId, updates }) => {
      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? { ...el, ...updates } : el))
      );
    });

    // Peer selection highlight change
    socket.on('remote-selection-change', ({ socketId, username, avatarColor, selectedElementIds }) => {
      setRemoteSelections((prev) => ({
        ...prev,
        [socketId]: { username, avatarColor, selectedElementIds },
      }));
    });

    // Peer deleted elements
    socket.on('element-deleted', ({ elementIds }) => {
      const idsSet = new Set(elementIds);
      setElements((prev) => prev.filter((el) => !idsSet.has(el.id)));
    });

    // Peer cleared canvas
    socket.on('canvas-cleared', () => {
      setElements([]);
      setSelectedIds([]);
    });

    // Canvas batch state sync (after undo / redo / snapshot rollback)
    socket.on('canvas-state-synced', ({ elements: syncedElements, backgroundColor: syncedBg }) => {
      if (syncedElements) setElements(syncedElements);
      if (syncedBg) setBackgroundColor(syncedBg);
    });

    // Role updated dynamically by owner
    socket.on('role-changed', ({ newRole }) => {
      setCurrentRole(newRole);
      alert(`Your permission in this room was updated to: ${newRole.toUpperCase()}`);
    });

    // Live Room Chat
    socket.on('chat-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (!isChatOpen) {
        setUnreadChatCount((c) => c + 1);
      }
    });

    // Typing status
    socket.on('user-typing', ({ userId, username, isTyping }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [userId]: { username, isTyping },
      }));
    });

    // Cleanup listeners on room change
    return () => {
      socket.off('init-room-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('remote-cursor-move');
      socket.off('remote-stroke-chunk');
      socket.off('element-created');
      socket.off('element-updated');
      socket.off('remote-selection-change');
      socket.off('element-deleted');
      socket.off('canvas-cleared');
      socket.off('canvas-state-synced');
      socket.off('role-changed');
      socket.off('chat-message');
      socket.off('user-typing');
      leaveRoom();
    };
  }, [socket, roomId]);

  // Reset unread count when chat opened
  useEffect(() => {
    if (isChatOpen) setUnreadChatCount(0);
  }, [isChatOpen]);

  // 4. Main HTML5 Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      // Resize canvas to window dimensions
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Render Background & Grid pattern
      renderGrid(ctx, canvas.width, canvas.height, zoom, pan, gridType, backgroundColor);

      // 2. Apply World Transform Matrix (Zoom & Pan)
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 3. Render all existing canvas elements
      elements.forEach((el) => {
        // Skip rendering element currently being edited as text input
        if (editingText && editingText.id === el.id) return;
        renderElement(ctx, el);
      });

      // 4. Render live streaming strokes from peers
      Object.values(remoteStreamingStrokes).forEach((stroke) => {
        renderElement(ctx, stroke);
      });

      // 5. Render element currently being drawn locally
      if (currentElementRef.current) {
        renderElement(ctx, currentElementRef.current);
      }

      // 6. Render Laser Trails
      renderLaserTrails(ctx, laserTrails);

      // 7. Render peer selections
      Object.values(remoteSelections).forEach((sel) => {
        if (sel.selectedElementIds && sel.selectedElementIds.length > 0) {
          sel.selectedElementIds.forEach((id) => {
            const el = elements.find((e) => e.id === id);
            if (el) renderRemoteSelection(ctx, el, sel.username, sel.avatarColor);
          });
        }
      });

      // 8. Render local selection bounding box & handles
      if (selectedIds.length > 0) {
        const selectedEls = elements.filter((el) => selectedIds.includes(el.id));
        selectedEls.forEach((el) => {
          renderSelectionBox(ctx, el, selectedIds.length > 1);
        });
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    elements,
    zoom,
    pan,
    gridType,
    backgroundColor,
    selectedIds,
    remoteStreamingStrokes,
    remoteSelections,
    laserTrails,
    editingText,
  ]);

  // 5. Mouse / Pointer Event Handlers
  const handlePointerDown = (e) => {
    if (editingText) {
      finishTextEditing();
    }

    const { clientX, clientY, button } = e;
    const worldPoint = screenToWorld(clientX, clientY);

    // Pan mode with Space key, Middle mouse button, or Hand tool
    if (button === 1 || e.spaceKey || activeTool === 'hand') {
      isPanningRef.current = true;
      panStartRef.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    if (button !== 0) return; // Only primary button for drawing
    if (currentRole === 'viewer') return; // Viewers read-only

    // Laser pointer tool
    if (activeTool === 'laser') {
      isDrawingRef.current = true;
      setLaserTrails((prev) => [
        ...prev,
        { x: worldPoint.x, y: worldPoint.y, time: Date.now(), color: '#f43f5e' },
      ]);
      sendCursorMove(worldPoint.x, worldPoint.y, 'laser', true);
      return;
    }

    // Pointer / Select tool
    if (activeTool === 'select') {
      // Check hit on existing elements (reverse iterate to select top-most element)
      const hitEl = [...elements].reverse().find((el) => isPointInElement(worldPoint.x, worldPoint.y, el));

      if (hitEl) {
        if (e.shiftKey) {
          // Toggle selection
          setSelectedIds((prev) =>
            prev.includes(hitEl.id) ? prev.filter((id) => id !== hitEl.id) : [...prev, hitEl.id]
          );
        } else if (!selectedIds.includes(hitEl.id)) {
          setSelectedIds([hitEl.id]);
          sendSelectionChange([hitEl.id]);
        }

        isDraggingElementRef.current = true;
        startPointRef.current = worldPoint;
        dragStartElementsRef.current = elements.filter((el) =>
          (e.shiftKey ? [...selectedIds, hitEl.id] : [hitEl.id]).includes(el.id)
        );
        pushUndo(elements);
      } else {
        // Deselect
        setSelectedIds([]);
        sendSelectionChange([]);
      }
      return;
    }

    // Text tool
    if (activeTool === 'text') {
      const newTextEl = {
        id: uuidv4(),
        type: 'text',
        x: snapToGrid ? Math.round(worldPoint.x / 28) * 28 : worldPoint.x,
        y: snapToGrid ? Math.round(worldPoint.y / 28) * 28 : worldPoint.y,
        width: 160,
        height: 40,
        text: 'Type text here...',
        fontSize,
        strokeColor,
        opacity,
      };

      setEditingText(newTextEl);
      return;
    }

    // Sticky note tool
    if (activeTool === 'sticky') {
      pushUndo(elements);
      const newSticky = {
        id: uuidv4(),
        type: 'sticky',
        x: snapToGrid ? Math.round(worldPoint.x / 28) * 28 : worldPoint.x,
        y: snapToGrid ? Math.round(worldPoint.y / 28) * 28 : worldPoint.y,
        width: 180,
        height: 180,
        text: 'New Memo\nClick to edit...',
        fontSize: 16,
        fillColor: fillColor !== 'transparent' ? fillColor : '#fef08a',
        strokeColor: '#1e293b',
        opacity,
      };

      setElements((prev) => [...prev, newSticky]);
      sendElementCreate(newSticky);
      setSelectedIds([newSticky.id]);
      setActiveTool('select');
      return;
    }

    // Eraser tool
    if (activeTool === 'eraser') {
      isDrawingRef.current = true;
      eraseAtPoint(worldPoint.x, worldPoint.y);
      return;
    }

    // Drawing freehand (pencil, brush, highlighter) or shapes
    isDrawingRef.current = true;
    startPointRef.current = worldPoint;

    const elementId = uuidv4();
    let newElement = null;

    if (['pencil', 'brush', 'highlighter'].includes(activeTool)) {
      newElement = {
        id: elementId,
        type: activeTool,
        strokeColor,
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 2.5 : strokeWidth,
        strokeStyle,
        opacity,
        points: [{ x: worldPoint.x, y: worldPoint.y }],
      };

      // Stream initial point
      sendStrokeChunk({
        id: elementId,
        type: activeTool,
        strokeColor,
        strokeWidth: newElement.strokeWidth,
        opacity,
        newPoints: [{ x: worldPoint.x, y: worldPoint.y }],
      });
    } else {
      // Geometric shapes (rectangle, rounded-rect, circle, triangle, star, line, arrow)
      newElement = {
        id: elementId,
        type: activeTool,
        x: worldPoint.x,
        y: worldPoint.y,
        x1: worldPoint.x,
        y1: worldPoint.y,
        x2: worldPoint.x,
        y2: worldPoint.y,
        width: 0,
        height: 0,
        strokeColor,
        fillColor,
        strokeWidth,
        strokeStyle,
        opacity,
      };
    }

    currentElementRef.current = newElement;
  };

  const handlePointerMove = (e) => {
    const { clientX, clientY } = e;
    const worldPoint = screenToWorld(clientX, clientY);

    // Throttled cursor broadcast
    sendCursorMove(worldPoint.x, worldPoint.y, activeTool, isDrawingRef.current);

    // Panning canvas
    if (isPanningRef.current) {
      setPan({
        x: clientX - panStartRef.current.x,
        y: clientY - panStartRef.current.y,
      });
      return;
    }

    // Dragging selected elements
    if (isDraggingElementRef.current && dragStartElementsRef.current.length > 0) {
      const dx = worldPoint.x - startPointRef.current.x;
      const dy = worldPoint.y - startPointRef.current.y;

      setElements((prev) =>
        prev.map((el) => {
          const original = dragStartElementsRef.current.find((orig) => orig.id === el.id);
          if (!original) return el;

          if (['pencil', 'brush', 'highlighter'].includes(original.type)) {
            return {
              ...original,
              points: original.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
          } else if (['line', 'arrow'].includes(original.type)) {
            return {
              ...original,
              x1: original.x1 + dx,
              y1: original.y1 + dy,
              x2: original.x2 + dx,
              y2: original.y2 + dy,
            };
          } else {
            return {
              ...original,
              x: original.x + dx,
              y: original.y + dy,
            };
          }
        })
      );
      return;
    }

    // Laser trail
    if (activeTool === 'laser' && isDrawingRef.current) {
      setLaserTrails((prev) => [
        ...prev,
        { x: worldPoint.x, y: worldPoint.y, time: Date.now(), color: '#f43f5e' },
      ]);
      return;
    }

    // Eraser dragging
    if (activeTool === 'eraser' && isDrawingRef.current) {
      eraseAtPoint(worldPoint.x, worldPoint.y);
      return;
    }

    // Active Drawing
    if (!isDrawingRef.current || !currentElementRef.current) return;

    const curr = currentElementRef.current;

    if (['pencil', 'brush', 'highlighter'].includes(curr.type)) {
      const newPoint = { x: worldPoint.x, y: worldPoint.y };
      curr.points.push(newPoint);

      // Stream incremental points to peers
      sendStrokeChunk({
        id: curr.id,
        type: curr.type,
        strokeColor: curr.strokeColor,
        strokeWidth: curr.strokeWidth,
        opacity: curr.opacity,
        newPoints: [newPoint],
      });
    } else if (['line', 'arrow'].includes(curr.type)) {
      curr.x2 = worldPoint.x;
      curr.y2 = worldPoint.y;
    } else {
      // Box Shapes
      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;
      curr.x = Math.min(startX, worldPoint.x);
      curr.y = Math.min(startY, worldPoint.y);
      curr.width = Math.abs(worldPoint.x - startX);
      curr.height = Math.abs(worldPoint.y - startY);
    }
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;

    // Finish dragging elements
    if (isDraggingElementRef.current) {
      isDraggingElementRef.current = false;
      // Broadcast updates for all dragged elements
      selectedIds.forEach((id) => {
        const updated = elements.find((el) => el.id === id);
        if (updated) {
          sendElementUpdate(id, updated);
        }
      });
      dragStartElementsRef.current = [];
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentElementRef.current) {
      const finishedElement = { ...currentElementRef.current };
      currentElementRef.current = null;

      // Filter out accidental micro-clicks on shapes
      if (
        !['pencil', 'brush', 'highlighter', 'line', 'arrow'].includes(finishedElement.type) &&
        finishedElement.width < 5 &&
        finishedElement.height < 5
      ) {
        return;
      }

      pushUndo(elements);
      setElements((prev) => [...prev, finishedElement]);
      sendElementCreate(finishedElement);
    }
  };

  // Erase elements hit by point
  const eraseAtPoint = (wx, wy) => {
    const hitElements = elements.filter((el) => isPointInElement(wx, wy, el));
    if (hitElements.length > 0) {
      const idsToDelete = hitElements.map((el) => el.id);
      pushUndo(elements);
      setElements((prev) => prev.filter((el) => !idsToDelete.includes(el.id)));
      sendElementDelete(idsToDelete);
    }
  };

  // Finish inline text editing
  const finishTextEditing = () => {
    if (!editingText) return;
    if (editingText.text && editingText.text.trim()) {
      pushUndo(elements);
      const existing = elements.find((el) => el.id === editingText.id);
      if (existing) {
        setElements((prev) => prev.map((el) => (el.id === editingText.id ? editingText : el)));
        sendElementUpdate(editingText.id, editingText);
      } else {
        setElements((prev) => [...prev, editingText]);
        sendElementCreate(editingText);
      }
    }
    setEditingText(null);
  };

  // Zoom with Wheel
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.min(5, Math.max(0.15, Math.round(z * zoomFactor * 100) / 100)));
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  // 6. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If typing in input or text editing, ignore canvas shortcuts
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand');
      } else if (e.key === 'p' || e.key === 'P') {
        setActiveTool('pencil');
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('highlighter');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'r' || e.key === 'R') {
        setActiveTool('rectangle');
      } else if (e.key === 'o' || e.key === 'O') {
        setActiveTool('circle');
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool('text');
      } else if (e.key === 's' || e.key === 'S') {
        setActiveTool('sticky');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('laser');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, setActiveTool]);

  // Double click element to edit text
  const handleDoubleClick = (e) => {
    const worldPoint = screenToWorld(e.clientX, e.clientY);
    const hitText = [...elements].reverse().find((el) => (el.type === 'text' || el.type === 'sticky') && isPointInElement(worldPoint.x, worldPoint.y, el));
    if (hitText) {
      setEditingText(hitText);
    }
  };

  return (
    <div className="canvas-viewport" onWheel={handleWheel}>
      {/* Floating Canvas Top Header */}
      <CanvasHeader
        room={room}
        currentRole={currentRole}
        activeUsers={activeUsers}
        onOpenSnapshots={() => setShowSnapshots(true)}
        onOpenExport={() => setShowExport(true)}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        isUsersOpen={isUsersOpen}
        setIsUsersOpen={setIsUsersOpen}
        unreadChatCount={unreadChatCount}
      />

      {/* Floating Left Toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        fillColor={fillColor}
        setFillColor={setFillColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        strokeStyle={strokeStyle}
        setStrokeStyle={setStrokeStyle}
        opacity={opacity}
        setOpacity={setOpacity}
        fontSize={fontSize}
        setFontSize={setFontSize}
        currentRole={currentRole}
      />

      {/* Floating Bottom Bar */}
      <CanvasBottomBar
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onUndo={handleUndo}
        onRedo={handleRedo}
        undoCount={undoCount}
        redoCount={redoCount}
        onClear={handleClear}
        selectedCount={selectedIds.length}
        onDeleteSelected={handleDeleteSelected}
        gridType={gridType}
        setGridType={setGridType}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        backgroundColor={backgroundColor}
        setBackgroundColor={(col) => {
          setBackgroundColor(col);
          if (socket && isConnected) {
            socket.emit('background-change', { color: col });
          }
        }}
        currentRole={currentRole}
      />

      {/* HTML5 Canvas Surface */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          cursor:
            activeTool === 'hand'
              ? 'grab'
              : activeTool === 'laser'
              ? 'crosshair'
              : activeTool === 'eraser'
              ? 'cell'
              : activeTool === 'select'
              ? 'default'
              : 'crosshair',
        }}
      />

      {/* Inline Text Box Editor */}
      {editingText && (
        <div
          style={{
            position: 'absolute',
            left: `${worldToScreen(editingText.x, editingText.y).x}px`,
            top: `${worldToScreen(editingText.x, editingText.y).y}px`,
            zIndex: 50,
          }}
        >
          <textarea
            autoFocus
            value={editingText.text}
            onChange={(e) => setEditingText({ ...editingText, text: e.target.value })}
            onBlur={finishTextEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishTextEditing();
              }
            }}
            style={{
              background: editingText.type === 'sticky' ? (editingText.fillColor || '#fef08a') : 'rgba(18, 19, 28, 0.95)',
              color: editingText.type === 'sticky' ? '#1e293b' : (editingText.strokeColor || '#ffffff'),
              fontSize: `${(editingText.fontSize || 20) * zoom}px`,
              border: '2px solid var(--accent-primary)',
              borderRadius: '8px',
              padding: '8px',
              minWidth: '180px',
              minHeight: '60px',
              outline: 'none',
              resize: 'both',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}

      {/* Multiplayer Live Cursor Overlay */}
      <RemoteCursors remoteCursors={remoteCursors} worldToScreen={worldToScreen} />

      {/* Live Room Chat Sidebar */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        onTyping={sendTypingStatus}
        typingUsers={typingUsers}
        currentUserId={user?.id || user?._id}
      />

      {/* Collaborators & Room Settings Sidebar */}
      <CollaboratorsSidebar
        isOpen={isUsersOpen}
        onClose={() => setIsUsersOpen(false)}
        activeUsers={activeUsers}
        currentUserId={user?.id || user?._id}
        isOwner={currentRole === 'owner'}
        onUpdateRole={(targetUserId, newRole) => updateUserRole(targetUserId, newRole)}
        onKickUser={(targetUserId) => {
          if (window.confirm('Remove this collaborator from the room?')) {
            fetch(`/api/rooms/${roomId}/members/${targetUserId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }}
        room={room}
      />

      {/* Snapshots & Version History Modal */}
      <SnapshotModal
        isOpen={showSnapshots}
        onClose={() => setShowSnapshots(false)}
        roomId={roomId}
        elements={elements}
        backgroundColor={backgroundColor}
        token={token}
        onRestoreSnapshot={(restoredElements, restoredBg) => {
          setElements(restoredElements);
          if (restoredBg) setBackgroundColor(restoredBg);
          sendSyncAllElements(restoredElements, restoredBg);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }}
        currentRole={currentRole}
      />

      {/* Export Canvas Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        elements={elements}
        backgroundColor={backgroundColor}
        roomTitle={room?.title || 'canvas'}
        roomId={roomId}
      />
    </div>
  );
};
