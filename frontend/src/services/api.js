// API service layer. Tries the FastAPI backend first; falls back to the
// deterministic client-side engine if the server is unreachable so the app
// always works for the demo.

import axios from 'axios';
import { processBillingLog } from './analyticsEngine.js';

const API_BASE_URL = 'http://localhost:8000/api';
const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

/**
 * Process a billing log file. Returns { result, source }.
 * source is 'backend' or 'client' so the UI can indicate which engine ran.
 */
export async function processBillingFile(file, dateStr) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/billing/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { result: data, source: 'backend' };
  } catch (err) {
    // Backend unavailable — use the deterministic client-side engine.
    const text = await file.text();
    const result = processBillingLog(text, dateStr);
    return { result, source: 'client' };
  }
}

export function deriveDateFromFilename(filename) {
  const match = filename && filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : new Date().toISOString().slice(0, 10);
}
