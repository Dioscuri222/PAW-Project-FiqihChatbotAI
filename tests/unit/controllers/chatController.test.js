import { describe, it, expect, vi, beforeEach } from 'vitest';
const chatController = require('../../../controllers/chatController');
const geminiService = require('../../../services/geminiService');
const config = require('../../../config');
const gemini = require('../../../config/gemini');

function createRes() {
  return {
    render: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('controllers/chatController.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('page merender view chat dengan konfigurasi yang benar', () => {
    const res = createRes();

    chatController.page({}, res);

    expect(res.render).toHaveBeenCalledWith('chat', {
      judul: `${config.appName} - Tanya Fiqih (AI Assistant)`,
      config,
      maxLength: gemini.maxMessageLength,
    });
  });

  it('chat mengembalikan balasan dan sumber rujukan saat berhasil', async () => {
    const mockResult = {
      reply: 'Zakat profesi wajib jika mencapai nisab.',
      sources: [{ judul: 'Hukum Zakat - Yusuf Al Qardhawi.pdf', halaman: 45 }],
    };
    vi.spyOn(geminiService, 'tanya').mockResolvedValue(mockResult);
    const res = createRes();

    await chatController.chat({ body: { message: 'Hukum zakat profesi?' } }, res);

    expect(geminiService.tanya).toHaveBeenCalledWith('Hukum zakat profesi?');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockResult,
    });
  });

  it('chat mengembalikan status error terkendali saat AppError dilempar', async () => {
    const appErr = new geminiService.AppError(503, 'Layanan AI sedang sibuk.');
    vi.spyOn(geminiService, 'tanya').mockRejectedValue(appErr);
    const res = createRes();

    await chatController.chat({ body: { message: 'Hukum zakat?' } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Layanan AI sedang sibuk.',
    });
  });

  it('chat mengembalikan HTTP 500 dan mencatat error untuk kesalahan tak terduga', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(geminiService, 'tanya').mockRejectedValue(new Error('Unexpected crash'));
    const res = createRes();

    await chatController.chat({ body: { message: 'Hukum zakat?' } }, res);

    expect(errorSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    });
  });
});
