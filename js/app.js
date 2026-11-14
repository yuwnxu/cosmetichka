/* =========================================================
   app.js — логика приложения «Косметичка»
   ========================================================= */

/* ---------- Состояние ---------- */
const state = {
  items: storage.get("items", null) || createDemoItems(),
  settings: storage.get("settings", { threshold: 30, name: "Юлдуз" }),
  routine: storage.get("routine", { date: "", done: [] }),
  filter: { category: "Все", status: null, query: "" },
  editingId: null,     // id средства в модальном окне (null — новое)
  formColor: 0,        // выбранный цвет в форме
  formPhoto: null,     // фото в форме (data URL или путь к файлу)
};

function createDemoItems() {
  return DEMO_ITEMS.map((demo, i) => {
    const opened = addDays(addMonths(today(), -demo.months), demo.daysLeft);
    return {
      id: `demo-${i}`,
      name: demo.name,
      brand: demo.brand,
      category: demo.category,
      opened: toISO(opened),
      months: demo.months,
      color: demo.color,
      photo: demo.photo || null,
    };
  });
}

/* Возвращает false, если браузер не смог сохранить (например, кончилось место) */
function save() {
  const ok = storage.set("items", state.items);
  storage.set("settings", state.settings);
  storage.set("routine", state.routine);
  return ok;
}

/* ---------- Короткие ссылки на элементы ---------- */
const $ = (sel) => document.querySelector(sel);
const els = {
  grid: $("#grid"),
  empty: $("#empty"),
  subtitle: $("#subtitle"),
  search: $("#search"),
  categories: $("#categories"),
  countOk: $("#countOk"),
  countSoon: $("#countSoon"),
  countExpired: $("#countExpired"),
  navBadge: $("#navBadge"),
  modal: $("#modal"),
  form: $("#form"),
  modalTitle: $("#modalTitle"),
  preview: $("#preview"),
  swatches: $("#swatches"),
  deleteBtn: $("#deleteBtn"),
  toast: $("#toast"),
};

/* Средства с уже посчитанным сроком */
function withExpiry() {
  return state.items.map((item) => ({ ...item, ...getExpiry(item, state.settings.threshold) }));
}

/* ---------- HTML-шаблоны ---------- */
function bottleHTML(color) {
  const c = PALETTE[color] || PALETTE[0];
  return `
    <div class="bottle" style="--body:${c.body}">
      <span class="bottle__cap"></span>
      <span class="bottle__body"><span class="bottle__label"></span></span>
    </div>`;
}

/* Фото, если оно есть, иначе нарисованный флакон */
function visualHTML(item) {
  return item.photo
    ? `<img class="photo" src="${escapeHTML(item.photo)}" alt="${escapeHTML(item.name)}" loading="lazy">`
    : bottleHTML(item.color);
}

function cardHTML(item, index) {
  const c = PALETTE[item.color] || PALETTE[0];
  const dot = item.status === "ok" ? "dot-green" : "dot-dark";
  const fillClass = item.status === "ok" ? "bar__fill bar__fill--ok" : "bar__fill";
  return `
    <button class="card" type="button" data-id="${item.id}" style="animation-delay:${index * 40}ms">
      <div class="card__img" style="background:${c.bg}">${visualHTML(item)}</div>
      <div class="card__info">
        <p class="card__name">${escapeHTML(item.name)}</p>
        <p class="card__meta">${escapeHTML(item.brand || "Без бренда")} · ${item.category}</p>
        <span class="status status--${item.status}">
          <img src="assets/icons/${dot}.svg" alt="" width="7" height="7">
          ${statusText(item.daysLeft)}
        </span>
        <div class="bar" role="progressbar" aria-label="Прошло срока" aria-valuenow="${Math.round(item.used * 100)}" aria-valuemin="0" aria-valuemax="100">
          <div class="${fillClass}" style="width:${item.used * 100}%"></div>
        </div>
        <p class="card__dates">Открыто ${formatDate(item.opened)} · срок ${item.months} мес.</p>
      </div>
    </button>`;
}

/* ---------- Страница «Косметичка» ---------- */
function renderCategories() {
  const all = ["Все", ...CATEGORIES];
  els.categories.innerHTML = all
    .map((cat) => `<button class="chip ${cat === state.filter.category ? "is-active" : ""}" type="button" role="tab" data-category="${cat}">${cat}</button>`)
    .join("");
}

