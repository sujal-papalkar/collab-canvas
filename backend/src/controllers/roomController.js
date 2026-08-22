import Room from '../models/Room.js';
import RoomMember from '../models/RoomMember.js';
import CanvasState from '../models/CanvasState.js';
import CanvasSnapshot from '../models/CanvasSnapshot.js';
import ChatMessage from '../models/ChatMessage.js';
import bcrypt from 'bcryptjs';

// Create a new drawing room
export const createRoom = async (req, res) => {
  try {
    const { title, description, isPrivate, password, defaultRole, maxUsers } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Room title is required.' });
    }

    // Generate unique short roomId (e.g., room-4a8f9b or slug)
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const roomId = `room-${randomSuffix}`;

    let passwordHash = null;
    if (isPrivate && password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const newRoom = await Room.create({
      roomId,
      title: title.trim(),
      description: description?.trim() || '',
      owner: userId,
      isPrivate: !!isPrivate,
      passwordHash,
      defaultRole: defaultRole === 'viewer' ? 'viewer' : 'editor',
      maxUsers: maxUsers || 20,
    });

    // Create owner as room member
    await RoomMember.create({
      roomId,
      userId,
      role: 'owner',
    });

    // Initialize blank canvas state
    await CanvasState.create({
      roomId,
      version: 1,
      elements: [],
      backgroundColor: '#12131c',
      lastModifiedBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully.',
      room: {
        roomId: newRoom.roomId,
        title: newRoom.title,
        description: newRoom.description,
        isPrivate: newRoom.isPrivate,
        defaultRole: newRoom.defaultRole,
        owner: userId,
        createdAt: newRoom.createdAt,
      },
    });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
};

// Get list of public rooms
export const getPublicRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('owner', 'username avatarColor')
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();

    const roomsWithCount = await Promise.all(
      rooms.map(async (r) => {
        const memberCount = await RoomMember.countDocuments({ roomId: r.roomId });
        return {
          roomId: r.roomId,
          title: r.title,
          description: r.description,
          owner: r.owner,
          defaultRole: r.defaultRole,
          memberCount: Math.max(memberCount, 1),
          maxUsers: r.maxUsers,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      })
    );

    res.json({ success: true, rooms: roomsWithCount });
  } catch (err) {
    console.error('Get public rooms error:', err);
    res.status(500).json({ success: false, message: 'Failed to load public rooms.' });
  }
};

// Get user's own rooms and joined rooms
export const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    // Rooms owned by user
    const ownedRooms = await Room.find({ owner: userId }).sort({ updatedAt: -1 }).lean();

    // Rooms where user is a member
    const memberships = await RoomMember.find({ userId }).lean();
    const joinedRoomIds = memberships.map((m) => m.roomId);

    const joinedRooms = await Room.find({
      roomId: { $in: joinedRoomIds },
      owner: { $ne: userId },
    })
      .populate('owner', 'username avatarColor')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      ownedRooms,
      joinedRooms,
    });
  } catch (err) {
    console.error('Get my rooms error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve your rooms.' });
  }
};

// Get details for a single room
export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    const room = await Room.findOne({ roomId }).populate('owner', 'username avatarColor email');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    let userRole = null;
    let isMember = false;

    if (userId) {
      if (room.owner._id.toString() === userId.toString()) {
        userRole = 'owner';
        isMember = true;
      } else {
        const member = await RoomMember.findOne({ roomId, userId });
        if (member) {
          userRole = member.role;
          isMember = true;
        } else {
          userRole = room.defaultRole;
        }
      }
    }

    const memberCount = await RoomMember.countDocuments({ roomId });

    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        title: room.title,
        description: room.description,
        isPrivate: room.isPrivate,
        defaultRole: room.defaultRole,
        maxUsers: room.maxUsers,
        owner: room.owner,
        memberCount,
        userRole,
        isMember,
        createdAt: room.createdAt,
      },
    });
  } catch (err) {
    console.error('Get room details error:', err);
    res.status(500).json({ success: false, message: 'Failed to get room details.' });
  }
};

// Join a room (validates password if private)
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    // If private room, verify password
    if (room.isPrivate && room.owner.toString() !== userId.toString()) {
      if (!room.passwordHash) {
        // Private room without password (invite only)
      } else {
        if (!password) {
          return res.status(401).json({ success: false, message: 'Password is required to join this private room.' });
        }
        const isMatch = await bcrypt.compare(password, room.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Incorrect room password.' });
        }
      }
    }

    // Check membership or create
    let member = await RoomMember.findOne({ roomId, userId });
    if (!member) {
      const role = room.owner.toString() === userId.toString() ? 'owner' : room.defaultRole;
      member = await RoomMember.create({
        roomId,
        userId,
        role,
      });
    } else {
      member.lastActiveAt = new Date();
      await member.save();
    }

    res.json({
      success: true,
      message: 'Joined room successfully.',
      role: member.role,
      room: {
        roomId: room.roomId,
        title: room.title,
        owner: room.owner,
      },
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ success: false, message: 'Failed to join room.' });
  }
};

// Update room settings (owner only)
export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, description, isPrivate, password, defaultRole, maxUsers } = req.body;
    const userId = req.user.id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the room owner can modify room settings.' });
    }

    if (title) room.title = title.trim();
    if (description !== undefined) room.description = description.trim();
    if (defaultRole) room.defaultRole = defaultRole;
    if (maxUsers) room.maxUsers = maxUsers;

    if (typeof isPrivate === 'boolean') {
      room.isPrivate = isPrivate;
      if (isPrivate && password) {
        const salt = await bcrypt.genSalt(10);
        room.passwordHash = await bcrypt.hash(password, salt);
      } else if (!isPrivate) {
        room.passwordHash = null;
      }
    }

    await room.save();

    res.json({
      success: true,
      message: 'Room updated successfully.',
      room,
    });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ success: false, message: 'Failed to update room.' });
  }
};

// Delete room (owner only)
export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the room owner can delete the room.' });
    }

    await Promise.all([
      Room.deleteOne({ roomId }),
      RoomMember.deleteMany({ roomId }),
      CanvasState.deleteOne({ roomId }),
      CanvasSnapshot.deleteMany({ roomId }),
      ChatMessage.deleteMany({ roomId }),
    ]);

    res.json({ success: true, message: 'Room and all canvas history deleted successfully.' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete room.' });
  }
};

// Get members list for a room
export const getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const members = await RoomMember.find({ roomId })
      .populate('userId', 'username avatarColor email')
      .sort({ joinedAt: 1 });

    res.json({ success: true, members });
  } catch (err) {
    console.error('Get room members error:', err);
    res.status(500).json({ success: false, message: 'Failed to load members.' });
  }
};

// Update member role (Owner control: promote/demote editor <-> viewer)
export const updateMemberRole = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be editor or viewer.' });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the room owner can manage permissions.' });
    }

    const member = await RoomMember.findOne({ roomId, userId: memberId });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.role = role;
    await member.save();

    res.json({ success: true, message: `Member permission updated to ${role}.`, member });
  } catch (err) {
    console.error('Update member role error:', err);
    res.status(500).json({ success: false, message: 'Failed to update member role.' });
  }
};

// Kick/remove member from room (Owner control)
export const removeMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.params;
    const userId = req.user.id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the room owner can remove members.' });
    }

    if (memberId.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'Owner cannot be removed from their own room.' });
    }

    await RoomMember.deleteOne({ roomId, userId: memberId });

    res.json({ success: true, message: 'Member removed from room.' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove member.' });
  }
};
