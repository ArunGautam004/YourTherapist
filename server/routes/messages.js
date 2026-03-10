import express from 'express';
import { getConversations, getMessages, sendMessage, markAsRead } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.route('/').post(sendMessage);
router.get('/:userId', getMessages);
router.put('/read/:senderId', markAsRead);

export default router;
