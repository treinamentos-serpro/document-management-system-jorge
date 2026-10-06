const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function createDocumentController(service) {
  function requireUser(request, _response, next) {
    const owner = request.get('X-User-Id')?.trim();
    if (!owner || owner.length > 128) {
      return next(createHttpError(400, 'INVALID_USER', 'Informe um identificador de usuário válido.'));
    }
    request.owner = owner;
    return next();
  }

  return {
    requireUser,

    async upload(request, response, next) {
      try {
        if (!request.file) {
          throw createHttpError(400, 'FILE_REQUIRED', 'Selecione um arquivo para enviar.');
        }
        const document = await service.upload(request.file, request.owner);
        return response.status(201).json(document);
      } catch (error) {
        return next(error);
      }
    },

    list(request, response, next) {
      try {
        return response.json(service.list(request.owner));
      } catch (error) {
        return next(error);
      }
    },

    download(request, response, next) {
      if (!DOCUMENT_ID_PATTERN.test(request.params.id)) {
        return next(createHttpError(400, 'INVALID_DOCUMENT_ID', 'O identificador do documento é inválido.'));
      }

      const document = service.findForDownload(request.params.id, request.owner);
      if (!document) {
        return next(createHttpError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
      }

      return response.download(document.storagePath, document.metadata.originalName, (error) => {
        if (!error) return;
        if (error.code === 'ENOENT' && !response.headersSent) {
          return response.status(404).json({
            error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
          });
        }
        if (!response.headersSent) return next(error);
        return response.destroy(error);
      });
    },
  };
}

module.exports = { createDocumentController };