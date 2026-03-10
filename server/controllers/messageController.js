import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Get conversations list
// @route   GET /api/messages/conversations
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get unique conversation partners
    const sent = await Message.distinct('receiver', { sender: userId });
    const received = await Message.distinct('sender', { receiver: userId });
    const partnerIds = [...new Set([...sent.map(String), ...received.map(String)])];

    const conversations = await Promise.all(partnerIds.map(async (partnerId) => {
      const partner = await User.findById(partnerId).select('name role profilePic specialization');

      const lastMessage = await Message.findOne({
        $or: [
          { sender: userId, receiver: partnerId },
          { sender: partnerId, receiver: userId },
        ],
      }).sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        sender: partnerId, receiver: userId, read: false,
      });

      return {
        partner,
        lastMessage,
        unreadCount,
      };
    }));

    // Sort by most recent message
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || 0;
      const dateB = b.lastMessage?.createdAt || 0;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages with a user
// @route   GET /api/messages/:userId
export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark as read
    await Message.updateMany(
      { sender: userId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text,
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:senderId
export const markAsRead = async (req, res, next) => {
  try {
    const { senderId } = req.params;

    await Message.updateMany(
      { sender: senderId, receiver: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
