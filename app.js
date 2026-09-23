(() => {
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const fallbackFS = {
  "/home/user/readme.txt": "Welcome to HindhoklaOS 5.0.\nThis is your local virtual system.",
  "/home/user/notes.txt": "HindhoklaOS 5.0 notes",
  "/projects/hello/index.html": "<h1>Hello from HindhoklaOS</h1>",
  "/projects/hello/style.css": "body { font-family: sans-serif; }",
  "/system/kernel.log": "HKO kernel initialized successfully."
};

const defaultSettings = { theme: "neon", grid: true, compact: false, sound: false };

const ACCOUNT_KEY = "hko_account_50";
const LOCKOUT_KEY = "hko_login_lock_50";

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function getAccount() {
  return safeLoad(ACCOUNT_KEY, null);
}

function userHome(username = getAccount()?.username || "user") {
  return "/home/" + username;
}

function showAuthScreen() {
  const setup = $("#setupScreen");
  const login = $("#loginScreen");
  const account = getAccount();
  if (!account) {
    setup?.classList.remove("hidden");
    login?.classList.add("hidden");
    return;
  }
  setup?.classList.add("hidden");
  login?.classList.remove("hidden");
  const username = $("#loginUsername");
  if (username) username.textContent = account.username;
  const password = $("#loginPassword");
  if (password) {
    password.value = "";
    setTimeout(() => password.focus(), 50);
  }
}

function setSetupMessage(message, error = false) {
  const el = $("#setupMessage");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
}

function setLoginMessage(message, error = false) {
  const el = $("#loginMessage");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", error);
  }
}

function passwordStrength(password) {
  if (!password) return 0;
  let score = Math.min(2, Math.floor(password.length / 4));
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(5, score);
}

function updatePasswordMeter() {
  const password = $("#setupPassword")?.value || "";
  const meter = $("#setupPasswordMeter");
  if (!meter) return;
  const score = passwordStrength(password);
  meter.dataset.score = String(score);
  const labels = ["", "WEAK", "WEAK", "FAIR", "GOOD", "STRONG"];
  meter.querySelector("span").textContent = labels[score];
}

function migrateUserFiles(username) {
  const next = {};
  Object.entries(state.fs).forEach(([path, value]) => {
    next[path.replace(/^\/home\/user(?=\/|$)/, "/home/" + username)] = value;
  });
  state.fs = next;
  saveFS();
}

async function createLocalAccount() {
  const username = ($("#setupUsername")?.value || "").trim().toLowerCase();
  const password = $("#setupPassword")?.value || "";
  const confirm = $("#setupPasswordConfirm")?.value || "";

  if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) {
    setSetupMessage("Username must be 3–24 characters: letters, numbers, ., _, or -.", true);
    return;
  }
  if (password.length < 6) {
    setSetupMessage("Password must be at least 6 characters.", true);
    return;
  }
  if (password !== confirm) {
    setSetupMessage("Passwords do not match.", true);
    return;
  }

  const hash = await hashPassword(password);
  safeSave(ACCOUNT_KEY, { username, passwordHash: hash, createdAt: new Date().toISOString() });
  migrateUserFiles(username);
  setSetupMessage("Account created. Preparing secure login...");
  await sleep(500);
  showAuthScreen();
}

async function loginLocalAccount() {
  const account = getAccount();
  if (!account) return showAuthScreen();
  const password = $("#loginPassword")?.value || "";
  const nowMs = Date.now();
  const lock = safeLoad(LOCKOUT_KEY, { attempts: 0, until: 0 });
  if (lock.until > nowMs) {
    const seconds = Math.ceil((lock.until - nowMs) / 1000);
    setLoginMessage("Too many attempts. Try again in " + seconds + "s.", true);
    return;
  }
  if (!password) {
    setLoginMessage("Enter your password.", true);
    return;
  }
  const hash = await hashPassword(password);
  if (hash !== account.passwordHash) {
    const attempts = (lock.attempts || 0) + 1;
    if (attempts >= 5) {
      safeSave(LOCKOUT_KEY, { attempts: 0, until: Date.now() + 15000 });
      setLoginMessage("Five failed attempts. Login paused for 15 seconds.", true);
    } else {
      safeSave(LOCKOUT_KEY, { attempts, until: 0 });
      setLoginMessage("Incorrect password. Attempt " + attempts + " of 5.", true);
    }
    return;
  }
  safeSave(LOCKOUT_KEY, { attempts: 0, until: 0 });
  $("#loginScreen")?.classList.add("hidden");
  $("#desktop")?.classList.remove("hidden");
  notify("Welcome back, " + account.username + ".");
  openApp("files");
}

function resetLocalAccount() {
  if (!confirm("Reset the local HindhoklaOS account? This returns the system to Initial Setup.")) return;
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(LOCKOUT_KEY);
  location.reload();
}