function renderCosmetics() {
  const list = withExpiry();

  // Сводка считается по всем средствам, без фильтров
  const counts = { ok: 0, soon: 0, expired: 0 };
  list.forEach((item) => counts[item.status]++);
  els.countOk.textContent = counts.ok;
  els.countSoon.textContent = counts.soon;
  els.countExpired.textContent = counts.expired;

  const total = list.length;
  els.subtitle.textContent =
    `${total} ${plural(total, ["средство", "средства", "средств"])} · ` +
    `${counts.soon} скоро ${plural(counts.soon, ["истекает", "истекают", "истекают"])}`;

  const alerts = counts.soon + counts.expired;
  els.navBadge.hidden = alerts === 0;
  els.navBadge.textContent = alerts;

  document.querySelectorAll(".summary__card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.status === state.filter.status);
  });

  // Фильтрация: категория + статус + поиск
  const { category, status, query } = state.filter;
  const q = query.trim().toLowerCase();
  const visible = list
    .filter((item) => category === "Все" || item.category === category)
    .filter((item) => !status || item.status === status)
    .filter((item) => !q || `${item.name} ${item.brand}`.toLowerCase().includes(q))
    .sort((a, b) => a.daysLeft - b.daysLeft); // сначала то, что истекает раньше

  els.grid.innerHTML = visible.map(cardHTML).join("");
  els.empty.hidden = visible.length > 0;
}

/* ---------- Страница «Рутина» ---------- */
function renderRoutine() {
  const todayISO = toISO(today());
  if (state.routine.date !== todayISO) {
    state.routine = { date: todayISO, done: [] }; // новый день — чек-лист с нуля
    save();
  }
  $("#routineDate").textContent = formatDate(today());

  const fresh = withExpiry().filter((item) => item.status !== "expired");
  const renderList = (part, el) => {
    const items = fresh.filter((item) => ROUTINE[part].includes(item.category));
    el.innerHTML = items.length
      ? items.map((item) => {
          const key = `${part}:${item.id}`;
          const checked = state.routine.done.includes(key) ? "checked" : "";
          return `<li><label class="check"><input type="checkbox" data-key="${key}" ${checked}><span>${escapeHTML(item.name)}</span></label></li>`;
        }).join("")
      : `<li class="muted">Нет подходящих средств</li>`;
  };
  renderList("morning", $("#routineMorning"));
  renderList("evening", $("#routineEvening"));
}

/* ---------- Страница «Напоминания» ---------- */
function renderReminders() {
  $("#threshold").value = String(state.settings.threshold);
  const list = withExpiry()
    .filter((item) => item.status !== "ok")
    .sort((a, b) => a.daysLeft - b.daysLeft);

  $("#remindersList").innerHTML = list.map((item) => {
    const c = PALETTE[item.color] || PALETTE[0];
    const action = item.status === "expired" ? "Пора выбросить" : `Истекает ${formatDate(item.expires)}`;
    return `
      <li class="reminder">
        <div class="reminder__dot" style="background:${c.bg}">${visualHTML(item)}</div>
        <div class="reminder__text">
          <span class="reminder__name">${escapeHTML(item.name)}</span>
          <span class="muted">${action}</span>
        </div>
        <span class="status status--${item.status}">${statusText(item.daysLeft)}</span>
      </li>`;
  }).join("");
  $("#remindersEmpty").hidden = list.length > 0;
}

/* ---------- Страница «Профиль» ---------- */
function renderProfile() {
  const name = state.settings.name || "Гость";
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  $("#profileName").value = state.settings.name;
  $("#profileAvatar").textContent = initial;
  $("#avatar").textContent = initial;

  const list = withExpiry();
  const brands = new Set(list.map((i) => i.brand).filter(Boolean)).size;
  $("#profileStats").innerHTML = `
    <span class="status status--ok">${list.length} ${plural(list.length, ["средство", "средства", "средств"])}</span>
    <span class="status status--soon">${brands} ${plural(brands, ["бренд", "бренда", "брендов"])}</span>
    <span class="status status--expired">${list.filter((i) => i.status === "expired").length} просрочено</span>`;
}

/* ---------- Роутинг по #hash ---------- */
const ROUTES = {
  cosmetics: renderCosmetics,
  routine: renderRoutine,
  reminders: renderReminders,
  profile: renderProfile,
};

function currentRoute() {
  const hash = location.hash.slice(1);
  return ROUTES[hash] ? hash : "cosmetics";
}

function render() {
  const route = currentRoute();
  document.querySelectorAll(".page").forEach((page) => {
    page.hidden = page.id !== `page-${route}`;
  });
  document.querySelectorAll(".nav__item").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  renderCosmetics(); // обновляет бейдж в меню на любой странице
  if (route !== "cosmetics") ROUTES[route]();
  renderProfileInitial();
}

function renderProfileInitial() {
  const name = state.settings.name || "Гость";
  $("#avatar").textContent = name.trim().charAt(0).toUpperCase() || "?";
}

/* ---------- Модальное окно ---------- */
function renderSwatches() {
  els.swatches.innerHTML = PALETTE.map((c, i) =>
    `<button type="button" class="swatch ${i === state.formColor ? "is-active" : ""}" data-color="${i}" style="background:${c.body}" aria-label="Цвет ${i + 1}"></button>`
  ).join("");
  els.preview.style.background = PALETTE[state.formColor].bg;
  els.preview.innerHTML = visualHTML({ photo: state.formPhoto, color: state.formColor, name: "Фото" });
  $("#photoRemove").hidden = !state.formPhoto;
  $("#photoBtnText").textContent = state.formPhoto ? "Заменить фото" : "Добавить фото";
}

