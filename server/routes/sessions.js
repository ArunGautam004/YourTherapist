import express from 'express';
import {
  createSessionNote, getSessionNotes, updateSessionNote,
  createQuestionnaireTemplate, getQuestionnaireTemplates, updateQuestionnaireTemplate, deleteQuestionnaireTemplate,
  submitQuestionnaireResponse, getQuestionnaireResponses,
  getQuestionnairesByDisease, getDiseaseList, getSessionDetail,
  getPatientSessionHistory,
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// ─── Session Notes ────────────────────────────────────────────────────────────
router.post('/notes', authorize('doctor', 'admin'), createSessionNote);
router.get('/notes/:patientId', getSessionNotes);
router.put('/notes/:id', authorize('doctor', 'admin'), updateSessionNote);

// ─── Patient's own full session history ──────────────────────────────────────
router.get('/my-history', getPatientSessionHistory);

// ─── Session Detail ───────────────────────────────────────────────────────────
router.get('/detail/:appointmentId', getSessionDetail);

// ─── Questionnaire Templates ──────────────────────────────────────────────────
// ⚠️ CRITICAL: static routes MUST be declared BEFORE /:id or Express matches them as IDs
router.get('/questionnaires/diseases', authorize('doctor', 'admin'), getDiseaseList);
router.get('/questionnaires/by-disease/:diseaseName', authorize('doctor', 'admin'), getQuestionnairesByDisease);

// ⚠️ respond route must also be before /:id
router.post('/questionnaires/respond', submitQuestionnaireResponse);
router.get('/questionnaires/responses/:appointmentId', getQuestionnaireResponses);

// Dynamic /:id routes AFTER all statics
router.route('/questionnaires')
  .get(authorize('doctor', 'admin'), getQuestionnaireTemplates)
  .post(authorize('doctor', 'admin'), createQuestionnaireTemplate);

router.put('/questionnaires/:id', authorize('doctor', 'admin'), updateQuestionnaireTemplate);
router.delete('/questionnaires/:id', authorize('doctor', 'admin'), deleteQuestionnaireTemplate);

export default router;