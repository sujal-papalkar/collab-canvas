import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Room title is required'],
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    defaultRole: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'editor',
    },
    maxUsers: {
      type: Number,
      default: 20,
      min: 2,
      max: 100,
    },
    isGuestRoom: {
      type: Boolean,
      default: false,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Room', RoomSchema);
