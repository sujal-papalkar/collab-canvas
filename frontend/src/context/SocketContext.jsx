import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [currentRole, setCurrentRole] = useState('editor');

  // Initialize socket connection
  useEffect(() => {
    const SOCKET_SERVER_URL =
      import.meta.env.VITE_BACKEND_URL ||
      (import.meta.env.DEV ? 'http://localhost:5000' : '/');

    // Connect to server
    const socket = io(SOCKET_SERVER_URL, {
      auth: {
        token: token || null,
        guestName: user?.username || null,
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log('Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      // console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection warning:', err.message);
    });

    // Cleanup on unmount or user change
    return () => {
      socket.disconnect();
    };
  }, [token, user?.username]);

  // Join a canvas room
  const joinRoom = (roomId, password = null) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('join-room', { roomId, password });

    // Reset local room states
    setRemoteCursors({});
    setTypingUsers({});
  };

  // Leave a canvas room
  const leaveRoom = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave-room');
    setActiveUsers([]);
    setRemoteCursors({});
    setChatMessages([]);
  };

  // Send live cursor coordinates
  const sendCursorMove = (x, y, tool, isDrawing) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('cursor-move', { x, y, tool, isDrawing });
  };

  // Send streaming freehand stroke chunk
  const sendStrokeChunk = (chunkData) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('draw-stroke-chunk', chunkData);
  };

  // Emit element creation
  const sendElementCreate = (element) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('element-create', element);
  };

  // Emit element update
  const sendElementUpdate = (elementId, updates) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('element-update', { elementId, updates });
  };

  // Emit element deletion
  const sendElementDelete = (elementIds) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('element-delete', { elementIds });
  };

  // Emit canvas clear
  const sendCanvasClear = () => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('canvas-clear');
  };

  // Emit full canvas batch sync
  const sendSyncAllElements = (elements, backgroundColor) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('sync-all-elements', { elements, backgroundColor });
  };

  // Emit selection change
  const sendSelectionChange = (selectedElementIds) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('selection-change', { selectedElementIds });
  };

  // Send chat message
  const sendChatMessage = (message) => {
    if (!socketRef.current || !isConnected || !message.trim()) return;
    socketRef.current.emit('send-chat', { message });
  };

  // Send typing status
  const sendTypingStatus = (isTyping) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('typing-status', { isTyping });
  };

  // Update user role in room (Owner only)
  const updateUserRole = (targetUserId, newRole) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('update-user-role', { targetUserId, newRole });
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
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
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
