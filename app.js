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

/* ==================== КОНСТАНТЫ ==================== */

const STATUS  = { sent: "Отправлено", received: "Получено", accepted: "Принято" };
const ROLE_RU = { user: "пользователь", staff: "сотрудник", admin: "админ" };

const DOC_STATUS = {
  active:  "Действителен",
  pending: "Ожидает выдачи",
  revoked: "Аннулирован"
};

const DOC_TYPES = {
  passport:     "Паспорт",
  inn:          "ИНН",
  registration: "Прописка",
  medical:      "Медицинская карта",
  certificate:  "Свидетельство",
  permit:       "Разрешение",
  license:      "Удостоверение",
  other:        "Иной документ"
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
      { key: "evidence",   label: "Доказательства (описание)", type: "textarea", required: false }
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
      { key: "grantType",   label: "Тип гранта",              type: "select",   required: true,
        options: ["Культурный проект", "Бизнес проект"] },
      { key: "description", label: "Описание проекта",        type: "textarea", required: true },
      { key: "amount",      label: "Запрашиваемая сумма (₮)", type: "number",   required: true },
      { key: "budget",      label: "План расходов",           type: "textarea", required: true }
    ]
  },
  inspection: {
    name: "Проверка трудовых условий (МинТруд / МВД)", order: 5,
    fields: [
      { key: "subject",       label: "Кратко о проблеме",  type: "text",     required: true },
      { key: "authority",     label: "Куда направить",     type: "select",   required: true,
        options: ["Министерство труда", "МВД"] },
      { key: "employer",      label: "Работодатель",       type: "text",     required: true },
      { key: "violationType", label: "Что проверить",      type: "select",   required: true,
        options: ["Нарушение трудового договора", "Техника безопасности", "Оба"] },
      { key: "description",   label: "Описание нарушений", type: "textarea", required: true }
    ]
  },
  military: {
    name: "Помощь военнослужащим и семьям", order: 6,
    fields: [
      { key: "subject",        label: "Кратко о ситуации",   type: "text",     required: true },
      { key: "status",         label: "Ваш статус",          type: "select",   required: true,
        options: ["Военнослужащий", "Член семьи военнослужащего"] },
      { key: "servicemanName", label: "ФИО военнослужащего", type: "text",     required: true },
      { key: "unit",           label: "Подразделение",       type: "text",     required: false },
      { key: "aidType",        label: "Вид помощи",          type: "select",   required: true,
        options: ["Материальная", "Медицинская", "Юридическая", "Иная"] },
      { key: "situation",      label: "Описание ситуации",   type: "textarea", required: true }
    ]
  }
};

const DEFAULT_FAQ = {
  faq_1: { question: "Что такое ЖакидУслуги?",
           answer: "Единый портал государственных услуг Республики Жакид. Здесь можно подать заявление, получить официальный ответ и просмотреть свои документы.",
           order: 1, createdAt: Date.now() },
  faq_2: { question: "Сколько рассматривается заявление?",
           answer: "Обычно 3–7 рабочих дней. Срок может быть продлён, если требуется дополнительная проверка — сотрудник укажет это в переписке.",
           order: 2, createdAt: Date.now() },
  faq_3: { question: "Как я получу официальный ответ?",
           answer: "Ответ появится прямо в личном кабинете в карточке заявления, а также в переписке. Статус меняется на «Принято», когда сотрудник дал ответ.",
           order: 3, createdAt: Date.now() },
  faq_4: { question: "Что означает статус «Получено»?",
           answer: "Сотрудник открыл ваше заявление и приступил к его рассмотрению.",
           order: 4, createdAt: Date.now() },
  faq_5: { question: "Можно ли добавить документ самому?",
           answer: "Да, в разделе «Мои документы» есть кнопка «Добавить документ». Такие записи помечаются 📝. Официальные документы от госорганов помечены 🏛️ — их выдаёт уполномоченный сотрудник.",
           order: 5, createdAt: Date.now() }
};

/* ==================== СОСТОЯНИЕ ==================== */

let me = null;
let role = "user";
let categories = {};
let staffCats = {};

let globalSubs = [];
let tabSubs = [];

