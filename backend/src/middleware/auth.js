import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RoomMember from '../models/RoomMember.js';
import Room from '../models/Room.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-collaborative-canvas-jwt-secret-key-2026';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      username: user.username,
      email: user.email,
      avatarColor: user.avatarColor,
      isGuest: user.isGuest || false,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ success: false, message: 'Internal server error in authentication.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }
    next();
  } catch (err) {
    next();
  }
};

// Check room role middleware
export const requireRoomRole = (allowedRoles = ['owner', 'editor']) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }

      // Room owner always has owner role
      if (room.owner.toString() === userId.toString()) {
        req.roomRole = 'owner';
        req.room = room;
        return next();
      }

      const member = await RoomMember.findOne({ roomId, userId });
      const userRole = member ? member.role : room.defaultRole;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. You have '${userRole}' permission, but '${allowedRoles.join(' or ')}' is required.`,
        });
      }

      req.roomRole = userRole;
      req.room = room;
      next();
    } catch (err) {
      console.error('Room permission check error:', err);
      res.status(500).json({ success: false, message: 'Error checking room permissions.' });
    }
  };
};
