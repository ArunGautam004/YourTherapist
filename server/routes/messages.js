import express from 'express';
import { getConversations, getMessages, sendMessage, markAsRead, submitContactForm, sendEmailToPatient } from '../controllers/messageController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public route — contact form
router.post('/contact', submitContactForm);

router.use(protect);

router.get('/conversations', getConversations);
router.post('/email-patient', sendEmailToPatient);
router.route('/').post(sendMessage);
router.get('/:userId', getMessages);
router.put('/read/:senderId', markAsRead);

export default router;