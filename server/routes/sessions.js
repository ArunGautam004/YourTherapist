import express from 'express';
import {
  createSessionNote, getSessionNotes, updateSessionNote,
  createQuestionnaireTemplate, getQuestionnaireTemplates,
  submitQuestionnaireResponse, getQuestionnaireResponses,
  getQuestionnairesByDisease, getDiseaseList, getSessionDetail,
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Session Notes
router.post('/notes', authorize('doctor', 'admin'), createSessionNote);
router.get('/notes/:patientId', getSessionNotes);
router.put('/notes/:id', authorize('doctor', 'admin'), updateSessionNote);

// Session Detail
router.get('/detail/:appointmentId', getSessionDetail);

// Questionnaire Templates (doctor only)
router.route('/questionnaires')
  .get(authorize('doctor', 'admin'), getQuestionnaireTemplates)
  .post(authorize('doctor', 'admin'), createQuestionnaireTemplate);

// Disease-based queries
router.get('/questionnaires/diseases', authorize('doctor', 'admin'), getDiseaseList);
router.get('/questionnaires/by-disease/:diseaseName', authorize('doctor', 'admin'), getQuestionnairesByDisease);

// Questionnaire Responses
router.post('/questionnaires/respond', submitQuestionnaireResponse);
router.get('/questionnaires/responses/:appointmentId', getQuestionnaireResponses);

export default router;
