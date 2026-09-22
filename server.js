import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3000;
const DIST = join(__dirname, 'dist');

// Serve every static asset (JS, CSS, images, etc.) from dist/
app.use(express.static(DIST));

// SPA catch-all — for any URL that isn't a real file, return index.html
// and let React Router decide what to render.
app.get('*', (_req, res) => {
  res.sendFile(join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server listening on port ${PORT}`);
});
