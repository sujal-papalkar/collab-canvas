import mongoose from 'mongoose';

const CanvasSnapshotSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
      default: 'Manual Snapshot',
      trim: true,
      maxlength: 60,
    },
    thumbnail: {
      type: String, // base64 / dataURI
      default: '',
    },
    elements: {
      type: Array,
      default: [],
    },
    backgroundColor: {
      type: String,
      default: '#12131c',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

CanvasSnapshotSchema.index({ roomId: 1, version: 1 });

export default mongoose.model('CanvasSnapshot', CanvasSnapshotSchema);
