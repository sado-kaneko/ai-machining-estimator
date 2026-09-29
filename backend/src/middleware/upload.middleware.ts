import multer from 'multer';
import { envConfig } from '../config/env';

// メモリストレージによる安全な一時バッファ保持
const storage = multer.memoryStorage();

export const uploadPdf = multer({
  storage,
  limits: {
    fileSize: envConfig.upload.maxUploadMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});
