import { describe, it, expect, vi, beforeEach } from 'vitest';
const ProdukModel = require('../../../models/produkModel');
const apiController = require('../../../controllers/apiController');
const {
  sampleProduk,
  sampleProdukList,
  newProdukPayload,
  updateProdukPayload,
} = require('../../fixtures/produk');

function createRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe('controllers/apiController.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('status mengembalikan informasi status server dan metadata aplikasi', () => {
    const res = createRes();
    apiController.status({}, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        kelas: 'E',
        metodePengembangan: 'Waterfall',
        uptimeDetik: expect.any(Number),
        waktuServer: expect.any(String),
      })
    );
  });

  it('produk mengembalikan daftar produk terbungkus objek sukses', async () => {
    vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);
    const res = createRes();

    await apiController.produk({ query: {} }, res);

    expect(res.json).toHaveBeenCalledWith({
      sukses: true,
      jumlah: sampleProdukList.length,
      data: sampleProdukList,
    });
  });

  it('produk mengembalikan array murni saat query format=array', async () => {
    vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);
    const res = createRes();

    await apiController.produk({ query: { format: 'array' } }, res);

    expect(res.json).toHaveBeenCalledWith(sampleProdukList);
  });

  it('produk mengembalikan 500 jika database error', async () => {
    vi.spyOn(ProdukModel, 'getAll').mockRejectedValue(new Error('DB gagal'));
    const res = createRes();

    await apiController.produk({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB gagal' });
  });

  it('getProdukById mengembalikan data produk jika ditemukan', async () => {
    vi.spyOn(ProdukModel, 'getById').mockResolvedValue(sampleProduk);
    const res = createRes();

    await apiController.getProdukById({ params: { id: '1' } }, res);

    expect(ProdukModel.getById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith(sampleProduk);
  });

  it('getProdukById mengembalikan 404 jika produk tidak ditemukan', async () => {
    vi.spyOn(ProdukModel, 'getById').mockResolvedValue(undefined);
    const res = createRes();

    await apiController.getProdukById({ params: { id: '999' } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ pesan: 'Tidak ditemukan' });
  });

  it('getProdukById mengembalikan 500 jika terjadi error', async () => {
    vi.spyOn(ProdukModel, 'getById').mockRejectedValue(new Error('Query error'));
    const res = createRes();

    await apiController.getProdukById({ params: { id: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Query error' });
  });

  it('createProduk menambahkan data baru dengan status 201', async () => {
    const created = { id: 4, ...newProdukPayload };
    vi.spyOn(ProdukModel, 'create').mockResolvedValue(created);
    const res = createRes();

    await apiController.createProduk({ body: newProdukPayload }, res);

    expect(ProdukModel.create).toHaveBeenCalledWith(newProdukPayload);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ sukses: true, data: created });
  });

  it('createProduk mengembalikan 500 jika insert gagal', async () => {
    vi.spyOn(ProdukModel, 'create').mockRejectedValue(new Error('Insert gagal'));
    const res = createRes();

    await apiController.createProduk({ body: newProdukPayload }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insert gagal' });
  });

  it('updateProduk memperbarui data dan mengembalikan data terbaru', async () => {
    const updated = { id: 1, ...updateProdukPayload };
    vi.spyOn(ProdukModel, 'update').mockResolvedValue(updated);
    const res = createRes();

    await apiController.updateProduk({ params: { id: '1' }, body: updateProdukPayload }, res);

    expect(ProdukModel.update).toHaveBeenCalledWith('1', updateProdukPayload);
    expect(res.json).toHaveBeenCalledWith({ sukses: true, data: updated });
  });

  it('updateProduk mengembalikan 500 jika update gagal', async () => {
    vi.spyOn(ProdukModel, 'update').mockRejectedValue(new Error('Update gagal'));
    const res = createRes();

    await apiController.updateProduk({ params: { id: '1' }, body: updateProdukPayload }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Update gagal' });
  });

  it('deleteProduk menghapus data berdasarkan id', async () => {
    vi.spyOn(ProdukModel, 'delete').mockResolvedValue(undefined);
    const res = createRes();

    await apiController.deleteProduk({ params: { id: '1' } }, res);

    expect(ProdukModel.delete).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ sukses: true, pesan: 'Data dihapus' });
  });

  it('deleteProduk mengembalikan 500 jika penghapusan gagal', async () => {
    vi.spyOn(ProdukModel, 'delete').mockRejectedValue(new Error('Delete gagal'));
    const res = createRes();

    await apiController.deleteProduk({ params: { id: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Delete gagal' });
  });
});
