const multer = require('multer');

function createErrorHandler() {
  return (error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE';
      const status = tooLarge ? 413 : 400;
      return response.status(status).json({
        error: {
          code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: tooLarge ? 'O arquivo excede o limite permitido.' : 'Não foi possível processar o upload.',
        },
      });
    }

    const status = error.status || 500;
    return response.status(status).json({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: status < 500 ? error.message : 'Ocorreu um erro interno. Tente novamente.',
      },
    });
  };
}

module.exports = { createErrorHandler };