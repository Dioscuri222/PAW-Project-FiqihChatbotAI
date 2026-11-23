import { describe, it, expect, vi, beforeEach } from 'vitest';
const validateChatInput = require('../../../middlewares/validateChatInput');
const ChatModel = require('../../../models/chatModel');
const { validMessages, invalidMessages } = require('../../fixtures/chat');
const { sampleProduk } = require('../../fixtures/produk');

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('middlewares/validateChatInput.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('menolak pesan kosong atau hanya spasi dengan HTTP 400', async () => {
    const res = createRes();
    const next = vi.fn();

    await validateChatInput({ body: { message: invalidMessages.kosong } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Pesan tidak boleh kosong.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('menolak jika body atau message bukan string dengan HTTP 400', async () => {
    const res = createRes();
    const next = vi.fn();

    await validateChatInput({ body: { message: 12345 } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('menolak pesan melebihi 500 karakter dengan HTTP 400', async () => {
    const res = createRes();
    const next = vi.fn();

    await validateChatInput({ body: { message: invalidMessages.terlaluPanjang } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Pesan terlalu panjang'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('memblokir percobaan prompt injection (Bahasa Indonesia & Inggris)', async () => {
    const resIndo = createRes();
    const nextIndo = vi.fn();
    await validateChatInput({ body: { message: invalidMessages.injeksiIndo } }, resIndo, nextIndo);

    expect(resIndo.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          blocked: true,
          reason: 'prompt_injection',
          sources: [],
        }),
      })
    );
    expect(nextIndo).not.toHaveBeenCalled();

    const resEng = createRes();
    const nextEng = vi.fn();
    await validateChatInput({ body: { message: invalidMessages.injeksiInggris } }, resEng, nextEng);

    expect(resEng.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          blocked: true,
          reason: 'prompt_injection',
        }),
      })
    );
    expect(nextEng).not.toHaveBeenCalled();
  });

  it('mengizinkan sapaan dan menormalisasi spasi berlebih', async () => {
    const req = { body: { message: '   Assalamualaikum   warahmatullah  ' } };
    const res = createRes();
    const next = vi.fn();
    const searchSpy = vi.spyOn(ChatModel, 'searchCatalog');

    await validateChatInput(req, res, next);

    expect(req.body.message).toBe('Assalamualaikum warahmatullah');
    expect(next).toHaveBeenCalledTimes(1);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('mengizinkan pertanyaan bertopik fiqih langsung tanpa query fallback katalog', async () => {
    const req = { body: { message: validMessages.spasiBerlebih } };
    const res = createRes();
    const next = vi.fn();
    const searchSpy = vi.spyOn(ChatModel, 'searchCatalog');

    await validateChatInput(req, res, next);

    expect(req.body.message).toBe('Bagaimana hukum wudhu saat bepergian?');
    expect(next).toHaveBeenCalledTimes(1);
    expect(searchSpy).not.toHaveBeenCalled();
  });

  it('mengizinkan pesan non-keyword jika cocok dengan katalog di database', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({
      rows: [sampleProduk],
      hasil: [sampleProduk],
    });
    const req = { body: { message: validMessages.katalogUnik } };
    const res = createRes();
    const next = vi.fn();

    await validateChatInput(req, res, next);

    expect(ChatModel.searchCatalog).toHaveBeenCalledWith(validMessages.katalogUnik, 1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('memblokir pertanyaan di luar konteks jika tidak ada kecocokan di katalog', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({
      rows: [sampleProduk],
      hasil: [],
    });
    const req = { body: { message: invalidMessages.diLuarKonteks } };
    const res = createRes();
    const next = vi.fn();

    await validateChatInput(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          blocked: true,
          reason: 'out_of_context',
          sources: [],
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('meneruskan error database ke next(err) saat fallback searchCatalog gagal', async () => {
    const dbErr = new Error('Koneksi DB putus');
    vi.spyOn(ChatModel, 'searchCatalog').mockRejectedValue(dbErr);
    const req = { body: { message: invalidMessages.diLuarKonteks } };
    const res = createRes();
    const next = vi.fn();

    await validateChatInput(req, res, next);

    expect(next).toHaveBeenCalledWith(dbErr);
  });
});
