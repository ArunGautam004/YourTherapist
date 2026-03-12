import SessionNote from '../models/SessionNote.js';
import QuestionnaireTemplate from '../models/QuestionnaireTemplate.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import Appointment from '../models/Appointment.js';

// ========== SESSION NOTES ==========

export const createSessionNote = async (req, res, next) => {
  try {
    // Upsert: if note for this appointment already exists, update it
    const existing = await SessionNote.findOne({ appointment: req.body.appointment });
    if (existing) {
      const updated = await SessionNote.findByIdAndUpdate(
        existing._id,
        { ...req.body, doctor: req.user._id },
        { new: true, runValidators: true }
      );
      return res.status(200).json({ note: updated });
    }

    const note = await SessionNote.create({
      ...req.body,
      doctor: req.user._id,
    });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
};

export const getSessionNotes = async (req, res, next) => {
  try {
    const filter = { patient: req.params.patientId };

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

export const getQuestionnaireTemplates = async (req, res, next) => {
  try {
    const templates = await QuestionnaireTemplate.find({ doctor: req.user._id, isActive: true })
      .sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
};

export const updateQuestionnaireTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, diseaseName, testName, answerType, category, questions } = req.body;

    const template = await QuestionnaireTemplate.findOneAndUpdate(
      { _id: id, doctor: req.user._id },
      { title, description, diseaseName, testName, answerType, category, questions },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found or unauthorized' });
    }

    res.json({ message: 'Template updated successfully', template });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestionnaireTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await QuestionnaireTemplate.findOneAndDelete({ _id: id, doctor: req.user._id });
    if (!template) {
      return res.status(404).json({ message: 'Template not found or unauthorized' });
    }
    await QuestionnaireResponse.deleteMany({ template: id });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getQuestionnairesByDisease = async (req, res, next) => {
  try {
    const templates = await QuestionnaireTemplate.find({
      doctor: req.user._id,
      diseaseName: { $regex: req.params.diseaseName, $options: 'i' },
      isActive: true,
    }).sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
};

export const getDiseaseList = async (req, res, next) => {
  try {
    const diseases = await QuestionnaireTemplate.distinct('diseaseName', {
      doctor: req.user._id,
      isActive: true,
    });
    res.json({ diseases });
  } catch (error) {
    next(error);
  }
};

// ========== QUESTIONNAIRE RESPONSES ==========

export const submitQuestionnaireResponse = async (req, res, next) => {
  try {
    const { templateId, appointmentId, responses, doctorId } = req.body;

    // Guard: appointmentId must be a valid 24-char MongoDB ObjectId
    if (!appointmentId || appointmentId.length !== 24) {
      return res.status(400).json({
        message: 'Invalid appointmentId. Must be the MongoDB _id of the appointment, not the meeting room URL.',
      });
    }
    if (!templateId || !responses?.length) {
      return res.status(400).json({ message: 'templateId and responses are required' });
    }

    let totalScore = 0;
    responses.forEach(r => {
      if (r.type === 'scale' && !isNaN(r.answer)) {
        totalScore += parseInt(r.answer);
      }
    });

    // Upsert: one response per patient per appointment per template
    const existing = await QuestionnaireResponse.findOne({
      template: templateId,
      appointment: appointmentId,
      patient: req.user._id,
    });

    let response;
    if (existing) {
      response = await QuestionnaireResponse.findByIdAndUpdate(
        existing._id,
        { responses, totalScore, doctor: doctorId },
        { new: true }
      );
    } else {
      response = await QuestionnaireResponse.create({
        template: templateId,
        appointment: appointmentId,
        patient: req.user._id,
        doctor: doctorId,
        responses,
        totalScore,
      });
    }

    res.status(201).json({ response });
  } catch (error) {
    next(error);
  }
};

export const getQuestionnaireResponses = async (req, res, next) => {
  try {
    const responses = await QuestionnaireResponse.find({
      appointment: req.params.appointmentId,
    })
      .populate('template', 'title category diseaseName testName')
      .sort({ createdAt: -1 });

    res.json({ responses });
  } catch (error) {
    next(error);
  }
};

// ========== SESSION DETAIL ==========

// Works for both doctor (any appointment) and patient (only their own appointments)
export const getSessionDetail = async (req, res, next) => {
  try {
    const appointmentId = req.params.appointmentId;

    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name specialization profilePic')
      .populate('patient', 'name email profilePic');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Patients can only view their own session details
    if (
      req.user.role === 'patient' &&
      appointment.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build session note query
    const noteFilter = { appointment: appointmentId };
    // Patients only see shared notes
    if (req.user.role === 'patient') {
      noteFilter.isSharedWithPatient = true;
    }

    const [sessionNote, questionnaireResponses] = await Promise.all([
      SessionNote.findOne(noteFilter),
      QuestionnaireResponse.find({ appointment: appointmentId })
        .populate('template', 'title category diseaseName testName questions')
        .sort({ createdAt: -1 }),
    ]);

    res.json({
      appointment,
      sessionNote,
      questionnaireResponses,
    });
  } catch (error) {
    next(error);
  }
};

// ========== PATIENT SESSION HISTORY ==========
// @desc    Get all sessions with notes + responses for the logged-in patient
// @route   GET /api/sessions/my-history
export const getPatientSessionHistory = async (req, res, next) => {
  try {
    const patientId = req.user._id;

    // Get all appointments for this patient
    const appointments = await Appointment.find({ patient: patientId })
      .populate('doctor', 'name specialization profilePic')
      .sort({ date: -1 });

    // For each appointment, fetch note + questionnaire responses in parallel
    const sessions = await Promise.all(
      appointments.map(async (apt) => {
        const [sessionNote, questionnaireResponses] = await Promise.all([
          SessionNote.findOne({
            appointment: apt._id,
            isSharedWithPatient: true,
          }),
          QuestionnaireResponse.find({ appointment: apt._id, patient: patientId })
            .populate('template', 'title category diseaseName testName questions')
            .sort({ createdAt: -1 }),
        ]);

        return {
          appointment: apt,
          sessionNote,
          questionnaireResponses,
        };
      })
    );

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};