const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

class DocumentRepository {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.documents = new Map();
    fs.mkdirSync(storageDir, { recursive: true });
  }

  create(file, owner) {
    const metadata = {
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
    };

    this.documents.set(metadata.id, {
      metadata,
      storagePath: path.join(this.storageDir, file.filename),
    });

    return metadata;
  }

  findAllByOwner(owner) {
    return [...this.documents.values()]
      .filter((document) => document.metadata.owner === owner)
      .map((document) => document.metadata)
      .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
  }

  findOwnedById(id, owner) {
    const document = this.documents.get(id);
    if (!document || document.metadata.owner !== owner) return null;
    return document;
  }

  async removeStoredFile(filename) {
    try {
      await fs.promises.unlink(path.join(this.storageDir, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = { DocumentRepository };