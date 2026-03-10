import express from 'express';
import { getDoctors, getDoctor } from '../controllers/doctorController.js';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id', getDoctor);

export default router;
