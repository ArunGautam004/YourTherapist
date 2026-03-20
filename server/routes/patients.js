import express from 'express';
import { getPatients, getPatientDetail, getAnalytics, updatePatientInfo, getAllPatientsOnSite } from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('doctor', 'admin'));

router.get('/', getPatients);
router.get('/analytics', getAnalytics);
router.get('/all', getAllPatientsOnSite);
router.get('/:id', getPatientDetail);

router.put('/:id', updatePatientInfo);

export default router;
