import { verifyToken } from '../middleware/auth.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import CanvasState from '../models/CanvasState.js';
import CanvasSnapshot from '../models/CanvasSnapshot.js';
import ChatMessage from '../models/ChatMessage.js';
import bcrypt from 'bcryptjs';

// In-memory active rooms presence cache
// structure: roomsMap[roomId] = { users: Map<socketId, userData>, elements: Array, saveTimeout: Timer }
const roomsMap = new Map();

// In-memory pending join requests queue
// structure: pendingRequestsMap[roomId] = Map<userId, { socketId, userId, username, avatarColor, requestedAt }>
const pendingRequestsMap = new Map();

// Debounce helper to persist canvas state to MongoDB
const scheduleCanvasSave = (roomId) => {
  const roomData = roomsMap.get(roomId);
  if (!roomData) return;

  if (roomData.saveTimeout) {
    clearTimeout(roomData.saveTimeout);
  }

  roomData.saveTimeout = setTimeout(async () => {
    try {
      if (!roomData.elements) return;
      await CanvasState.findOneAndUpdate(
        { roomId },
        {
          elements: roomData.elements,
          backgroundColor: roomData.backgroundColor || '#12131c',
          $inc: { version: 1 },
        },
        { upsert: true, new: true }
      );
      // console.log(`[DB] Canvas auto-saved for room ${roomId} (${roomData.elements.length} elements)`);
    } catch (err) {
      console.error(`[DB] Error auto-saving canvas for room ${roomId}:`, err);
    }
  }, 1000); // 1-second debounce for high throughput performance
};

