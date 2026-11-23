import { describe, it, expect, vi, beforeEach } from 'vitest';
const request = require('supertest');
const db = require('../../config/database');
const loadApp = require('../setup/test-app');
const { sampleProdukList } = require('../fixtures/produk');

const app = loadApp();

describe('Integration: Web Routes, Status API & 404 Handler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('GET /api/status mengembalikan status server aktif dan metadata aplikasi', async () => {
    const response = await request(app).get('/api/status');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.kelas).toBe('E');
    expect(response.body.metodePengembangan).toBe('Waterfall');
  });

  it('GET / merender halaman beranda HTML yang memuat data katalog produk', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: sampleProdukList });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('FiqihAI');
    expect(response.text).toContain('Hukum Zakat Kontemporer');
  });

  it('GET /chat merender halaman antarmuka Chatbot AI', async () => {
    const response = await request(app).get('/chat');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('Tanya Fiqih');
  });

  it('GET /api/endpoint-tidak-ada mengembalikan 404 JSON dari API 404 handler', async () => {
    const response = await request(app).get('/api/endpoint-tidak-ada');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      sukses: false,
      pesan: 'Endpoint API tidak ditemukan',
      path: '/api/endpoint-tidak-ada',
    });
  });

  it('GET /halaman-tidak-ada mengembalikan 404 teks dari web 404 handler', async () => {
    const response = await request(app).get('/halaman-tidak-ada');

    expect(response.status).toBe(404);
    expect(response.text).toBe('Halaman tidak ditemukan');
  });
});
