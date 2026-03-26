import Database from 'better-sqlite3';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';

const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'slideshows.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---

db.exec(`
  CREATE TABLE IF NOT EXISTS slideshows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    slideshow_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_path TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 8,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (slideshow_id) REFERENCES slideshows(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gyms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT DEFAULT '',
    display_token TEXT UNIQUE NOT NULL,
    assigned_slideshow_id TEXT,
    FOREIGN KEY (assigned_slideshow_id) REFERENCES slideshows(id) ON DELETE SET NULL
  );
`);

// --- Helpers ---

function genId(): string {
  return Date.now().toString(36) + randomBytes(4).toString('hex');
}

function genToken(): string {
  return randomBytes(16).toString('hex');
}

// --- Slideshows ---

export function getSlideshows() {
  const rows = db.prepare(`
    SELECT s.*, COUNT(sl.id) as slide_count
    FROM slideshows s
    LEFT JOIN slides sl ON sl.slideshow_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all() as any[];
  return rows;
}

export function getSlideshow(id: string) {
  const slideshow = db.prepare('SELECT * FROM slideshows WHERE id = ?').get(id) as any;
  if (!slideshow) return null;
  slideshow.slides = db.prepare(
    'SELECT * FROM slides WHERE slideshow_id = ? ORDER BY sort_order ASC'
  ).all(id);
  return slideshow;
}

export function createSlideshow(name: string) {
  const id = genId();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO slideshows (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
  return getSlideshow(id);
}

export function updateSlideshow(id: string, name: string) {
  db.prepare('UPDATE slideshows SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, id);
  return getSlideshow(id);
}

export function deleteSlideshow(id: string) {
  // Delete associated image files
  const slides = db.prepare('SELECT image_path FROM slides WHERE slideshow_id = ?').all(id) as any[];
  for (const slide of slides) {
    const fullPath = path.join(DATA_DIR, slide.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
  db.prepare('DELETE FROM slideshows WHERE id = ?').run(id);
}

// --- Slides ---

export function addSlide(slideshowId: string, title: string, description: string, durationSeconds: number, base64Image: string) {
  const id = genId();
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM slides WHERE slideshow_id = ?').get(slideshowId) as any;
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  // Save image to disk
  const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data');
  const ext = match[1].split('/')[1] || 'png';
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${id}.${ext}`;
  const imagePath = `uploads/${filename}`;
  fs.writeFileSync(path.join(DATA_DIR, imagePath), buffer);

  db.prepare(`
    INSERT INTO slides (id, slideshow_id, title, description, image_path, duration_seconds, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, slideshowId, title, description, imagePath, durationSeconds, sortOrder);

  db.prepare('UPDATE slideshows SET updated_at = datetime(\'now\') WHERE id = ?').run(slideshowId);
  return db.prepare('SELECT * FROM slides WHERE id = ?').get(id);
}

export function updateSlide(slideId: string, updates: { title?: string; description?: string; durationSeconds?: number }) {
  const parts: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { parts.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { parts.push('description = ?'); values.push(updates.description); }
  if (updates.durationSeconds !== undefined) { parts.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
  if (parts.length === 0) return;
  values.push(slideId);
  db.prepare(`UPDATE slides SET ${parts.join(', ')} WHERE id = ?`).run(...values);

  // Update slideshow timestamp
  const slide = db.prepare('SELECT slideshow_id FROM slides WHERE id = ?').get(slideId) as any;
  if (slide) {
    db.prepare('UPDATE slideshows SET updated_at = datetime(\'now\') WHERE id = ?').run(slide.slideshow_id);
  }
}

export function deleteSlide(slideId: string) {
  const slide = db.prepare('SELECT * FROM slides WHERE id = ?').get(slideId) as any;
  if (!slide) return;
  // Delete image file
  const fullPath = path.join(DATA_DIR, slide.image_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.prepare('DELETE FROM slides WHERE id = ?').run(slideId);
  db.prepare('UPDATE slideshows SET updated_at = datetime(\'now\') WHERE id = ?').run(slide.slideshow_id);
}

export function reorderSlides(slideshowId: string, slideIds: string[]) {
  const stmt = db.prepare('UPDATE slides SET sort_order = ? WHERE id = ? AND slideshow_id = ?');
  const transaction = db.transaction(() => {
    slideIds.forEach((id, index) => stmt.run(index, id, slideshowId));
  });
  transaction();
  db.prepare('UPDATE slideshows SET updated_at = datetime(\'now\') WHERE id = ?').run(slideshowId);
}

// --- Gyms ---

export function getGyms() {
  return db.prepare('SELECT * FROM gyms ORDER BY name ASC').all();
}

export function addGym(name: string, address: string) {
  const id = genId();
  const token = genToken();
  db.prepare('INSERT INTO gyms (id, name, address, display_token) VALUES (?, ?, ?, ?)').run(id, name, address, token);
  return db.prepare('SELECT * FROM gyms WHERE id = ?').get(id);
}

export function updateGym(id: string, updates: { name?: string; address?: string; assignedSlideshowId?: string | null }) {
  const parts: string[] = [];
  const values: any[] = [];
  if (updates.name !== undefined) { parts.push('name = ?'); values.push(updates.name); }
  if (updates.address !== undefined) { parts.push('address = ?'); values.push(updates.address); }
  if (updates.assignedSlideshowId !== undefined) { parts.push('assigned_slideshow_id = ?'); values.push(updates.assignedSlideshowId); }
  if (parts.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE gyms SET ${parts.join(', ')} WHERE id = ?`).run(...values);
  return db.prepare('SELECT * FROM gyms WHERE id = ?').get(id);
}

export function deleteGym(id: string) {
  db.prepare('DELETE FROM gyms WHERE id = ?').run(id);
}

// --- Display (public, token-based) ---

export function getSlideshowByDisplayToken(token: string) {
  const gym = db.prepare('SELECT * FROM gyms WHERE display_token = ?').get(token) as any;
  if (!gym || !gym.assigned_slideshow_id) return null;
  const slideshow = getSlideshow(gym.assigned_slideshow_id);
  return slideshow;
}

export { UPLOADS_DIR, DATA_DIR };
