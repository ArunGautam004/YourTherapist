import express from 'express';
import {
  createSessionNote, getSessionNotes, updateSessionNote,
  createQuestionnaireTemplate, getQuestionnaireTemplates,
  submitQuestionnaireResponse, getQuestionnaireResponses,
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Session Notes
router.post('/notes', authorize('doctor', 'admin'), createSessionNote);
router.get('/notes/:patientId', getSessionNotes);
router.put('/notes/:id', authorize('doctor', 'admin'), updateSessionNote);

// Questionnaire Templates (doctor only)
router.route('/questionnaires')
  .get(authorize('doctor', 'admin'), getQuestionnaireTemplates)
  .post(authorize('doctor', 'admin'), createQuestionnaireTemplate);

// Questionnaire Responses
router.post('/questionnaires/respond', submitQuestionnaireResponse);
router.get('/questionnaires/responses/:appointmentId', getQuestionnaireResponses);

export default router;