const unsubGlobal = () => { globalSubs.forEach(f => { try { f(); } catch (e) {} }); globalSubs = []; };
const unsubTab    = () => { tabSubs.forEach(f => { try { f(); } catch (e) {} }); tabSubs = []; };
const subG = f => globalSubs.push(f);
const sub  = f => tabSubs.push(f);

/* ==================== ХЕЛПЕРЫ ==================== */

const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmt = t => t ? new Date(t).toLocaleString("ru-RU") : "";

const catName   = id => categories[id]?.name || id;
const catFields = id => (categories[id]?.fields || []).filter(f => f.key !== "subject");

function sortedEntries(obj) {
  return Object.entries(obj || {}).sort((a, b) => (a[1]?.order || 0) - (b[1]?.order || 0));
}

const canDeleteApp = cat => role === "admin" || (role === "staff" && staffCats[cat] === true);
const canIssueDocs = ()  => role === "admin" || (role === "staff" && staffCats["documents"] === true);

/* ==================== СКАЧИВАНИЕ / УДАЛЕНИЕ ЗАЯВЛЕНИЯ ==================== */

function downloadApp(a, id) {
  const cat  = categories[a.category];
  const msgs = Object.entries(a.messages || {})
    .sort((x, y) => (x[1].createdAt || 0) - (y[1].createdAt || 0));

  const L = [];
  L.push("=".repeat(62));
  L.push("ЖАКИДУСЛУГИ · РЕСПУБЛИКА ЖАКИД");
  L.push("АРХИВНАЯ КОПИЯ ЗАЯВЛЕНИЯ");
  L.push("=".repeat(62), "");
  L.push(`Номер заявления: ${id}`);
  L.push(`Категория:       ${cat?.name || a.category}`);
  L.push(`Статус:          ${STATUS[a.status] || a.status}`);
  L.push(`Дата подачи:     ${fmt(a.createdAt)}`);
  L.push(`Заявитель:       ${a.authorName || "—"} (${a.uid})`, "");
  L.push("— Поля заявления —");
  (cat?.fields || []).forEach(f => {
    const v = a.fields?.[f.key];
    if (v) L.push(`${f.label}: ${v}`);
  });
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
  link.download = `zayavlenie-${id.slice(0,8)}-${new Date().toISOString().slice(0,10)}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
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

async function deleteApplication(appId) {
  const snap = await get(ref(db, `applications/${appId}`));
  const a = snap.val();
  if (!a) { alert("Заявление уже удалено."); return; }
  if (!confirm(
    `Заявление №${appId.slice(0,8)} будет сохранено на ваше устройство (файл .txt), ` +
    `затем удалено из базы.\n\nПроверьте папку загрузок после подтверждения. Продолжить?`
  )) return;

  downloadApp(a, appId);
  await new Promise(r => setTimeout(r, 400));

  try {
    await update(ref(db), {
      [`applications/${appId}`]:             null,
      [`userApps/${a.uid}/${appId}`]:        null,
      [`staffQueue/${a.category}/${appId}`]: null
    });
  } catch (e) {
    alert("Не удалось удалить из базы: " + e.message);
  }
}

/* ==================== АВТОРИЗАЦИЯ ==================== */

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
        displayName: f.name.value,
        email: f.email.value,
        createdAt: Date.now()
      });
    } catch (err) { root.querySelector("#e2").textContent = "Ошибка: " + err.message; }
  };
}

onAuthStateChanged(auth, async u => {
  unsubGlobal(); unsubTab();
  me = u;
  if (!u) { renderAuth(); return; }

  try {
    const [r, c, sc] = await Promise.all([
      get(ref(db, `roles/${u.uid}`)),
      get(ref(db, "categories")),
      get(ref(db, `staffCategories/${u.uid}`))
    ]);
    role       = r.val()  || "user";
    categories = c.val()  || {};
    staffCats  = sc.val() || {};
  } catch (e) {
    console.error(e);
    role = "user"; categories = {}; staffCats = {};
  }

  subG(onValue(ref(db, `roles/${u.uid}`), snap => {
    const newRole = snap.val() || "user";
    if (newRole !== role) { role = newRole; renderDash(); }
  }));
  subG(onValue(ref(db, "categories"), snap => { categories = snap.val() || {}; }));
  subG(onValue(ref(db, `staffCategories/${u.uid}`), snap => { staffCats = snap.val() || {}; }));

  renderDash();
});

/* ==================== КАРКАС ==================== */

function renderDash() {
  unsubTab();
  root.innerHTML = `
    <h1>ЖакидУслуги</h1>
    <header>
      <div>
        <strong>${esc(me.displayName || me.email)}</strong>
        <span class="badge">${ROLE_RU[role]}</span>
      </div>
      <button id="logout" class="mini">Выйти</button>
    </header>
    <nav id="tabs"></nav>
    <main id="view"></main>`;

  root.querySelector("#logout").onclick = () => signOut(auth);

  const tabs = [
    ["apps",       "Мои заявления",     true],
    ["docs",       "Мои документы",     true],
    ["faq",        "Частые вопросы",    true],
    ["queue",      "Очередь",           role !== "user"],
    ["docs-issue", "Выдать документ",   canIssueDocs()],
    ["admin",      "Администрирование", role === "admin"]
  ].filter(t => t[2]);

  const nav  = root.querySelector("#tabs");
  const view = root.querySelector("#view");
  nav.innerHTML = tabs.map(([k, t]) => `<button data-tab="${k}">${t}</button>`).join("");

  const mounts = {
    apps: mountApps,
    docs: mountDocs,
    faq: mountFaq,
    queue: mountQueue,
    "docs-issue": mountIssueDoc,
    admin: mountAdmin
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
  go("apps");
}

/* ==================== ФОРМА ==================== */

function fieldHtml(f, value = "") {
  const req  = f.required ? "required" : "";
  const v    = value ?? "";
  const opts = (f.options || []).map(o =>
    `<option value="${esc(o)}" ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("");

  let control;
  switch (f.type) {
    case "textarea":
      control = `<textarea name="${esc(f.key)}" rows="3" ${req}>${esc(v)}</textarea>`; break;
    case "select":
      control = `<select name="${esc(f.key)}" ${req}>${opts}</select>`; break;
    case "number":
      control = `<input name="${esc(f.key)}" type="number" ${req} value="${esc(v)}">`; break;
    case "date":
      control = `<input name="${esc(f.key)}" type="date" ${req} value="${esc(v)}">`; break;
    default:
      control = `<input name="${esc(f.key)}" type="text" ${req} value="${esc(v)}">`;
  }
  return `<label><span>${esc(f.label)}${f.required ? " *" : ""}</span>${control}</label>`;
}

