import express from 'express';
import session from 'express-session';
import path from 'path';
import { DATA_DIR, initDb } from './db.js';
import routes from './routes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// --- Middleware ---

app.use(express.json({ limit: '100mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// --- API routes ---

app.use(routes);

// --- Serve uploaded images ---

app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads')));

// --- Serve frontend (production) ---

const distPath = path.resolve('dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Start ---

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('WARNING: ADMIN_PASSWORD not set. Set it as an environment variable.');
      console.warn('  Example: ADMIN_PASSWORD=your-secret-password npm start');
    }
  });
}).catch((err) => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
