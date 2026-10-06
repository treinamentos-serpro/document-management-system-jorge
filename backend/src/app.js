const express = require('express');
const path = require('node:path');
const multer = require('multer');
const { DocumentRepository } = require('./repositories/documentRepository');
const { DocumentService } = require('./services/documentService');
const { createDocumentController } = require('./controllers/documentController');
const { createDocumentRoutes } = require('./routes/documentRoutes');
const { createErrorHandler } = require('./middleware/errorHandler');

function createApp(options = {}) {
  const storageDir = options.storageDir || process.env.STORAGE_DIR || path.resolve(__dirname, '../storage');
  const configuredLimit = Number(process.env.MAX_FILE_SIZE_BYTES);
  const maxFileSizeBytes = options.maxFileSizeBytes || (configuredLimit > 0 ? configuredLimit : 10 * 1024 * 1024);
  const repository = options.repository || new DocumentRepository(storageDir);
  const service = options.service || new DocumentService(repository);
  const controller = createDocumentController(service);
  const upload = multer({
    storage: multer.diskStorage({
      destination: storageDir,
      filename: (_request, _file, callback) => callback(null, require('node:crypto').randomUUID()),
    }),
    limits: { fileSize: maxFileSizeBytes, files: 1 },
  });

  const app = express();
  app.use(express.json());
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use(createDocumentRoutes({ controller, upload }));
  app.use(createErrorHandler());

  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

app.createApp = createApp;
module.exports = app;
