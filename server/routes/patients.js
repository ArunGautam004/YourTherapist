import express from 'express';
import { getPatients, getPatientDetail, getAnalytics } from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('doctor', 'admin'));

router.get('/', getPatients);
router.get('/analytics', getAnalytics);
router.get('/:id', getPatientDetail);

export default router;
