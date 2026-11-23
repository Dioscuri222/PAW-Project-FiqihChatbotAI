const express = require('express');

let cachedApp = null;

/**
 * Memuat instance Express dari app.js tanpa membuka port TCP sungguhan
 * agar app.js asli tetap utuh dan tidak terjadi bentrok port (EADDRINUSE) saat pengujian.
 */
function loadApp() {
  if (cachedApp) return cachedApp;

  const originalListen = express.application.listen;
  express.application.listen = function noopListen() {
    return { close: () => {} };
  };

  try {
    cachedApp = require('../../app');
  } finally {
    express.application.listen = originalListen;
  }

  return cachedApp;
}

module.exports = loadApp;
