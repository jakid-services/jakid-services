import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, push, onValue, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);
const root = document.getElementById("app");

/* ═══════════════ КОНСТАНТЫ ═══════════════ */

const STATUS       = { sent: "Отправлено", received: "Получено", accepted: "Принято" };
const ROLE_RU      = { user: "пользователь", staff: "сотрудник", admin: "админ" };
const DOC_STATUS   = { active: "Действителен", pending: "Ожидает выдачи", revoked: "Аннулирован" };
const WANTED_STATUS = { wanted: "В розыске", detained: "Задержан", cleared: "Розыск прекращён" };
const DOC_TYPES    = {
  passport: "Паспорт", inn: "ИНН", registration: "Прописка",
  medical: "Медицинская карта", certificate: "Свидетельство",
  permit: "Разрешение", license: "Удостоверение", other: "Иной документ"
};
const SERVICE_TYPES = {
  military:  "Военнослужащий",
  police:    "Сотрудник МВД",
  emergency: "Экстренная служба",
  judicial:  "Судебная система"
};
const REGIONS = ["т/о Мекас", "т/о Эльт", "ОЭЗ Кибер-Сити", "Республика Балугу"];

const DEFAULT_CATEGORIES = {
  court: {
    name: "Обращение в Суд", order: 1,
    fields: [
      { key: "subject",    label: "Краткое описание иска",     type: "text",     required: true },
      { key: "respondent", label: "Ответчик (ФИО / название)", type: "text",     required: true },
      { key: "claimBody",  label: "Суть иска",                 type: "textarea", required: true },
      { key: "demands",    label: "Требования",                type: "textarea", required: true },
      { key: "evidence",   label: "Доказательства",            type: "textarea", required: false }
    ]
  },
  labor: {
    name: "Улучшение трудовых условий (МинТруд)", order: 2,
    fields: [
      { key: "subject",           label: "Кратко о проблеме",     type: "text",     required: true },
      { key: "employer",          label: "Работодатель",          type: "text",     required: true },
      { key: "currentConditions", label: "Текущие условия труда", type: "textarea", required: true },
      { key: "improvements",      label: "Желаемые улучшения",    type: "textarea", required: true },
      { key: "reason",            label: "Обоснование",           type: "textarea", required: false }
    ]
  },
  registration: {
    name: "Смена регистрации", order: 3,
    fields: [
      { key: "subject",       label: "Причина смены",           type: "text",     required: true },
      { key: "currentRegion", label: "Текущая регистрация",     type: "select",   required: true, options: REGIONS },
      { key: "newRegion",     label: "Новая регистрация",       type: "select",   required: true, options: REGIONS },
      { key: "details",       label: "Дополнительные сведения", type: "textarea", required: false }
    ]
  },
  grant: {
    name: "Грант (культура / бизнес)", order: 4,
    fields: [
      { key: "subject",     label: "Название проекта",        type: "text",     required: true },
      { key: "grantType",   label: "Тип гранта",              type: "select",   required: true, options: ["Культурный проект", "Бизнес проект"] },
      { key: "description", label: "Описание проекта",        type: "textarea", required: true },
      { key: "amount",      label: "Запрашиваемая сумма (₮)", type: "number",   required: true },
      { key: "budget",      label: "План расходов",           type: "textarea", required: true }
    ]
  },
  inspection: {
    name: "Проверка трудовых условий (МинТруд / МВД)", order: 5,
    fields: [
      { key: "subject",       label: "Кратко о проблеме",  type: "text",     required: true },
      { key: "authority",     label: "Куда направить",     type: "select",   required: true, options: ["Министерство труда", "МВД"] },
      { key: "employer",      label: "Работодатель",       type: "text",     required: true },
      { key: "violationType", label: "Что проверить",      type: "select",   required: true, options: ["Нарушение трудового договора", "Техника безопасности", "Оба"] },
      { key: "description",   label: "Описание нарушений", type: "textarea", required: true }
    ]
  },
  military: {
    name: "Помощь военнослужащим и семьям", order: 6,
    fields: [
      { key: "subject",        label: "Кратко о ситуации",   type: "text",     required: true },
      { key: "status",         label: "Ваш статус",          type: "select",   required: true, options: ["Военнослужащий", "Член семьи военнослужащего"] },
      { key: "servicemanName", label: "ФИО военнослужащего", type: "text",     required: true },
      { key: "unit",           label: "Подразделение",       type: "text",     required: false },
      { key: "aidType",        label: "Вид помощи",          type: "select",   required: true, options: ["Материальная", "Медицинская", "Юридическая", "Иная"] },
      { key: "situation",      label: "Описание ситуации",   type: "textarea", required: true }
    ]
  },
  citizenship: {
    name: "Гражданство (получение / продление)", order: 7,
    fields: [
      { key: "subject",            label: "Кратко о запросе",    type: "text",     required: true },
      { key: "action",             label: "Действие",            type: "select",   required: true, options: ["Получение", "Продление", "Восстановление", "Выход"] },
      { key: "currentCitizenship", label: "Текущее гражданство", type: "text",     required: true },
      { key: "birthDate",          label: "Дата рождения",       type: "date",     required: true },
      { key: "residenceRegion",    label: "Регион проживания",   type: "select",   required: true, options: REGIONS },
      { key: "reason",             label: "Обоснование",         type: "textarea", required: true }
    ]
  },
  marriage: {
    name: "Регистрация / расторжение брака", order: 8,
    fields: [
      { key: "subject",       label: "Тема обращения",  type: "text",     required: true },
      { key: "action",        label: "Действие",        type: "select",   required: true, options: ["Регистрация брака", "Расторжение брака"] },
      { key: "partnerName",   label: "ФИО партнёра",    type: "text",     required: true },
      { key: "partnerEmail",  label: "Email партнёра",  type: "text",     required: false },
      { key: "preferredDate", label: "Желаемая дата",   type: "date",     required: false },
      { key: "notes",         label: "Дополнительно",   type: "textarea", required: false }
    ]
  },
  businessLicense: {
    name: "Лицензия на бизнес", order: 9,
    fields: [
      { key: "subject",     label: "Название бизнеса",        type: "text",     required: true },
      { key: "legalForm",   label: "Форма",                   type: "select",   required: true, options: ["ИП", "ООО", "НКО", "Самозанятый"] },
      { key: "sphere",      label: "Сфера деятельности",      type: "text",     required: true },
      { key: "address",     label: "Адрес регистрации",       type: "text",     required: true },
      { key: "capital",     label: "Уставный капитал (₮)",    type: "number",   required: false },
      { key: "description", label: "Описание",                type: "textarea", required: true }
    ]
  },
  complaint: {
    name: "Жалоба на решение органа", order: 10,
    fields: [
      { key: "subject",        label: "Кратко о жалобе",  type: "text",     required: true },
      { key: "authority",      label: "Орган",            type: "text",     required: true },
      { key: "decisionNumber", label: "Номер решения",    type: "text",     required: false },
      { key: "decisionDate",   label: "Дата решения",     type: "date",     required: false },
      { key: "essence",        label: "Суть жалобы",      type: "textarea", required: true },
      { key: "demands",        label: "Что просите",      type: "textarea", required: true }
    ]
  },
  telemedicine: {
    name: "Телемедицинская консультация", order: 11,
    fields: [
      { key: "subject",       label: "Тема консультации",   type: "text",     required: true },
      { key: "specialty",     label: "Специальность врача", type: "select",   required: true, options: ["Терапевт", "Педиатр", "Психолог", "Кардиолог", "Дерматолог", "Иное"] },
      { key: "symptoms",      label: "Жалобы / симптомы",   type: "textarea", required: true },
      { key: "preferredDate", label: "Желаемая дата",       type: "date",     required: false },
      { key: "preferredTime", label: "Желаемое время",      type: "select",   required: false, options: ["09:00–12:00", "12:00–15:00", "15:00–18:00", "18:00–21:00"] },
      { key: "contactPhone",  label: "Телефон для связи",   type: "text",     required: false }
    ]
  },
  party: {
    name: "Регистрация политической партии", order: 12,
    fields: [
      { key: "subject",      label: "Название партии",       type: "text",     required: true },
      { key: "shortName",    label: "Аббревиатура",          type: "text",     required: false },
      { key: "ideology",     label: "Идеология",             type: "select",   required: true, options: ["Либеральная", "Социал-демократическая", "Консервативная", "Зелёная", "Иная"] },
      { key: "founders",     label: "Основатели (ФИО)",      type: "textarea", required: true },
      { key: "membersCount", label: "Число членов",          type: "number",   required: true },
      { key: "program",      label: "Программа партии",      type: "textarea", required: true }
    ]
  },
  tax: {
    name: "Налоговая декларация", order: 13,
    fields: [
      { key: "subject",  label: "Период (например 2026)",  type: "text",     required: true },
      { key: "year",     label: "Год",                     type: "number",   required: true },
      { key: "income",   label: "Доход за год (₮)",        type: "number",   required: true },
      { key: "expenses", label: "Расходы (₮)",             type: "number",   required: false },
      { key: "sources",  label: "Источники дохода",        type: "textarea", required: true },
      { key: "notes",    label: "Дополнительно",           type: "textarea", required: false }
    ]
  }
};

