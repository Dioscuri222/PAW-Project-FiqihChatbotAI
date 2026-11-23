import { describe, it, expect, vi, beforeEach } from 'vitest';
const request = require('supertest');
const db = require('../../config/database');
const loadApp = require('../setup/test-app');
const {
  sampleProduk,
  sampleProdukList,
  newProdukPayload,
  updateProdukPayload,
} = require('../fixtures/produk');

const app = loadApp();

describe('Integration: CRUD API /api/produk', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('GET /api/produk mengembalikan daftar seluruh modul fiqih', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleProdukList });

    const response = await request(app).get('/api/produk');

    expect(response.status).toBe(200);
    expect(response.body.sukses).toBe(true);
    expect(response.body.jumlah).toBe(sampleProdukList.length);
    expect(response.body.data).toEqual(sampleProdukList);
  });

  it('GET /api/produk?format=array mengembalikan array murni', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleProdukList });

    const response = await request(app).get('/api/produk?format=array');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(sampleProdukList.length);
  });

  it('GET /api/produk/:id mengembalikan detail modul saat ditemukan', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [sampleProduk] });

    const response = await request(app).get('/api/produk/1');

    expect(response.status).toBe(200);
    expect(response.body.nama).toBe(sampleProduk.nama);
  });

  it('GET /api/produk/:id mengembalikan 404 saat data tidak ditemukan', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const response = await request(app).get('/api/produk/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ pesan: 'Tidak ditemukan' });
  });

  it('POST /api/produk berhasil menambahkan modul baru ke database', async () => {
    const created = { id: 4, ...newProdukPayload };
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [created] });

    const response = await request(app).post('/api/produk').send(newProdukPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ sukses: true, data: created });
  });

  it('PUT /api/produk/:id berhasil memperbarui modul yang ada', async () => {
    const updated = { id: 1, ...updateProdukPayload };
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [updated] });

    const response = await request(app).put('/api/produk/1').send(updateProdukPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sukses: true, data: updated });
  });

  it('DELETE /api/produk/:id berhasil menghapus modul', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });

    const response = await request(app).delete('/api/produk/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ sukses: true, pesan: 'Data dihapus' });
  });

  it('GET /api/produk mengembalikan 500 saat query database gagal', async () => {
    vi.spyOn(db, 'query').mockRejectedValue(new Error('PostgreSQL tidak tersedia'));

    const response = await request(app).get('/api/produk');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'PostgreSQL tidak tersedia' });
  });
});