/* ==================== КАРТОЧКА ЗАЯВЛЕНИЯ ==================== */

function renderAppCard(node, a, id, opts = {}) {
  if (!a) { node.remove(); return; }
  const sig = JSON.stringify(a);
  if (node.dataset.sig === sig) return;
  node.dataset.sig = sig;

  const oldDraft = node.querySelector('form.reply input[name="text"]')?.value || "";
  const cat      = categories[a.category];
  const title    = a.fields?.subject || cat?.name || a.category;
  const msgs     = Object.entries(a.messages || {})
    .sort((x, y) => (x[1].createdAt || 0) - (y[1].createdAt || 0));

  const fieldsHtml = catFields(a.category)
    .filter(f => a.fields?.[f.key] != null && a.fields[f.key] !== "")
    .map(f => `<div><b>${esc(f.label)}:</b> ${esc(a.fields[f.key])}</div>`).join("");

  const canStatus = opts.staff && (role === "admin" || staffCats[a.category] === true);
  const canDel    = opts.staff && canDeleteApp(a.category);

  node.innerHTML = `
    <div class="app-head">
      <strong>${esc(title)}</strong>
      <span class="status s-${esc(a.status)}">${STATUS[a.status] || esc(a.status)}</span>
    </div>
    <div class="muted">${esc(catName(a.category))} · ${fmt(a.createdAt)}</div>
    ${opts.staff ? `<div class="muted">Заявитель: ${esc(a.authorName || a.uid)}</div>` : ""}
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

    <form class="reply" data-id="${esc(id)}">
      <label><span>Сообщение</span>
        <input name="text" placeholder="Написать сообщение…" required value="${esc(oldDraft)}">
      </label>
      <button class="mini">Отправить</button>
    </form>

    ${canDel ? `
      <div style="margin-top:8px;text-align:right;">
        <button class="mini" data-del-id="${esc(id)}"
                style="color:#b91c1c;border-color:#b91c1c;">
          Удалить с сохранением в файл
        </button>
      </div>` : ""}`;

  if (opts.staff && a.status === "sent") observeAsReceived(id, node);
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
  } catch (err) { alert("Не удалось отправить: " + err.message); }
}

