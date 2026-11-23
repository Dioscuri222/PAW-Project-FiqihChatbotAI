import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const gemini = require('../../../config/gemini');
const ChatModel = require('../../../models/chatModel');
const geminiService = require('../../../services/geminiService');
const { sampleProdukList, sampleProduk } = require('../../fixtures/produk');
const {
  sampleChunks,
  geminiSuccessResponse,
  geminiMaxTokensResponse,
  geminiTidakAdaResponse,
  geminiImplicitNoAnswerResponse,
  geminiBlockedResponse,
  geminiEmptyResponse,
} = require('../../fixtures/chat');

describe('services/geminiService.js', () => {
  const originalGeminiConfig = { ...gemini };

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(gemini, originalGeminiConfig, {
      apiKey: 'test-api-key',
      model: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      maxRetry: 0,
      timeoutMs: 5000,
    });
  });

  afterEach(() => {
    Object.assign(gemini, originalGeminiConfig);
  });

  it('mengirim konteks katalog + chunks ke Gemini dan mengembalikan balasan beserta sumber unik', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({
      rows: sampleProdukList,
      hasil: [sampleProduk, sampleProduk], // duplikat disengaja untuk uji deduplikasi sumber
    });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue(sampleChunks);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiSuccessResponse,
    });

    const result = await geminiService.tanya('Bagaimana hukum zakat profesi?');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('gemini-flash-lite-latest:generateContent');
    expect(options.headers['x-goog-api-key']).toBe('test-api-key');

    const sentBody = JSON.parse(options.body);
    const systemText = sentBody.systemInstruction.parts[0].text;
    expect(systemText).toContain('[KONTEKS APLIKASI]');
    expect(systemText).toContain('Hukum Zakat - Yusuf Al Qardhawi.pdf');
    expect(systemText).toContain('Hukum Zakat Kontemporer');

    expect(result.reply).toContain('2,5%');
    // 2 chunks + 1 katalog unik (duplikat dibuang)
    expect(result.sources).toHaveLength(3);
  });

  it('menghapus penanda [[TIDAK_ADA]] dan mengosongkan daftar sumber', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiTidakAdaResponse,
    });

    const result = await geminiService.tanya('Pertanyaan tanpa data di korpus');

    expect(result.reply).not.toContain('[[TIDAK_ADA]]');
    expect(result.reply).toContain('belum tersedia');
    expect(result.sources).toEqual([]);
  });

  it('mengosongkan sumber jika balasan mengandung indikasi belum tersedia di awal teks', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({
      rows: sampleProdukList,
      hasil: [sampleProduk],
    });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue(sampleChunks);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiImplicitNoAnswerResponse,
    });

    const result = await geminiService.tanya('Apakah ada fatwa kripto terbaru?');

    expect(result.sources).toEqual([]);
  });

  it('menambahkan catatan pemotongan jika finishReason adalah MAX_TOKENS', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: sampleProdukList, hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiMaxTokensResponse,
    });

    const result = await geminiService.tanya('Jelaskan seluruh kitab zakat');

    expect(result.reply).toContain('(Jawaban terpotong karena terlalu panjang.');
  });

  it('melempar AppError 503 jika GEMINI_API_KEY belum dikonfigurasi', async () => {
    gemini.apiKey = '';
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);

    await expect(geminiService.tanya('Hukum zakat?')).rejects.toMatchObject({
      status: 503,
      message: 'Layanan AI belum dikonfigurasi di server.',
    });
  });

  it('melempar AppError 422 jika prompt diblokir oleh filter keamanan Gemini', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiBlockedResponse,
    });

    await expect(geminiService.tanya('Pertanyaan diblokir')).rejects.toMatchObject({
      status: 422,
    });
  });

  it('melempar AppError 502 jika respons Gemini tidak memiliki teks', async () => {
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => geminiEmptyResponse,
    });

    await expect(geminiService.tanya('Hukum puasa')).rejects.toMatchObject({
      status: 502,
    });
  });

  it('beralih ke model cadangan saat model utama mengembalikan HTTP 429/503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: sampleProdukList, hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Quota exceeded',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => geminiSuccessResponse,
      });

    const result = await geminiService.tanya('Hukum zakat profesi');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1][0]).toContain('gemini-3.1-flash-lite:generateContent');
    expect(result.reply).toContain('2,5%');
  });

  it('melempar AppError 502 tanpa fallback saat Gemini menolak dengan HTTP 400', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    await expect(geminiService.tanya('Hukum zakat')).rejects.toMatchObject({
      status: 502,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('melempar AppError 504 ketika request timeout (AbortError) dan fallback juga gagal', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);

    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(abortErr);

    await expect(geminiService.tanya('Hukum zakat')).rejects.toMatchObject({
      status: 504,
    });
  });

  it('melempar AppError 503 ketika terjadi gangguan jaringan dan retry habis', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    gemini.fallbackModel = '';
    gemini.maxRetry = 0;

    vi.spyOn(ChatModel, 'searchCatalog').mockResolvedValue({ rows: [], hasil: [] });
    vi.spyOn(ChatModel, 'searchChunks').mockResolvedValue([]);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

    await expect(geminiService.tanya('Hukum zakat')).rejects.toMatchObject({
      status: 503,
    });
  });
});