export const initializeSockets = (io) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const guestName = socket.handshake.auth?.guestName || socket.handshake.query?.guestName;

      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          socket.user = {
            id: decoded.id,
            username: decoded.username,
            avatarColor: decoded.avatarColor || '#6366f1',
            isGuest: decoded.isGuest || false,
          };
          return next();
        }
      }

      // Guest fallback
      const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      socket.user = {
        id: `guest_${socket.id.substring(0, 6)}`,
        username: guestName || `Guest_${socket.id.substring(0, 4)}`,
        avatarColor: randomColor,
        isGuest: true,
      };
      next();
    } catch (err) {
      console.error('Socket auth middleware error:', err);
      next();
    }
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id} (${socket.user.username})`);
    let currentRoomId = null;

    // Join room event
    socket.on('join-room', async ({ roomId, password }) => {
      try {
        if (!roomId) return;

        // Fetch room info from DB
        const roomDoc = await Room.findOne({ roomId });
        if (!roomDoc) {
          socket.emit('room-error', { message: 'Room not found.' });
          return;
        }

        const isOwner =
          socket.user.id &&
          mongoose.Types.ObjectId.isValid(socket.user.id) &&
          roomDoc.owner.toString() === socket.user.id.toString();

        let member = null;
        if (socket.user.id && mongoose.Types.ObjectId.isValid(socket.user.id)) {
          member = await RoomMember.findOne({ roomId, userId: socket.user.id });
        }

        // If private room, verify password or existing membership
        if (roomDoc.isPrivate && !isOwner && !member) {
          let verified = false;
          if (password && roomDoc.passwordHash) {
            const isMatch = await bcrypt.compare(password, roomDoc.passwordHash);
            if (isMatch) {
              verified = true;
              if (socket.user.id && mongoose.Types.ObjectId.isValid(socket.user.id)) {
                member = await RoomMember.create({
                  roomId,
                  userId: socket.user.id,
                  role: roomDoc.defaultRole,
                });
              }
            }
          }

          if (!verified) {
            socket.emit('room-auth-required', {
              roomId,
              title: roomDoc.title,
              isPrivate: true,
              message: 'Password required to join this private room.',
            });
            return;
          }
        }

        // If room requires host approval and user is not owner and not already an approved member
        if (roomDoc.requireApproval && !isOwner && !member) {
          if (!pendingRequestsMap.has(roomId)) {
            pendingRequestsMap.set(roomId, new Map());
          }
          const roomPending = pendingRequestsMap.get(roomId);
          const requestData = {
            socketId: socket.id,
            userId: socket.user.id,
            username: socket.user.username,
            avatarColor: socket.user.avatarColor,
            isGuest: !!socket.user.isGuest,
            requestedAt: Date.now(),
          };
          roomPending.set(socket.user.id.toString(), requestData);

          // Notify applicant they are waiting for host approval
          socket.emit('join-request-pending', {
            roomId,
            title: roomDoc.title,
            ownerName: roomDoc.owner?.username || 'Host',
            message: 'Waiting for the room host to admit you...',
          });

          // Notify all active owners in the room
          const ownerSockets = [];
          if (roomsMap.has(roomId)) {
            const roomUsers = roomsMap.get(roomId).users;
            for (const [sId, u] of roomUsers.entries()) {
              if (u.role === 'owner' || u.userId?.toString() === roomDoc.owner.toString()) {
                ownerSockets.push(sId);
              }
            }
          }
          for (const ownerSocketId of ownerSockets) {
            io.to(ownerSocketId).emit('join-request-received', {
              roomId,
              applicant: requestData,
              allPending: Array.from(roomPending.values()),
            });
          }
          return;
        }

        currentRoomId = roomId;
        socket.currentRoomId = roomId;
        socket.join(roomId);

        let userRole = 'editor';
        if (isOwner) {
          userRole = 'owner';
        } else if (member) {
          userRole = member.role;
        } else {
          userRole = roomDoc.defaultRole;
        }

        socket.user.role = userRole;

        // Initialize in-memory room store if not exists
        if (!roomsMap.has(roomId)) {
          // Load or initialize current canvas state atomically
          let dbState = await CanvasState.findOneAndUpdate(
            { roomId },
            { $setOnInsert: { elements: [], version: 1, backgroundColor: '#12131c' } },
            { upsert: true, new: true }
          );

          roomsMap.set(roomId, {
            users: new Map(),
            elements: dbState.elements || [],
            backgroundColor: dbState.backgroundColor || '#12131c',
            saveTimeout: null,
            sequence: 0,
          });
        }

        const roomData = roomsMap.get(roomId);

        // Add user to room's active user list
        const activeUserData = {
          socketId: socket.id,
          userId: socket.user.id,
          username: socket.user.username,
          avatarColor: socket.user.avatarColor,
          role: userRole,
          cursor: null,
          tool: 'pen',
          joinedAt: Date.now(),
        };

        roomData.users.set(socket.id, activeUserData);

        // 1. Send initial sync data to the newly joined client
        socket.emit('init-room-state', {
          roomId,
          role: userRole,
          elements: roomData.elements,
          backgroundColor: roomData.backgroundColor,
          activeUsers: Array.from(roomData.users.values()),
        });

        // If user is owner, also send any pending join requests
        if (userRole === 'owner' && pendingRequestsMap.has(roomId)) {
          const roomPending = pendingRequestsMap.get(roomId);
          if (roomPending.size > 0) {
            socket.emit('pending-requests-updated', {
              roomId,
              allPending: Array.from(roomPending.values()),
            });
          }
        }

        // 2. Broadcast user joined to other room participants
        socket.to(roomId).emit('user-joined', {
          user: activeUserData,
          activeUsers: Array.from(roomData.users.values()),
        });

        // 3. Send system join message
        const sysMsg = {
          roomId,
          senderId: 'system',
          senderName: 'System',
          senderColor: '#94a3b8',
          message: `${socket.user.username} joined the canvas`,
          type: 'system',
          timestamp: new Date(),
        };
        io.to(roomId).emit('chat-message', sysMsg);
      } catch (err) {
        console.error('Error in join-room socket handler:', err);
      }
    });

    // Owner approves applicant join request
    socket.on('approve-join-request', async ({ roomId, applicantUserId, role = 'editor' }) => {
      try {
        if (!roomId || !applicantUserId) return;
        const roomDoc = await Room.findOne({ roomId });
        if (!roomDoc) return;

        const isOwner = socket.user.id && roomDoc.owner.toString() === socket.user.id.toString();
        if (!isOwner && socket.user.role !== 'owner') {
          socket.emit('room-error', { message: 'Only room owner can approve requests.' });
          return;
        }

        const roomPending = pendingRequestsMap.get(roomId);
        const applicantReq = roomPending?.get(applicantUserId.toString());
        if (!applicantReq) return;

        const assignedRole = role === 'viewer' ? 'viewer' : 'editor';

        // Persist membership for registered users
        if (mongoose.Types.ObjectId.isValid(applicantUserId)) {
          await RoomMember.findOneAndUpdate(
            { roomId, userId: applicantUserId },
            {
              $set: { role: assignedRole, lastActiveAt: new Date() },
              $setOnInsert: { joinedAt: new Date() },
            },
            { upsert: true, new: true }
          );
        }

        // Remove from pending map
        roomPending.delete(applicantUserId.toString());

        // Notify all owners of updated pending list
        io.to(roomId).emit('pending-requests-updated', {
          roomId,
          allPending: Array.from(roomPending.values()),
        });

        const applicantSocket = io.sockets.sockets.get(applicantReq.socketId);
        if (applicantSocket) {
          applicantSocket.currentRoomId = roomId;
          applicantSocket.user.role = assignedRole;
          applicantSocket.join(roomId);

          if (!roomsMap.has(roomId)) {
            let dbState = await CanvasState.findOneAndUpdate(
              { roomId },
              { $setOnInsert: { elements: [], version: 1, backgroundColor: '#12131c' } },
              { upsert: true, new: true }
            );
            roomsMap.set(roomId, {
              users: new Map(),
              elements: dbState.elements || [],
              backgroundColor: dbState.backgroundColor || '#12131c',
              saveTimeout: null,
              sequence: 0,
            });
          }

          const roomData = roomsMap.get(roomId);
          const activeUserData = {
            socketId: applicantSocket.id,
            userId: applicantReq.userId,
            username: applicantReq.username,
            avatarColor: applicantReq.avatarColor,
            role: assignedRole,
            cursor: null,
            tool: 'pen',
            joinedAt: Date.now(),
          };

          roomData.users.set(applicantSocket.id, activeUserData);

          applicantSocket.emit('join-request-approved', {
            roomId,
            role: assignedRole,
            elements: roomData.elements,
            backgroundColor: roomData.backgroundColor,
            activeUsers: Array.from(roomData.users.values()),
          });

          applicantSocket.to(roomId).emit('user-joined', {
            user: activeUserData,
            activeUsers: Array.from(roomData.users.values()),
          });

          const sysMsg = {
            roomId,
            senderId: 'system',
            senderName: 'System',
            senderColor: '#94a3b8',
            message: `${applicantReq.username} was admitted by host`,
            type: 'system',
            timestamp: new Date(),
          };
          io.to(roomId).emit('chat-message', sysMsg);
        }
      } catch (err) {
        console.error('Error approving join request:', err);
      }
    });

    // Owner denies applicant join request
    socket.on('deny-join-request', async ({ roomId, applicantUserId }) => {
      try {
        if (!roomId || !applicantUserId) return;
        const roomDoc = await Room.findOne({ roomId });
        if (!roomDoc) return;

        const isOwner = socket.user.id && roomDoc.owner.toString() === socket.user.id.toString();
        if (!isOwner && socket.user.role !== 'owner') return;

        const roomPending = pendingRequestsMap.get(roomId);
        const applicantReq = roomPending?.get(applicantUserId.toString());
        if (!applicantReq) return;

        roomPending.delete(applicantUserId.toString());

        io.to(roomId).emit('pending-requests-updated', {
          roomId,
          allPending: Array.from(roomPending.values()),
        });

        const applicantSocket = io.sockets.sockets.get(applicantReq.socketId);
        if (applicantSocket) {
          applicantSocket.emit('join-request-denied', {
            roomId,
            message: 'The room host declined your request to join.',
          });
        }
      } catch (err) {
        console.error('Error denying join request:', err);
      }
    });

    // Applicant cancels their join request
    socket.on('cancel-join-request', ({ roomId }) => {
      if (!roomId || !pendingRequestsMap.has(roomId)) return;
      const roomPending = pendingRequestsMap.get(roomId);
      roomPending.delete(socket.user?.id?.toString());

      io.to(roomId).emit('pending-requests-updated', {
        roomId,
        allPending: Array.from(roomPending.values()),
      });
    });

    // Real-time live cursor movement
    socket.on('cursor-move', ({ x, y, tool, isDrawing }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;

      const roomData = roomsMap.get(activeRoom);
      const user = roomData.users.get(socket.id);
      if (user) {
        user.cursor = { x, y };
        user.tool = tool || user.tool;
        user.isDrawing = !!isDrawing;
      }

      // Broadcast to other users in the room
      socket.to(activeRoom).emit('remote-cursor-move', {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        x,
        y,
        tool,
        isDrawing,
      });
    });

    // Streaming freehand stroke chunks during active drawing
    socket.on('draw-stroke-chunk', (chunkData) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom) return;
      if (socket.user.role === 'viewer') return; // Viewers cannot draw

      // Broadcast immediately to peers for real-time stroke streaming
      socket.to(activeRoom).emit('remote-stroke-chunk', {
        ...chunkData,
        userId: socket.user.id,
        socketId: socket.id,
      });
    });

    // Stroke completed or shape created
    socket.on('element-create', (element) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      roomData.sequence += 1;

      const newElement = {
        ...element,
        sequence: roomData.sequence,
        createdBy: socket.user.id,
        creatorName: socket.user.username,
        updatedAt: Date.now(),
      };

      roomData.elements.push(newElement);
      scheduleCanvasSave(activeRoom);

      // Broadcast element creation to room peers
      socket.to(activeRoom).emit('element-created', newElement);
    });

    // Element modified (transform, drag, resize, rotate, edit text, style change)
    socket.on('element-update', ({ elementId, updates }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      const index = roomData.elements.findIndex((el) => el.id === elementId);

      if (index !== -1) {
        roomData.sequence += 1;
        roomData.elements[index] = {
          ...roomData.elements[index],
          ...updates,
          sequence: roomData.sequence,
          updatedBy: socket.user.id,
          updatedAt: Date.now(),
        };

        scheduleCanvasSave(activeRoom);

        // Broadcast update to peers
        socket.to(activeRoom).emit('element-updated', {
          elementId,
          updates,
          userId: socket.user.id,
          sequence: roomData.sequence,
        });
      }
    });

    // Multi-element selection highlights (collaborator bounding box indicator)
    socket.on('selection-change', ({ selectedElementIds }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom) return;

      socket.to(activeRoom).emit('remote-selection-change', {
        socketId: socket.id,
        userId: socket.user.id,
        username: socket.user.username,
        avatarColor: socket.user.avatarColor,
        selectedElementIds: selectedElementIds || [],
      });
    });

    // Delete element(s)
    socket.on('element-delete', ({ elementIds }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      const idsSet = new Set(elementIds);

      roomData.elements = roomData.elements.filter((el) => !idsSet.has(el.id));
      scheduleCanvasSave(activeRoom);

      socket.to(activeRoom).emit('element-deleted', {
        elementIds,
        userId: socket.user.id,
      });
    });

    // Clear entire canvas
    socket.on('canvas-clear', () => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      roomData.elements = [];
      scheduleCanvasSave(activeRoom);

      io.to(activeRoom).emit('canvas-cleared', {
        clearedBy: socket.user.username,
        userId: socket.user.id,
      });

      // System announcement
      const sysMsg = {
        roomId: activeRoom,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#ef4444',
        message: `${socket.user.username} cleared the canvas`,
        type: 'system',
        timestamp: new Date(),
      };
      io.to(activeRoom).emit('chat-message', sysMsg);
    });

    // Full canvas batch synchronization (e.g. after undo/redo or snapshot restore)
    socket.on('sync-all-elements', ({ elements, backgroundColor }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      if (elements) roomData.elements = elements;
      if (backgroundColor) roomData.backgroundColor = backgroundColor;

      scheduleCanvasSave(activeRoom);

      socket.to(activeRoom).emit('canvas-state-synced', {
        elements: roomData.elements,
        backgroundColor: roomData.backgroundColor,
        syncedBy: socket.user.username,
      });
    });

    // Background color changed
    socket.on('background-change', ({ color }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role === 'viewer') return;

      const roomData = roomsMap.get(activeRoom);
      roomData.backgroundColor = color;
      scheduleCanvasSave(activeRoom);

      socket.to(activeRoom).emit('background-changed', { color });
    });

    // Live Room Chat message
    socket.on('send-chat', async ({ message }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !message || !message.trim()) return;

      const newMsg = {
        roomId: activeRoom,
        senderId: socket.user.id,
        senderName: socket.user.username,
        senderColor: socket.user.avatarColor,
        message: message.trim(),
        type: 'user',
        timestamp: new Date(),
      };

      try {
        await ChatMessage.create(newMsg);
      } catch (err) {
        console.error('Error saving chat message:', err);
      }

      io.to(activeRoom).emit('chat-message', newMsg);
    });

    // Typing indicator
    socket.on('typing-status', ({ isTyping }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom) return;
      socket.to(activeRoom).emit('user-typing', {
        userId: socket.user.id,
        username: socket.user.username,
        isTyping: !!isTyping,
      });
    });

    // Role update broadcast (called by room owner via socket or after API update)
    socket.on('update-user-role', ({ targetUserId, newRole }) => {
      const activeRoom = currentRoomId || socket.currentRoomId;
      if (!activeRoom || !roomsMap.has(activeRoom)) return;
      if (socket.user.role !== 'owner') return;

      const roomData = roomsMap.get(activeRoom);

      // Find socket(s) belonging to target user
      for (const [sId, userData] of roomData.users.entries()) {
        if (userData.userId.toString() === targetUserId.toString()) {
          userData.role = newRole;
          io.to(sId).emit('role-changed', { newRole });
        }
      }

      io.to(activeRoom).emit('active-users-updated', {
        activeUsers: Array.from(roomData.users.values()),
      });
    });

    // Handle user exit (disconnect or leave-room) with guest room auto-cleanup
    const handleUserExit = async (roomId, leavingSocket) => {
      // Clean up any pending join request for this socket
      for (const [rId, pMap] of pendingRequestsMap.entries()) {
        for (const [uId, req] of pMap.entries()) {
          if (req.socketId === leavingSocket.id || uId === leavingSocket.user?.id?.toString()) {
            pMap.delete(uId);
            io.to(rId).emit('pending-requests-updated', {
              roomId: rId,
              allPending: Array.from(pMap.values()),
            });
          }
        }
      }

      if (!roomId) return;
      const roomData = roomsMap.get(roomId);
      if (roomData) {
        roomData.users.delete(leavingSocket.id);
      }

      try {
        const roomDoc = await Room.findOne({ roomId }).populate('owner');
        if (!roomDoc) return;

        const userId = leavingSocket.user?.id?.toString();
        const ownerId = (roomDoc.owner?._id || roomDoc.owner)?.toString();
        const isOwner = (userId && ownerId && ownerId === userId) || leavingSocket.user?.role === 'owner';
        const isGuestRoom = roomDoc.isGuestRoom === true || roomDoc.owner?.isGuest === true || (isOwner && leavingSocket.user?.isGuest === true);

        // If it's a guest room and the host left OR if the room is now empty, delete it
        const activeCount = roomData ? roomData.users.size : 0;
        if (isGuestRoom && (isOwner || activeCount === 0)) {
          // Notify any remaining peers
          io.to(roomId).emit('room-closed', {
            message: 'This temporary guest room has been closed because the host exited.',
          });

          if (roomData?.saveTimeout) {
            clearTimeout(roomData.saveTimeout);
          }

          roomsMap.delete(roomId);

          await Promise.all([
            Room.deleteOne({ roomId }),
            RoomMember.deleteMany({ roomId }),
            CanvasState.deleteOne({ roomId }),
            CanvasSnapshot.deleteMany({ roomId }),
            ChatMessage.deleteMany({ roomId }),
          ]);

          console.log(`🧹 [Auto-Cleanup] Guest room ${roomId} deleted because host exited or room became empty.`);
          return;
        }
      } catch (err) {
        console.error(`Error during guest room cleanup for ${roomId}:`, err);
      }

      if (roomData) {
        // Normal room leave broadcast
        leavingSocket.to(roomId).emit('user-left', {
          socketId: leavingSocket.id,
          userId: leavingSocket.user?.id,
          username: leavingSocket.user?.username,
          activeUsers: Array.from(roomData.users.values()),
        });

        if (roomData.users.size === 0) {
          scheduleCanvasSave(roomId);
        }
      }
    };

    // Explicit leave-room event
    socket.on('leave-room', async () => {
      if (currentRoomId) {
        const rId = currentRoomId;
        currentRoomId = null;
        socket.leave(rId);
        await handleUserExit(rId, socket);
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', async () => {
      // console.log(`[Socket] Client disconnected: ${socket.id}`);
      if (currentRoomId) {
        await handleUserExit(currentRoomId, socket);
      }
    });
  });
};
