import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import { randomBytes } from 'crypto';
import fs from 'fs';

const DATA_DIR = path.resolve('data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'slideshows.db');

let db: SqlJsDatabase;

/** Persist the in-memory database to disk */
function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/** Initialise sql.js – MUST be awaited before any other export is used */
export async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS slideshows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS slides (
      id TEXT PRIMARY KEY,
      slideshow_id TEXT NOT NULL,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_path TEXT NOT NULL,
      media_type TEXT DEFAULT 'image',
      duration_seconds INTEGER DEFAULT 8,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (slideshow_id) REFERENCES slideshows(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gyms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      display_token TEXT UNIQUE NOT NULL,
      assigned_slideshow_id TEXT,
      FOREIGN KEY (assigned_slideshow_id) REFERENCES slideshows(id) ON DELETE SET NULL
    )
  `);

  persist();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert an sql.js exec() result into an array of plain objects */
function execAsObjects(sql: string, params?: any[]): any[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** Get a single row as a plain object, or null */
function getOne(sql: string, params?: any[]): any | null {
  const rows = execAsObjects(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function genId(): string {
  return Date.now().toString(36) + randomBytes(4).toString('hex');
}

function genToken(): string {
  return randomBytes(16).toString('hex');
}

// ---------------------------------------------------------------------------
// Slideshows
// ---------------------------------------------------------------------------

export function getSlideshows() {
  return execAsObjects(`
    SELECT s.*, COUNT(sl.id) as slide_count
    FROM slideshows s
    LEFT JOIN slides sl ON sl.slideshow_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
}

export function getSlideshow(id: string) {
  const slideshow = getOne('SELECT * FROM slideshows WHERE id = ?', [id]);
  if (!slideshow) return null;
  slideshow.slides = execAsObjects(
    'SELECT * FROM slides WHERE slideshow_id = ? ORDER BY sort_order ASC',
    [id]
  );
  return slideshow;
}

export function createSlideshow(name: string) {
  const id = genId();
  const now = new Date().toISOString();
  db.run('INSERT INTO slideshows (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [id, name, now, now]);
  persist();
  return getSlideshow(id);
}

export function updateSlideshow(id: string, name: string) {
  db.run("UPDATE slideshows SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
  persist();
  return getSlideshow(id);
}

export function deleteSlideshow(id: string) {
  const slides = execAsObjects('SELECT image_path FROM slides WHERE slideshow_id = ?', [id]);
  for (const slide of slides) {
    const fullPath = path.join(DATA_DIR, slide.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
  db.run('DELETE FROM slideshows WHERE id = ?', [id]);
  persist();
}

// ---------------------------------------------------------------------------
// Slides
// ---------------------------------------------------------------------------

export function addSlide(slideshowId: string, title: string, description: string, durationSeconds: number, base64Data: string) {
  const id = genId();
  const maxOrder = getOne('SELECT MAX(sort_order) as max_order FROM slides WHERE slideshow_id = ?', [slideshowId]);
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  // Save media to disk (image or video)
  const match = base64Data.match(/^data:((image|video)\/[\w+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid media data — must be an image or video');
  const mimeType = match[1];
  const mediaType = match[2]; // 'image' or 'video'
  const ext = mimeType.split('/')[1].replace('+', '') || (mediaType === 'video' ? 'mp4' : 'png');
  const buffer = Buffer.from(match[3], 'base64');
  const filename = `${id}.${ext}`;
  const mediaPath = `uploads/${filename}`;
  fs.writeFileSync(path.join(DATA_DIR, mediaPath), buffer);

  db.run(`
    INSERT INTO slides (id, slideshow_id, title, description, image_path, media_type, duration_seconds, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, slideshowId, title, description, mediaPath, mediaType, durationSeconds, sortOrder]);

  db.run("UPDATE slideshows SET updated_at = datetime('now') WHERE id = ?", [slideshowId]);
  persist();
  return getOne('SELECT * FROM slides WHERE id = ?', [id]);
}

export function updateSlide(slideId: string, updates: { title?: string; description?: string; durationSeconds?: number }) {
  const parts: string[] = [];
  const values: any[] = [];
  if (updates.title !== undefined) { parts.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { parts.push('description = ?'); values.push(updates.description); }
  if (updates.durationSeconds !== undefined) { parts.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
  if (parts.length === 0) return;
  values.push(slideId);
  db.run(`UPDATE slides SET ${parts.join(', ')} WHERE id = ?`, values);

  const slide = getOne('SELECT slideshow_id FROM slides WHERE id = ?', [slideId]);
  if (slide) {
    db.run("UPDATE slideshows SET updated_at = datetime('now') WHERE id = ?", [slide.slideshow_id]);
  }
  persist();
}

export function deleteSlide(slideId: string) {
  const slide = getOne('SELECT * FROM slides WHERE id = ?', [slideId]);
  if (!slide) return;
  const fullPath = path.join(DATA_DIR, slide.image_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.run('DELETE FROM slides WHERE id = ?', [slideId]);
  db.run("UPDATE slideshows SET updated_at = datetime('now') WHERE id = ?", [slide.slideshow_id]);
  persist();
}

export function reorderSlides(slideshowId: string, slideIds: string[]) {
  slideIds.forEach((id, index) => {
    db.run('UPDATE slides SET sort_order = ? WHERE id = ? AND slideshow_id = ?', [index, id, slideshowId]);
  });
  db.run("UPDATE slideshows SET updated_at = datetime('now') WHERE id = ?", [slideshowId]);
  persist();
}

// ---------------------------------------------------------------------------
// Gyms
// ---------------------------------------------------------------------------

export function getGyms() {
  return execAsObjects('SELECT * FROM gyms ORDER BY name ASC');
}

export function addGym(name: string, address: string) {
  const id = genId();
  const token = genToken();
  db.run('INSERT INTO gyms (id, name, address, display_token) VALUES (?, ?, ?, ?)', [id, name, address, token]);
  persist();
  return getOne('SELECT * FROM gyms WHERE id = ?', [id]);
}

export function updateGym(id: string, updates: { name?: string; address?: string; assignedSlideshowId?: string | null }) {
  const parts: string[] = [];
  const values: any[] = [];
  if (updates.name !== undefined) { parts.push('name = ?'); values.push(updates.name); }
  if (updates.address !== undefined) { parts.push('address = ?'); values.push(updates.address); }
  if (updates.assignedSlideshowId !== undefined) { parts.push('assigned_slideshow_id = ?'); values.push(updates.assignedSlideshowId); }
  if (parts.length === 0) return;
  values.push(id);
  db.run(`UPDATE gyms SET ${parts.join(', ')} WHERE id = ?`, values);
  persist();
  return getOne('SELECT * FROM gyms WHERE id = ?', [id]);
}

export function deleteGym(id: string) {
  db.run('DELETE FROM gyms WHERE id = ?', [id]);
  persist();
}

// ---------------------------------------------------------------------------
// Display (public, token-based)
// ---------------------------------------------------------------------------

export function getSlideshowByDisplayToken(token: string) {
  const gym = getOne('SELECT * FROM gyms WHERE display_token = ?', [token]);
  if (!gym || !gym.assigned_slideshow_id) return null;
  return getSlideshow(gym.assigned_slideshow_id);
}

export { UPLOADS_DIR, DATA_DIR };
