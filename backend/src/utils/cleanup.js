import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import CanvasState from '../models/CanvasState.js';
import CanvasSnapshot from '../models/CanvasSnapshot.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

/**
 * Clean up all rooms created by guest users and all temporary guest accounts.
 * Invoked on server startup, server shutdown, and maintenance triggers.
 */
export const cleanUpGuestRooms = async () => {
  try {
    // 1. Find all guest users
    const guestUsers = await User.find({ isGuest: true }).select('_id');
    const guestUserIds = guestUsers.map((u) => u._id);

    // 2. Find all rooms marked as isGuestRoom OR owned by any guest user
    const guestRooms = await Room.find({
      $or: [
        { isGuestRoom: true },
        { owner: { $in: guestUserIds } },
      ],
    }).select('roomId');

    const guestRoomIds = guestRooms.map((r) => r.roomId);

    if (guestRoomIds.length > 0) {
      await Promise.all([
        Room.deleteMany({ roomId: { $in: guestRoomIds } }),
        RoomMember.deleteMany({ roomId: { $in: guestRoomIds } }),
        CanvasState.deleteMany({ roomId: { $in: guestRoomIds } }),
        CanvasSnapshot.deleteMany({ roomId: { $in: guestRoomIds } }),
        ChatMessage.deleteMany({ roomId: { $in: guestRoomIds } }),
      ]);
    }

    // 3. Delete guest user accounts
    if (guestUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: guestUserIds } });
    }

    return {
      deletedRooms: guestRoomIds.length,
      deletedUsers: guestUserIds.length,
    };
  } catch (err) {
    console.error('Error during guest room cleanup:', err);
    return { deletedRooms: 0, deletedUsers: 0, error: err.message };
  }
};

/**
 * Clean up rooms and records owned by a specific guest user (e.g. on logout).
 */
export const cleanUpGuestUserRooms = async (userId) => {
  try {
    if (!userId) return { deletedRooms: 0 };

    const userRooms = await Room.find({
      $or: [
        { owner: userId },
        { isGuestRoom: true, owner: userId },
      ],
    }).select('roomId');

    const roomIds = userRooms.map((r) => r.roomId);

    if (roomIds.length > 0) {
      await Promise.all([
        Room.deleteMany({ roomId: { $in: roomIds } }),
        RoomMember.deleteMany({ roomId: { $in: roomIds } }),
        CanvasState.deleteMany({ roomId: { $in: roomIds } }),
        CanvasSnapshot.deleteMany({ roomId: { $in: roomIds } }),
        ChatMessage.deleteMany({ roomId: { $in: roomIds } }),
      ]);
    }

    // Delete guest user document if it was a guest
    await User.deleteOne({ _id: userId, isGuest: true });

    return { deletedRooms: roomIds.length, roomIds };
  } catch (err) {
    console.error(`Error cleaning up rooms for guest user ${userId}:`, err);
    return { deletedRooms: 0, error: err.message };
  }
};
