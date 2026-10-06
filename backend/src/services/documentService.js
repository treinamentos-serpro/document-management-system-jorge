class DocumentService {
  constructor(repository) {
    this.repository = repository;
  }

  async upload(file, owner) {
    if (!file || file.size === 0) {
      if (file) await this.repository.removeStoredFile(file.filename);
      const error = new Error('O arquivo enviado está vazio.');
      error.status = 400;
      error.code = 'EMPTY_FILE';
      throw error;
    }

    try {
      return this.repository.create(file, owner);
    } catch (error) {
      await this.repository.removeStoredFile(file.filename);
      throw error;
    }
  }

  list(owner) {
    return this.repository.findAllByOwner(owner);
  }

  findForDownload(id, owner) {
    return this.repository.findOwnedById(id, owner);
  }
}

module.exports = { DocumentService };