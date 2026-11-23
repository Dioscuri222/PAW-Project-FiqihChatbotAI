import { describe, it, expect, vi, beforeEach } from 'vitest';
const db = require('../../../config/database');
const ProdukModel = require('../../../models/produkModel');
const ChatModel = require('../../../models/chatModel');
const { sampleProdukList } = require('../../fixtures/produk');
const { sampleChunks } = require('../../fixtures/chat');

describe('models/chatModel.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('tokenize', () => {
    it('mengubah ke huruf kecil, menghapus tanda baca, kata pendek, dan stopwords', () => {
      const tokens = ChatModel.tokenize('Apakah hukumnya zakat profesi di zaman modern?');
      expect(tokens).toEqual(['zakat', 'profesi', 'zaman', 'modern']);
    });

    it('mengembalikan array kosong jika hanya berisi stopwords atau kata <= 2 huruf', () => {
      expect(ChatModel.tokenize('apa di ke ini itu')).toEqual([]);
    });
  });

  describe('getCatalog', () => {
    it('mengembalikan seluruh daftar produk dari ProdukModel.getAll', async () => {
      vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);

      const hasil = await ChatModel.getCatalog();

      expect(hasil).toEqual(sampleProdukList);
    });
  });

  describe('searchCatalog', () => {
    it('mengurutkan modul katalog berdasarkan skor relevansi tertinggi dan membatasi hasil', async () => {
      vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);

      const { rows, hasil } = await ChatModel.searchCatalog('zakat profesi qaradhawi', 2);

      expect(rows).toHaveLength(3);
      expect(hasil).toHaveLength(2);
      expect(hasil[0].nama).toBe('Hukum Zakat Kontemporer');
    });

    it('mengembalikan hasil kosong jika tidak ada modul yang cocok', async () => {
      vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);

      const { hasil } = await ChatModel.searchCatalog('astronomi roket');

      expect(hasil).toEqual([]);
    });
  });

  describe('searchChunks', () => {
    it('mengembalikan array kosong tanpa query DB jika tidak ada token bermakna', async () => {
      const querySpy = vi.spyOn(db, 'query');

      const hasil = await ChatModel.searchChunks('apa ini dan itu');

      expect(hasil).toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('memperluas varian ejaan, menghapus awalan, dan mengembalikan potongan teks dari fatwa_chunk', async () => {
      const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleChunks });

      const hasil = await ChatModel.searchChunks('berwudhu sholat', 3);

      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('FROM fatwa_chunk');
      expect(params).toContain('berwudhu');
      expect(params).toContain('wudhu');
      expect(params).toContain('shalat');
      expect(hasil).toEqual(sampleChunks);
    });

    it('mengembalikan array kosong jika tabel fatwa_chunk belum ada (kode error 42P01)', async () => {
      const err = Object.assign(new Error('relation "fatwa_chunk" does not exist'), { code: '42P01' });
      vi.spyOn(db, 'query').mockRejectedValue(err);

      const hasil = await ChatModel.searchChunks('zakat profesi');

      expect(hasil).toEqual([]);
    });

    it('melempar ulang error database selain 42P01', async () => {
      const err = Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' });
      vi.spyOn(db, 'query').mockRejectedValue(err);

      await expect(ChatModel.searchChunks('zakat profesi')).rejects.toThrow('Connection refused');
    });
  });
});
