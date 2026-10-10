import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, token: 'demo-token' });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
