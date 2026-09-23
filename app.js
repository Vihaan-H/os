(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const fallbackFS = {
    "/home/vihaan/readme.txt": "Welcome to HindhoklaOS 1.1.\nYour virtual system is ready.",
    "/projects/hello/index.html": "<h1>Hello from HindhoklaOS</h1>",
    "/projects/hello/style.css": "body { font-family: sans-serif; }",
    "/system/kernel.log": "HKO kernel initialized successfully."
  };

  function safeLoad(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeSave(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  const state = {
    fs: safeLoad("hko_fs_11", fallbackFS),
    settings: safeLoad("hko_settings_11", { theme: "neon", sound: false }),
    windows: new Map(),
    z: 10
  };

  const apps = [
    ["files","Files","Virtual filesystem"],["terminal","Terminal","Command shell"],
    ["browser","Browser","Hindhokla web"],["code","Code Studio","Edit files"],
    ["debug","Debug Detective","Find problems"],["network","Network Lab","Virtual network"],
    ["packet","Packet Journey","Trace a packet"],["ui","UI Archaeologist","Inspect interfaces"],
    ["museum","Internet Museum","Web history"],["software","Software Museum","Software history"],
    ["osmuseum","OS Museum","Operating system history"],["escape","Escape Room","Puzzle environment"],
    ["git","Git Visualizer","Visual commit graph"],["company","Company Simulator","Build a company"],
    ["settings","Settings","System preferences"],["task","Task Manager","Processes and resources"],
    ["store","App Store","Install virtual apps"],["paint","Paint","Pixel canvas"],
    ["calculator","Calculator","Calculator"],["media","Media Player","Local media controls"],
    ["clock","Clock","Time and date"]
  ];

  function now() {
    return new Date().toLocaleTimeString([], {hour12:false});
  }

  function log(msg, cls="") {
    const el = $("#kernelLog");
    if (!el) return;
    const line = document.createElement("div");
    line.className = "log-line";
    line.innerHTML = `<span class="log-time">[${now()}]</span> ${escapeHTML(msg)}`;
    if (cls) line.classList.add(cls);
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function setProgress(id, value) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0,Math.min(100,value))}%`;
  }

  function mark(id, text="OK") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("ok", text === "OK" || text === "READY" || text === "PASS");
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  let bootStarted = false;
  let fastBoot = false;

  async function boot() {
    if (bootStarted) return;
    bootStarted = true;

    const start = performance.now();
    const steps = [
      {type:"log", text:"HKO kernel initializing...", wait:350},
      {type:"hardware", text:"Probing virtual CPU...", check:"cpuCheck", wait:500},
      {type:"hardware", text:"Detecting memory map...", check:"memoryCheck", wait:450},
      {type:"hardware", text:"Initializing virtual display...", check:"displayCheck", wait:400},
      {type:"hardware", text:"Registering keyboard input...", check:"inputCheck", wait:400},
      {type:"log", text:"Hardware detection complete.", wait:350},
      {type:"fs", text:"Mounting root filesystem...", check:"fsRoot", wait:500},
      {type:"fs", text:"Checking /home/vihaan...", check:"fsHome", wait:450},
      {type:"fs", text:"Running filesystem integrity check...", check:"fsIntegrity", wait:500},
      {type:"log", text:"Filesystem checks passed.", wait:350},
      {type:"service", text:"Starting window manager...", check:"svcWindow", wait:450},
      {type:"service", text:"Starting application manager...", check:"svcApps", wait:450},
      {type:"service", text:"Starting notification bus...", check:"svcNotify", wait:450},
      {type:"log", text:"All core services started.", wait:350},
      {type:"log", text:"Secure boot verification passed.", cls:"ok", wait:450},
      {type:"log", text:"HindhoklaOS kernel is ready.", cls:"ok", wait:350}
    ];

    const total = steps.reduce((n,s) => n+s.wait, 0);
    let elapsed = 0;

    for (const step of steps) {
      if (fastBoot) break;
      log(step.text, step.cls || "");
      await sleep(step.wait);
      elapsed += step.wait;
      const percent = Math.round((elapsed / total) * 100);
      setProgress("hardwareBar", percent);
      const p = $("#bootProgressText");
      if (p) p.textContent = `${percent}%`;

      if (step.check) mark(step.check, "OK");
      if (step.type === "hardware") {
        const hs = $("#hardwareStatus");
        if (hs) hs.textContent = percent >= 42 ? "READY" : "SCANNING";
      }
      if (step.type === "fs") {
        setProgress("hardwareBar", Math.max(percent, 55));
      }
    }

    if (fastBoot) {
      log("SPACE detected: accelerating boot sequence...", "ok");
      for (const id of ["cpuCheck","memoryCheck","displayCheck","inputCheck","fsRoot","fsHome","fsIntegrity","svcWindow","svcApps","svcNotify"]) mark(id,"OK");
      setProgress("hardwareBar",100);
      $("#bootProgressText").textContent = "100%";
      await sleep(500);
    }

    const seconds = ((performance.now() - start) / 1000).toFixed(1);
    const status = $("#bootState");
    if (status) status.textContent = `HKO KERNEL • READY IN ${seconds}s`;
    const hs = $("#hardwareStatus");
    if (hs) hs.textContent = "READY";
    const hint = $("#bootHint");
    if (hint) hint.textContent = "BOOT COMPLETE • Launching login";
    await sleep(700);
    $("#bootScreen").classList.add("hidden");
    $("#loginScreen").classList.remove("hidden");
  }

  window.addEventListener("keydown", e => {
    if (e.code === "Space" && !$("#bootScreen").classList.contains("hidden")) {
      e.preventDefault();
      fastBoot = true;
    }
  });

  window.addEventListener("error", e => {
    const hint = $("#bootHint");
    if (hint) {
      hint.textContent = `BOOT ERROR • ${e.message || "Unknown error"}`;
      hint.style.color = "#ff6f6f";
    }
  });

  function saveFS() { safeSave("hko_fs_11", state.fs); }
  function notify(msg) {
    const area = $("#notificationArea");
    if (!area) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    area.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function iconLetter(name) {
    return name[0].toUpperCase();
  }

  function initDesktop() {
    renderDesktopIcons();
    renderAppList();
    updateClock();
    setInterval(updateClock, 1000);
    $("#startButton").onclick = () => $("#startMenu").classList.toggle("hidden");
    $("#clockButton").onclick = () => openApp("clock");
    $("#appSearch").addEventListener("input", renderAppList);
    $("#loginButton").onclick = () => {
      $("#loginScreen").classList.add("hidden");
      $("#desktop").classList.remove("hidden");
      notify("Welcome back, vihaan.");
      openApp("files");
    };
    document.addEventListener("click", e => {
      const menu = $("#startMenu");
      if (!menu.contains(e.target) && !$("#startButton").contains(e.target)) menu.classList.add("hidden");
    });
  }

  function updateClock() {
    const d = new Date();
    const time = d.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
    const full = d.toLocaleTimeString([], {hour12:false});
    if ($("#clockButton")) $("#clockButton").textContent = time;
    if ($("#bootClock")) $("#bootClock").textContent = full;
  }

  function renderDesktopIcons() {
    const host = $("#desktopIcons");
    host.innerHTML = "";
    apps.slice(0,8).forEach(([id,name]) => {
      const b = document.createElement("button");
      b.className = "desktop-icon";
      b.innerHTML = `<div class="icon">${iconLetter(name)}</div><span>${name}</span>`;
      b.onclick = () => openApp(id);
      host.appendChild(b);
    });
  }

  function renderAppList() {
    const host = $("#appList");
    const q = ($("#appSearch").value || "").toLowerCase();
    host.innerHTML = "";
    apps.filter(a => a[1].toLowerCase().includes(q) || a[2].toLowerCase().includes(q)).forEach(([id,name,desc]) => {
      const b = document.createElement("div");
      b.className = "app-entry";
      b.innerHTML = `<div class="app-letter">${iconLetter(name)}</div><div><b>${name}</b><small>${desc}</small></div>`;
      b.onclick = () => { $("#startMenu").classList.add("hidden"); openApp(id); };
      host.appendChild(b);
    });
  }

  function openApp(id) {
    if (state.windows.has(id)) {
      const w = state.windows.get(id);
      w.style.zIndex = ++state.z;
      return;
    }
    const app = apps.find(a => a[0] === id);
    if (!app) return;
    const w = document.createElement("section");
    w.className = "window";
    w.style.zIndex = ++state.z;
    w.dataset.app = id;
    w.innerHTML = `<div class="titlebar"><div class="title">${app[1]}</div><button class="close">×</button></div><div class="window-body"></div>`;
    $("#windows").appendChild(w);
    state.windows.set(id,w);
    w.querySelector(".close").onclick = () => { w.remove(); state.windows.delete(id); };
    w.addEventListener("mousedown", () => w.style.zIndex = ++state.z);
    makeDraggable(w, w.querySelector(".titlebar"));
    renderApp(id, w.querySelector(".window-body"));
  }

  function makeDraggable(win, bar) {
    let dragging=false, ox=0, oy=0;
    bar.addEventListener("pointerdown", e => {
      dragging=true; ox=e.clientX-win.offsetLeft; oy=e.clientY-win.offsetTop;
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", e => {
      if (!dragging) return;
      win.style.left = Math.max(0,Math.min(innerWidth-win.offsetWidth,e.clientX-ox))+"px";
      win.style.top = Math.max(0,Math.min(innerHeight-80,e.clientY-oy))+"px";
    });
    bar.addEventListener("pointerup",()=>dragging=false);
  }

  function renderApp(id, body) {
    const views = {
      files: filesView, terminal: terminalView, browser: browserView, code: codeView,
      debug: debugView, network: networkView, packet: packetView, ui: uiView,
      museum: museumView, software: softwareView, osmuseum: osMuseumView,
      escape: escapeView, git: gitView, company: companyView, settings: settingsView,
      task: taskView, store: storeView, paint: paintView, calculator: calculatorView,
      media: mediaView, clock: clockView
    };
    (views[id] || (() => { body.textContent = "Application unavailable."; }))(body);
  }

  function filesView(body) {
    body.innerHTML = `<div class="app-toolbar"><button class="tool-btn" id="newFile">New file</button><button class="tool-btn" id="saveFile">Save</button><span class="muted" id="filePath">Select a file</span></div><div class="file-list" id="fileList"></div><textarea class="editor" id="fileEditor" placeholder="Select a file to edit..."></textarea>`;
    const list=$("#fileList",body), editor=$("#fileEditor",body), path=$("#filePath",body);
    let current=null;
    function render(){list.innerHTML="";Object.keys(state.fs).sort().forEach(p=>{const d=document.createElement("div");d.className="file-item";d.innerHTML=`<span>${p}</span><span class="muted">${state.fs[p].length} chars</span>`;d.onclick=()=>{current=p;path.textContent=p;editor.value=state.fs[p]};list.appendChild(d)})}
    render();
    $("#saveFile",body).onclick=()=>{if(current){state.fs[current]=editor.value;saveFS();notify("File saved.")}};
    $("#newFile",body).onclick=()=>{const p=prompt("Virtual path:","/home/vihaan/new.txt");if(p){state.fs[p]="";saveFS();render()}};
  }

  function terminalView(body) {
    body.innerHTML=`<pre class="terminal" id="termOut"></pre><input class="terminal-input" id="termInput" placeholder="hko@vihaan:~$ ">`;
    const out=$("#termOut",body), input=$("#termInput",body);
    const print=x=>out.textContent+=x+"\n";
    print("HindhoklaOS Terminal 1.1");
    print("Type help for commands.");
    input.focus();
    input.onkeydown=e=>{if(e.key!=="Enter")return;const cmd=input.value.trim();input.value="";print("hko@vihaan:~$ "+cmd);const [c,...args]=cmd.split(" ");if(c==="help")print("help  clear  ls  cat <path>  date  whoami  sysinfo  open <app>");else if(c==="clear")out.textContent="";else if(c==="ls")Object.keys(state.fs).forEach(p=>print(p));else if(c==="cat")print(state.fs[args.join(" ")]??"File not found.");else if(c==="date")print(new Date().toString());else if(c==="whoami")print("vihaan");else if(c==="sysinfo")print("HindhoklaOS 1.1 | virtual kernel | local session");else if(c==="open"&&args[0])openApp(args.join(" "));else if(c)print("Command not found.")};
  }

  function browserView(body) {
    body.innerHTML=`<div class="app-toolbar"><input id="url" style="flex:1;background:#080e09;border:1px solid #1c3820;color:#cfe4d0;padding:8px" value="hko://home"><button class="tool-btn" id="go">GO</button></div><div id="page" class="mini-card"><b>Hindhokla Browser</b><p class="muted">This is a local simulated browser. Try hko://home, hko://system, or hko://apps.</p></div>`;
    const url=$("#url",body), page=$("#page",body);
    $("#go",body).onclick=()=>{const u=url.value.trim();page.innerHTML=u==="hko://system"?`<b>System</b><p class="muted">Kernel: HKO 1.1<br>Session: vihaan<br>Filesystem: mounted<br>Services: running</p>`:u==="hko://apps"?`<b>Applications</b><p class="muted">${apps.map(a=>a[1]).join(" • ")}</p>`:`<b>Hindhokla Home</b><p class="muted">Welcome to the local virtual web.</p>`};
  }

  function codeView(body) {
    body.innerHTML=`<div class="app-toolbar"><select id="codeFile"></select><button class="tool-btn" id="runCode">Run</button></div><textarea class="editor" id="codeEditor"></textarea><div id="codeOutput" class="muted"></div>`;
    const sel=$("#codeFile",body), ed=$("#codeEditor",body), out=$("#codeOutput",body);
    Object.keys(state.fs).filter(p=>/\.(html|css|js|txt)$/.test(p)).forEach(p=>{const o=document.createElement("option");o.value=p;o.textContent=p;sel.appendChild(o)});
    function load(){ed.value=state.fs[sel.value]||""} sel.onchange=load;load();
    $("#runCode",body).onclick=()=>{out.textContent=`Executed ${sel.value} in virtual workspace.`;notify("Code Studio run complete.")};
  }

  function debugView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>${Object.keys(state.fs).length}</b><small>files scanned</small></div><div class="mini-card"><b>0</b><small>syntax blockers</small></div><div class="mini-card"><b>PASS</b><small>boot integrity</small></div></div><p class="muted">Debug Detective scans the current virtual filesystem and boot state.</p>`}
  function networkView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>LOOP</b><small>virtual adapter</small></div><div class="mini-card"><b>127.0.0.1</b><small>local endpoint</small></div><div class="mini-card"><b>ONLINE</b><small>simulated network</small></div></div>`}
  function packetView(body){body.innerHTML=`<div class="app-toolbar"><button class="tool-btn" id="trace">Trace packet</button></div><pre class="terminal" id="traceOut">Ready.</pre>`;$("#trace",body).onclick=()=>{$("#traceOut",body).textContent="Packet created\n  ↓\nVirtual NIC\n  ↓\nHKO Router\n  ↓\nDestination\n\nTrace complete."}}
  function uiView(body){body.innerHTML=`<div class="mini-card"><b>UI ARCHAEOLOGIST</b><p class="muted">Inspect mode is active. This window demonstrates how interface structure, spacing and interaction states can be analyzed.</p></div>`}
  function museumView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>WEB 1.0</b><small>Static pages and guestbooks</small></div><div class="mini-card"><b>SEARCH</b><small>Directories before modern search</small></div><div class="mini-card"><b>BROWSER</b><small>The interface became the platform</small></div></div>`}
  function softwareView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>1980s</b><small>Desktop software</small></div><div class="mini-card"><b>1990s</b><small>Shareware and boxed apps</small></div><div class="mini-card"><b>2000s</b><small>Web applications</small></div></div>`}
  function osMuseumView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>CLI</b><small>Command-first systems</small></div><div class="mini-card"><b>GUI</b><small>Windows, icons and menus</small></div><div class="mini-card"><b>WEB</b><small>Operating systems became connected</small></div></div>`}
  function escapeView(body){let solved=false;body.innerHTML=`<div class="mini-card"><b>ROOM 01</b><p class="muted">A locked terminal displays: 2 + 3 = ?</p><input id="answer" style="background:#080e09;border:1px solid #1c3820;color:#cfe4d0;padding:8px"><button class="tool-btn" id="solve">Submit</button><p id="escapeMsg" class="muted"></p></div>`;$("#solve",body).onclick=()=>{const a=$("#answer",body).value.trim();if(a==="5"){solved=true;$("#escapeMsg",body).textContent="LOCK OPEN • NEXT ROOM UNLOCKED"}else $("#escapeMsg",body).textContent="ACCESS DENIED"}}
  function gitView(body){body.innerHTML=`<div class="mini-card"><b>main</b><p class="muted">● Initial commit<br>│<br>● Kernel boot<br>│<br>● Desktop services<br>│<br>● 1.1 release</p></div>`}
  function companyView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>$0</b><small>virtual cash</small></div><div class="mini-card"><b>0</b><small>customers</small></div><div class="mini-card"><b>IDEA</b><small>company stage</small></div></div><button class="tool-btn" id="launch" style="margin-top:12px">Launch product</button>`;$("#launch",body).onclick=()=>notify("Company product launched into the virtual market.")}
  function settingsView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>NEON</b><small>current theme</small></div><div class="mini-card"><b>LOCAL</b><small>storage mode</small></div></div><button class="tool-btn" id="clearData" style="margin-top:12px">Reset virtual filesystem</button>`;$("#clearData",body).onclick=()=>{if(confirm("Reset virtual filesystem?")){state.fs={...fallbackFS};saveFS();notify("Filesystem reset.")}}}
  function taskView(body){body.innerHTML=`<div class="card-grid"><div class="mini-card"><b>${state.windows.size}</b><small>open windows</small></div><div class="mini-card"><b>READY</b><small>window manager</small></div><div class="mini-card"><b>1.1</b><small>kernel</small></div></div>`}
  function storeView(body){body.innerHTML=`<div class="card-grid">${apps.slice(0,9).map(a=>`<div class="mini-card"><b>${iconLetter(a[1])}</b><small>${a[1]}</small></div>`).join("")}</div>`}
  function paintView(body){body.innerHTML=`<canvas class="paint" width="900" height="520"></canvas><div class="app-toolbar" style="margin-top:8px"><button class="tool-btn" id="clearPaint">Clear</button></div>`;const c=$("canvas",body),ctx=c.getContext("2d");ctx.fillStyle="#030503";ctx.fillRect(0,0,c.width,c.height);let down=false;c.onpointerdown=e=>{down=true;draw(e)};c.onpointerup=()=>down=false;c.onpointerleave=()=>down=false;c.onpointermove=e=>{if(down)draw(e)};function draw(e){const r=c.getBoundingClientRect();ctx.fillStyle="#8dff70";ctx.beginPath();ctx.arc((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height,3,0,Math.PI*2);ctx.fill()}$("#clearPaint",body).onclick=()=>{ctx.fillStyle="#030503";ctx.fillRect(0,0,c.width,c.height)}}
  function calculatorView(body){body.innerHTML=`<div class="calc"><div class="calc-display" id="calcDisplay">0</div><div class="calc-grid">${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"].map(x=>`<button>${x}</button>`).join("")}</div></div>`;const d=$("#calcDisplay",body);let expr="";$$("button",body).forEach(b=>b.onclick=()=>{const x=b.textContent;if(x==="C")expr="";else if(x==="="){try{expr=String(Function("return "+expr)())}catch{expr="ERR"}}else expr+=x;d.textContent=expr||"0"})}
  function mediaView(body){body.innerHTML=`<div class="mini-card"><b>MEDIA PLAYER</b><p class="muted">Local playback surface ready.</p><button class="tool-btn" id="play">▶ Play</button><button class="tool-btn" id="pause">Ⅱ Pause</button><p id="mediaStatus" class="muted">Stopped</p></div>`;$("#play",body).onclick=()=>$("#mediaStatus",body).textContent="Playing";$("#pause",body).onclick=()=>$("#mediaStatus",body).textContent="Paused"}
  function clockView(body){body.innerHTML=`<div class="mini-card" style="text-align:center"><b id="bigClock">--:--:--</b><small id="bigDate"></small></div>`;function tick(){const d=new Date();$("#bigClock",body).textContent=d.toLocaleTimeString([], {hour12:false});$("#bigDate",body).textContent=d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}tick();setInterval(tick,1000)}

  initDesktop();
  boot();
})();