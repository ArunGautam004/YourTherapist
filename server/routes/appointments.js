import express from 'express';
import {
  createAppointment, getAppointments, getAppointment,
  updateAppointment, getTodayAppointments, getAvailableSlots,
  verifyPayment,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getAppointments).post(createAppointment);
router.post('/verify-payment', verifyPayment);
router.get('/today', getTodayAppointments);
router.get('/slots/:doctorId/:date', getAvailableSlots);
router.route('/:id').get(getAppointment).put(updateAppointment);

export default router;