async function onStatusChange(e) {
  const sel = e.target.closest("select.status-sel");
  if (!sel) return;
  try { await set(ref(db, `applications/${sel.dataset.id}/status`), sel.value); }
  catch (err) { alert("Не удалось изменить статус: " + err.message); }
}

/* ==================== МОИ ЗАЯВЛЕНИЯ ==================== */

function mountApps(view) {
  const catOptions = sortedEntries(categories)
    .map(([id, c]) => `<option value="${esc(id)}">${esc(c.name)}</option>`).join("");

  view.innerHTML = `
    <section class="card">
      <h2>Подать заявление</h2>
      ${catOptions
        ? `<label><span>Категория</span><select id="cat-select">${catOptions}</select></label>
           <form id="f-new">
             <div id="fields"></div>
             <button class="primary">Отправить заявление</button>
           </form>
           <p class="err" id="e-new"></p>`
        : `<p class="muted">Администратор ещё не создал категории. Зайдите позже.</p>`}
    </section>
    <h2>Мои заявления</h2>
    <div id="apps"></div>
    <p id="empty" class="muted">Заявлений пока нет.</p>`;

  if (catOptions) {
    const catSel   = view.querySelector("#cat-select");
    const fieldsEl = view.querySelector("#fields");

    const paintForm = () => {
      const cat = categories[catSel.value];
      fieldsEl.innerHTML = (cat?.fields || []).map(f => fieldHtml(f)).join("");
    };
    catSel.onchange = paintForm;
    paintForm();

    view.querySelector("#f-new").onsubmit = async e => {
      e.preventDefault();
      const cat = catSel.value;
      const fd  = new FormData(e.target);
      const fields = {};
      for (const f of (categories[cat]?.fields || [])) {
        fields[f.key] = fd.get(f.key) ?? "";
      }
      if (!fields.subject) {
        view.querySelector("#e-new").textContent = "Заполните поле «Тема».";
        return;
      }

      const id = push(ref(db, "applications")).key;
      try {
        await set(ref(db, `applications/${id}`), {
          uid: me.uid,
          authorName: me.displayName || me.email,
          category: cat,
          status: "sent",
          createdAt: Date.now(),
          fields
        });
        await update(ref(db), {
          [`userApps/${me.uid}/${id}`]: true,
          [`staffQueue/${cat}/${id}`]:  true
        });
        e.target.reset();
        paintForm();
        view.querySelector("#e-new").textContent = "";
      } catch (err) {
        view.querySelector("#e-new").textContent = "Ошибка: " + err.message;
      }
    };
  }

  const listEl  = view.querySelector("#apps");
  const emptyEl = view.querySelector("#empty");
  listEl.addEventListener("submit", onReply);

  const items = new Map();
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
      const unsub = onValue(ref(db, `applications/${id}`),
        s => renderAppCard(node, s.val(), id));
      items.set(id, { node, unsub });
    }
  }));
}

