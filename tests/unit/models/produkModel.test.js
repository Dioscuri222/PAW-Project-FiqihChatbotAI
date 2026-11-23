import { describe, it, expect, vi, beforeEach } from 'vitest';
const db = require('../../../config/database');
const ProdukModel = require('../../../models/produkModel');
const {
  sampleProduk,
  sampleProdukList,
  newProdukPayload,
  updateProdukPayload,
} = require('../../fixtures/produk');

describe('models/produkModel.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAll menjalankan SELECT * FROM produk dan mengembalikan semua baris', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleProdukList });

    const hasil = await ProdukModel.getAll();

    expect(querySpy).toHaveBeenCalledWith('SELECT * FROM produk');
    expect(hasil).toEqual(sampleProdukList);
  });

  it('getById mengambil satu baris produk berdasarkan id', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [sampleProduk] });

    const hasil = await ProdukModel.getById(1);

    expect(querySpy).toHaveBeenCalledWith('SELECT * FROM produk WHERE id = $1', [1]);
    expect(hasil).toEqual(sampleProduk);
  });

  it('create menyimpan produk baru dan mengembalikan baris hasil RETURNING *', async () => {
    const created = { id: 4, ...newProdukPayload };
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [created] });

    const hasil = await ProdukModel.create(newProdukPayload);

    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO produk'),
      [
        newProdukPayload.nama,
        newProdukPayload.kategori,
        newProdukPayload.penulis,
        newProdukPayload.deskripsi,
        newProdukPayload.harga,
        newProdukPayload.stok,
        newProdukPayload.format,
      ]
    );
    expect(hasil).toEqual(created);
  });

  it('update memperbarui produk berdasarkan id dan mengembalikan baris terbaru', async () => {
    const updated = { id: 1, ...updateProdukPayload };
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [updated] });

    const hasil = await ProdukModel.update(1, updateProdukPayload);

    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE produk SET'),
      [
        updateProdukPayload.nama,
        updateProdukPayload.kategori,
        updateProdukPayload.penulis,
        updateProdukPayload.deskripsi,
        updateProdukPayload.harga,
        updateProdukPayload.stok,
        updateProdukPayload.format,
        1,
      ]
    );
    expect(hasil).toEqual(updated);
  });

  it('delete menjalankan query DELETE berdasarkan id', async () => {
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    await ProdukModel.delete(1);

    expect(querySpy).toHaveBeenCalledWith('DELETE FROM produk WHERE id = $1', [1]);
  });
});
