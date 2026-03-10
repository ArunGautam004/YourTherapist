import express from 'express';
import { createMoodEntry, getMoodEntries, deleteMoodEntry } from '../controllers/moodController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/').get(getMoodEntries).post(createMoodEntry);
router.delete('/:id', deleteMoodEntry);

export default router;
