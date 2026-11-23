import { describe, it, expect, vi, beforeEach } from 'vitest';
const homeController = require('../../../controllers/homeController');
const ProdukModel = require('../../../models/produkModel');
const config = require('../../../config');
const utils = require('../../../utils');
const { sampleProdukList } = require('../../fixtures/produk');

describe('controllers/homeController.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('index mengambil daftar produk dan merender halaman index', async () => {
    vi.spyOn(ProdukModel, 'getAll').mockResolvedValue(sampleProdukList);
    const res = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    await homeController.index({}, res);

    expect(ProdukModel.getAll).toHaveBeenCalledTimes(1);
    expect(res.render).toHaveBeenCalledWith('index', {
      judul: `${config.appName} - Asisten Fiqih Kontemporer & Modul Fatwa`,
      config,
      produk: sampleProdukList,
      utils,
    });
  });

  it('index mengembalikan HTTP 500 ketika gagal memuat data dari database', async () => {
    vi.spyOn(ProdukModel, 'getAll').mockRejectedValue(new Error('Database offline'));
    const res = {
      render: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    await homeController.index({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Gagal memuat halaman: Database offline');
  });
});
