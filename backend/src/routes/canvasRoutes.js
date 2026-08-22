import express from 'express';
import {
  getCanvasState,
  saveCanvasState,
  createSnapshot,
  getSnapshots,
  restoreSnapshot,
  exportCanvasJSON,
  getChatHistory,
} from '../controllers/canvasController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Canvas state
router.get('/:roomId/state', optionalAuth, getCanvasState);
router.post('/:roomId/state', requireAuth, saveCanvasState);

// Snapshots & Version History
router.post('/:roomId/snapshots', requireAuth, createSnapshot);
router.get('/:roomId/snapshots', optionalAuth, getSnapshots);
router.post('/:roomId/snapshots/:snapshotId/restore', requireAuth, restoreSnapshot);

// Export
router.get('/:roomId/export', optionalAuth, exportCanvasJSON);

// Chat logs
router.get('/:roomId/chat', optionalAuth, getChatHistory);

export default router;
