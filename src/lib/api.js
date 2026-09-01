const TOKEN_KEY = "lipovoy_token";

/** Пусто в dev (прокси Vite), в проде — URL бэкенда без слэша в конце */
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/** Vercel рубит запрос больше ~4.5 МБ ещё до функции и отвечает не JSON-ом. */
const TOO_LARGE_MSG = "Файл слишком большой — 4.5 МБ это максимум для одного запроса";

/** Длинная сторона фото после сжатия и качество JPEG/WebP. */
const MAX_IMAGE_SIDE = 1600;
const IMAGE_QUALITY = 0.82;

/** Эти форматы пережимать нельзя: анимация и вектор канвасом ломаются. */
const RAW_IMAGE_TYPES = new Set(["image/gif", "image/svg+xml"]);

/** Через функцию Vercel файл идёт в base64 и пухнет на треть — отсюда потолок в 3 МБ. */
const THROUGH_SERVER_LIMIT = 3 * 1024 * 1024;

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(apiUrl(path), { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || (res.status === 413 ? TOO_LARGE_MSG : "Request failed"));
    err.status = res.status;
    throw err;
  }
  return data;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });
}

/** Пережимает фото прямо в браузере: длинная сторона до 1600px, ~0.8 качества. */
export function compressImage(file, { maxSide = MAX_IMAGE_SIDE, quality = IMAGE_QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", quality);
      resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось открыть изображение (HEIC с айфона нужно пересохранить в JPG)"));
    };
    img.src = objectUrl;
  });
}

/**
 * Кладёт файл в S3 через /api/upload и отдаёт ссылку.
 * Товар после этого уезжает на сервер со ссылками, а не с самими картинками,
 * поэтому запрос остаётся в пределах лимита Vercel.
 */
export async function uploadMedia(file, folder = "uploads") {
  const dataUrl = file.type.startsWith("image/") && !RAW_IMAGE_TYPES.has(file.type)
    ? await compressImage(file)
    : await readAsDataUrl(file);
  try {
    const { url } = await apiFetch("/api/upload", { method: "POST", body: { dataUrl, folder } });
    return url || dataUrl;
  } catch (err) {
    // S3 не настроен (локальная разработка) — работаем по-старому, на data URL.
    if (err.status === 503) return dataUrl;
    throw err;
  }
}

function putToS3(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 ответил ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Браузер не достучался до S3 — на бакете не настроен CORS для PUT"));
    xhr.send(file);
  });
}

/**
 * Кладёт большой файл (видео) прямо в S3 по подписанной ссылке, мимо нашей функции.
 * Иначе всё упирается в лимит Vercel: 4.5 МБ на запрос, и это не обходится.
 */
export async function uploadLargeMedia(file, folder = "uploads", onProgress) {
  let presigned;
  try {
    presigned = await apiFetch("/api/upload-url", {
      method: "POST",
      body: { contentType: file.type || "application/octet-stream", folder },
    });
  } catch (err) {
    // Старый бэкенд или S3 не настроен — остаётся дорога через сервер, для мелочи.
    if (err.status === 404 || err.status === 503) {
      if (file.size > THROUGH_SERVER_LIMIT) {
        throw new Error("Загрузка напрямую в S3 недоступна, а файл больше 3 МБ — через сервер он не пройдёт");
      }
      return uploadMedia(file, folder);
    }
    throw err;
  }

  if (onProgress) onProgress(0);
  try {
    await putToS3(presigned.uploadUrl, file, onProgress);
  } catch (err) {
    // Пока на бакете нет CORS, мелкие файлы можно дотащить через сервер.
    if (file.size <= THROUGH_SERVER_LIMIT) return uploadMedia(file, folder);
    throw err;
  }
  return presigned.publicUrl;
}