/*
  Уменьшаем фото перед сохранением: localStorage вмещает всего ~5 МБ,
  а фото с телефона весит несколько мегабайт. Через <canvas>
  сжимаем до 640 px по большей стороне и сохраняем в JPEG.
*/
function resizeImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openModal(id = null) {
  state.editingId = id;
  const item = state.items.find((i) => i.id === id);
  const f = els.form.elements;

  els.modalTitle.textContent = item ? "Изменить средство" : "Новое средство";
  els.deleteBtn.hidden = !item;
  f.name.value = item ? item.name : "";
  f.brand.value = item ? item.brand : "";
  f.category.value = item ? item.category : (state.filter.category !== "Все" ? state.filter.category : CATEGORIES[0]);
  f.opened.value = item ? item.opened : toISO(today());
  f.opened.max = toISO(today());
  f.months.value = String(item ? item.months : 12);
  state.formColor = item ? item.color : Math.floor(Math.random() * PALETTE.length);
  state.formPhoto = item ? item.photo || null : null;
  $("#photoInput").value = "";
  renderSwatches();

  els.modal.showModal();
  f.name.focus();
}

function closeModal() {
  els.modal.close();
}

function submitForm(event) {
  event.preventDefault();
  const f = els.form.elements;
  const data = {
    name: f.name.value.trim(),
    brand: f.brand.value.trim(),
    category: f.category.value,
    opened: f.opened.value,
    months: Number(f.months.value),
    color: state.formColor,
    photo: state.formPhoto,
  };
  if (!data.name || !data.opened) return;

  if (state.editingId) {
    const item = state.items.find((i) => i.id === state.editingId);
    Object.assign(item, data);
    showToast("Изменения сохранены");
  } else {
    state.items.push({ id: `item-${Date.now()}`, ...data });
    showToast("Средство добавлено ✨");
  }
  if (!save()) showToast("Не хватает места в браузере — попробуйте фото поменьше");
  closeModal();
  render();
}

function deleteItem() {
  const item = state.items.find((i) => i.id === state.editingId);
  if (!item || !confirm(`Удалить «${item.name}»?`)) return;
  state.items = state.items.filter((i) => i.id !== item.id);
  save();
  closeModal();
  render();
  showToast("Средство удалено");
}

/* ---------- Уведомление внизу экрана ---------- */
let toastTimer;
function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2200);
}

/* ---------- Обработчики событий ---------- */
function bindEvents() {
  window.addEventListener("hashchange", render);

  els.search.addEventListener("input", (e) => {
    state.filter.query = e.target.value;
    renderCosmetics();
  });

  els.categories.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.filter.category = chip.dataset.category;
    renderCategories();
    renderCosmetics();
  });

  document.querySelectorAll(".summary__card").forEach((card) => {
    card.addEventListener("click", () => {
      const s = card.dataset.status;
      state.filter.status = state.filter.status === s ? null : s; // повторный клик снимает фильтр
      renderCosmetics();
    });
  });

  els.grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openModal(card.dataset.id);
  });

  $("#addBtn").addEventListener("click", () => openModal());
  $("#cancelBtn").addEventListener("click", closeModal);
  els.deleteBtn.addEventListener("click", deleteItem);
  els.form.addEventListener("submit", submitForm);

  // клик по затемнённому фону закрывает окно
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeModal();
  });

  $("#photoInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Это не изображение");
      return;
    }
    try {
      state.formPhoto = await resizeImage(file);
      renderSwatches();
    } catch {
      showToast("Не получилось открыть фото");
    }
  });

  $("#photoRemove").addEventListener("click", () => {
    state.formPhoto = null;
    $("#photoInput").value = "";
    renderSwatches();
  });

  els.swatches.addEventListener("click", (e) => {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    state.formColor = Number(sw.dataset.color);
    renderSwatches();
  });

  $("#routineMorning").parentElement.parentElement.addEventListener("change", (e) => {
    const key = e.target.dataset.key;
    if (!key) return;
    const done = state.routine.done;
    if (e.target.checked) done.push(key);
    else state.routine.done = done.filter((k) => k !== key);
    save();
  });

  $("#threshold").addEventListener("change", (e) => {
    state.settings.threshold = Number(e.target.value);
    save();
    render();
  });

  $("#profileName").addEventListener("input", (e) => {
    state.settings.name = e.target.value;
    save();
    renderProfile();
  });

  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Вернуть демо-данные? Ваши средства будут удалены.")) return;
    state.items = createDemoItems();
    save();
    render();
    showToast("Демо-данные восстановлены");
  });
}

/* ---------- Запуск ---------- */
function init() {
  $("#categorySelect").innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join("");
  renderCategories();
  bindEvents();
  render();
}

init();
