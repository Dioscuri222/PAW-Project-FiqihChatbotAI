import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const request = require('supertest');
const db = require('../../config/database');
const gemini = require('../../config/gemini');
const loadApp = require('../setup/test-app');
const { sampleProdukList } = require('../fixtures/produk');
const {
  sampleChunks,
  validMessages,
  invalidMessages,
  geminiSuccessResponse,
} = require('../fixtures/chat');

const app = loadApp();

describe('Integration: Fitur Chat AI POST /api/chat', () => {
  const originalGeminiConfig = { ...gemini };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    Object.assign(gemini, originalGeminiConfig, {
      apiKey: 'test-gemini-api-key',
      model: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      maxRetry: 0,
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    Object.assign(gemini, originalGeminiConfig);
  });

  it('memproses pertanyaan fiqih end-to-end dari route -> middleware -> controller -> service -> model & Gemini', async () => {
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: sampleProdukList })
      .mockResolvedValueOnce({ rows: sampleChunks });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiSuccessResponse,
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: validMessages.fiqih });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reply).toContain('zakat profesi');
    expect(response.body.data.sources.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('menolak input kosong dengan HTTP 400 sebelum menyentuh service AI', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await request(app)
      .post('/api/chat')
      .send({ message: invalidMessages.kosong });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Pesan tidak boleh kosong.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('menolak pesan terlalu panjang (> 500 karakter) dengan HTTP 400', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: invalidMessages.terlaluPanjang });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Pesan terlalu panjang');
  });

  it('memblokir percobaan prompt injection di lapisan guardrail middleware', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await request(app)
      .post('/api/chat')
      .send({ message: invalidMessages.injeksiIndo });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.blocked).toBe(true);
    expect(response.body.data.reason).toBe('prompt_injection');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('memblokir pertanyaan di luar konteks jika tidak ditemukan di katalog database', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleProdukList });
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const response = await request(app)
      .post('/api/chat')
      .send({ message: invalidMessages.diLuarKonteks });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.blocked).toBe(true);
    expect(response.body.data.reason).toBe('out_of_context');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mengembalikan HTTP 502 saat layanan Gemini menolak permintaan', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'query')
      .mockResolvedValueOnce({ rows: sampleProdukList })
      .mockResolvedValueOnce({ rows: [] });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid argument',
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: validMessages.fiqih });

    expect(response.status).toBe(502);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('menolak permintaan');
  });
});
