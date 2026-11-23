import { describe, it, expect, vi, beforeEach } from 'vitest';
const EventEmitter = require('events');
const fs = require('fs');
const logger = require('../../../middlewares/logger');

describe('middlewares/logger.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('memanggil next dan mencatat log ke console serta file Markdown saat response selesai', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const appendSpy = vi.spyOn(fs, 'appendFile').mockImplementation((_p, _data, cb) => cb(null));

    const req = {
      method: 'GET',
      originalUrl: '/api/produk?q=a|b',
      ip: '127.0.0.1|local',
    };
    const res = Object.assign(new EventEmitter(), { statusCode: 200 });
    const next = vi.fn();

    logger(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    res.emit('finish');

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain('GET /api/produk?q=a|b - Status: 200');
    expect(appendSpy).toHaveBeenCalledTimes(1);
    const writtenLine = appendSpy.mock.calls[0][1];
    expect(writtenLine).toContain('| GET | /api/produk?q=a%7Cb | 200 |');
    expect(writtenLine).toContain('| 127.0.0.1%7Clocal |');
  });

  it('menampilkan console.error jika fs.appendFile gagal', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(fs, 'appendFile').mockImplementation((_p, _data, cb) =>
      cb(new Error('Disk penuh'))
    );

    const req = { method: 'POST', originalUrl: '/api/chat', ip: '::1' };
    const res = Object.assign(new EventEmitter(), { statusCode: 200 });
    const next = vi.fn();

    logger(req, res, next);
    res.emit('finish');

    expect(errorSpy).toHaveBeenCalledWith('Gagal menulis log ke file:', 'Disk penuh');
  });
});
