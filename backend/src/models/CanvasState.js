import mongoose from 'mongoose';

const CanvasStateSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    elements: {
      type: Array, // Array of element objects: { id, type, points, x, y, width, height, strokeColor, fillColor, strokeWidth, opacity, strokeStyle, text, fontSize, rotation, zIndex, createdBy, updatedBy }
      default: [],
    },
    backgroundColor: {
      type: String,
      default: '#12131c',
    },
    gridType: {
      type: String,
      enum: ['dots', 'grid', 'none'],
      default: 'dots',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('CanvasState', CanvasStateSchema);
