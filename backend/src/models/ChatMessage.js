import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderColor: {
      type: String,
      default: '#6366f1',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['user', 'system'],
      default: 'user',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ChatMessageSchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model('ChatMessage', ChatMessageSchema);
