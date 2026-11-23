import { beforeEach, vi } from 'vitest';
const fs = require('fs');

// Pastikan environment pengujian aman dan tidak bergantung pada .env asli
process.env.NODE_ENV = 'test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-api-key';
process.env.GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
process.env.GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite';
process.env.GEMINI_TIMEOUT_MS = process.env.GEMINI_TIMEOUT_MS || '5000';

// Cegah middleware logger menulis ke logs/logger.md selama pengujian berjalan
beforeEach(() => {
  vi.spyOn(fs, 'appendFile').mockImplementation((_filePath, _data, cb) => {
    if (typeof cb === 'function') cb(null);
  });
});
