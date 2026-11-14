const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ["янв.", "февр.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сент.", "окт.", "нояб.", "дек."];

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// new Date("2026-11-14") парсится в UTC и может сдвинуть дату, поэтому собираем вручную
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
  d.setDate(d.getDate() + n);
  return d;
}

function formatDate(date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function plural(n, forms) {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
  return forms[2];
}

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

function statusText(daysLeft) {
  if (daysLeft < 0) {
    const d = Math.abs(daysLeft);
    return `Просрочено на ${d} ${plural(d, ["день", "дня", "дней"])}`;
  }
  if (daysLeft === 0) return "Истекает сегодня";
  if (daysLeft <= 60) return `Осталось ${daysLeft} дн.`;
  return `Осталось ${Math.floor(daysLeft / 30)} мес.`;
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

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
      return false;
    }
  },
};
