import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getEngineStatuses } from '../services/engines.js';

const router = Router();

router.get('/', requireAuth, async (_, res) => {
  try {
    res.json(await getEngineStatuses());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