function safeLoad(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeSave(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Phase 0 account constants are intentionally initialized after the storage helpers.\n
const state = {
  fs: safeLoad("hko_fs_50", { ...fallbackFS }),
  settings: { ...defaultSettings, ...safeLoad("hko_settings_50", {}) },
  windows: new Map(),
  z: 10,
  notifications: [],
  bootStarted: false,
  fastBoot: false,
  scrolling: false,
  bootStart: performance.now()
};

const apps = [
  ["files","Files","Virtual filesystem"], ["terminal","Terminal","Command shell"],
  ["browser","Browser","Hindhokla web"], ["code","Code Studio","Edit files"],
  ["debug","Debug Detective","Find problems"], ["network","Network Lab","Virtual network"],
  ["packet","Packet Journey","Trace a packet"], ["ui","UI Archaeologist","Inspect interfaces"],
  ["museum","Internet Museum","Web history"], ["software","Software Museum","Software history"],
  ["osmuseum","OS Museum","OS history"], ["escape","Escape Room","Puzzle environment"],
  ["git","Git Visualizer","Commit graph"], ["company","Company Simulator","Build a company"],
  ["settings","Settings","System preferences"], ["task","Task Manager","Processes"],
  ["store","App Store","Virtual software"], ["paint","Paint","Pixel canvas"],
  ["calculator","Calculator","Calculator"], ["media","Media Player","Local media"],
  ["clock","Clock","Time and date"]
];

const pinned = ["files","terminal","code","task","settings","network"];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const now = () => new Date().toLocaleTimeString([], { hour12: false });

function mark(id, text = "OK") {
  const e = $("#" + id);
  if (e) {
    e.textContent = text;
    e.classList.toggle("ok", ["OK","READY","PASS"].includes(text));
  }
}

function progress(value) {
  const p = Math.max(0, Math.min(100, value));
  const bar = $("#hardwareBar");
  const text = $("#bootProgressText");
  if (bar) bar.style.width = p + "%";
  if (text) text.textContent = p + "%";
}

function bootLog(message, cls = "") {
  const log = $("#kernelLog");
  if (!log) return;
  const line = document.createElement("div");
  line.className = "log-line " + cls;
  line.innerHTML = '<span class="log-time">[' + now() + ']</span> ' + esc(message);
  log.appendChild(line);
  if (state.scrolling) log.scrollTop = log.scrollHeight;
}

function startScrolling() {
  state.scrolling = true;
  const log = $("#kernelLog");
  const mode = $("#scrollMode");
  const hint = $("#bootHint");
  if (log) log.scrollTop = log.scrollHeight;
  if (mode) mode.textContent = "SPACE-SCROLL ACTIVE";
  if (hint) hint.textContent = "SPACE • accelerate boot • log scrolling active";
}

async function boot() {
  if (state.bootStarted) return;
  state.bootStarted = true;

  const steps = [
    ["HKO kernel 5.0 initializing...", "log", 260],
    ["Probing virtual CPU...", "cpuCheck", 360],
    ["Detecting memory map...", "memoryCheck", 340],
    ["Negotiating virtual display bus...", "displayCheck", 340],
    ["Registering keyboard input...", "inputCheck", 300],
    ["Hardware detection complete.", "log", 260],
    ["Mounting root volume...", "fsRoot", 360],
    ["Checking user home...", "fsHome", 340],
    ["Running filesystem integrity scan...", "fsIntegrity", 360],
    ["Filesystem checks passed.", "log", 260],
    ["Starting window manager...", "svcWindow", 340],
    ["Starting application manager...", "svcApps", 340],
    ["Starting notification bus...", "svcNotify", 300],
    ["Starting power manager...", "svcPower", 300],
    ["Loading desktop session...", "log", 260],
    ["Secure boot signature verified.", "log", 300],
    ["HindhoklaOS kernel is ready.", "log", 300]
  ];

  const total = steps.reduce((sum, step) => sum + step[2], 0);
  let elapsed = 0;

  for (const [message, target, duration] of steps) {
    bootLog(message, target === "log" && /verified|ready|passed/i.test(message) ? "ok" : "");
    await sleep(state.fastBoot ? 55 : duration);
    elapsed += duration;
    progress(Math.round(elapsed / total * 100));
    if (target !== "log") mark(target, "OK");
    if (elapsed / total > 0.2) mark("hardwareStatus", "READY");
    if (state.fastBoot && elapsed / total > 0.38) break;
  }

  if (state.fastBoot) {
    bootLog("SPACE detected: accelerating remaining boot sequence.", "ok");
    ["cpuCheck","memoryCheck","displayCheck","inputCheck","fsRoot","fsHome","fsIntegrity","svcWindow","svcApps","svcNotify","svcPower"].forEach(id => mark(id, "OK"));
    progress(100);
    await sleep(180);
  }

  mark("hardwareStatus", "READY");
  const bootState = $("#bootState");
  const hint = $("#bootHint");
  if (bootState) bootState.textContent = "HKO KERNEL • READY";
  if (hint) hint.textContent = "BOOT COMPLETE • Loading account session";
  await sleep(450);

  const bootScreen = $("#bootScreen");
  const login = $("#loginScreen");
  if (!bootScreen || !login) throw new Error("Boot UI is incomplete.");
  bootScreen.classList.add("hidden");
  login.classList.remove("hidden");
}

function saveFS() { safeSave("hko_fs_50", state.fs); }

function notify(message) {
  state.notifications.unshift({ msg: message, time: now() });
  state.notifications = state.notifications.slice(0, 20);
  renderNotifications();
  const area = $("#notificationArea");
  if (!area) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  area.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderNotifications() {
  const list = $("#notificationList");
  if (!list) return;
  list.innerHTML = state.notifications.length
    ? state.notifications.map(n => '<div class="notification-item">' + esc(n.msg) + '<time>' + esc(n.time) + '</time></div>').join("")
    : '<div class="muted" style="padding:15px 0">No notifications.</div>';
}

function updateClock() {
  const d = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const clock = $("#clockButton");
  const bootClock = $("#bootClock");
  const panelClock = $("#panelClock");
  if (clock) clock.textContent = time;
  if (bootClock) bootClock.textContent = d.toLocaleTimeString([], { hour12: false });
  if (panelClock) panelClock.textContent = time;
}

function renderDesktopIcons() {
  const host = $("#desktopIcons");
  if (!host) return;
  host.innerHTML = "";
  apps.slice(0, 8).forEach(app => {
    const button = document.createElement("button");
    button.className = "desktop-icon";
    button.innerHTML = '<div class="icon">' + esc(app[1][0]) + '</div><span>' + esc(app[1]) + '</span>';
    button.onclick = () => openApp(app[0]);
    host.appendChild(button);
  });
}

function renderPinned() {
  const host = $("#pinnedApps");
  if (!host) return;
  host.innerHTML = "";
  pinned.forEach(id => {
    const app = apps.find(a => a[0] === id);
    if (!app) return;
    const button = document.createElement("button");
    button.className = "pinned-app";
    button.innerHTML = '<b>' + esc(app[1][0]) + '</b><small>' + esc(app[1]) + '</small>';
    button.onclick = () => { $("#startMenu")?.classList.add("hidden"); openApp(id); };
    host.appendChild(button);
  });
}

function renderAppList() {
  const host = $("#appList");
  const search = $("#appSearch");
  if (!host) return;
  const q = (search?.value || "").toLowerCase();
  host.innerHTML = "";
  apps.filter(a => a[1].toLowerCase().includes(q) || a[2].toLowerCase().includes(q)).forEach(app => {
    const item = document.createElement("div");
    item.className = "app-entry";
    item.innerHTML = '<div class="app-letter">' + esc(app[1][0]) + '</div><div><b>' + esc(app[1]) + '</b><small>' + esc(app[2]) + '</small></div>';
    item.onclick = () => { $("#startMenu")?.classList.add("hidden"); openApp(app[0]); };
    host.appendChild(item);
  });
}

function applySettings() {
  const s = state.settings;
  const wallpaper = $("#wallpaper");
  if (wallpaper) wallpaper.classList.toggle("no-grid", !s.grid);
  document.body.classList.toggle("compact", !!s.compact);
  document.documentElement.style.setProperty("--green", s.theme === "ice" ? "#78e8ff" : "#8dff70");
  $$(".quick-card").forEach(card => {
    const active = (card.dataset.toggle === "grid" && s.grid) ||
      (card.dataset.toggle === "compact" && s.compact) ||
      (card.dataset.toggle === "sound" && s.sound) ||
      (card.dataset.toggle === "theme" && s.theme === "neon");
    card.classList.toggle("active", active);
  });
}

function toggleControl(key) {
  if (key === "grid") state.settings.grid = !state.settings.grid;
  if (key === "compact") state.settings.compact = !state.settings.compact;
  if (key === "sound") state.settings.sound = !state.settings.sound;
  if (key === "theme") state.settings.theme = state.settings.theme === "neon" ? "ice" : "neon";
  safeSave("hko_settings_50", state.settings);
  applySettings();
  notify("Control center updated.");
}

function updateSystemStats() {
  const cpu = 8 + Math.floor(Math.random() * 18);
  const ram = 320 + Math.floor(Math.random() * 90);
  const qCpu = $("#quickCpu"), qRam = $("#quickRam"), qUp = $("#quickUptime");
  if (qCpu) qCpu.textContent = cpu + "%";
  if (qRam) qRam.textContent = ram + " MB";
  if (qUp) {
    const seconds = Math.floor((performance.now() - state.bootStart) / 1000);
    qUp.textContent = Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }
}

function makeDraggable(windowEl, bar) {
  let dragging = false, ox = 0, oy = 0;
  bar.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    dragging = true;
    ox = e.clientX - windowEl.offsetLeft;
    oy = e.clientY - windowEl.offsetTop;
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", e => {
    if (!dragging) return;
    windowEl.style.left = Math.max(0, Math.min(innerWidth - windowEl.offsetWidth, e.clientX - ox)) + "px";
    windowEl.style.top = Math.max(0, Math.min(innerHeight - 85, e.clientY - oy)) + "px";
  });
  bar.addEventListener("pointerup", () => { dragging = false; });
}

function openApp(id) {
  if (state.windows.has(id)) {
    const existing = state.windows.get(id);
    existing.classList.remove("minimized");
    existing.style.zIndex = ++state.z;
    updateTaskbar();
    return;
  }

  const app = apps.find(a => a[0] === id);
  const host = $("#windows");
  if (!app || !host) return;

  const win = document.createElement("section");
  win.className = "window";
  win.dataset.app = id;
  win.style.zIndex = ++state.z;
  win.innerHTML = '<div class="titlebar"><div class="title">' + esc(app[1]) + '</div><span class="window-state">LIVE</span><button class="minimize" aria-label="Minimize">−</button><button class="close" aria-label="Close">×</button></div><div class="window-body"></div>';

  host.appendChild(win);
  state.windows.set(id, win);

  win.querySelector(".close").onclick = () => {
    win.remove();
    state.windows.delete(id);
    updateTaskbar();
  };
  win.querySelector(".minimize").onclick = () => {
    win.classList.add("minimized");
    updateTaskbar();
  };
  win.addEventListener("mousedown", () => {
    win.style.zIndex = ++state.z;
    updateTaskbar();
  });

  makeDraggable(win, win.querySelector(".titlebar"));
  renderApp(id, win.querySelector(".window-body"));
  updateTaskbar();
}

function updateTaskbar() {
  const host = $("#taskApps");
  if (!host) return;
  host.innerHTML = "";
  state.windows.forEach((win, id) => {
    const app = apps.find(a => a[0] === id);
    if (!app) return;
    const button = document.createElement("button");
    button.className = "task-app " + (!win.classList.contains("minimized") ? "active" : "");
    button.textContent = app[1];
    button.onclick = () => {
      win.classList.remove("minimized");
      win.style.zIndex = ++state.z;
      updateTaskbar();
    };
    host.appendChild(button);
  });
}

function filesView(body) {
  body.innerHTML = '<div class="app-toolbar"><button class="tool-btn" id="newFile">New file</button><button class="tool-btn" id="saveFile">Save</button><button class="tool-btn" id="deleteFile">Delete</button><span class="muted" id="filePath">Select a file</span></div><div class="file-list" id="fileList"></div><textarea class="editor" id="fileEditor" placeholder="Select a file to edit..."></textarea>';
  const list = $("#fileList", body), editor = $("#fileEditor", body), path = $("#filePath", body);
  let current = null;

  const render = () => {
    list.innerHTML = "";
    Object.keys(state.fs).sort().forEach(file => {
      const item = document.createElement("div");
      item.className = "file-item";
      item.innerHTML = '<span>' + esc(file) + '</span><span class="muted">' + state.fs[file].length + ' chars</span>';
      item.onclick = () => { current = file; path.textContent = file; editor.value = state.fs[file]; };
      list.appendChild(item);
    });
  };

  $("#saveFile", body).onclick = () => {
    if (current) { state.fs[current] = editor.value; saveFS(); notify("File saved."); }
  };
  $("#deleteFile", body).onclick = () => {
    if (current && confirm("Delete " + current + "?")) {
      delete state.fs[current];
      current = null;
      editor.value = "";
      path.textContent = "Select a file";
      saveFS();
      render();
    }
  };
  $("#newFile", body).onclick = () => {
    const file = prompt("Virtual path:", userHome() + "/new.txt");
    if (file) { state.fs[file] = ""; saveFS(); render(); }
  };
  render();
}

function terminalView(body) {
  body.innerHTML = '<pre class="terminal" id="termOut"></pre><input class="terminal-input" id="termInput" placeholder="hko@user:~$ " autocomplete="off">';
  const out = $("#termOut", body), input = $("#termInput", body);
  const print = text => { out.textContent += String(text) + "\n"; out.scrollTop = out.scrollHeight; };
  print("HindhoklaOS Terminal 5.0");
  print("Type help for commands.");
  input.focus();

  input.onkeydown = e => {
    if (e.key !== "Enter") return;
    const raw = input.value.trim();
    input.value = "";
    print("hko@" + (getAccount()?.username || "user") + ":~$ " + raw);
    if (!raw) return;
    const [command, ...parts] = raw.split(/\s+/);
    const arg = parts.join(" ");
    switch (command) {
      case "help": print("help clear ls cat date whoami sysinfo open touch rm echo reboot"); break;
      case "clear": out.textContent = ""; break;
      case "ls": Object.keys(state.fs).forEach(p => print(p)); break;
      case "cat": print(state.fs[arg] ?? "File not found."); break;
      case "date": print(new Date().toString()); break;
      case "whoami": print(getAccount()?.username || "user"); break;
      case "sysinfo": print("HindhoklaOS 5.0 | HKO kernel | " + state.windows.size + " windows"); break;
      case "open": if (apps.some(a => a[0] === arg)) openApp(arg); else print("Usage: open <app-id>"); break;
      case "touch": if (arg) { state.fs[arg] = ""; saveFS(); print("Created " + arg); } break;
      case "rm": if (Object.prototype.hasOwnProperty.call(state.fs, arg)) { delete state.fs[arg]; saveFS(); print("Removed " + arg); } else print("File not found."); break;
      case "echo": print(arg); break;
      case "reboot": location.reload(); break;
      default: print("Command not found. Type help.");
    }
  };
}

function simpleCards(body, title, cards) {
  body.innerHTML = '<div class="card-grid">' + cards.map(c => '<div class="mini-card"><b>' + esc(c[0]) + '</b><small>' + esc(c[1]) + '</small></div>').join("") + '</div>';
  if (title) body.insertAdjacentHTML("afterbegin", '<p class="muted">' + esc(title) + '</p>');
}

function browserView(body) {
  body.innerHTML = '<div class="app-toolbar"><input id="url" style="flex:1;background:#080e09;border:1px solid #1c3820;color:#cfe4d0;padding:8px" value="hko://home"><button class="tool-btn" id="go">GO</button></div><div id="page" class="mini-card"></div>';
  const url = $("#url", body), page = $("#page", body);
  const go = () => {
    const value = url.value.trim();
    if (value === "hko://system") page.innerHTML = "<b>System</b><p class='muted'>Kernel: HKO 5.0<br>Session: " + esc(getAccount()?.username || "user") + "<br>Filesystem: mounted<br>Services: running</p>";
    else if (value === "hko://apps") page.innerHTML = "<b>Applications</b><p class='muted'>" + apps.map(a => esc(a[1])).join(" • ") + "</p>";
    else page.innerHTML = "<b>Hindhokla Home</b><p class='muted'>Welcome to the local virtual web.</p>";
  };
  $("#go", body).onclick = go;
  go();
}

function codeView(body) {
  body.innerHTML = '<div class="app-toolbar"><select id="codeFile"></select><button class="tool-btn" id="saveCode">Save</button><button class="tool-btn" id="runCode">Run</button></div><textarea class="editor" id="codeEditor"></textarea><div id="codeOutput" class="muted"></div>';
  const select = $("#codeFile", body), editor = $("#codeEditor", body), output = $("#codeOutput", body);
  Object.keys(state.fs).filter(p => /\.(html|css|js|txt)$/.test(p)).forEach(file => {
    const option = document.createElement("option");
    option.value = file;
    option.textContent = file;
    select.appendChild(option);
  });
  const load = () => { editor.value = state.fs[select.value] || ""; };
  select.onchange = load;
  load();
  $("#saveCode", body).onclick = () => { state.fs[select.value] = editor.value; saveFS(); notify("Code saved."); };
  $("#runCode", body).onclick = () => { output.textContent = "Executed " + select.value + " in the virtual workspace."; notify("Code Studio run complete."); };
}

function calculatorView(body) {
  const keys = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"];
  body.innerHTML = '<div class="calc"><div class="calc-display" id="calcDisplay">0</div><div class="calc-grid">' + keys.map(k => "<button>" + k + "</button>").join("") + "</div></div>";
  const display = $("#calcDisplay", body);
  let expression = "";
  $$(".calc-grid button", body).forEach(button => button.onclick = () => {
    const value = button.textContent;
    if (value === "C") expression = "";
    else if (value === "=") {
      try { expression = String(Function("return " + expression)()); } catch { expression = "ERR"; }
    } else expression += value;
    display.textContent = expression || "0";
  });
}

function paintView(body) {
  body.innerHTML = '<canvas class="paint" width="700" height="360"></canvas>';
  const canvas = $(".paint", body), ctx = canvas.getContext("2d");
  let drawing = false;
  canvas.addEventListener("pointerdown", e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
  canvas.addEventListener("pointermove", e => { if (!drawing) return; ctx.lineTo(e.offsetX, e.offsetY); ctx.strokeStyle = "#8dff70"; ctx.lineWidth = 3; ctx.stroke(); });
  canvas.addEventListener("pointerup", () => drawing = false);
  canvas.addEventListener("pointerleave", () => drawing = false);
}

function clockView(body) {
  body.innerHTML = '<div class="mini-card" style="text-align:center"><b id="bigClock">--:--:--</b><small id="bigDate"></small></div>';
  const tick = () => {
    const d = new Date();
    $("#bigClock", body).textContent = d.toLocaleTimeString([], { hour12: false });
    $("#bigDate", body).textContent = d.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  };
  tick();
  setInterval(tick, 1000);
}

function settingsView(body) {
  body.innerHTML = '<div class="card-grid"><div class="mini-card"><b>THEME</b><small>Use Control Center to switch themes.</small></div><div class="mini-card"><b>PERSISTENCE</b><small>Settings and files are stored locally.</small></div><div class="mini-card"><b>VERSION</b><small>HindhoklaOS 5.0</small></div></div>';
}

function taskView(body) {
  body.innerHTML = '<div class="card-grid"><div class="mini-card"><b>' + state.windows.size + '</b><small>open windows</small></div><div class="mini-card"><b>RUNNING</b><small>window manager</small></div><div class="mini-card"><b>READY</b><small>session state</small></div></div>';
}

function debugView(body) {
  simpleCards(body, "Debug Detective scans the virtual filesystem and current session.", [
    [Object.keys(state.fs).length, "files scanned"], ["0", "boot blockers"], ["PASS", "integrity"]
  ]);
}

function networkView(body) {
  simpleCards(body, "", [["LOOP","virtual adapter"],["127.0.0.1","local endpoint"],["ONLINE","simulated network"]]);
  body.insertAdjacentHTML("beforeend", '<button class="tool-btn" id="ping">Ping local host</button><pre class="terminal" id="pingOut"></pre>');
  $("#ping", body).onclick = () => { $("#pingOut", body).textContent = "PING 127.0.0.1\n64 bytes • 1ms\n64 bytes • 1ms\n64 bytes • 2ms\n3 packets transmitted, 3 received, 0% loss."; };
}

function packetView(body) {
  body.innerHTML = '<button class="tool-btn" id="trace">Trace packet</button><pre class="terminal" id="traceOut">Ready.</pre>';
  $("#trace", body).onclick = () => { $("#traceOut", body).textContent = "Packet created\n  ↓\nVirtual NIC\n  ↓\nHKO Router\n  ↓\nDestination\n\nTrace complete."; };
}

function terminalLike(body, title, text) { body.innerHTML = '<div class="mini-card"><b>' + esc(title) + '</b><p class="muted">' + esc(text) + '</p></div>'; }

const views = {
  files: filesView,
  terminal: terminalView,
  browser: browserView,
  code: codeView,
  calculator: calculatorView,
  paint: paintView,
  clock: clockView,
  settings: settingsView,
  task: taskView,
  debug: debugView,
  network: networkView,
  packet: packetView,
  ui: b => terminalLike(b, "UI ARCHAEOLOGIST", "Inspect interface structure, spacing, controls and interaction states."),
  museum: b => simpleCards(b, "", [["WEB 1.0","Static pages and guestbooks"],["SEARCH","Directories before modern search"],["WEB APPS","The browser became the platform"]]),
  software: b => simpleCards(b, "", [["1980s","Desktop software"],["1990s","Shareware and boxed apps"],["2000s","Web applications"]]),
  osmuseum: b => simpleCards(b, "", [["CLI","Command-first systems"],["GUI","Windows and icons"],["WEB","Browser-based computing"]]),
  escape: b => terminalLike(b, "ESCAPE ROOM", "Find the hidden sequence: H • K • O • 4 • 0."),
  git: b => terminalLike(b, "GIT VISUALIZER", "main → feature/ui → fix/boot → release/4.0"),
  company: b => terminalLike(b, "COMPANY SIMULATOR", "Build a fictional company, allocate resources, and watch simulated metrics change."),
  store: b => simpleCards(b, "", [["Code Tools","Development utilities"],["System Tools","Virtual system utilities"],["Games","Small interactive experiments"]]),
  media: b => terminalLike(b, "MEDIA PLAYER", "Local playback surface ready.")
};

function renderApp(id, body) {
  const view = views[id];
  if (view) view(body);
  else terminalLike(body, "APPLICATION", "This application is available in the HindhoklaOS catalog.");
}

/* HINDHOKLAOS 5.0 PHASES 1-12 */
const V5 = {
  installed: safeLoad("hko_installed_50", ["files","terminal","browser","code","settings","task","clock","calculator","paint","network","packet","debug","store","monitor","devtools"]),
  history: safeLoad("hko_history_50", []),
  bookmarks: safeLoad("hko_bookmarks_50", ["hko://home","hko://system","hko://apps"]),
  trash: safeLoad("hko_trash_50", {}),
  notes: safeLoad("hko_notes_50", [])
};
function v5Save(){safeSave("hko_installed_50",V5.installed);safeSave("hko_history_50",V5.history);safeSave("hko_bookmarks_50",V5.bookmarks);safeSave("hko_trash_50",V5.trash);safeSave("hko_notes_50",V5.notes)}
function accountUser(){return getAccount()?.username||"user"}
function ensureHome(){const h=userHome();const d={};d[h+"/readme.txt"]="Welcome to HindhoklaOS 5.0.\nYour local virtual home.";d[h+"/notes.txt"]="Notes\n\n";d[h+"/Documents/.keep"]="";d[h+"/Downloads/.keep"]="";d[h+"/Pictures/.keep"]="";for(const p in d)if(!Object.prototype.hasOwnProperty.call(state.fs,p))state.fs[p]=d[p];saveFS()}
function trashFile(p){if(state.fs[p]==null)return;V5.trash[p]={content:state.fs[p],time:Date.now()};delete state.fs[p];saveFS();v5Save()}
function files5(body){let cur=null;body.innerHTML="<div class=\"app-toolbar\"><input id=\"fsSearch\" placeholder=\"Search files...\"><button class=\"tool-btn\" id=\"fsNew\">NEW FILE</button><button class=\"tool-btn\" id=\"fsFolder\">NEW FOLDER</button><button class=\"tool-btn\" id=\"fsTrash\">TRASH</button></div><div class=\"file-layout5\"><div class=\"file-items5\" id=\"fsList\"></div><div><div class=\"editor-title\" id=\"fsTitle\">No file selected</div><textarea class=\"editor\" id=\"fsEdit\"></textarea><button class=\"tool-btn\" id=\"fsSave\">SAVE</button><button class=\"tool-btn danger-btn\" id=\"fsDelete\">DELETE</button></div></div>";const list=$("#fsList",body),edit=$("#fsEdit",body),title=$("#fsTitle",body),search=$("#fsSearch",body);const render=()=>{const q=search.value.toLowerCase();list.innerHTML="";Object.keys(state.fs).filter(p=>p.toLowerCase().includes(q)).sort().forEach(p=>{const b=document.createElement("button");b.className="file-row";b.innerHTML="<b>▤ "+esc(p)+"</b><small>"+new Blob([state.fs[p]]).size+" B</small>";b.onclick=()=>{cur=p;title.textContent=p;edit.value=state.fs[p]};list.appendChild(b)})};$("#fsSave",body).onclick=()=>{if(cur){state.fs[cur]=edit.value;saveFS();notify("File saved.")}};$("#fsDelete",body).onclick=()=>{if(cur&&confirm("Delete "+cur+"?")){trashFile(cur);cur=null;edit.value="";title.textContent="No file selected";render()}};$("#fsNew",body).onclick=()=>{const p=prompt("File path",userHome()+"/new.txt");if(p){state.fs[p]="";saveFS();render()}};$("#fsFolder",body).onclick=()=>{const p=prompt("Folder path",userHome()+"/NewFolder");if(p){state.fs[p+"/.keep"]="";saveFS();render()}};$("#fsTrash",body).onclick=()=>{list.innerHTML=Object.keys(V5.trash).map(p=>"<button class=\"file-row\" data-restore=\""+esc(p)+"\">♻ "+esc(p)+" <small>RESTORE</small></button>").join("");$("[data-restore]",body).forEach(b=>b.onclick=()=>{const p=b.dataset.restore;state.fs[p]=V5.trash[p].content;delete V5.trash[p];saveFS();v5Save();render()})};search.oninput=render;render()}
function terminal5(body){body.innerHTML="<pre class=\"terminal\" id=\"t5out\"></pre><input class=\"terminal-input\" id=\"t5in\" placeholder=\"hko@"+esc(accountUser())+":~$ \">";const o=$("#t5out",body),i=$("#t5in",body),hist=[];let pos=0;const p=x=>{o.textContent+=x+"\n";o.scrollTop=o.scrollHeight};p("HindhoklaOS Terminal 5.0");p("help • ls • cd • pwd • mkdir • touch • cat • rm • cp • mv • tree • find • grep • whoami • ps • neofetch • open");i.onkeydown=e=>{if(e.key==="ArrowUp"){e.preventDefault();i.value=hist[Math.max(0,--pos)]||"";return}if(e.key==="ArrowDown"){e.preventDefault();i.value=hist[Math.min(hist.length,++pos)]||"";return}if(e.key==="Tab"){e.preventDefault();const q=i.value;const m=["help","ls","cd","pwd","mkdir","touch","cat","rm","cp","mv","tree","find","grep","whoami","ps","neofetch","open"].filter(x=>x.startsWith(q));if(m.length===1)i.value=m[0];return}if(e.key!=="Enter")return;const raw=i.value.trim();i.value="";if(!raw)return;hist.push(raw);pos=hist.length;p("hko@"+accountUser()+":~$ "+raw);const a=raw.split(/\s+/),cmd=a.shift(),arg=a.join(" ");if(cmd==="help")p("help ls cd pwd mkdir touch cat rm cp mv tree find grep history date whoami ps sysinfo neofetch open reboot");else if(cmd==="clear")o.textContent="";else if(cmd==="ls")Object.keys(state.fs).forEach(x=>p(x));else if(cmd==="pwd")p(userHome());else if(cmd==="cd")p("directory changed to "+(arg||userHome()));else if(cmd==="mkdir"){state.fs[(arg||userHome()+"/folder")+"/.keep"]="";saveFS();p("created") }else if(cmd==="touch"){state.fs[arg]="";saveFS();p("created "+arg)}else if(cmd==="cat")p(state.fs[arg]??"File not found.");else if(cmd==="rm"){trashFile(arg);p("moved to trash")}else if(cmd==="cp"){if(state.fs[a[0]]!=null){state.fs[a[1]]=state.fs[a[0]];saveFS();p("copied")}}else if(cmd==="mv"){if(state.fs[a[0]]!=null){state.fs[a[1]]=state.fs[a[0]];delete state.fs[a[0]];saveFS();p("moved")}}else if(cmd==="tree")Object.keys(state.fs).sort().forEach(x=>p("├─ "+x));else if(cmd==="find")Object.keys(state.fs).filter(x=>x.includes(arg)).forEach(x=>p(x));else if(cmd==="grep"){const f=state.fs[a[1]]||"";f.split("\n").filter(x=>x.includes(a[0])).forEach(x=>p(x))}else if(cmd==="whoami")p(accountUser());else if(cmd==="ps")p([...state.windows.keys()].join("\n")||"No processes");else if(cmd==="sysinfo")p("HindhoklaOS 5.0 • kernel HKO-5 • files "+Object.keys(state.fs).length);else if(cmd==="neofetch")p("HINDHOKLAOS 5.0\nUSER "+accountUser()+"\nKERNEL HKO-5\nWINDOWS "+state.windows.size+"\nFILES "+Object.keys(state.fs).length);else if(cmd==="open")openApp(a[0]);else if(cmd==="reboot")location.reload();else p("Command not found.")}}
function browser5(body){let tabs=["hko://home"],active=0;body.innerHTML="<div class=\"browser-tabs\" id=\"bTabs\"></div><div class=\"browser-bar\"><button id=\"bBack\">‹</button><button id=\"bForward\">›</button><input id=\"bUrl\" value=\"hko://home\"><button id=\"bGo\">GO</button><button id=\"bMark\">☆</button></div><div class=\"browser-page\" id=\"bPage\"></div>";const tabs=$("#bTabs",body),url=$("#bUrl",body),page=$("#bPage",body);const go=()=>{const u=url.value.trim()||"hko://home";tabs[active]=u;V5.history=[u,...V5.history.filter(x=>x!==u)].slice(0,50);v5Save();if(u==="hko://system")page.innerHTML="<h2>System</h2><div class=\"card-grid\"><div class=\"mini-card\"><b>HKO 5.0</b><small>Kernel online</small></div><div class=\"mini-card\"><b>"+esc(accountUser())+"</b><small>User</small></div></div>";else if(u==="hko://apps")page.innerHTML="<h2>Applications</h2><div class=\"card-grid\">"+apps.map(a=>"<div class=\"mini-card\"><b>"+esc(a[1])+"</b><small>"+esc(a[2])+"</small></div>").join("")+"</div>";else page.innerHTML="<div class=\"browser-home\"><div class=\"browser-logo\">H</div><h1>HINDHOKLAOS</h1><p>Local virtual web</p><button data-u=\"hko://system\">SYSTEM</button> <button data-u=\"hko://apps\">APPS</button></div>";$("[data-u]",page).forEach(b=>b.onclick=()=>{url.value=b.dataset.u;go()});tabs.innerHTML=tabs.map((x,n)=>"<button class=\"browser-tab "+(n===active?"active":"")+"\">"+esc(x)+"</button>").join("")};$("#bGo",body).onclick=go;url.onkeydown=e=>{if(e.key==="Enter")go()};$("#bMark",body).onclick=()=>{if(!V5.bookmarks.includes(url.value)){V5.bookmarks.push(url.value);v5Save();notify("Bookmark added.")}};go()}
function monitor5(body){body.innerHTML="<div class=\"monitor-grid\"><div class=\"monitor-card\"><b>CPU</b><strong id=\"mcpu\">0%</strong><div class=\"stat-bar\"><i></i></div></div><div class=\"monitor-card\"><b>MEMORY</b><strong id=\"mmem\">0%</strong><div class=\"stat-bar\"><i></i></div></div><div class=\"monitor-card\"><b>DISK</b><strong>42%</strong><div class=\"stat-bar\"><i style=\"width:42%\"></i></div></div><div class=\"monitor-card\"><b>NETWORK</b><strong id=\"mnet\">IDLE</strong></div></div>";const tick=()=>{const c=8+Math.floor(Math.random()*75),m=Math.min(95,30+state.windows.size*8);$("#mcpu",body).textContent=c+"%";$("#mmem",body).textContent=m+"%";$(".stat-bar i",body)[0].style.width=c+"%";$(".stat-bar i",body)[1].style.width=m+"%";$("#mnet",body).textContent=(Math.random()*4).toFixed(1)+" MB/s"};tick();setInterval(tick,1200)}
function notes5(body){body.innerHTML="<div class=\"notes5\"><aside id=\"noteList\"></aside><section><input id=\"noteTitle\" placeholder=\"Note title\"><textarea id=\"noteText\" class=\"editor\"></textarea><button class=\"tool-btn\" id=\"noteSave\">SAVE</button></section></div>";const list=$("#noteList",body);const render=()=>{list.innerHTML=V5.notes.map((n,i)=>"<button class=\"note-item\" data-i=\""+i+"\">"+esc(n.title)+"</button>").join("")};render();$("#noteSave",body).onclick=()=>{V5.notes.unshift({title:$("#noteTitle",body).value||"Untitled",text:$("#noteText",body).value});v5Save();render();notify("Note saved.")};list.onclick=e=>{const b=e.target.closest("[data-i]");if(b){const n=V5.notes[+b.dataset.i];$("#noteTitle",body).value=n.title;$("#noteText",body).value=n.text}}}
function calendar5(body){const d=new Date();body.innerHTML="<div class=\"calendar-head\"><button id=\"calPrev\">‹</button><h2 id=\"calMonth\"></h2><button id=\"calNext\">›</button></div><div class=\"calendar-grid\" id=\"calGrid\"></div>";const render=()=>{const y=d.getFullYear(),m=d.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();$("#calMonth",body).textContent=d.toLocaleString(undefined,{month:"long",year:"numeric"});$("#calGrid",body).innerHTML=["S","M","T","W","T","F","S"].map(x=>"<b>"+x+"</b>").join("")+Array(first).fill("<span></span>").join("")+Array.from({length:days},(_,i)=>"<button>"+(i+1)+"</button>").join("")};$("#calPrev",body).onclick=()=>{d.setMonth(d.getMonth()-1);render()};$("#calNext",body).onclick=()=>{d.setMonth(d.getMonth()+1);render()};render()}
function devtools5(body){body.innerHTML="<div class=\"card-grid\"><button class=\"tool-btn\" id=\"dvStorage\">STORAGE</button><button class=\"tool-btn\" id=\"dvWindows\">WINDOWS</button><button class=\"tool-btn\" id=\"dvEvents\">EVENTS</button></div><pre class=\"terminal\" id=\"dvOut\">HKO DEVTOOLS READY</pre>";$("#dvStorage",body).onclick=()=>$("#dvOut",body).textContent=Object.keys(localStorage).sort().join("\n");$("#dvWindows",body).onclick=()=>$("#dvOut",body).textContent=[...state.windows.keys()].join("\n")||"No windows";$("#dvEvents",body).onclick=()=>$("#dvOut",body).textContent="Kernel ready\nFilesystem mounted\nWindow manager online\nNotification bus online"}
Object.assign(views,{files:files5,terminal:terminal5,browser:browser5,monitor:monitor5,notes:notes5,calendar:calendar5,devtools:devtools5});
apps.push(["notes","HKO Notes","Local notes"],["calendar","HKO Calendar","Calendar"],["monitor","System Monitor","Live system"],["devtools","Developer Console","OS inspection"]);
function initPhase5(){ensureHome();const desktop=$("#desktop");if(desktop&&!$("#desktopWidget")){const w=document.createElement("div");w.id="desktopWidget";w.innerHTML="<b>HKO 5.0</b><strong id=\"widgetTime\">--:--</strong><small>LOCAL • "+esc(accountUser())+"</small>";desktop.appendChild(w);setInterval(()=>{$("#widgetTime").textContent=now()},1000)};document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="t"){e.preventDefault();openApp("terminal")}if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="f"){e.preventDefault();openApp("files")}if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="b"){e.preventDefault();openApp("browser")}if(e.ctrlKey&&e.altKey&&e.key.toLowerCase()==="c"){e.preventDefault();openApp("code")}if(e.ctrlKey&&e.shiftKey&&e.key==="Escape"){e.preventDefault();openApp("task")}if(e.altKey&&e.key==="Tab"){e.preventDefault();const ids=[...state.windows.keys()];if(ids.length)openApp(ids[(ids.indexOf([...state.windows.keys()].at(-1))+1)%ids.length])}});notify("HindhoklaOS 5.0 ready.")}
const oldRenderApp=renderApp;renderApp=function(id,body){if(views[id])views[id](body);else oldRenderApp(id,body)};function init() {
  initPhase5();
  updateClock();
  setInterval(updateClock, 1000);
  setInterval(updateSystemStats, 1500);
  renderDesktopIcons();
  renderPinned();
  renderAppList();
  renderNotifications();
  applySettings();

  $$(".quick-card").forEach(card => card.onclick = () => toggleControl(card.dataset.toggle));

  $("#setupButton").onclick = createLocalAccount;
  $("#setupPassword").oninput = updatePasswordMeter;
  $("#setupPasswordConfirm").oninput = updatePasswordMeter;
  $("#loginButton").onclick = loginLocalAccount;
  $("#loginPassword").addEventListener("keydown", e => {
    if (e.key === "Enter") loginLocalAccount();
  });
  $("#switchUserButton").onclick = resetLocalAccount;

  $("#startButton").onclick = () => {
    $("#startMenu")?.classList.toggle("hidden");
    $("#quickPanel")?.classList.add("hidden");
    $("#notificationCenter")?.classList.add("hidden");
  };

  $("#notificationButton").onclick = () => {
    $("#notificationCenter")?.classList.toggle("hidden");
    $("#quickPanel")?.classList.add("hidden");
    renderNotifications();
  };

  $("#clockButton").onclick = () => {
    $("#quickPanel")?.classList.toggle("hidden");
    $("#startMenu")?.classList.add("hidden");
    $("#notificationCenter")?.classList.add("hidden");
  };

  $("#appSearch").oninput = renderAppList;
  $("#clearNotifications").onclick = () => { state.notifications = []; renderNotifications(); };
  $("#shutdownButton").onclick = () => location.reload();

  document.addEventListener("keydown", e => {
    if (e.code === "Space" && !$("#bootScreen")?.classList.contains("hidden")) {
      e.preventDefault();
      state.fastBoot = true;
      startScrolling();
    }
  });

  document.addEventListener("click", e => {
    const menu = $("#startMenu"), start = $("#startButton");
    if (menu && start && !menu.contains(e.target) && !start.contains(e.target)) menu.classList.add("hidden");
  });
}

function showFatalError(error) {
  console.error("HindhoklaOS startup error:", error);
  const hint = $("#bootHint");
  if (hint) {
    hint.textContent = "BOOT ERROR • " + (error?.message || "Unknown startup error");
    hint.style.color = "#ff6f6f";
  }
  setTimeout(() => {
    $("#bootScreen")?.classList.add("hidden");
    showAuthScreen();
  }, 1200);
}

async function startSystem() {
  try {
    init();
    await boot();
  } catch (error) {
    showFatalError(error);
  }
}

window.addEventListener("error", event => {
  if ($("#bootScreen") && !$("#bootScreen").classList.contains("hidden")) showFatalError(event.error || new Error(event.message || "Unknown error"));
});

window.addEventListener("unhandledrejection", event => {
  if ($("#bootScreen") && !$("#bootScreen").classList.contains("hidden")) showFatalError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSystem, { once: true });
} else {
  startSystem();
}
})();