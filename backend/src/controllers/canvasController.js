import CanvasState from '../models/CanvasState.js';
import CanvasSnapshot from '../models/CanvasSnapshot.js';
import ChatMessage from '../models/ChatMessage.js';
import Room from '../models/Room.js';

// Get current canvas state for a room
export const getCanvasState = async (req, res) => {
  try {
    const { roomId } = req.params;

    let canvasState = await CanvasState.findOne({ roomId });
    if (!canvasState) {
      // Create default if missing
      canvasState = await CanvasState.create({
        roomId,
        version: 1,
        elements: [],
        backgroundColor: '#12131c',
      });
    }

    res.json({
      success: true,
      canvasState: {
        roomId: canvasState.roomId,
        version: canvasState.version,
        elements: canvasState.elements || [],
        backgroundColor: canvasState.backgroundColor || '#12131c',
        gridType: canvasState.gridType || 'dots',
        updatedAt: canvasState.updatedAt,
      },
    });
  } catch (err) {
    console.error('Get canvas state error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve canvas state.' });
  }
};

// Save / update canvas state manually
export const saveCanvasState = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { elements, backgroundColor, gridType } = req.body;
    const userId = req.user?.id;

    let canvasState = await CanvasState.findOne({ roomId });
    if (!canvasState) {
      canvasState = new CanvasState({ roomId, version: 1 });
    }

    if (elements !== undefined) canvasState.elements = elements;
    if (backgroundColor) canvasState.backgroundColor = backgroundColor;
    if (gridType) canvasState.gridType = gridType;
    if (userId) canvasState.lastModifiedBy = userId;

    canvasState.version = (canvasState.version || 1) + 1;
    await canvasState.save();

    res.json({
      success: true,
      message: 'Canvas state saved.',
      version: canvasState.version,
    });
  } catch (err) {
    console.error('Save canvas state error:', err);
    res.status(500).json({ success: false, message: 'Failed to save canvas state.' });
  }
};

// Create a named version snapshot
export const createSnapshot = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, thumbnail } = req.body;
    const userId = req.user.id;

    const canvasState = await CanvasState.findOne({ roomId });
    if (!canvasState) {
      return res.status(404).json({ success: false, message: 'Canvas state not found.' });
    }

    const snapshotCount = await CanvasSnapshot.countDocuments({ roomId });
    const versionNumber = snapshotCount + 1;

    const snapshot = await CanvasSnapshot.create({
      roomId,
      version: versionNumber,
      name: name?.trim() || `Snapshot v${versionNumber}`,
      thumbnail: thumbnail || '',
      elements: canvasState.elements || [],
      backgroundColor: canvasState.backgroundColor || '#12131c',
      createdBy: userId,
    });

    const populatedSnapshot = await CanvasSnapshot.findById(snapshot._id).populate('createdBy', 'username avatarColor');

    res.status(201).json({
      success: true,
      message: 'Snapshot created successfully.',
      snapshot: populatedSnapshot,
    });
  } catch (err) {
    console.error('Create snapshot error:', err);
    res.status(500).json({ success: false, message: 'Failed to create snapshot.' });
  }
};

// Get list of all snapshots for a room
export const getSnapshots = async (req, res) => {
  try {
    const { roomId } = req.params;
    const snapshots = await CanvasSnapshot.find({ roomId })
      .populate('createdBy', 'username avatarColor')
      .sort({ createdAt: -1 });

    res.json({ success: true, snapshots });
  } catch (err) {
    console.error('Get snapshots error:', err);
    res.status(500).json({ success: false, message: 'Failed to load snapshots.' });
  }
};

// Restore a snapshot version to active canvas
export const restoreSnapshot = async (req, res) => {
  try {
    const { roomId, snapshotId } = req.params;
    const userId = req.user.id;

    const snapshot = await CanvasSnapshot.findOne({ _id: snapshotId, roomId });
    if (!snapshot) {
      return res.status(404).json({ success: false, message: 'Snapshot version not found.' });
    }

    let canvasState = await CanvasState.findOne({ roomId });
    if (!canvasState) {
      canvasState = new CanvasState({ roomId });
    }

    canvasState.elements = snapshot.elements;
    canvasState.backgroundColor = snapshot.backgroundColor;
    canvasState.version = (canvasState.version || 1) + 1;
    canvasState.lastModifiedBy = userId;
    await canvasState.save();

    res.json({
      success: true,
      message: `Restored canvas to snapshot '${snapshot.name}' (v${snapshot.version}).`,
      canvasState: {
        roomId: canvasState.roomId,
        version: canvasState.version,
        elements: canvasState.elements,
        backgroundColor: canvasState.backgroundColor,
      },
    });
  } catch (err) {
    console.error('Restore snapshot error:', err);
    res.status(500).json({ success: false, message: 'Failed to restore snapshot.' });
  }
};

// Export canvas metadata and elements as JSON
export const exportCanvasJSON = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate('owner', 'username email');
    const canvasState = await CanvasState.findOne({ roomId });
    const snapshots = await CanvasSnapshot.find({ roomId }).select('-thumbnail');

    const exportData = {
      exportedAt: new Date().toISOString(),
      room: {
        roomId: room?.roomId,
        title: room?.title,
        description: room?.description,
        owner: room?.owner?.username,
      },
      canvas: {
        version: canvasState?.version,
        backgroundColor: canvasState?.backgroundColor,
        elementsCount: canvasState?.elements?.length || 0,
        elements: canvasState?.elements || [],
      },
      snapshotsCount: snapshots.length,
      snapshots: snapshots.map((s) => ({
        version: s.version,
        name: s.name,
        createdAt: s.createdAt,
        elementCount: s.elements?.length || 0,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${room?.title || 'canvas'}_${roomId}_export.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Export canvas error:', err);
    res.status(500).json({ success: false, message: 'Failed to export canvas data.' });
  }
};

// Get room chat history
export const getChatHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

    const messages = await ChatMessage.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(limit)
      .lean();

    res.json({ success: true, messages });
  } catch (err) {
    console.error('Get chat history error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve chat history.' });
  }
};
