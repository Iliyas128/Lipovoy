const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ORDERS_CHAT_ID = process.env.TELEGRAM_ORDERS_CHAT_ID || "";
const PAYMENT_DETAILS = (process.env.TELEGRAM_PAYMENT_DETAILS || "").trim() ||
  "Реквизиты для оплаты пока не настроены. Напишите администратору.";

export const telegramEnabled = Boolean(BOT_TOKEN);

const pendingByChat = new Map();

function api(method, body) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!data.ok) console.error(`Telegram ${method}:`, data.description || data);
    return data;
  });
}

export async function sendMessage(chatId, text, extra = {}) {
  return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

function formatOrder(order) {
  const lines = (order.items || []).map(
    (i) => `• ${i.name || i.slug} — ${i.size || "—"} × ${i.qty || i.quantity || 1}`,
  );
  return [
    `<b>Заказ ${order.orderId}</b>`,
    `Сумма: <b>${Number(order.total || 0).toLocaleString("ru-RU")} ₽</b>`,
    "",
    lines.length ? lines.join("\n") : "Состав не указан",
  ].join("\n");
}

export async function handleTelegramUpdate(update, { findOrder }) {
  if (!telegramEnabled) return { ok: false, error: "Telegram bot not configured" };

  const message = update.message || update.edited_message;
  if (!message) return { ok: true };

  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const from = message.from || {};

  if (text.startsWith("/start")) {
    const payload = text.slice(6).trim();
    const orderId = payload || null;
    const order = orderId ? await findOrder(orderId) : null;

    if (order) {
      pendingByChat.set(String(chatId), {
        orderId: order.orderId,
        total: order.total,
        items: order.items,
        user: { id: from.id, username: from.username, name: [from.first_name, from.last_name].filter(Boolean).join(" ") },
      });
      await sendMessage(
        chatId,
        [
          "Спасибо за заказ в <b>Липовой</b> 👊",
          "",
          formatOrder(order),
          "",
          "<b>Реквизиты для оплаты:</b>",
          PAYMENT_DETAILS,
          "",
          "После оплаты пришлите <b>чек</b> сюда (фото или PDF).",
          "Мы проверим оплату и свяжемся с вами.",
        ].join("\n"),
      );
      return { ok: true };
    }

    await sendMessage(
      chatId,
      [
        "Привет! Это бот оплаты <b>Липовой</b>.",
        "",
        "Соберите корзину на сайте и нажмите «Оформить в Telegram» — сюда придёт сумма и реквизиты.",
        "",
        "<b>Реквизиты:</b>",
        PAYMENT_DETAILS,
        "",
        "Уже оплатили? Пришлите чек (фото/PDF) и номер заказа текстом.",
      ].join("\n"),
    );
    return { ok: true };
  }

  const hasMedia = Boolean(message.photo?.length || message.document);
  if (hasMedia) {
    const pending = pendingByChat.get(String(chatId));
    const captionBits = [
      "🧾 <b>Новый чек на проверку</b>",
      pending ? formatOrder(pending) : "Заказ: не привязан (спросите номер у клиента)",
      "",
      `Клиент: ${[from.first_name, from.last_name].filter(Boolean).join(" ") || "—"}`,
      from.username ? `@${from.username}` : `tg://user?id=${from.id}`,
      message.caption ? `Комментарий: ${message.caption}` : "",
    ].filter(Boolean);

    if (ORDERS_CHAT_ID) {
      if (message.photo?.length) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        await api("sendPhoto", {
          chat_id: ORDERS_CHAT_ID,
          photo: fileId,
          caption: captionBits.join("\n"),
          parse_mode: "HTML",
        });
      } else if (message.document) {
        await api("sendDocument", {
          chat_id: ORDERS_CHAT_ID,
          document: message.document.file_id,
          caption: captionBits.join("\n"),
          parse_mode: "HTML",
        });
      }
    } else {
      console.warn("TELEGRAM_ORDERS_CHAT_ID is not set — receipt not forwarded");
    }

    await sendMessage(
      chatId,
      "Чек получен ✅\nМы проверим оплату и скоро свяжемся с вами в этом чате.",
    );
    return { ok: true };
  }

  if (text) {
    await sendMessage(
      chatId,
      "Чтобы оформить заказ — нажмите «Оформить в Telegram» на сайте.\nЕсли уже оплатили — пришлите чек (фото или PDF).",
    );
  }

  return { ok: true };
}
