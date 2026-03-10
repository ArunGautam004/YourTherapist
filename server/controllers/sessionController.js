import SessionNote from '../models/SessionNote.js';
import QuestionnaireTemplate from '../models/QuestionnaireTemplate.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';

// ========== SESSION NOTES ==========

// @desc    Create session note
// @route   POST /api/sessions/notes
export const createSessionNote = async (req, res, next) => {
  try {
    const note = await SessionNote.create({
      ...req.body,
      doctor: req.user._id,
    });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session notes for a patient
// @route   GET /api/sessions/notes/:patientId
export const getSessionNotes = async (req, res, next) => {
  try {
    const filter = { patient: req.params.patientId };

    // Patient can only see shared notes
    if (req.user.role === 'patient') {
      filter.isSharedWithPatient = true;
    } else {
      filter.doctor = req.user._id;
    }

    const notes = await SessionNote.find(filter)
      .populate('appointment', 'date time type')
      .sort({ createdAt: -1 });

    res.json({ notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Update session note
// @route   PUT /api/sessions/notes/:id
export const updateSessionNote = async (req, res, next) => {
  try {
    const note = await SessionNote.findOneAndUpdate(
      { _id: req.params.id, doctor: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ note });
  } catch (error) {
    next(error);
  }
};

// ========== QUESTIONNAIRE TEMPLATES ==========

// @desc    Create questionnaire template
// @route   POST /api/sessions/questionnaires
export const createQuestionnaireTemplate = async (req, res, next) => {
  try {
    const template = await QuestionnaireTemplate.create({
      ...req.body,
      doctor: req.user._id,
    });
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
};

// @desc    Get questionnaire templates
// @route   GET /api/sessions/questionnaires
export const getQuestionnaireTemplates = async (req, res, next) => {
  try {
    const templates = await QuestionnaireTemplate.find({ doctor: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
};

// ========== QUESTIONNAIRE RESPONSES ==========

// @desc    Submit questionnaire response
// @route   POST /api/sessions/questionnaires/respond
export const submitQuestionnaireResponse = async (req, res, next) => {
  try {
    const { templateId, appointmentId, responses } = req.body;

    // Calculate score from scale-type answers
    let totalScore = 0;
    responses.forEach(r => {
      if (r.type === 'scale' && !isNaN(r.answer)) {
        totalScore += parseInt(r.answer);
      }
    });

    const response = await QuestionnaireResponse.create({
      template: templateId,
      appointment: appointmentId,
      patient: req.user._id,
      doctor: req.body.doctorId,
      responses,
      totalScore,
    });

    res.status(201).json({ response });
  } catch (error) {
    next(error);
  }
};

// @desc    Get responses for an appointment
// @route   GET /api/sessions/questionnaires/responses/:appointmentId
export const getQuestionnaireResponses = async (req, res, next) => {
  try {
    const responses = await QuestionnaireResponse.find({
      appointment: req.params.appointmentId,
    })
      .populate('template', 'title category')
      .sort({ createdAt: -1 });

    res.json({ responses });
  } catch (error) {
    next(error);
  }
};
