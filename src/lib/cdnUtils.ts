const API_KEY = import.meta.env.VITE_CDN_API_KEY || '';
const JWT_TOKEN = import.meta.env.VITE_CDN_JWT_TOKEN || '';
const BASE_URL = 'https://api-cdn.kroombox.com';

const CDN_HEADERS = {
  'x-api-key': API_KEY,
  'Authorization': `Bearer ${JWT_TOKEN}`
};

// URL backend proxy untuk gambar CDN — pisah dari VITE_API_URL yang dipakai api.ts
const BACKEND_URL = import.meta.env.VITE_CDN_BACKEND_URL || 'https://api-hallowarga.kolab.top';

/**
 * Buat URL proxy backend untuk fileId CDN Kroombox.
 * Backend akan fetch dari /api/bridge/view/:id dengan API key,
 * dan stream gambar ke browser — tidak ada CORS, tidak ada rate limit.
 */
const makeProxyUrl = (fileId: string): string => {
  return `${BACKEND_URL}/api/image-proxy/${fileId}`;
};

/**
 * Polling: Cek GET /api/bridge/files setiap 2 detik
 * sampai file berstatus 'ready', lalu kembalikan proxy URL.
 */
const waitForFileReady = async (fileId: string, maxWaitMs = 60000): Promise<string> => {
  const interval = 2000;
  const maxAttempts = Math.ceil(maxWaitMs / interval);

  console.log(`[CDN] Menunggu file ${fileId} siap...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, interval));

    try {
      const res = await fetch(`${BASE_URL}/api/bridge/files`, {
        headers: CDN_HEADERS
      });

      if (!res.ok) {
        console.warn(`[CDN] poll attempt ${attempt}: HTTP ${res.status}`);
        continue;
      }

      const files = await res.json();
      if (!Array.isArray(files)) continue;

      console.log(`[CDN] poll attempt ${attempt}: ${files.length} file(s)`);

      const file = files.find((f: any) => f.id === fileId);
      if (!file) {
        console.log(`[CDN] File ${fileId} belum muncul...`);
        continue;
      }

      console.log(`[CDN] File status: ${file.status}`);

      if (file.status === 'ready' || file.status === 'completed' || file.status === 'done') {
        // Gunakan proxy backend dengan fileId — langsung ke CDN Kroombox
        const proxyUrl = makeProxyUrl(fileId);
        console.log(`[CDN] File siap! Proxy URL: ${proxyUrl}`);
        return proxyUrl;
      }
    } catch (err) {
      console.warn(`[CDN] Error polling attempt ${attempt}:`, err);
    }
  }

  // Timeout — tetap pakai proxy URL (backend akan coba ambil dari CDN)
  console.warn(`[CDN] Timeout, menggunakan proxy URL`);
  return makeProxyUrl(fileId);
};


/**
 * Upload file ke CDN Kroombox.
 * Menunggu hingga file benar-benar siap (status ready + file.url tersedia)
 * lalu mengembalikan URL fisik langsung yang bisa dipakai di <img />.
 */
/**
 * Mengonversi fileId menjadi URL view CDN yang valid.
 */
export const getCdnUrl = (id: string | null | undefined): string => {
  if (!id || id === 'null' || id === 'undefined' || id === '') return '';
  
  // Jika sudah berupa data base64, kembalikan apa adanya (jangan di-proxy)
  if (id.startsWith('data:image/') || id.includes('base64,')) {
    return id;
  }

  // Jika sudah berupa URL lengkap (data lama atau eksternal)
  if (id.startsWith('http')) return id;
  
  // Gunakan proxy backend untuk viewing agar aman dari blokir browser
  const backendUrl = import.meta.env.VITE_CDN_BACKEND_URL || 'https://api-hallowarga.kolab.top';
  return `${backendUrl}/api/image-proxy/${id}`;
};

export const uploadToCdn = async (file: File | Blob, projectName: string = 'HalloWarga'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('projectName', projectName);

  console.log(`[CDN] Uploading to: ${BASE_URL}/api/bridge/upload`);

  const res = await fetch(`${BASE_URL}/api/bridge/upload`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      // Mengikuti dokumentasi: gunakan x-api-key saja agar stabil
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Upload CDN gagal (${res.status}): ${errText}`);
  }

  const responseData = await res.json();
  console.log('>>> [CDN FULL RESPONSE]:', JSON.stringify(responseData, null, 2));
  
  // Algoritma ekstraksi ID yang sangat teliti
  let extractedId: string | null = null;
  
  // 1. Jika respon adalah array, ambil elemen pertama
  const data = Array.isArray(responseData) ? responseData[0] : responseData;
  
  // 2. Cek berbagai variasi nama field ID
  const possibleFields = ['fileId', 'id', 'file_id', 'asset_id', 'key', 'uid'];
  
  for (const field of possibleFields) {
    if (data[field]) {
      extractedId = String(data[field]);
      break;
    }
  }
  
  // 3. Cek di dalam properti 'data' jika dibungkus
  if (!extractedId && data.data) {
    for (const field of possibleFields) {
      if (data.data[field]) {
        extractedId = String(data.data[field]);
        break;
      }
    }
  }
  
  // 4. Fallback terakhir: ambil dari tracking URL jika ada
  if (!extractedId && data.tracking) {
    const parts = data.tracking.split('/');
    extractedId = parts[parts.length - 1];
  }

  if (!extractedId || extractedId === 'null' || extractedId === 'undefined') {
    console.error('!!! CRITICAL: Gagal mendapatkan ID dari respon CDN:', responseData);
    throw new Error('Upload berhasil tapi ID file tidak ditemukan. Cek Console browser untuk detail JSON.');
  }

  // LOGIKA BARU: Menunggu sampai status 'ready' agar gambar langsung tampil tanpa reload
  console.log(`[CDN] File ID: ${extractedId} sedang diproses. Menunggu status 'ready'...`);
  
  let isReady = false;
  let attempts = 0;
  const maxAttempts = 10; // Maksimal menunggu 10 detik

  while (!isReady && attempts < maxAttempts) {
    try {
      // Tunggu 1 detik sebelum cek status
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusRes = await fetch(`${BASE_URL}/api/bridge/status/${extractedId}`, {
        headers: { 'x-api-key': API_KEY }
      });

      if (statusRes.ok) {
        const text = await statusRes.text();
        console.log(`[CDN] Status check #${attempts} raw:`, text);
        
        // Cek apakah teks mengandung kata kunci 'ready', 'success', atau format JSON di dalam SSE
        if (text.toLowerCase().includes('ready') || 
            text.toLowerCase().includes('success') || 
            text.toLowerCase().includes('"status":"ready"') ||
            text.toLowerCase().includes('done')) {
          isReady = true;
        }
      }
    } catch (e: any) {
      console.warn(`[CDN] Gagal cek status #${attempts}:`, e.message);
    }
  }

  if (!isReady) {
    console.warn(`[CDN] File ${extractedId} masih diproses setelah ${maxAttempts} detik. Gambar mungkin muncul terlambat.`);
  }

  const finalUrl = getCdnUrl(extractedId);
  console.log(`[CDN] Success! ID: ${extractedId} -> URL: ${finalUrl}`);
  
  return extractedId;
};