const DEFAULT_FAQ = {
  faq_1: { question: "Что такое ЖакидУслуги?", answer: "Единый портал государственных услуг Республики Жакид.", order: 1, createdAt: Date.now() },
  faq_2: { question: "Сколько рассматривается заявление?", answer: "Обычно 3–7 рабочих дней.", order: 2, createdAt: Date.now() },
  faq_3: { question: "Что означают статусы?", answer: "«Отправлено» — попало в базу. «Получено» — сотрудник открыл. «Принято» — вынесено решение.", order: 3, createdAt: Date.now() },
  faq_4: { question: "Можно ли добавить документ самому?", answer: "Да, «Мои документы» → «Добавить документ».", order: 4, createdAt: Date.now() },
  faq_5: { question: "Как найти моё заявление?", answer: "У каждого заявления есть ID вида #A3F8B21C — ищите по нему в «Моих заявлениях» и в очереди.", order: 5, createdAt: Date.now() }
};

/* ═══════════════ СОСТОЯНИЕ ═══════════════ */

let me         = null;
let profile    = {};
let role       = "user";
let categories = {};
let staffCats  = {};
const pendingCategory = { value: null };

let globalSubs = [];
let tabSubs    = [];

const unsubGlobal = () => { globalSubs.forEach(f => { try { f(); } catch (e) {} }); globalSubs = []; };
const unsubTab    = () => { tabSubs.forEach(f => { try { f(); } catch (e) {} }); tabSubs = []; };
const subG = f => globalSubs.push(f);
const sub  = f => tabSubs.push(f);

/* ═══════════════ ХЕЛПЕРЫ ═══════════════ */

const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt     = t => t ? new Date(t).toLocaleString("ru-RU") : "";
const shortId = id => id ? "#" + id.slice(-8).toUpperCase() : "";

const catName = id => categories[id]?.name || DEFAULT_CATEGORIES[id]?.name || `[${id}]`;
const catFields = id => (categories[id]?.fields || DEFAULT_CATEGORIES[id]?.fields || []).filter(f => f.key !== "subject");

function fieldLabel(catId, key) {
  const f = (categories[catId]?.fields || []).find(x => x.key === key);
  if (f) return f.label;
  for (const c of [...Object.values(categories), ...Object.values(DEFAULT_CATEGORIES)]) {
    const ff = (c?.fields || []).find(x => x.key === key);
    if (ff) return ff.label;
  }
  return key;
}

function sortedEntries(obj) {
  return Object.entries(obj || {}).sort((a, b) => (a[1]?.order || 999) - (b[1]?.order || 999));
}

const canDeleteApp = cat => role === "admin" || (role === "staff" && staffCats[cat] === true);
const canIssueDocs = ()  => role === "admin" || (role === "staff" && staffCats["documents"] === true);

function switchTab(k) {
  const btn = root.querySelector(`#tabs [data-tab="${k}"]`);
  if (btn) btn.click();
}

/* ═══════════════ АРХИВ / УДАЛЕНИЕ ═══════════════ */

function downloadApp(a, id) {
  const cat  = categories[a.category] || DEFAULT_CATEGORIES[a.category];
  const msgs = Object.entries(a.messages || {})
    .sort((x, y) => (x[1].createdAt || 0) - (y[1].createdAt || 0));

  const L = ["=".repeat(62), "ЖАКИДУСЛУГИ · РЕСПУБЛИКА ЖАКИД", "АРХИВНАЯ КОПИЯ ЗАЯВЛЕНИЯ", "=".repeat(62), ""];
  L.push(`ID заявления:  ${shortId(id)} (${id})`);
  L.push(`Категория:     ${cat?.name || a.category}`);
  L.push(`Статус:        ${STATUS[a.status] || a.status}`);
  L.push(`Дата подачи:   ${fmt(a.createdAt)}`);
  L.push(`Заявитель:     ${a.authorName || "—"} (${a.uid})`);
  if (a.assignee) L.push(`Ответственный: ${a.assignee.name || a.assignee.uid}`);
  L.push("", "— Поля заявления —");
  Object.entries(a.fields || {}).forEach(([k, v]) => { if (v) L.push(`${fieldLabel(a.category, k)}: ${v}`); });
  L.push("", "— Переписка —");
  if (!msgs.length) L.push("(нет сообщений)");
  else msgs.forEach(([, m]) => {
    L.push(`[${fmt(m.createdAt)}] ${m.by === a.uid ? "Заявитель" : "Сотрудник"}:`);
    L.push(`  ${m.text}`, "");
  });
  L.push("", "=".repeat(62), `Архив создан: ${fmt(Date.now())}`);

  const blob = new Blob([L.join("\n")], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zayavlenie-${id.slice(-8)}-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const markedReceived    = new Set();
const receivedObservers = new Map();

function observeAsReceived(appId, node) {
  if (markedReceived.has(appId) || receivedObservers.has(appId)) return;
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting && !markedReceived.has(appId)) {
        markedReceived.add(appId);
        set(ref(db, `applications/${appId}/status`), "received").catch(console.error);
        obs.disconnect();
        receivedObservers.delete(appId);
      }
    }
  }, { threshold: 0.5 });
  obs.observe(node);
  receivedObservers.set(appId, obs);
}

/* ═══════════════ ИСПРАВЛЕННОЕ УДАЛЕНИЕ ═══════════════ */
async function deleteApplication(appId) {
  const snap = await get(ref(db, `applications/${appId}`));
  const a = snap.val();
  if (!a) { alert("Заявление уже удалено."); return; }
  if (!confirm(`Заявление ${shortId(appId)} будет сохранено в файл .txt и удалено из базы.\n\nПродолжить?`)) return;

  downloadApp(a, appId);
  await new Promise(r => setTimeout(r, 400));

  try {
    // Шаг 1: удаляем индексы, ПОКА applications/$appId ещё существует.
    // Тогда правило userApps (root.child('applications').child($appId).exists())
    // видит true и пропускает удаление.
    await update(ref(db), {
      [`userApps/${a.uid}/${appId}`]:        null,
      [`staffQueue/${a.category}/${appId}`]: null
    });

    // Шаг 2: удаляем само заявление.
    // Индексов уже нет, правило applications для удаления пропускает.
    await set(ref(db, `applications/${appId}`), null);

    // Шаг 3 (best-effort): чистим заметки. Если прав нет — молча пропускаем,
    // данные просто останутся в БД, на работу это не влияет.
    remove(ref(db, `applicationNotes/${appId}`)).catch(() => {});
  } catch (e) {
    alert("Не удалось удалить: " + e.message);
  }
}

/* ═══════════════ УВЕДОМЛЕНИЯ ═══════════════ */

async function getUnread() {
  if (role !== "user") return { count: 0, snapshot: {} };
  const key  = `seen_${me.uid}`;
  const seen = JSON.parse(localStorage.getItem(key) || "{}");
  const snap = await get(ref(db, `userApps/${me.uid}`));
  const ids  = Object.keys(snap.val() || {});
  const current = {};
  let count = 0;

  for (const id of ids) {
    const a = (await get(ref(db, `applications/${id}`))).val();
    if (!a) continue;
    const mc = Object.keys(a.messages || {}).length;
    current[id] = { status: a.status, msgCount: mc };
    const prev = seen[id];
    if (prev && a.status === "accepted" && (prev.status !== "accepted" || prev.msgCount < mc)) count++;
  }
  return { count, snapshot: current };
}

async function refreshUnreadBadge() {
  if (role !== "user") return;
  try {
    const { count } = await getUnread();
    const tabBtn = root.querySelector('#tabs [data-tab="apps"]');
    if (!tabBtn) return;
    let badge = tabBtn.querySelector(".badge-num");
    if (count > 0) {
      if (!badge) { badge = document.createElement("span"); badge.className = "badge-num"; tabBtn.appendChild(badge); }
      badge.textContent = count;
    } else if (badge) badge.remove();
  } catch (e) {}
}

/* ═══════════════ АВТОРИЗАЦИЯ ═══════════════ */

