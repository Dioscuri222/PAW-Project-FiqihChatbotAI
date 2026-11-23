import { describe, it, expect } from 'vitest';
const {
  formatRupiah,
  formatTanggal,
  formatLogTerminal,
} = require('../../../utils');

describe('utils/index.js', () => {
  describe('formatRupiah', () => {
    it('memformat angka positif ke format Rupiah Indonesia', () => {
      expect(formatRupiah(85000)).toBe('Rp 85.000');
      expect(formatRupiah(1250000)).toBe('Rp 1.250.000');
    });

    it('memformat angka nol dengan benar', () => {
      expect(formatRupiah(0)).toBe('Rp 0');
    });

    it('mengembalikan Rp 0 untuk input bukan angka atau NaN', () => {
      expect(formatRupiah(NaN)).toBe('Rp 0');
      expect(formatRupiah('85000')).toBe('Rp 0');
      expect(formatRupiah(null)).toBe('Rp 0');
      expect(formatRupiah(undefined)).toBe('Rp 0');
    });
  });

  describe('formatTanggal', () => {
    it('memformat string tanggal ISO ke format lokal Indonesia', () => {
      const hasil = formatTanggal('2026-11-23T04:00:00.000Z');
      expect(typeof hasil).toBe('string');
      expect(hasil).toContain('2026');
    });

    it('menggunakan waktu saat ini sebagai nilai default ketika argumen tidak diberikan', () => {
      const hasil = formatTanggal();
      expect(typeof hasil).toBe('string');
      expect(hasil.length).toBeGreaterThan(0);
    });
  });

  describe('formatLogTerminal', () => {
    it('memformat log request HTTP dengan status dan durasi 1 angka desimal', () => {
      const log = formatLogTerminal('GET', '/api/produk', 200, 12.345);
      expect(log).toMatch(/^\[.+Z\] GET \/api\/produk - Status: 200 \(12\.3 ms\)$/);
    });
  });
});
