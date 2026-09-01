const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const ORDERS_CHAT_ID = process.env.TELEGRAM_ORDERS_CHAT_ID || "";
const PAYMENT_DETAILS = (process.env.TELEGRAM_PAYMENT_DETAILS || "").trim() ||
  "Реквизиты для оплаты пока не настроены. Напишите администратору.";

export const telegramEnabled = Boolean(BOT_TOKEN);

let diagnosticsCache = null;

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

export async function getTelegramDiagnostics() {
  if (!BOT_TOKEN) {
    return {
      enabled: false,
      tokenValid: false,
      configuredBot: BOT_USERNAME || null,
      actualBot: null,
      usernameMatches: false,
      webhook: null,
      error: "TELEGRAM_BOT_TOKEN is not set",
    };
  }

  if (diagnosticsCache?.expiresAt > Date.now()) return diagnosticsCache.value;

  const [me, webhookInfo] = await Promise.all([
    api("getMe", {}),
    api("getWebhookInfo", {}),
  ]);
  const actualBot = me.ok ? me.result?.username || null : null;
  const info = webhookInfo.ok ? webhookInfo.result || {} : {};
  const value = {
    enabled: telegramEnabled,
    tokenValid: Boolean(me.ok),
    configuredBot: BOT_USERNAME || null,
    actualBot,
    usernameMatches: Boolean(actualBot && BOT_USERNAME && actualBot.toLowerCase() === BOT_USERNAME.toLowerCase()),
    webhook: webhookInfo.ok
      ? {
          configured: Boolean(info.url),
          url: info.url || null,
          pendingUpdates: Number(info.pending_update_count) || 0,
          lastErrorAt: info.last_error_date
            ? new Date(info.last_error_date * 1000).toISOString()
            : null,
          lastErrorMessage: info.last_error_message || null,
        }
      : null,
    error: me.ok && webhookInfo.ok
      ? null
      : me.description || webhookInfo.description || "Telegram API request failed",
  };

  diagnosticsCache = { value, expiresAt: Date.now() + 15_000 };
  return value;
}

export async function setTelegramWebhook(url) {
  const webhookUrl = String(url || "").trim();
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!webhookUrl.startsWith("https://")) {
    throw new Error("Telegram webhook URL must use HTTPS");
  }

  const result = await api("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
  });
  if (!result.ok) {
    throw new Error(result.description || "Telegram setWebhook failed");
  }

  diagnosticsCache = null;
  return {
    ok: true,
    url: webhookUrl,
    description: result.description || "Webhook was set",
  };
}