function renderAuth() {
  root.innerHTML = `
    <h1>ЖакидУслуги</h1>
    <p class="muted">Официальный портал государственных услуг Республики Жакид</p>

    <div class="card">
      <h2>Вход</h2>
      <form id="login">
        <label><span>Email</span><input name="email" type="email" required></label>
        <label><span>Пароль</span><input name="password" type="password" required></label>
        <button class="primary">Войти</button>
      </form>
      <p class="err" id="e1"></p>
    </div>

    <div class="card">
      <h2>Регистрация</h2>
      <form id="reg">
        <label><span>Имя / ФИО</span><input name="name" required></label>
        <label><span>Email</span><input name="email" type="email" required></label>
        <label><span>Пароль (мин. 6)</span><input name="password" type="password" minlength="6" required></label>
        <button class="primary">Создать аккаунт</button>
      </form>
      <p class="err" id="e2"></p>
    </div>`;

  root.querySelector("#login").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    try { await signInWithEmailAndPassword(auth, f.email.value, f.password.value); }
    catch (err) { root.querySelector("#e1").textContent = "Ошибка: " + err.message; }
  };

  root.querySelector("#reg").onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    try {
      const cred = await createUserWithEmailAndPassword(auth, f.email.value, f.password.value);
      await updateProfile(cred.user, { displayName: f.name.value });
      await set(ref(db, `users/${cred.user.uid}`), {
        displayName: f.name.value, email: f.email.value, createdAt: Date.now()
      });
    } catch (err) { root.querySelector("#e2").textContent = "Ошибка: " + err.message; }
  };
}

onAuthStateChanged(auth, async u => {
  unsubGlobal(); unsubTab();
  me = u;
  if (!u) { renderAuth(); return; }

  try {
    const [r, c, sc, p] = await Promise.all([
      get(ref(db, `roles/${u.uid}`)),
      get(ref(db, "categories")),
      get(ref(db, `staffCategories/${u.uid}`)),
      get(ref(db, `users/${u.uid}`))
    ]);
    role       = r.val()  || "user";
    categories = c.val()  || {};
    staffCats  = sc.val() || {};
    profile    = p.val()  || {};
  } catch (e) {
    console.error(e);
    role = "user"; categories = {}; staffCats = {}; profile = {};
  }

  subG(onValue(ref(db, `roles/${u.uid}`), snap => {
    const nr = snap.val() || "user";
    if (nr !== role) { role = nr; renderDash(); }
  }));
  subG(onValue(ref(db, "categories"),              snap => { categories = snap.val() || {}; }));
  subG(onValue(ref(db, `staffCategories/${u.uid}`), snap => { staffCats  = snap.val() || {}; }));
  subG(onValue(ref(db, `users/${u.uid}`),           snap => { profile    = snap.val() || {}; }));

  renderDash();
});

/* ═══════════════ КАРКАС ═══════════════ */

function renderDash() {
  unsubTab();
  root.innerHTML = `
    <h1>ЖакидУслуги</h1>
    <header>
      <div>
        <strong>${esc(me.displayName || me.email)}</strong>
        <span class="badge">${ROLE_RU[role]}</span>
        ${renderServiceBadge()}
      </div>
      <button id="logout" class="mini">Выйти</button>
    </header>
    <nav id="tabs"></nav>
    <main id="view"></main>`;

  root.querySelector("#logout").onclick = () => signOut(auth);

  const tabs = [
    ["home",       "Главная",           true],
    ["apps",       "Мои заявления",     true],
    ["docs",       "Мои документы",     true],
    ["wanted",     "Розыск",            true],
    ["faq",        "Частые вопросы",    true],
    ["profile",    "Профиль",           true],
    ["queue",      "Очередь",           role !== "user"],
    ["docs-issue", "Выдать документ",   canIssueDocs()],
    ["admin",      "Администрирование", role === "admin"]
  ].filter(t => t[2]);

  const nav  = root.querySelector("#tabs");
  const view = root.querySelector("#view");
  nav.innerHTML = tabs.map(([k, t]) => `<button data-tab="${k}">${t}</button>`).join("");

  const mounts = {
    home: mountHome, apps: mountApps, docs: mountDocs,
    wanted: mountWanted, faq: mountFaq, profile: mountProfile,
    queue: mountQueue, "docs-issue": mountIssueDoc, admin: mountAdmin
  };

  const go = k => {
    unsubTab();
    [...nav.children].forEach(b => b.classList.toggle("active", b.dataset.tab === k));
    mounts[k](view);
  };
  nav.onclick = e => {
    const b = e.target.closest("button[data-tab]");
    if (b) go(b.dataset.tab);
  };

  go("home");
  refreshUnreadBadge();
}

function renderServiceBadge() {
  if (!profile.serviceType) return "";
  const type = SERVICE_TYPES[profile.serviceType] || "";
  const bits = [type, profile.rank, profile.unit].filter(Boolean).map(esc);
  return `<span class="service-badge" title="Служба">🛡️ ${bits.join(" · ")}</span>`;
}

/* ═══════════════ ФОРМА ═══════════════ */

