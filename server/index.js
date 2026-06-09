import 'dotenv/config';
import express from 'express';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import path from 'path';
import { fileURLToPath } from 'url';
import { appRouter } from './routers.js';
import multer from 'multer';
import { parseUploadedFile } from './upload.js';
import { setupLingxingRoutes } from './lingxing-express-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => { if (req.url.includes("lingxing")) console.log("[EXPRESS]", req.method, req.url.substring(0,100)); next(); });
// Lingxing WMS API routes (direct express)
setupLingxingRoutes(app);

// tRPC API
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  })
);

// File upload endpoint
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/api/upload/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const result = await parseUploadedFile(req.file);
    res.json(result);
  } catch (error) {
    console.error('Upload parse error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// WMS管理页面路由
app.get("/wms", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "wms.html"));
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`AFM PickApp server running on http://0.0.0.0:${PORT}/`);
  server.keepAliveTimeout = 5000;
  server.headersTimeout = 10000;
});
