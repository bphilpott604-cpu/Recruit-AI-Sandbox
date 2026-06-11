import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';
import * as db from './db.js';

const router = Router();

// Multer config — save uploads directly to the uploads directory
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, db.UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now().toString(36) + randomBytes(4).toString('hex');
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

// --- Auth middleware ---

function requireAuth(req: Request, res: Response, next: () => void) {
  if ((req.session as any)?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// --- Auth routes ---

router.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: 'ADMIN_PASSWORD not configured on server' });
    return;
  }
  if (password === adminPassword) {
    (req.session as any).authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!(req.session as any)?.authenticated });
});

// --- Slideshows (protected) ---

router.get('/api/slideshows', requireAuth, (_req, res) => {
  res.json(db.getSlideshows());
});

router.post('/api/slideshows', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return; }
  res.json(db.createSlideshow(name.trim()));
});

router.get('/api/slideshows/:id', requireAuth, (req, res) => {
  const slideshow = db.getSlideshow(param(req, 'id'));
  if (!slideshow) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(slideshow);
});

router.put('/api/slideshows/:id', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return; }
  const result = db.updateSlideshow(param(req, 'id'), name.trim());
  if (!result) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(result);
});

router.delete('/api/slideshows/:id', requireAuth, (req, res) => {
  db.deleteSlideshow(param(req, 'id'));
  res.json({ ok: true });
});

// --- Slides (protected) ---

router.post('/api/slideshows/:id/slides', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('Multer upload error:', err);
      res.status(400).json({ error: err.message || 'Upload failed' });
      return;
    }

    const file = req.file;

    if (file) {
      // Multipart form upload (new approach — handles large files)
      const title = (req.body.title as string) || '';
      const description = (req.body.description as string) || '';
      const durationSeconds = parseInt(req.body.durationSeconds) || 8;
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const mediaPath = `uploads/${file.filename}`;
      try {
        const slide = db.addSlideFromFile(param(req, 'id'), title, description, durationSeconds, mediaPath, mediaType);
        res.json(slide);
      } catch (err: any) {
        console.error('DB addSlideFromFile error:', err);
        res.status(400).json({ error: err.message });
      }
    } else {
      // Legacy base64 JSON upload (for backwards compatibility)
      const { title, description, durationSeconds, imageData, mediaData } = req.body;
      const data = mediaData || imageData;
      if (!data) { res.status(400).json({ error: 'Media data required' }); return; }
      try {
        const slide = db.addSlide(param(req, 'id'), title || '', description || '', durationSeconds || 8, data);
        res.json(slide);
      } catch (err: any) {
        console.error('DB addSlide error:', err);
        res.status(400).json({ error: err.message });
      }
    }
  });
});

// NOTE: this route must be registered BEFORE the :slideId routes below,
// otherwise Express matches "reorder" as a slideId and the reorder never runs
router.put('/api/slideshows/:id/slides/reorder', requireAuth, (req, res) => {
  const { slideIds } = req.body;
  if (!Array.isArray(slideIds)) { res.status(400).json({ error: 'slideIds array required' }); return; }
  db.reorderSlides(param(req, 'id'), slideIds);
  res.json({ ok: true });
});

router.put('/api/slideshows/:slideshowId/slides/:slideId', requireAuth, (req, res) => {
  const { title, description, durationSeconds } = req.body;
  db.updateSlide(param(req, 'slideId'), { title, description, durationSeconds });
  res.json({ ok: true });
});

router.delete('/api/slideshows/:slideshowId/slides/:slideId', requireAuth, (req, res) => {
  db.deleteSlide(param(req, 'slideId'));
  res.json({ ok: true });
});

// --- Gyms (protected) ---

router.get('/api/gyms', requireAuth, (_req, res) => {
  res.json(db.getGyms());
});

router.post('/api/gyms', requireAuth, (req, res) => {
  const { name, address } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Name required' }); return; }
  res.json(db.addGym(name.trim(), address?.trim() || ''));
});

router.put('/api/gyms/:id', requireAuth, (req, res) => {
  const { name, address, assignedSlideshowId } = req.body;
  const result = db.updateGym(param(req, 'id'), { name, address, assignedSlideshowId });
  if (!result) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(result);
});

router.delete('/api/gyms/:id', requireAuth, (req, res) => {
  db.deleteGym(param(req, 'id'));
  res.json({ ok: true });
});

// --- Display (public — TVs use this) ---

router.get('/api/display/:token', (req, res) => {
  const slideshow = db.getSlideshowByDisplayToken(param(req, 'token'));
  if (!slideshow) {
    res.status(404).json({ error: 'No slideshow found for this display' });
    return;
  }
  res.json(slideshow);
});

export default router;
