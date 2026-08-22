import express from 'express';
import {
  createRoom,
  getPublicRooms,
  getMyRooms,
  getRoomDetails,
  joinRoom,
  updateRoom,
  deleteRoom,
  getRoomMembers,
  updateMemberRole,
  removeMember,
} from '../controllers/roomController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public & User room listings
router.get('/public', getPublicRooms);
router.get('/my-rooms', requireAuth, getMyRooms);

// Room creation
router.post('/', requireAuth, createRoom);

// Single room details & actions
router.get('/:roomId', optionalAuth, getRoomDetails);
router.post('/:roomId/join', requireAuth, joinRoom);
router.put('/:roomId', requireAuth, updateRoom);
router.delete('/:roomId', requireAuth, deleteRoom);

// Member administration
router.get('/:roomId/members', optionalAuth, getRoomMembers);
router.put('/:roomId/members/:memberId', requireAuth, updateMemberRole);
router.delete('/:roomId/members/:memberId', requireAuth, removeMember);

export default router;
