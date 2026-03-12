import Notification from '../models/Notification.js';

// @route GET /api/notifications
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/notifications/:id/read
export const markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

// Internal helper — used by appointmentController, socket, reminderScheduler
export const createNotification = async ({ userId, type, title, message, link = '', meta = {} }) => {
  try {
    return await Notification.create({ user: userId, type, title, message, link, meta });
  } catch (err) {
    console.error('createNotification failed:', err.message);
    return null;
  }
};