/**
 * Menghapus aset dari CDN menggunakan URL view atau fileId.
 */
export const deleteFromCdn = async (urlOrId: string): Promise<void> => {
  if (!urlOrId) return;

  // Ekstrak fileId dari berbagai format URL
  let fileId = urlOrId;

  // Format proxy backend: https://api-hallowarga.kolab.top/api/image-proxy/FILEID
  if (urlOrId.includes('/api/image-proxy/')) {
    fileId = urlOrId.split('/api/image-proxy/')[1].split('?')[0];
  }
  // Format CDN view: https://api-cdn.kroombox.com/api/bridge/view/FILEID
  else if (urlOrId.includes('/api/bridge/view/')) {
    fileId = urlOrId.split('/api/bridge/view/')[1];
  }
  // Format CDN files: /api/bridge/files/FILEID
  else if (urlOrId.includes('/api/bridge/files/')) {
    fileId = urlOrId.split('/api/bridge/files/')[1];
  }
  // Jika masih berupa full URL bukan dari CDN kita, skip
  else if (urlOrId.startsWith('http') && !urlOrId.includes('api-cdn.kroombox.com') && !urlOrId.includes('localhost')) {
    return;
  }

  // Jika URL menggunakan endpoint server lokal /uploads/, biarkan saja (saat ini belum diimplementasi delete lokal)
  if (urlOrId.includes('/uploads/')) {
    console.log('[Delete] Skipping local file deletion:', urlOrId);
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/bridge/files/${fileId}`, {
      method: 'DELETE',
      headers: CDN_HEADERS
    });

    if (!response.ok) {
      console.warn(`[CDN] Gagal hapus file ${fileId} (${response.status})`);
    } else {
      console.log('[CDN] File berhasil dihapus:', fileId);
    }
  } catch (err) {
    console.error('[CDN] Delete Error:', err);
  }
};