/* ==================== МОИ ДОКУМЕНТЫ ==================== */

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
        type:       fd.get("type"),
        title:      fd.get("title").trim(),
        number:     fd.get("number").trim()     || null,
        issuedAt:   fd.get("issuedAt"),
        issuedBy:   fd.get("issuedBy").trim()   || null,
        validUntil: fd.get("validUntil")        || null,
        status:     "active",
        notes:      fd.get("notes").trim()      || null,
        addedBy:    "self",
        createdAt:  Date.now(),
        createdBy:  me.uid
      });
      e.target.reset();
      view.querySelector("#e-self-doc").textContent = "";
      e.target.closest("details").open = false;
    } catch (err) {
      view.querySelector("#e-self-doc").textContent = "Ошибка: " + err.message;
    }
  };

  const listEl  = view.querySelector("#docs");
  const emptyEl = view.querySelector("#docs-empty");

  listEl.addEventListener("click", async e => {
    const b = e.target.closest("[data-del-doc]");
    if (!b) return;
    if (!confirm("Удалить этот документ из картотеки?")) return;
    try { await remove(ref(db, `userDocs/${me.uid}/${b.dataset.delDoc}`)); }
    catch (err) { alert(err.message); }
  });

  sub(onValue(ref(db, `userDocs/${me.uid}`), snap => {
    const entries = Object.entries(snap.val() || {})
      .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

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

/* ==================== FAQ ==================== */

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

/* ==================== ОЧЕРЕДЬ ==================== */

async function mountQueue(view) {
  view.innerHTML = `
    <h2>Очередь заявлений</h2>
    <div class="filter">
      <button data-f="all" class="active">Все</button>
      <button data-f="sent">Отправлено</button>
      <button data-f="received">Получено</button>
      <button data-f="accepted">Принято</button>
    </div>
    <div id="q"></div>`;

  const q = view.querySelector("#q");
  let filter = "all";

  let cats = Object.keys(categories);
  if (role === "staff") {
    const s = await get(ref(db, `staffCategories/${me.uid}`));
    cats = Object.keys(s.val() || {});
    cats = cats.filter(c => c !== "documents");
  }
  if (!cats.length) {
    q.innerHTML = `<p class="muted">Вам не назначено ни одной категории.</p>`;
    return;
  }

  const items = new Map();

  const applyFilter = () => {
    for (const { node } of items.values()) {
      node.hidden = filter !== "all" && node.dataset.status !== filter;
    }
  };

  view.querySelector(".filter").onclick = e => {
    const b = e.target.closest("button[data-f]");
    if (!b) return;
    filter = b.dataset.f;
    [...view.querySelectorAll(".filter button")]
      .forEach(x => x.classList.toggle("active", x === b));
    applyFilter();
  };

  for (const cat of cats) {
    const block = document.createElement("section");
    block.className = "card";
    block.innerHTML = `<h3>${esc(catName(cat))}</h3><div class="list"></div>`;
    q.append(block);
    const list = block.querySelector(".list");

    sub(onValue(ref(db, `staffQueue/${cat}`), snap => {
      const ids = Object.keys(snap.val() || {});

      for (const [id, it] of items) {
        if (!ids.includes(id)) {
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
          if (a) node.dataset.status = a.status;
          renderAppCard(node, a, id, { staff: true });
          applyFilter();
        });
        items.set(id, { node, unsub });
      }
    }));
  }

  q.addEventListener("submit", onReply);
  q.addEventListener("change", onStatusChange);
  q.addEventListener("click", e => {
    const b = e.target.closest("[data-del-id]");
    if (b) deleteApplication(b.dataset.delId);
  });
}

/* ==================== ВЫДАЧА ДОКУМЕНТОВ ==================== */

function mountIssueDoc(view) {
  view.innerHTML = `
    <h2>Выдача документов</h2>
    <p class="muted">
      Выберите гражданина и заполните данные документа. Он появится в его разделе «Мои документы» с пометкой 🏛️.
    </p>
    <div class="card">
      <form id="f-doc">
        <label><span>Пользователь</span>
          <select name="uid" id="doc-uid" required></select>
        </label>
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
      `<option value="${esc(uid)}">${esc(u.displayName || "—")} — ${esc(u.email || "")}</option>`
    ).join("");
    if (cur) sel.value = cur;
  }));

  view.querySelector("#f-doc").onsubmit = async e => {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const uid = fd.get("uid");
    const id  = push(ref(db, `userDocs/${uid}`)).key;
    try {
      await set(ref(db, `userDocs/${uid}/${id}`), {
        type:       fd.get("type"),
        title:      fd.get("title").trim(),
        number:     fd.get("number").trim()    || null,
        issuedAt:   fd.get("issuedAt"),
        issuedBy:   fd.get("issuedBy").trim()  || null,
        validUntil: fd.get("validUntil")       || null,
        status:     fd.get("status"),
        notes:      fd.get("notes").trim()     || null,
        addedBy:    "staff",
        createdAt:  Date.now(),
        createdBy:  me.uid
      });
      e.target.reset();
      view.querySelector("#e-doc").textContent = "";
    } catch (err) {
      view.querySelector("#e-doc").textContent = "Ошибка: " + err.message;
    }
  };
}

/* ==================== АДМИНКА ==================== */

function mountAdmin(view) {
  view.innerHTML = `
    <h2>Администрирование</h2>

    <section class="card">
      <h3>Стандартные категории</h3>
      <p class="muted">
        Заполнит/перезапишет категории ЖакидУслуг (суд, МинТруд, регистрация, грант,
        проверка, военнослужащие). Существующие заявления не пострадают.
      </p>
      <button id="seed-cats" class="primary mini">Установить стандартные категории</button>
      <p class="ok" id="seed-msg"></p>
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
      <h3>Пользователи и роли</h3>
      <div id="user-list" class="muted">Загрузка…</div>
      <p class="muted" style="font-size:13px;margin-top:8px;">
        Роль <b>staff</b> + категории (напр. <code>court, labor, documents</code>) — сотрудник
        обрабатывает заявления этих категорий. <code>documents</code> — право выдавать документы.
      </p>
    </section>
  `;

  view.querySelector("#seed-cats").onclick = async () => {
    if (!confirm("Перезаписать все категории стандартным набором?")) return;
    try {
      await set(ref(db, "categories"), DEFAULT_CATEGORIES);
      view.querySelector("#seed-msg").textContent = "✓ Категории установлены.";
    } catch (e) {
      view.querySelector("#seed-msg").textContent = "Ошибка: " + e.message;
    }
  };

  view.querySelector("#f-faq").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const snap  = await get(ref(db, "faq"));
      const order = Object.keys(snap.val() || {}).length + 1;
      await push(ref(db, "faq"), {
        question: fd.get("question").trim(),
        answer:   fd.get("answer").trim(),
        order,
        createdAt: Date.now()
      });
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
      ? entries.map(([id, f]) => `
          <li>
            <b>${esc(f.question)}</b> — ${esc(f.answer)}
            <button class="mini" data-del-faq="${esc(id)}">удалить</button>
          </li>`).join("")
      : `<li class="muted">пока нет</li>`;
  }));

  view.querySelector("#faq-list").onclick = async e => {
    const b = e.target.closest("[data-del-faq]");
    if (!b) return;
    if (!confirm("Удалить FAQ?")) return;
    try { await remove(ref(db, `faq/${b.dataset.delFaq}`)); }
    catch (err) { alert(err.message); }
  };

  let users = {}, roles = {}, scats = {};

  const paintUsers = () => {
    const box = view.querySelector("#user-list");
    const entries = Object.entries(users);
    if (!entries.length) { box.textContent = "Пока никто не зарегистрировался."; return; }

    box.innerHTML = entries.map(([uid, u]) => {
      const r    = roles[uid] || "user";
      const cats = Object.keys(scats[uid] || {}).join(", ");
      const self = uid === me.uid;

      return `<div class="user-row">
        <div><b>${esc(u.displayName || "—")}</b><br><small>${esc(u.email || "")}</small></div>
        ${self
          ? `<div class="muted">(вы — ${ROLE_RU[r]})</div>`
          : `<select class="role-sel" data-uid="${esc(uid)}">
               ${["user","staff","admin"].map(x =>
                 `<option value="${x}" ${r === x ? "selected" : ""}>${ROLE_RU[x]}</option>`).join("")}
             </select>`}
        <input class="cat-inp" data-uid="${esc(uid)}"
               placeholder="категории через запятую"
               value="${esc(cats)}">
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
        await set(ref(db, `staffCategories/${t.dataset.uid}`),
          Object.keys(obj).length ? obj : null);
      }
    } catch (err) { alert(err.message); }
  };
        }
