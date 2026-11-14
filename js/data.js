/* =========================================================
   data.js — справочники и демо-данные
   ========================================================= */

const CATEGORIES = ["Лицо", "Макияж", "Волосы", "Тело", "Парфюм"];

/* Пары цветов из макета: фон карточки + цвет флакона */
const PALETTE = [
  { bg: "#ffb3d9", body: "#ff5ca8" },
  { bg: "#b9e7ff", body: "#111111" },
  { bg: "#c7f9cc", body: "#4d96ff" },
  { bg: "#ffd6a5", body: "#ff8a3d" },
  { bg: "#d0bfff", body: "#6bcb77" },
  { bg: "#ffb3d9", body: "#9b5de5" },
  { bg: "#fff3b0", body: "#ffc145" },
  { bg: "#c7f9cc", body: "#0b3d2e" },
];

/*
  Демо-набор. Вместо фиксированной даты вскрытия задаём,
  сколько дней осталось до конца срока (daysLeft). Дата вскрытия
  считается от сегодняшнего дня, поэтому прототип всегда
  показывает все три статуса, когда бы его ни открыли.
  photo — фото на прозрачном фоне (вырезка), у остальных рисуется флакон.
*/
const DEMO_ITEMS = [
  { name: "Тушь Curl Fix",                 brand: "Etude",      category: "Макияж", months: 3,  daysLeft: -5,  color: 1, photo: "assets/photos/etude-mascara.webp" },
  { name: "Сыворотка с витамином C",       brand: "Lumière",    category: "Лицо",   months: 12, daysLeft: 12,  color: 0 },
  { name: "Солнцезащитный флюид",          brand: "Sunny Day",  category: "Лицо",   months: 6,  daysLeft: 20,  color: 6 },
  { name: "Блеск Glasting Color Gloss",    brand: "rom&nd",     category: "Макияж", months: 12, daysLeft: 24,  color: 4, photo: "assets/photos/romand-gloss.webp" },
  { name: "Лосьон для тела",               brand: "Cocoa Club", category: "Тело",   months: 12, daysLeft: 28,  color: 3 },
  { name: "Пенка 1025 Dokdo Cleanser",     brand: "Round Lab",  category: "Лицо",   months: 12, daysLeft: 95,  color: 2, photo: "assets/photos/roundlab-cleanser.webp" },
  { name: "Румяна-стик Pocket Blush",      brand: "rhode",      category: "Макияж", months: 12, daysLeft: 150, color: 0, photo: "assets/photos/rhode-blush.webp" },
  { name: "Кушон Kill Cover Mesh",         brand: "CLIO",       category: "Макияж", months: 12, daysLeft: 180, color: 3, photo: "assets/photos/clio-cushion.webp" },
  { name: "Скраб для тела",                brand: "Cocoa Club", category: "Тело",   months: 12, daysLeft: 200, color: 7 },
  { name: "Увлажняющий крем",              brand: "Aqua Bloom", category: "Лицо",   months: 12, daysLeft: 240, color: 2 },
  { name: "Шампунь для объёма",            brand: "Nord Skin",  category: "Волосы", months: 12, daysLeft: 300, color: 4 },
  { name: "Туалетная вода «Пион»",         brand: "Maison Rose",category: "Парфюм", months: 36, daysLeft: 700, color: 5 },
];

/* Шаги рутины (для вкладки «Рутина») — по категориям */
const ROUTINE = {
  morning: ["Лицо", "Макияж"],
  evening: ["Лицо", "Волосы", "Тело"],
};
