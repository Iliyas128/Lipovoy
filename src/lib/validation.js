const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateEmail(email) {
  const value = String(email || "").trim();
  if (!value) return "Введите email";
  if (!EMAIL_RE.test(value)) return "Некорректный email";
  return "";
}

export function validatePassword(password, { min = 6 } = {}) {
  if (!password) return "Введите пароль";
  if (String(password).length < min) return `Минимум ${min} символов`;
  return "";
}

export function validateName(name) {
  const value = String(name || "").trim();
  if (!value) return "Введите имя";
  if (value.length < 2) return "Имя должно быть не короче 2 символов";
  if (value.length > 60) return "Имя слишком длинное";
  return "";
}

export function validateSlug(slug) {
  const value = String(slug || "").trim().toLowerCase();
  if (!value) return "Введите slug";
  if (!SLUG_RE.test(value)) return "Только лatin, цифры и дефис (напр. tee-black)";
  return "";
}

export function validateAuthForm(mode, { name, email, password }) {
  const errors = {};
  if (mode === "register") {
    const nameErr = validateName(name);
    if (nameErr) errors.name = nameErr;
  }
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;
  return errors;
}

export function validateProduct(form) {
  const errors = {};
  if (!String(form.name || "").trim()) errors.name = "Введите название";

  const slugErr = validateSlug(form.slug);
  if (slugErr) errors.slug = slugErr;

  const catalogs = Array.isArray(form.catalogs) ? form.catalogs.filter(Boolean) : [];
  if (!catalogs.length) errors.catalogs = "Выберите хотя бы один каталог";

  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) errors.price = "Цена должна быть 0 или больше";

  const images = (form.images || []).filter(Boolean);
  if (!images.length && !form.image) errors.images = "Добавьте хотя бы одно фото";

  return errors;
}

export function validateCatalog({ name, slug }) {
  const errors = {};
  if (!String(name || "").trim()) errors.name = "Введите название каталога";
  const slugErr = validateSlug(slug);
  if (slugErr) errors.slug = slugErr;
  return errors;
}

export function validateCatalogs(items = []) {
  const errors = {};
  const seen = new Set();
  items.forEach((item, i) => {
    const itemErrors = validateCatalog(item);
    const slug = String(item.slug || "").trim().toLowerCase();
    if (slug) {
      if (seen.has(slug)) itemErrors.slug = "Такой slug уже используется";
      seen.add(slug);
    }
    if (Object.keys(itemErrors).length) errors[i] = itemErrors;
  });
  return errors;
}

export function validateMenuItem({ label, link }) {
  const errors = {};
  if (!String(label || "").trim()) errors.label = "Введите название";
  const path = String(link || "").trim();
  if (!path) errors.link = "Введите ссылку";
  else if (!path.startsWith("/") && !/^https?:\/\//i.test(path)) {
    errors.link = "Ссылка должна начинаться с / или http";
  }
  return errors;
}

export function validateMenuItems(items = []) {
  const errors = {};
  items.forEach((item, i) => {
    const itemErrors = validateMenuItem(item);
    if (Object.keys(itemErrors).length) errors[i] = itemErrors;
  });
  return errors;
}

export function validateVideoFile(file, { maxMb = 30 } = {}) {
  if (!file) return "Выберите файл";
  if (!file.type.startsWith("video/")) return "Нужен видеофайл (mp4, webm…)";
  if (file.size > maxMb * 1024 * 1024) return `Файл больше ${maxMb} МБ`;
  return "";
}