export async function sendMessage(chatId, text, extra = {}) {
  return api("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatOrder(order) {
  const lines = (order.items || []).map(
    (i) => `• ${escapeHtml(i.name || i.slug || "Товар")} — ${escapeHtml(i.size || "—")} × ${i.qty || i.quantity || 1}`,
  );
  return [
    `<b>Заказ ${escapeHtml(order.orderId)}</b>`,
    `Сумма: <b>${Number(order.total || 0).toLocaleString("ru-RU")} ₽</b>`,
    "",
    lines.length ? lines.join("\n") : "Состав не указан",
  ].join("\n");
}

function stripDetailLabel(value) {
  return String(value || "")
    .replace(/^(фио|имя|телефон|номер|контакт|адрес)\s*:\s*/i, "")
    .trim();
}

function parseCustomerDetails(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  const customerName = stripDetailLabel(lines[0]);
  const customerPhone = stripDetailLabel(lines[1]);
  const deliveryAddress = stripDetailLabel(lines.slice(2).join(", "));
  const phoneDigits = customerPhone.replace(/\D/g, "");

  if (customerName.length < 3 || phoneDigits.length < 7 || deliveryAddress.length < 8) {
    return null;
  }

  return { customerName, customerPhone, deliveryAddress };
}

function customerSummary(order) {
  return [
    `<b>Получатель:</b> ${escapeHtml(order.customerName || "—")}`,
    `<b>Телефон:</b> ${escapeHtml(order.customerPhone || "—")}`,
    `<b>Адрес:</b> ${escapeHtml(order.deliveryAddress || "—")}`,
  ].join("\n");
}

function contactPrompt() {
  return [
    "Для оформления доставки пришлите <b>одним сообщением</b>:",
    "1. ФИО",
    "2. Телефон",
    "3. Полный адрес доставки: город, улица, дом, квартира и индекс",
    "",
    "<b>Пример:</b>",
    "Иванов Иван Иванович",
    "+7 999 123-45-67",
    "Москва, ул. Примерная, д. 10, кв. 5, 123456",
  ].join("\n");
}

export async function handleTelegramUpdate(
  update,
  { findOrder, findOrderByChat, updateOrder },
) {
  if (!telegramEnabled) return { ok: false, error: "Telegram bot not configured" };

  const message = update.message || update.edited_message;
  if (!message) return { ok: true };

  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const from = message.from || {};

  if (text.startsWith("/start")) {
    // /start LP-…  or  /start@BotName LP-…
    const payload = text.replace(/^\/start(?:@\w+)?/i, "").trim().split(/\s+/)[0] || null;
    const orderId = payload || null;
    const order = orderId ? await findOrder(orderId) : null;

    if (order) {
      const telegramName = [from.first_name, from.last_name].filter(Boolean).join(" ");
      const hasCustomerDetails = Boolean(
        order.customerName && order.customerPhone && order.deliveryAddress,
      );
      const linkedOrder = await updateOrder(order.orderId, {
        telegramChatId: String(chatId),
        telegramUsername: from.username || "",
        telegramName,
        telegramStage: hasCustomerDetails ? "awaiting_receipt" : "awaiting_contact",
      });
      // Do not show the order as "linked" if chatId was not persisted — that caused
      // the next user message to hit "Не нашёл активный заказ".
      if (!linkedOrder?.telegramChatId) {
        console.error("Telegram /start: failed to link chat to order", order.orderId, chatId);
        await sendMessage(
          chatId,
          "Не удалось привязать заказ. Вернитесь на сайт и ещё раз нажмите «Оплатить в Telegram».",
        );
        return { ok: false, error: "Failed to link telegram chat to order" };
      }
      const currentOrder = linkedOrder;
      await sendMessage(
        chatId,
        [
          "Спасибо за заказ в <b>Липовой</b> 👊",
          "",
          formatOrder(currentOrder),
          "",
          hasCustomerDetails
            ? [
                customerSummary(currentOrder),
                "",
                "<b>Реквизиты для оплаты:</b>",
                PAYMENT_DETAILS,
                "",
                "После оплаты пришлите <b>чек</b> сюда (фото или PDF).",
              ].join("\n")
            : contactPrompt(),
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
        "Если заказ уже создан, вернитесь на его страницу и ещё раз нажмите кнопку оплаты — бот автоматически привяжет нужный заказ.",
      ].join("\n"),
    );
    return { ok: true };
  }

  const hasMedia = Boolean(message.photo?.length || message.document);
  if (hasMedia) {
    const order = await findOrderByChat(String(chatId));
    if (!order) {
      await sendMessage(
        chatId,
        "Не нашёл активный заказ. Вернитесь на сайт и ещё раз нажмите «Оплатить в Telegram», затем повторите отправку чека.",
      );
      return { ok: true };
    }

    if (!order.customerName || !order.customerPhone || !order.deliveryAddress) {
      await sendMessage(
        chatId,
        [
          "Сначала нужны данные для доставки, после этого отправьте чек повторно.",
          "",
          contactPrompt(),
        ].join("\n"),
      );
      return { ok: true };
    }

    const captionBits = [
      "🧾 <b>Новый чек на проверку</b>",
      "",
      formatOrder(order),
      "",
      customerSummary(order),
      "",
      `<b>Telegram:</b> ${from.username ? `@${escapeHtml(from.username)}` : escapeHtml([from.first_name, from.last_name].filter(Boolean).join(" ") || `ID ${from.id}`)}`,
      message.caption ? `<b>Комментарий:</b> ${escapeHtml(message.caption)}` : "",
    ].filter(Boolean);

    let receiptForwarded = false;
    if (ORDERS_CHAT_ID) {
      if (message.photo?.length) {
        const fileId = message.photo[message.photo.length - 1].file_id;
        const result = await api("sendPhoto", {
          chat_id: ORDERS_CHAT_ID,
          photo: fileId,
          caption: captionBits.join("\n"),
          parse_mode: "HTML",
        });
        receiptForwarded = Boolean(result.ok);
      } else if (message.document) {
        const result = await api("sendDocument", {
          chat_id: ORDERS_CHAT_ID,
          document: message.document.file_id,
          caption: captionBits.join("\n"),
          parse_mode: "HTML",
        });
        receiptForwarded = Boolean(result.ok);
      }
    } else {
      console.warn("TELEGRAM_ORDERS_CHAT_ID is not set — receipt not forwarded");
    }

    if (!receiptForwarded) {
      await sendMessage(
        chatId,
        "Не получилось передать чек администратору. Пожалуйста, попробуйте отправить его ещё раз через минуту.",
      );
      return { ok: false, error: "Receipt was not forwarded" };
    }

    const telegramName = [from.first_name, from.last_name].filter(Boolean).join(" ");
    const updatedOrder = await updateOrder(order.orderId, {
      status: "receipt_received",
      telegramStage: "receipt_received",
      telegramUsername: from.username || order.telegramUsername || "",
      telegramName: telegramName || order.telegramName || "",
    });

    await sendMessage(
      chatId,
      [
        "Чек получен ✅",
        "",
        formatOrder(updatedOrder || order),
        "",
        customerSummary(updatedOrder || order),
        "",
        "Мы проверим оплату и скоро свяжемся с вами в этом чате.",
      ].join("\n"),
    );
    return { ok: true };
  }

  if (text) {
    const order = await findOrderByChat(String(chatId));

    if (order?.telegramStage === "receipt_received") {
      await sendMessage(
        chatId,
        `Чек по заказу <b>${escapeHtml(order.orderId)}</b> уже получен ✅\nМы проверяем оплату и скоро свяжемся с вами.`,
      );
      return { ok: true };
    }

    if (order) {
      const details = parseCustomerDetails(text);
      if (!details) {
        await sendMessage(chatId, contactPrompt());
        return { ok: true };
      }

      const telegramName = [from.first_name, from.last_name].filter(Boolean).join(" ");
      const updatedOrder = await updateOrder(order.orderId, {
        ...details,
        telegramStage: "awaiting_receipt",
        telegramUsername: from.username || order.telegramUsername || "",
        telegramName: telegramName || order.telegramName || "",
      });
      const currentOrder = updatedOrder || { ...order, ...details };

      await sendMessage(
        chatId,
        [
          "Данные сохранены ✅",
          "",
          customerSummary(currentOrder),
          "",
          "<b>Реквизиты для оплаты:</b>",
          PAYMENT_DETAILS,
          "",
          "После оплаты пришлите сюда <b>чек</b> — фото или PDF.",
        ].join("\n"),
      );
      return { ok: true };
    }

    await sendMessage(
      chatId,
      "Не нашёл активный заказ. Соберите корзину на сайте и нажмите «Оплатить в Telegram».",
    );
  }

  return { ok: true };
}