function fieldHtml(f, value = "") {
  const req  = f.required ? "required" : "";
  const v    = value ?? "";
  const opts = (f.options || []).map(o =>
    `<option value="${esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("");

  let control;
  switch (f.type) {
    case "textarea": control = `<textarea name="${esc(f.key)}" rows="3" ${req}>${esc(v)}</textarea>`; break;
    case "select":   control = `<select name="${esc(f.key)}" ${req}>${opts}</select>`; break;
    case "number":   control = `<input name="${esc(f.key)}" type="number" ${req} value="${esc(v)}">`; break;
    case "date":     control = `<input name="${esc(f.key)}" type="date" ${req} value="${esc(v)}">`; break;
    default:         control = `<input name="${esc(f.key)}" type="text" ${req} value="${esc(v)}">`;
  }
  return `<label><span>${esc(f.label)}${f.required ? " *" : ""}</span>${control}</label>`;
}

/* ═══════════════ КАРТОЧКА ЗАЯВЛЕНИЯ ═══════════════ */

function renderAppCard(node, a, id, opts = {}) {
  if (!a) { node.remove(); return; }
  const sig = JSON.stringify(a) + "|" + (opts.staffList || []).length;
  if (node.dataset.sig === sig) return;
  node.dataset.sig = sig;

  const oldDraft = node.querySelector('form.reply input[name="text"]')?.value || "";
  const cat      = categories[a.category] || DEFAULT_CATEGORIES[a.category];
  const title    = a.fields?.subject || cat?.name || `[${a.category}]`;
  const msgs     = Object.entries(a.messages || {})
    .sort((x, y) => (x[1].createdAt || 0) - (y[1].createdAt || 0));
  const staffList = opts.staffList || [];

  const fieldDefs = cat?.fields || [];
  const fieldsHtml = fieldDefs.length > 0
    ? fieldDefs.filter(f => a.fields?.[f.key] != null && a.fields[f.key] !== "")
        .map(f => `<div><b>${esc(f.label)}:</b> ${esc(a.fields[f.key])}</div>`).join("")
    : Object.entries(a.fields || {}).filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join("");

  const canStatus = opts.staff && (role === "admin" || staffCats[a.category] === true);
  const canDel    = opts.staff && canDeleteApp(a.category);
  const canAssign = canStatus;
  const canChangeCat = opts.staff && (role === "admin" || (role === "staff" && staffCats[a.category] === true));

  node.innerHTML = `
    <div class="app-head">
      <strong>${esc(title)}</strong>
      <span class="status s-${esc(a.status)}">${STATUS[a.status] || esc(a.status)}</span>
    </div>
    <div class="app-id" title="${esc(id)}">${esc(shortId(id))}</div>
    <div class="muted">${esc(catName(a.category))} · ${fmt(a.createdAt)}</div>
    ${opts.staff ? `<div class="muted">Заявитель: ${esc(a.authorName || a.uid)}</div>` : ""}
    ${a.assignee ? `<div class="muted">Ответственный: ${esc(a.assignee.name || a.assignee.uid)}</div>` : ""}
    <div class="app-fields">${fieldsHtml}</div>

    <div class="thread">
      ${msgs.map(([, m]) => `
        <div class="msg ${m.by === me.uid ? "mine" : ""}">
          <div class="msg-meta">${m.by === a.uid ? "Заявитель" : "Сотрудник"} · ${fmt(m.createdAt)}</div>
          <div>${esc(m.text)}</div>
        </div>`).join("") || `<p class="muted">Сообщений пока нет.</p>`}
    </div>

    ${canStatus ? `
      <label><span>Статус</span>
        <select class="status-sel" data-id="${esc(id)}">
          ${Object.entries(STATUS).map(([k, v]) =>
            `<option value="${k}" ${a.status === k ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </label>` : ""}

    ${canAssign ? `
      <label><span>Ответственный</span>
        <select class="assignee-sel" data-id="${esc(id)}">
          <option value="">— не назначен —</option>
          ${staffList.map(s =>
            `<option value="${esc(s.uid)}" ${a.assignee?.uid === s.uid ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
        </select>
      </label>` : ""}

    ${canChangeCat ? `
      <label><span>Категория</span>
        <select class="category-sel" data-id="${esc(id)}">
          ${sortedEntries({ ...DEFAULT_CATEGORIES, ...categories }).map(([k, c]) =>
            `<option value="${esc(k)}" ${a.category === k ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
        </select>
      </label>` : ""}

    <form class="reply" data-id="${esc(id)}">
      <label><span>Сообщение</span>
        <input name="text" placeholder="Написать сообщение…" required value="${esc(oldDraft)}">
      </label>
      <button class="mini">Отправить</button>
    </form>

    ${opts.staff ? `
      <details style="margin-top:8px;">
        <summary style="cursor:pointer;font-size:14px;opacity:.8;">🕵️ Внутренние заметки</summary>
        <div class="notes-box" data-id="${esc(id)}" style="margin-top:8px;padding:8px;background:#8881;border-radius:8px;">
          <div class="notes-list" data-id="${esc(id)}"><p class="muted" style="font-size:13px;">Загрузка…</p></div>
          <form class="note-form" data-id="${esc(id)}" style="margin-top:8px;">
            <input name="text" placeholder="Внутренняя заметка (гражданин не увидит)" required>
            <button class="mini" style="margin-top:4px;">Добавить</button>
          </form>
        </div>
      </details>` : ""}

    ${canDel ? `
      <div style="margin-top:8px;text-align:right;">
        <button class="mini" data-del-id="${esc(id)}" style="color:#b91c1c;border-color:#b91c1c;">
          Удалить с сохранением в файл
        </button>
      </div>` : ""}`;

  if (opts.staff && a.status === "sent") observeAsReceived(id, node);

  if (opts.staff) {
    const listEl = node.querySelector(`.notes-list[data-id="${id}"]`);
    if (listEl) {
      get(ref(db, `applicationNotes/${id}`)).then(s => {
        const notes = s.val() || {};
        const entries = Object.entries(notes).sort((x, y) => (x[1].createdAt || 0) - (y[1].createdAt || 0));
        listEl.innerHTML = entries.length
          ? entries.map(([, n]) => `<div style="font-size:13px;margin-bottom:6px;"><b>${esc(n.byName || "сотрудник")}</b> · ${fmt(n.createdAt)}<br>${esc(n.text)}</div>`).join("")
          : `<p class="muted" style="font-size:13px;">Заметок нет</p>`;
      }).catch(() => {});
    }
  }
}

async function onReply(e) {
  const f = e.target.closest("form.reply");
  if (!f) return;
  e.preventDefault();
  const text = f.elements.text.value.trim();
  if (!text) return;
  try {
    await push(ref(db, `applications/${f.dataset.id}/messages`),
      { by: me.uid, role, text, createdAt: Date.now() });
    f.reset();
    refreshUnreadBadge();
  } catch (err) { alert("Не удалось отправить: " + err.message); }
}

async function onStatusChange(e) {
  const sel = e.target.closest("select.status-sel");
  if (!sel) return;
  try { await set(ref(db, `applications/${sel.dataset.id}/status`), sel.value); }
  catch (err) { alert("Не удалось изменить статус: " + err.message); }
}

async function onAssigneeChange(e) {
  const sel = e.target.closest("select.assignee-sel");
  if (!sel) return;
  const uid = sel.value;
  const name = sel.options[sel.selectedIndex]?.textContent || uid;
  try {
    if (!uid) await set(ref(db, `applications/${sel.dataset.id}/assignee`), null);
    else await set(ref(db, `applications/${sel.dataset.id}/assignee`), { uid, name });
  } catch (err) { alert("Не удалось назначить: " + err.message); }
}

async function onCategoryChange(e) {
  const sel = e.target.closest("select.category-sel");
  if (!sel) return;
  const appId  = sel.dataset.id;
  const newCat = sel.value;
  const snap   = await get(ref(db, `applications/${appId}`));
  const oldCat = snap.val()?.category;
  if (!oldCat || oldCat === newCat) return;
  try {
    await update(ref(db), {
      [`applications/${appId}/category`]:  newCat,
      [`staffQueue/${oldCat}/${appId}`]:   null,
      [`staffQueue/${newCat}/${appId}`]:   true
    });
  } catch (err) {
    alert("Ошибка смены категории: " + err.message);
    sel.value = oldCat;
  }
}

async function onNote(e) {
  const f = e.target.closest("form.note-form");
  if (!f) return;
  e.preventDefault();
  const text = f.elements.text.value.trim();
  if (!text) return;
  try {
    await push(ref(db, `applicationNotes/${f.dataset.id}`),
      { by: me.uid, byName: me.displayName || me.email, text, createdAt: Date.now() });
    f.reset();
    const box = f.closest(".app-item");
    if (box) box.dataset.sig = "";
  } catch (err) { alert(err.message); }
}

/* ═══════════════ ГЛАВНАЯ ═══════════════ */

function mountHome(view) {
  view.innerHTML = `
    <h2>Добро пожаловать${me.displayName ? ", " + esc(me.displayName) : ""}</h2>
    <div style="margin-bottom:12px;">
      ${renderServiceBadge()}
      <span class="badge">${ROLE_RU[role]}</span>
    </div>

    <section class="card">
      <h2>📰 Новости правительства</h2>
      <div id="news-feed"><p class="muted">Загрузка…</p></div>
    </section>

    <section class="card">
      <h2>⚡ Быстрые действия</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button data-quick="citizenship" class="mini">Гражданство</button>
        <button data-quick="marriage" class="mini">Брак</button>
        <button data-quick="telemedicine" class="mini">Телемедицина</button>
        <button data-quick="tax" class="mini">Налоги</button>
        <button data-quick="__all__" class="mini primary">Все услуги →</button>
      </div>
    </section>

    <section class="card">
      <h2>🔴 В розыске</h2>
      <div id="wanted-teaser"><p class="muted">Загрузка…</p></div>
      <button id="wanted-more" class="mini" style="margin-top:8px;">Весь список →</button>
    </section>`;

  sub(onValue(ref(db, "news"), snap => {
    const items = Object.entries(snap.val() || {})
      .map(([id, n]) => ({ id, ...n }))
      .sort((a, b) => (a.pinned && !b.pinned ? -1 : !a.pinned && b.pinned ? 1 : (b.createdAt || 0) - (a.createdAt || 0)))
      .slice(0, 5);
    const feed = view.querySelector("#news-feed");
    if (!items.length) { feed.innerHTML = `<p class="muted">Пока новостей нет.</p>`; return; }
    feed.innerHTML = items.map(n => `
      <div class="news-item ${n.pinned ? "pinned" : ""}">
        <div class="news-title">${n.pinned ? "📌 " : ""}${esc(n.title)}</div>
        <div class="news-meta">${esc(n.author || "администрация")} · ${fmt(n.createdAt)}</div>
        <div class="news-body">${esc(n.body)}</div>
      </div>`).join("");
  }));

  sub(onValue(ref(db, "wanted"), snap => {
    const items = Object.entries(snap.val() || {}).filter(([, w]) => w.status === "wanted").slice(0, 3);
    const t = view.querySelector("#wanted-teaser");
    if (!items.length) { t.innerHTML = `<p class="muted">Список пуст.</p>`; return; }
    t.innerHTML = items.map(([, w]) => `
      <div class="wanted-card">
        <b>${esc(w.name)}</b> · <span class="wanted-status ${esc(w.status)}">${WANTED_STATUS[w.status]}</span>
        <div class="muted">С ${esc(w.since)}: ${esc(w.reason)}</div>
      </div>`).join("");
  }));

  view.querySelector('[data-quick="__all__"]').onclick = () => { pendingCategory.value = null; switchTab("apps"); };
  view.querySelectorAll("[data-quick]").forEach(btn => {
    if (btn.dataset.quick === "__all__") return;
    btn.onclick = () => { pendingCategory.value = btn.dataset.quick; switchTab("apps"); };
  });
  view.querySelector("#wanted-more").onclick = () => switchTab("wanted");
}

/* ═══════════════ МОИ ЗАЯВЛЕНИЯ ═══════════════ */

function mountApps(view) {
  const sourceCats = Object.keys(categories).length > 0 ? categories : DEFAULT_CATEGORIES;
  const catOptions = sortedEntries(sourceCats)
    .map(([id, c]) => `<option value="${esc(id)}">${esc(c.name)}</option>`).join("");

  view.innerHTML = `
    <div id="unread-slot"></div>
    <div id="draft-slot"></div>

    <section class="card">
      <h2>Подать заявление</h2>
      ${catOptions
        ? `<label><span>Категория</span><select id="cat-select">${catOptions}</select></label>
           <form id="f-new">
             <div id="fields"></div>
             <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
               <button class="primary" style="flex:1;">Отправить заявление</button>
               <button type="button" id="save-draft" class="mini">💾 Сохранить черновик</button>
             </div>
           </form>
           <p class="err" id="e-new"></p>`
        : `<p class="muted">Категории ещё не созданы.</p>`}
    </section>

    <h2>Мои заявления</h2>
    <div class="search-row">
      <input id="apps-search" placeholder="🔍 Поиск по ID, теме, содержанию…">
    </div>
    <div id="apps"></div>
    <p id="empty" class="muted">Заявлений пока нет.</p>`;

  if (catOptions) {
    const catSel   = view.querySelector("#cat-select");
    const fieldsEl = view.querySelector("#fields");
    const form     = view.querySelector("#f-new");

    const paintForm = (values = {}) => {
      const cat = sourceCats[catSel.value];
      fieldsEl.innerHTML = (cat?.fields || []).map(f => fieldHtml(f, values[f.key])).join("");
    };
    catSel.onchange = () => paintForm();
    paintForm();

    if (pendingCategory.value && sourceCats[pendingCategory.value]) {
      catSel.value = pendingCategory.value;
      paintForm();
      pendingCategory.value = null;
    }

    const draftSlot = view.querySelector("#draft-slot");
    get(ref(db, `drafts/${me.uid}`)).then(snap => {
      const d = snap.val();
      if (!d) return;
      draftSlot.innerHTML = `
        <div class="draft-banner">
          <span>📝 Черновик: <b>${esc(catName(d.category))}</b> от ${fmt(d.savedAt)}</span>
          <button class="mini" id="draft-resume">Продолжить</button>
          <button class="mini" id="draft-drop" style="color:#b91c1c;">Удалить</button>
        </div>`;
      view.querySelector("#draft-resume").onclick = () => {
        if (sourceCats[d.category]) { catSel.value = d.category; paintForm(d.fields || {}); }
        draftSlot.innerHTML = "";
      };
      view.querySelector("#draft-drop").onclick = async () => {
        await remove(ref(db, `drafts/${me.uid}`));
        draftSlot.innerHTML = "";
      };
    });

    view.querySelector("#save-draft").onclick = async () => {
      const fd = new FormData(form);
      const fields = {};
      for (const f of (sourceCats[catSel.value]?.fields || [])) fields[f.key] = fd.get(f.key) ?? "";
      try {
        await set(ref(db, `drafts/${me.uid}`), { category: catSel.value, fields, savedAt: Date.now() });
        view.querySelector("#e-new").className = "ok";
        view.querySelector("#e-new").textContent = "✓ Черновик сохранён";
        setTimeout(() => { view.querySelector("#e-new").textContent = ""; view.querySelector("#e-new").className = "err"; }, 2000);
      } catch (err) { view.querySelector("#e-new").textContent = "Ошибка: " + err.message; }
    };

    form.onsubmit = async e => {
      e.preventDefault();
      const cat = catSel.value;
      const fd  = new FormData(e.target);
      const fields = {};
      for (const f of (sourceCats[cat]?.fields || [])) fields[f.key] = fd.get(f.key) ?? "";

      if (!fields.subject) {
        view.querySelector("#e-new").className = "err";
        view.querySelector("#e-new").textContent = "Заполните поле «Тема».";
        return;
      }
      if (Object.keys(fields).length === 0) {
        view.querySelector("#e-new").textContent = "Ошибка: у категории нет полей. Обновите страницу (Ctrl+Shift+R).";
        return;
      }

      const id = push(ref(db, "applications")).key;
      try {
        await set(ref(db, `applications/${id}`), {
          uid: me.uid, authorName: me.displayName || me.email,
          category: cat, status: "sent", createdAt: Date.now(), fields
        });
        await update(ref(db), {
          [`userApps/${me.uid}/${id}`]: true,
          [`staffQueue/${cat}/${id}`]:  true
        });
        await remove(ref(db, `drafts/${me.uid}`)).catch(() => {});
        e.target.reset();
        paintForm();
        view.querySelector("#draft-slot").innerHTML = "";
        view.querySelector("#e-new").className = "err";
        view.querySelector("#e-new").textContent = "";
      } catch (err) {
        view.querySelector("#e-new").className = "err";
        view.querySelector("#e-new").textContent = "Ошибка: " + err.message;
      }
    };
  }

  (async () => {
    if (role !== "user") return;
    try {
      const { count } = await getUnread();
      if (!count) return;
      const slot = view.querySelector("#unread-slot");
      slot.innerHTML = `
        <div class="unread-banner">
          <span>🟢 У вас <b>${count}</b> новых ответ(а/ов) от ведомств</span>
          <button class="mini" id="mark-read">Отметить прочитанными</button>
        </div>`;
      view.querySelector("#mark-read").onclick = async () => {
        const { snapshot } = await getUnread();
        localStorage.setItem(`seen_${me.uid}`, JSON.stringify(snapshot));
        slot.innerHTML = "";
        refreshUnreadBadge();
      };
    } catch {}
  })();

  const listEl  = view.querySelector("#apps");
  const emptyEl = view.querySelector("#empty");
  const search  = view.querySelector("#apps-search");
  listEl.addEventListener("submit", onReply);

  const items = new Map();
  const applySearch = () => {
    const q = (search.value || "").toLowerCase().trim();
    for (const { node } of items.values()) {
      node.hidden = q && !(node.dataset.search || "").includes(q);
    }
  };

  sub(onValue(ref(db, `userApps/${me.uid}`), snap => {
    const ids = Object.keys(snap.val() || {});
    emptyEl.hidden = ids.length > 0;
    for (const [id, it] of items) {
      if (!ids.includes(id)) { it.unsub(); it.node.remove(); items.delete(id); }
    }
    for (const id of ids) {
      if (items.has(id)) continue;
      const node = document.createElement("div");
      node.className = "app-item";
      listEl.append(node);
      const unsub = onValue(ref(db, `applications/${id}`), s => {
        const a = s.val();
        if (a) {
          node.dataset.search = (
            shortId(id) + " " + id + " " + (a.fields?.subject || "") + " " + Object.values(a.fields || {}).join(" ")
          ).toLowerCase();
        }
        renderAppCard(node, a, id);
        applySearch();
      });
      items.set(id, { node, unsub });
    }
    applySearch();
  }));

  search.oninput = applySearch;
}

/* ═══════════════ МОИ ДОКУМЕНТЫ ═══════════════ */

function mountDocs(view) {
  view.innerHTML = `
    <h2>Мои документы</h2>
    <p class="muted">🏛️ — выдано государственным органом · 📝 — добавлено вами лично.</p>

    <details class="card">
      <summary style="cursor:pointer;font-weight:600;">➕ Добавить документ в личную картотеку</summary>
      <form id="f-self-doc" style="margin-top:12px;">
        <label><span>Тип</span>
          <select name="type" required>
            ${Object.entries(DOC_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </label>
        <label><span>Название</span><input name="title" required></label>
        <label><span>Номер</span><input name="number"></label>
        <label><span>Выдан (дата)</span><input name="issuedAt" type="date" required></label>
        <label><span>Кем выдан</span><input name="issuedBy"></label>
        <label><span>Действителен до</span><input name="validUntil" type="date"></label>
        <label><span>Примечание</span><textarea name="notes" rows="2"></textarea></label>
        <button class="primary mini">Сохранить</button>
      </form>
      <p class="err" id="e-self-doc"></p>
    </details>

    <div id="docs"></div>
    <p id="docs-empty" class="muted">Документов пока нет.</p>`;

  view.querySelector("#f-self-doc").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = push(ref(db, `userDocs/${me.uid}`)).key;
    try {
      await set(ref(db, `userDocs/${me.uid}/${id}`), {
        type: fd.get("type"), title: fd.get("title").trim(),
        number: fd.get("number").trim() || null, issuedAt: fd.get("issuedAt"),
        issuedBy: fd.get("issuedBy").trim() || null, validUntil: fd.get("validUntil") || null,
        status: "active", notes: fd.get("notes").trim() || null,
        addedBy: "self", createdAt: Date.now(), createdBy: me.uid
      });
      e.target.reset();
      view.querySelector("#e-self-doc").textContent = "";
      e.target.closest("details").open = false;
    } catch (err) { view.querySelector("#e-self-doc").textContent = "Ошибка: " + err.message; }
  };

  const listEl  = view.querySelector("#docs");
  const emptyEl = view.querySelector("#docs-empty");

  listEl.addEventListener("click", async e => {
    const b = e.target.closest("[data-del-doc]");
    if (!b) return;
    if (!confirm("Удалить документ из картотеки?")) return;
    try { await remove(ref(db, `userDocs/${me.uid}/${b.dataset.delDoc}`)); }
    catch (err) { alert(err.message); }
  });

  sub(onValue(ref(db, `userDocs/${me.uid}`), snap => {
    const entries = Object.entries(snap.val() || {}).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    emptyEl.hidden = entries.length > 0;
    listEl.innerHTML = entries.map(([id, d]) => {
      const self = d.addedBy === "self";
      return `
        <div class="doc-card">
          <div class="doc-title">
            <span>${self ? "📝" : "🏛️"} ${esc(DOC_TYPES[d.type] || "Документ")} — ${esc(d.title || "")}</span>
            <span class="doc-status ${esc(d.status)}">${DOC_STATUS[d.status] || esc(d.status)}</span>
          </div>
          ${d.number     ? `<div class="doc-row"><span>Номер:</span><span>${esc(d.number)}</span></div>` : ""}
          ${d.issuedAt   ? `<div class="doc-row"><span>Выдан:</span><span>${esc(d.issuedAt)}</span></div>` : ""}
          ${d.issuedBy   ? `<div class="doc-row"><span>Кем выдан:</span><span>${esc(d.issuedBy)}</span></div>` : ""}
          ${d.validUntil ? `<div class="doc-row"><span>Действителен до:</span><span>${esc(d.validUntil)}</span></div>` : ""}
          ${d.notes      ? `<div class="doc-row"><span>Примечание:</span><span>${esc(d.notes)}</span></div>` : ""}
          ${self ? `<div style="margin-top:8px;text-align:right;">
            <button class="mini" data-del-doc="${esc(id)}" style="color:#b91c1c;">Удалить</button>
          </div>` : ""}
        </div>`;
    }).join("");
  }));
}

/* ═══════════════ FAQ ═══════════════ */

function mountFaq(view) {
  view.innerHTML = `<h2>Частые вопросы</h2><div id="faq"></div>`;
  const box = view.querySelector("#faq");

  sub(onValue(ref(db, "faq"), snap => {
    const entries = sortedEntries(snap.val());
    box.innerHTML = entries.length
      ? entries.map(([, f]) => `
          <details class="faq">
            <summary>${esc(f.question)}</summary>
            <div class="faq-body">${esc(f.answer)}</div>
          </details>`).join("")
      : `<p class="muted">Пока нет вопросов.</p>`;
  }));
}

/* ═══════════════ РОЗЫСК ═══════════════ */

function mountWanted(view) {
  view.innerHTML = `
    <h2>Реестр розыска</h2>
    <p class="muted">Публичный список лиц, находящихся в розыске. Если вы обладаете информацией — сообщите в МВД.</p>
    <div class="search-row"><input id="wanted-search" placeholder="🔍 Поиск по имени или описанию…"></div>
    <div id="wanted-list"></div>`;

  const search = view.querySelector("#wanted-search");
  const list   = view.querySelector("#wanted-list");
  let allItems = [];

  const paint = () => {
    const q = (search.value || "").toLowerCase().trim();
    const items = allItems.filter(([, w]) =>
      !q || w.name.toLowerCase().includes(q) || (w.reason || "").toLowerCase().includes(q) || (w.description || "").toLowerCase().includes(q)
    );
    list.innerHTML = items.length
      ? items.map(([, w]) => `
          <div class="wanted-card ${esc(w.status)}">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;">
              <b>${esc(w.name)}</b>
              <span class="wanted-status ${esc(w.status)}">${WANTED_STATUS[w.status] || esc(w.status)}</span>
            </div>
            <div class="muted" style="font-size:14px;margin-top:4px;">С ${esc(w.since)}: ${esc(w.reason)}</div>
            ${w.lastSeen    ? `<div style="font-size:13px;margin-top:4px;"><b>Последнее место:</b> ${esc(w.lastSeen)}</div>` : ""}
            ${w.description ? `<div style="font-size:13px;margin-top:4px;white-space:pre-wrap;">${esc(w.description)}</div>` : ""}
            ${w.reward      ? `<div style="font-size:13px;margin-top:4px;color:#b8860b;"><b>Награда:</b> ${esc(w.reward)}</div>` : ""}
          </div>`).join("")
      : `<p class="muted">Никого не найдено.</p>`;
  };

  sub(onValue(ref(db, "wanted"), snap => {
    allItems = Object.entries(snap.val() || {}).sort((a, b) => {
      const order = { wanted: 0, detained: 1, cleared: 2 };
      return (order[a[1].status] || 0) - (order[b[1].status] || 0);
    });
    paint();
  }));
  search.oninput = paint;
}

/* ═══════════════ ПРОФИЛЬ ═══════════════ */

function mountProfile(view) {
  const u = profile;
  view.innerHTML = `
    <h2>Профиль</h2>
    <div style="margin-bottom:12px;">${renderServiceBadge()} <span class="badge">${ROLE_RU[role]}</span></div>

    <form id="f-profile" class="card">
      <label><span>Имя / ФИО</span><input name="displayName" value="${esc(u.displayName || "")}" required></label>
      <label><span>Email</span><input value="${esc(me.email || "")}" disabled></label>
      <label><span>Регион</span>
        <select name="region">
          <option value="">— не указан —</option>
          ${REGIONS.map(r => `<option value="${esc(r)}" ${u.region === r ? "selected" : ""}>${esc(r)}</option>`).join("")}
        </select>
      </label>
      <label><span>Дата рождения</span><input name="birthDate" type="date" value="${esc(u.birthDate || "")}"></label>
      <label><span>Контактный телефон</span><input name="contactPhone" value="${esc(u.contactPhone || "")}" placeholder="+7 ..."></label>
      <label><span>О себе</span><textarea name="bio" rows="3">${esc(u.bio || "")}</textarea></label>

      <h3 style="margin-top:20px;">🛡️ Служба</h3>
      <p class="muted" style="font-size:13px;">Заполните, если вы военнослужащий, сотрудник МВД, экстренных служб или судебной системы.</p>

      <label><span>Тип службы</span>
        <select name="serviceType">
          <option value="">— не служу —</option>
          ${Object.entries(SERVICE_TYPES).map(([k, v]) =>
            `<option value="${esc(k)}" ${u.serviceType === k ? "selected" : ""}>${esc(v)}</option>`).join("")}
        </select>
      </label>
      <div id="service-fields" ${!u.serviceType ? "hidden" : ""}>
        <label><span>Звание / должность</span><input name="rank" value="${esc(u.rank || "")}" placeholder="напр. Лейтенант"></label>
        <label><span>Подразделение</span><input name="unit" value="${esc(u.unit || "")}" placeholder="напр. 3-й батальон"></label>
      </div>

      <button class="primary">Сохранить профиль</button>
      <p class="ok" id="prof-ok"></p>
      <p class="err" id="prof-err"></p>
    </form>`;

  const st = view.querySelector('[name="serviceType"]');
  const sf = view.querySelector("#service-fields");
  st.onchange = () => { sf.hidden = !st.value; };

  view.querySelector("#f-profile").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      displayName:  fd.get("displayName").trim(),
      region:       fd.get("region") || null,
      birthDate:    fd.get("birthDate") || null,
      contactPhone: fd.get("contactPhone").trim() || null,
      bio:          fd.get("bio").trim() || null,
      serviceType:  fd.get("serviceType") || null,
      rank:         fd.get("serviceType") ? (fd.get("rank").trim() || null) : null,
      unit:         fd.get("serviceType") ? (fd.get("unit").trim() || null) : null
    };
    try {
      await update(ref(db, `users/${me.uid}`), data);
      await updateProfile(me, { displayName: data.displayName });
      profile = { ...profile, ...data };
      view.querySelector("#prof-ok").textContent = "✓ Сохранено";
      view.querySelector("#prof-err").textContent = "";
      const old = root.querySelector(".service-badge");
      const header = root.querySelector("header");
      if (old) old.remove();
      if (data.serviceType) {
        const tmp = document.createElement("span");
        tmp.innerHTML = renderServiceBadge();
        const badgeEl = header.querySelector(".badge");
        if (badgeEl) badgeEl.after(tmp.firstChild);
      }
    } catch (err) {
      view.querySelector("#prof-err").textContent = "Ошибка: " + err.message;
    }
  };
}

/* ═══════════════ ОЧЕРЕДЬ ═══════════════ */

async function mountQueue(view) {
  view.innerHTML = `
    <h2>Очередь заявлений</h2>
    <div class="search-row">
      <input id="queue-search" placeholder="🔍 Поиск по ID, ФИО, теме, тексту…">
    </div>
    <div class="filter">
      <button data-f="all" class="active">Все</button>
      <button data-f="sent">Отправлено</button>
      <button data-f="received">Получено</button>
      <button data-f="accepted">Принято</button>
    </div>
    <p id="q-diag" class="muted" style="font-size:12px;margin:8px 0;"></p>
    <div id="q"></div>`;

  const q = view.querySelector("#q");
  const diag = view.querySelector("#q-diag");
  let filter = "all";

  try {
    const catsSnap = await get(ref(db, "categories"));
    const dbCats = catsSnap.val() || {};
    if (Object.keys(dbCats).length > 0) categories = dbCats;
  } catch (e) { console.warn("categories load failed:", e); }

  const activeCats = Object.keys(categories).length > 0 ? categories : DEFAULT_CATEGORIES;

  let showCats;
  if (role === "admin") {
    showCats = Object.keys(activeCats);
  } else {
    const s = await get(ref(db, `staffCategories/${me.uid}`));
    showCats = Object.keys(s.val() || {}).filter(c => c !== "documents");
  }

  let queueCats = [];
  try {
    const queueSnap = await get(ref(db, "staffQueue"));
    const queueData = queueSnap.val() || {};
    queueCats = Object.keys(queueData).filter(c => c !== "documents");
    if (role === "admin") {
      for (const c of queueCats) if (!showCats.includes(c)) showCats.push(c);
    } else {
      const staffCatsSet = new Set(Object.keys((await get(ref(db, `staffCategories/${me.uid}`))).val() || {}));
      for (const c of queueCats) {
        if (staffCatsSet.has(c) && !showCats.includes(c)) showCats.push(c);
      }
    }
  } catch (e) { console.warn("staffQueue read failed:", e); }

  diag.innerHTML =
    `В categories: [${Object.keys(activeCats).join(", ") || "—"}] · ` +
    `в staffQueue: [${queueCats.join(", ") || "—"}] · ` +
    `показываю: [${showCats.join(", ") || "—"}]`;

  if (showCats.length === 0) {
    q.innerHTML = `<p class="muted" style="padding:16px 0;">
      Очередь пуста — нет ни категорий, ни заявлений.<br>
      ${role === "admin" ? "Зайдите в «Администрирование» → «Установить стандартные категории»." : "Обратитесь к администратору за назначением категорий."}
    </p>`;
    return;
  }

  let staffList = [];
  try {
    const rolesSnap = await get(ref(db, "roles"));
    const staffRoles = rolesSnap.val() || {};
    staffList = await Promise.all(
      Object.entries(staffRoles)
        .filter(([, r]) => r === "staff" || r === "admin")
        .map(async ([uid]) => {
          const u = (await get(ref(db, `users/${uid}`))).val() || {};
          return { uid, name: u.displayName || u.email || uid.slice(0, 6) };
        })
    );
  } catch (e) { console.warn("staffList load failed:", e); }

  const items = new Map();
  const search = view.querySelector("#queue-search");

  const applyFilters = () => {
    const s = (search.value || "").toLowerCase().trim();
    for (const { node } of items.values()) {
      const st = filter !== "all" && node.dataset.status !== filter;
      const sq = s && !(node.dataset.search || "").includes(s);
      node.hidden = st || sq;
    }
  };

  view.querySelector(".filter").onclick = e => {
    const b = e.target.closest("button[data-f]");
    if (!b) return;
    filter = b.dataset.f;
    [...view.querySelectorAll(".filter button")].forEach(x => x.classList.toggle("active", x === b));
    applyFilters();
  };
  search.oninput = applyFilters;

  showCats.sort((a, b) => {
    const oa = activeCats[a]?.order ?? DEFAULT_CATEGORIES[a]?.order ?? 999;
    const ob = activeCats[b]?.order ?? DEFAULT_CATEGORIES[b]?.order ?? 999;
    return oa - ob;
  });

  for (const cat of showCats) {
    const block = document.createElement("section");
    block.className = "card";
    const name = activeCats[cat]?.name || DEFAULT_CATEGORIES[cat]?.name || `[${cat}]`;
    block.innerHTML = `
      <h3>${esc(name)}</h3>
      <div class="list"></div>
      <p class="muted empty-msg" style="font-size:13px;margin:6px 0;">Заявлений нет.</p>`;
    q.append(block);
    const list = block.querySelector(".list");
    const emptyMsg = block.querySelector(".empty-msg");

    sub(onValue(ref(db, `staffQueue/${cat}`), snap => {
      const ids = Object.keys(snap.val() || {});
      emptyMsg.hidden = ids.length > 0;

      for (const [id, it] of items) {
        if (it.category === cat && !ids.includes(id)) {
          it.unsub(); it.node.remove(); items.delete(id);
          const obs = receivedObservers.get(id);
          if (obs) { obs.disconnect(); receivedObservers.delete(id); }
        }
      }
      for (const id of ids) {
        if (items.has(id)) continue;
        const node = document.createElement("div");
        node.className = "app-item";
        list.append(node);
        const unsub = onValue(ref(db, `applications/${id}`), s => {
          const a = s.val();
          if (a) {
            node.dataset.status = a.status;
            node.dataset.search = (
              shortId(id) + " " + id + " " +
              (a.authorName || "") + " " + (a.fields?.subject || "") + " " +
              Object.values(a.fields || {}).join(" ")
            ).toLowerCase();
          }
          renderAppCard(node, a, id, { staff: true, staffList });
          applyFilters();
        });
        items.set(id, { node, unsub, category: cat });
      }
      applyFilters();
    }));
  }

  q.addEventListener("submit", onReply);
  q.addEventListener("submit", onNote);
  q.addEventListener("change", onStatusChange);
  q.addEventListener("change", onAssigneeChange);
  q.addEventListener("change", onCategoryChange);
  q.addEventListener("click", e => {
    const b = e.target.closest("[data-del-id]");
    if (b) deleteApplication(b.dataset.delId);
  });
}

/* ═══════════════ ВЫДАЧА ДОКУМЕНТОВ ═══════════════ */

function mountIssueDoc(view) {
  view.innerHTML = `
    <h2>Выдача документов</h2>
    <p class="muted">Выберите гражданина и заполните данные документа. Он появится в его разделе «Мои документы» с пометкой 🏛️.</p>
    <div class="card">
      <form id="f-doc">
        <label><span>Пользователь</span><select name="uid" id="doc-uid" required></select></label>
        <label><span>Тип</span>
          <select name="type" required>
            ${Object.entries(DOC_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </label>
        <label><span>Название документа</span><input name="title" required></label>
        <label><span>Номер</span><input name="number"></label>
        <label><span>Выдан (дата)</span><input name="issuedAt" type="date" required></label>
        <label><span>Кем выдан</span><input name="issuedBy"></label>
        <label><span>Действителен до</span><input name="validUntil" type="date"></label>
        <label><span>Статус</span>
          <select name="status" required>
            ${Object.entries(DOC_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </label>
        <label><span>Примечание</span><textarea name="notes" rows="2"></textarea></label>
        <button class="primary">Выдать документ</button>
      </form>
      <p class="err" id="e-doc"></p>
    </div>`;

  sub(onValue(ref(db, "users"), snap => {
    const users = snap.val() || {};
    const sel = view.querySelector("#doc-uid");
    const cur = sel.value;
    sel.innerHTML = Object.entries(users).map(([uid, u]) =>
      `<option value="${esc(uid)}">${esc(u.displayName || "—")} — ${esc(u.email || "")}</option>`).join("");
    if (cur) sel.value = cur;
  }));

  view.querySelector("#f-doc").onsubmit = async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const uid = fd.get("uid");
    const id  = push(ref(db, `userDocs/${uid}`)).key;
    try {
      await set(ref(db, `userDocs/${uid}/${id}`), {
        type: fd.get("type"), title: fd.get("title").trim(),
        number: fd.get("number").trim() || null, issuedAt: fd.get("issuedAt"),
        issuedBy: fd.get("issuedBy").trim() || null, validUntil: fd.get("validUntil") || null,
        status: fd.get("status"), notes: fd.get("notes").trim() || null,
        addedBy: "staff", createdAt: Date.now(), createdBy: me.uid
      });
      e.target.reset();
      view.querySelector("#e-doc").textContent = "";
    } catch (err) { view.querySelector("#e-doc").textContent = "Ошибка: " + err.message; }
  };
}

/* ═══════════════ АДМИНКА ═══════════════ */

function mountAdmin(view) {
  view.innerHTML = `
    <h2>Администрирование</h2>

    <section class="card">
      <h3>Стандартные категории</h3>
      <p class="muted">Заполнит/перезапишет категории. Существующие заявления не пострадают.</p>
      <button id="seed-cats" class="primary mini">Установить стандартные категории</button>
      <p class="ok" id="seed-msg"></p>
    </section>

    <section class="card">
      <h3>🔧 Обслуживание</h3>
      <p class="muted">Если заявления «теряются» в очереди — нажмите «Пересобрать индексы». Скрипт пройдёт по всем applications и восстановит userApps и staffQueue, удалит висячие ссылки.</p>
      <button id="rebuild-indexes" class="mini">Пересобрать индексы</button>
      <p class="ok" id="rebuild-msg"></p>
    </section>

    <section class="card">
      <h3>Частые вопросы</h3>
      <form id="f-faq" class="inline">
        <input name="question" placeholder="Вопрос" required>
        <input name="answer"   placeholder="Ответ" required>
        <button class="primary mini">Добавить</button>
      </form>
      <button id="seed-faq" class="mini">Загрузить стандартные FAQ</button>
      <ul id="faq-list"></ul>
    </section>

    <section class="card admin-section">
      <h3>📰 Новости правительства</h3>
      <form id="f-news">
        <label><span>Заголовок</span><input name="title" required></label>
        <label><span>Текст</span><textarea name="body" rows="4" required></textarea></label>
        <label style="display:flex;gap:8px;align-items:center;">
          <input type="checkbox" name="pinned" style="width:auto;">
          <span>📌 Закрепить (показывать первой)</span>
        </label>
        <button class="primary mini">Опубликовать</button>
      </form>
      <ul id="news-list"></ul>
    </section>

    <section class="card admin-section">
      <h3>🔴 Реестр розыска</h3>
      <form id="f-wanted">
        <label><span>ФИО</span><input name="name" required></label>
        <label><span>Причина розыска</span><input name="reason" required></label>
        <label><span>С какого числа</span><input name="since" type="date" required></label>
        <label><span>Последнее известное место</span><input name="lastSeen"></label>
        <label><span>Описание</span><textarea name="description" rows="2"></textarea></label>
        <label><span>Награда за информацию</span><input name="reward" placeholder="напр. 5000 ₮"></label>
        <label><span>Статус</span>
          <select name="status" required>
            ${Object.entries(WANTED_STATUS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </label>
        <button class="primary mini">Добавить в реестр</button>
      </form>
      <ul id="wanted-list-admin"></ul>
    </section>

    <section class="card admin-section">
      <h3>Пользователи и роли</h3>
      <div id="user-list" class="muted">Загрузка…</div>
      <p class="muted" style="font-size:13px;margin-top:8px;">
        Роль <b>staff</b> + категории (например <code>court, labor, documents</code>).
        <code>documents</code> — право выдавать документы.
      </p>
    </section>`;

  view.querySelector("#seed-cats").onclick = async () => {
    if (!confirm("Перезаписать все категории стандартным набором?")) return;
    try {
      await set(ref(db, "categories"), DEFAULT_CATEGORIES);
      view.querySelector("#seed-msg").textContent = "✓ Категории установлены.";
    } catch (e) { view.querySelector("#seed-msg").textContent = "Ошибка: " + e.message; }
  };

  view.querySelector("#rebuild-indexes").onclick = async () => {
    if (!confirm("Пересобрать индексы userApps и staffQueue по всем заявлениям?")) return;
    const msg = view.querySelector("#rebuild-msg");
    msg.textContent = "Работаю…";
    try {
      const [appsS, uaS, qS] = await Promise.all([
        get(ref(db, "applications")),
        get(ref(db, "userApps")),
        get(ref(db, "staffQueue"))
      ]);
      const apps  = appsS.val() || {};
      const ua    = uaS.val()  || {};
      const qdata = qS.val()   || {};
      const patch = {};

      let added = 0, removed = 0;

      for (const [id, a] of Object.entries(apps)) {
        if (!a.uid || !a.category) continue;
        if (!ua[a.uid]?.[id]) { patch[`userApps/${a.uid}/${id}`] = true; added++; }
        if (!qdata[a.category]?.[id]) { patch[`staffQueue/${a.category}/${id}`] = true; added++; }
      }

      for (const [uid, ids] of Object.entries(ua)) {
        for (const id of Object.keys(ids || {})) {
          if (!apps[id]) { patch[`userApps/${uid}/${id}`] = null; removed++; }
        }
      }
      for (const [cat, ids] of Object.entries(qdata)) {
        for (const id of Object.keys(ids || {})) {
          if (!apps[id]) { patch[`staffQueue/${cat}/${id}`] = null; removed++; }
          else if (apps[id].category !== cat) {
            patch[`staffQueue/${cat}/${id}`] = null;
            patch[`staffQueue/${apps[id].category}/${id}`] = true;
            removed++; added++;
          }
        }
      }

      if (Object.keys(patch).length === 0) {
        msg.textContent = "✓ Всё уже корректно — восстанавливать нечего.";
      } else {
        await update(ref(db), patch);
        msg.textContent = `✓ Готово. Восстановлено: ${added}, удалено/перемещено: ${removed}.`;
      }
    } catch (e) { msg.textContent = "Ошибка: " + e.message; }
  };

  view.querySelector("#f-faq").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const snap  = await get(ref(db, "faq"));
      const order = Object.keys(snap.val() || {}).length + 1;
      await push(ref(db, "faq"), { question: fd.get("question").trim(), answer: fd.get("answer").trim(), order, createdAt: Date.now() });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };
  view.querySelector("#seed-faq").onclick = async () => {
    if (!confirm("Добавить стандартные FAQ?")) return;
    try { await update(ref(db, "faq"), DEFAULT_FAQ); }
    catch (err) { alert(err.message); }
  };
  sub(onValue(ref(db, "faq"), snap => {
    const ul = view.querySelector("#faq-list");
    const entries = sortedEntries(snap.val());
    ul.innerHTML = entries.length
      ? entries.map(([id, f]) => `<li><b>${esc(f.question)}</b> — ${esc(f.answer)} <button class="mini" data-del-faq="${esc(id)}">удалить</button></li>`).join("")
      : `<li class="muted">пока нет</li>`;
  }));
  view.querySelector("#faq-list").onclick = async e => {
    const b = e.target.closest("[data-del-faq]");
    if (!b) return;
    if (!confirm("Удалить FAQ?")) return;
    try { await remove(ref(db, `faq/${b.dataset.delFaq}`)); }
    catch (err) { alert(err.message); }
  };

  view.querySelector("#f-news").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await push(ref(db, "news"), {
        title: fd.get("title").trim(), body: fd.get("body").trim(),
        pinned: fd.get("pinned") === "on",
        author: me.displayName || me.email, createdAt: Date.now()
      });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };
  sub(onValue(ref(db, "news"), snap => {
    const ul = view.querySelector("#news-list");
    const items = Object.entries(snap.val() || {}).sort((a, b) => {
      if (a[1].pinned && !b[1].pinned) return -1;
      if (!a[1].pinned && b[1].pinned) return 1;
      return (b[1].createdAt || 0) - (a[1].createdAt || 0);
    });
    ul.innerHTML = items.length
      ? items.map(([id, n]) => `<li><b>${n.pinned ? "📌 " : ""}${esc(n.title)}</b><div class="muted" style="font-size:13px;">${fmt(n.createdAt)}</div><button class="mini" data-del-news="${esc(id)}">удалить</button></li>`).join("")
      : `<li class="muted">пока нет</li>`;
  }));
  view.querySelector("#news-list").onclick = async e => {
    const b = e.target.closest("[data-del-news]");
    if (!b) return;
    if (!confirm("Удалить новость?")) return;
    try { await remove(ref(db, `news/${b.dataset.delNews}`)); }
    catch (err) { alert(err.message); }
  };

  view.querySelector("#f-wanted").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await push(ref(db, "wanted"), {
        name: fd.get("name").trim(), reason: fd.get("reason").trim(),
        since: fd.get("since"), lastSeen: fd.get("lastSeen").trim() || null,
        description: fd.get("description").trim() || null,
        reward: fd.get("reward").trim() || null,
        status: fd.get("status"), createdAt: Date.now(), createdBy: me.uid
      });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };
  sub(onValue(ref(db, "wanted"), snap => {
    const ul = view.querySelector("#wanted-list-admin");
    const items = Object.entries(snap.val() || {});
    ul.innerHTML = items.length
      ? items.map(([id, w]) => `<li><b>${esc(w.name)}</b> · ${WANTED_STATUS[w.status] || esc(w.status)} <button class="mini" data-del-wanted="${esc(id)}">удалить</button></li>`).join("")
      : `<li class="muted">пока нет</li>`;
  }));
  view.querySelector("#wanted-list-admin").onclick = async e => {
    const b = e.target.closest("[data-del-wanted]");
    if (!b) return;
    if (!confirm("Удалить из розыска?")) return;
    try { await remove(ref(db, `wanted/${b.dataset.delWanted}`)); }
    catch (err) { alert(err.message); }
  };

  let users = {}, roles = {}, scats = {};
  const paintUsers = () => {
    const box = view.querySelector("#user-list");
    const entries = Object.entries(users);
    if (!entries.length) { box.textContent = "Пока никто не зарегистрировался."; return; }
    box.innerHTML = entries.map(([uid, u]) => {
      const r = roles[uid] || "user";
      const cats = Object.keys(scats[uid] || {}).join(", ");
      const self = uid === me.uid;
      return `<div class="user-row">
        <div><b>${esc(u.displayName || "—")}</b><br><small>${esc(u.email || "")}</small></div>
        ${self ? `<div class="muted">(вы — ${ROLE_RU[r]})</div>`
          : `<select class="role-sel" data-uid="${esc(uid)}">
               ${["user","staff","admin"].map(x => `<option value="${x}" ${r === x ? "selected" : ""}>${ROLE_RU[x]}</option>`).join("")}
             </select>`}
        <input class="cat-inp" data-uid="${esc(uid)}" placeholder="категории через запятую" value="${esc(cats)}">
      </div>`;
    }).join("");
  };
  sub(onValue(ref(db, "users"),           s => { users = s.val() || {}; paintUsers(); }));
  sub(onValue(ref(db, "roles"),           s => { roles = s.val() || {}; paintUsers(); }));
  sub(onValue(ref(db, "staffCategories"), s => { scats = s.val() || {}; paintUsers(); }));

  view.querySelector("#user-list").onchange = async e => {
    const t = e.target;
    try {
      if (t.classList.contains("role-sel")) {
        await set(ref(db, `roles/${t.dataset.uid}`), t.value === "user" ? null : t.value);
      } else if (t.classList.contains("cat-inp")) {
        const obj = {};
        t.value.split(",").map(x => x.trim()).filter(Boolean).forEach(c => { obj[c] = true; });
        await set(ref(db, `staffCategories/${t.dataset.uid}`), Object.keys(obj).length ? obj : null);
      }
    } catch (err) { alert(err.message); }
  };
}
