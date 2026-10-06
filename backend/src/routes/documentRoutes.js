const express = require('express');

function createDocumentRoutes({ controller, upload }) {
  const router = express.Router();
  router.post('/upload', controller.requireUser, upload.single('file'), controller.upload);
  router.get('/documents', controller.requireUser, controller.list);
  router.get('/documents/:id/download', controller.requireUser, controller.download);
  return router;
}

module.exports = { createDocumentRoutes };