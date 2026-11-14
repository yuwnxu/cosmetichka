/* =========================================================
   utils.js — даты, склонения, хранилище
   ========================================================= */

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];

/* Сегодня без времени (полночь), чтобы разница считалась в целых днях */
function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* "2026-11-14" -> Date (в местном времени, без сдвига часового пояса) */
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Date -> "2026-11-14" (формат для <input type="date">) */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n); // setDate корректно учитывает переход на летнее/зимнее время
  return d;
}

/* "24 нояб. 2025" */
function formatDate(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/* Склонение: plural(5, ["средство", "средства", "средств"]) -> "средств" */
function plural(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

/*
  Главная функция расчёта: по дате вскрытия и сроку
  возвращает статус, сколько дней осталось и долю использованного срока.
*/
function getExpiry(item, soonDays) {
  const opened = parseDate(item.opened);
  const expires = addMonths(opened, item.months);
  const total = Math.max(1, Math.round((expires - opened) / DAY_MS));
  const daysLeft = Math.round((expires - today()) / DAY_MS);

  let status = "ok";
  if (daysLeft < 0) status = "expired";
  else if (daysLeft <= soonDays) status = "soon";

  const used = Math.min(1, Math.max(0, 1 - daysLeft / total));
  return { opened, expires, daysLeft, status, used };
}

/* Текст для бейджа статуса */
function statusText(daysLeft) {
  if (daysLeft < 0) {
    const d = Math.abs(daysLeft);
    return `Просрочено на ${d} ${plural(d, ["день", "дня", "дней"])}`;
  }
  if (daysLeft === 0) return "Истекает сегодня";
  if (daysLeft <= 60) return `Осталось ${daysLeft} дн.`;
  return `Осталось ${Math.floor(daysLeft / 30)} мес.`;
}

/* Безопасная вставка пользовательского текста в HTML */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

/* localStorage с защитой от ошибок (например, в режиме инкогнито) */
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false; /* хранилище недоступно или переполнено */
    }
  },
};
