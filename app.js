(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fallbackFS={
"/home/vihaan/readme.txt":"Welcome to HindhoklaOS 3.0.\nThis is your local virtual system.",
"/home/vihaan/notes.txt":"HindhoklaOS 3.0 notes",
"/projects/hello/index.html":"<h1>Hello from HindhoklaOS</h1>",
"/projects/hello/style.css":"body { font-family: sans-serif; }",
"/system/kernel.log":"HKO kernel initialized successfully."
};
const defaultSettings={theme:"neon",grid:true,compact:false,sound:false};
function safeLoad(k,f){try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch{return f}}
function safeSave(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const state={fs:safeLoad("hko_fs_30",{...fallbackFS}),settings:{...defaultSettings,...safeLoad("hko_settings_30",{})},windows:new Map(),z:10,notifications:[],bootStart:performance.now(),scrolling:false,bootStarted:false,fastBoot:false};
const apps=[
["files","Files","Virtual filesystem"],["terminal","Terminal","Command shell"],["browser","Browser","Hindhokla web"],["code","Code Studio","Edit files"],
["debug","Debug Detective","Find problems"],["network","Network Lab","Virtual network"],["packet","Packet Journey","Trace a packet"],["ui","UI Archaeologist","Inspect interfaces"],
["museum","Internet Museum","Web history"],["software","Software Museum","Software history"],["osmuseum","OS Museum","OS history"],["escape","Escape Room","Puzzle environment"],
["git","Git Visualizer","Commit graph"],["company","Company Simulator","Build a company"],["settings","Settings","System preferences"],["task","Task Manager","Processes"],
["store","App Store","Virtual software"],["paint","Paint","Pixel canvas"],["calculator","Calculator","Calculator"],["media","Media Player","Local media"],["clock","Clock","Time and date"]
];
const pinned=["files","terminal","code","task","settings","network"];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const now=()=>new Date().toLocaleTimeString([],{hour12:false});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function mark(id,t="OK"){const e=$("#"+id);if(e){e.textContent=t;e.classList.toggle("ok",["OK","READY","PASS"].includes(t))}}
function progress(v){const p=Math.max(0,Math.min(100,v));const e=$("#hardwareBar");if(e)e.style.width=p+"%";const t=$("#bootProgressText");if(t)t.textContent=p+"%"}
function log(msg,cls=""){const e=$("#kernelLog");if(!e)return;const line=document.createElement("div");line.className="log-line "+cls;line.innerHTML='<span class="log-time">['+now()+']</span> '+esc(msg);e.appendChild(line);if(state.scrolling)e.scrollTop=e.scrollHeight}
function startScrolling(){state.scrolling=true;const l=$("#kernelLog");if(l)l.scrollTop=l.scrollHeight;const m=$("#scrollMode");if(m)m.textContent="SPACE-SCROLL ACTIVE";const h=$("#bootHint");if(h)h.textContent="SPACE • accelerate boot • log scrolling active"}
window.addEventListener("keydown",e=>{if(e.code==="Space"&& !$("#bootScreen").classList.contains("hidden")){e.preventDefault();startScrolling();state.fastBoot=true}});
window.addEventListener("error",e=>{const h=$("#bootHint");if(h){h.textContent="BOOT ERROR • "+(e.message||"Unknown error");h.style.color="#ff6f6f"}});
async function boot(){
 if(state.bootStarted)return;state.bootStarted=true;
 const steps=[
 ["log","HKO kernel 3.0 initializing...",360],["hardware","Probing virtual CPU...","cpuCheck",480],["hardware","Detecting memory map...","memoryCheck",430],
 ["hardware","Negotiating virtual display bus...","displayCheck",430],["hardware","Registering keyboard input...","inputCheck",380],["log","Hardware detection complete.",300],
 ["fs","Mounting root volume...","fsRoot",470],["fs","Checking /home/vihaan...","fsHome",420],["fs","Running filesystem integrity scan...","fsIntegrity",470],
 ["log","Filesystem checks passed.",300],["service","Starting window manager...","svcWindow",430],["service","Starting application manager...","svcApps",430],
 ["service","Starting notification bus...","svcNotify",390],["service","Starting power manager...","svcPower",360],["log","Loading desktop session...",350],
 ["log","Secure boot signature verified.","",430,"ok"],["log","HindhoklaOS kernel is ready.","",400,"ok"]
 ];
 const total=steps.reduce((a,s)=>a+s[2],0);let elapsed=0;
 for(const s of steps){
   log(s[1],s[4]||"");await sleep(state.fastBoot?80:s[2]);elapsed+=s[2];
   progress(Math.round(elapsed/total*100));if(s[3])mark(s[3],"OK");
   if(s[0]==="hardware"&&elapsed/total>.2)$("#hardwareStatus").textContent="READY";
   if(state.fastBoot&&elapsed>total*.35)break;
 }
 if(state.fastBoot){log("SPACE detected: accelerating remaining boot sequence.","ok");["cpuCheck","memoryCheck","displayCheck","inputCheck","fsRoot","fsHome","fsIntegrity","svcWindow","svcApps","svcNotify","svcPower"].forEach(x=>mark(x,"OK"));progress(100);await sleep(300)}
 $("#hardwareStatus").textContent="READY";$("#bootState").textContent="HKO KERNEL • READY";$("#bootHint").textContent="BOOT COMPLETE • Launching login";await sleep(650);
 $("#bootScreen").classList.add("hidden");$("#loginScreen").classList.remove("hidden");
}
function saveFS(){safeSave("hko_fs_30",state.fs)}
function notify(msg){
 state.notifications.unshift({msg,time:now()});state.notifications=state.notifications.slice(0,20);renderNotifications();
 const a=$("#notificationArea");if(!a)return;const t=document.createElement("div");t.className="toast";t.textContent=msg;a.appendChild(t);setTimeout(()=>t.remove(),3000);
}
function renderNotifications(){const l=$("#notificationList");if(!l)return;l.innerHTML=state.notifications.length?state.notifications.map(n=>'<div class="notification-item">'+esc(n.msg)+'<time>'+esc(n.time)+'</time></div>').join(""):'<div class="muted" style="padding:15px 0">No notifications.</div>'}
function iconLetter(n){return n[0].toUpperCase()}
function init(){
 updateClock();setInterval(updateClock,1000);renderDesktopIcons();renderPinned();renderAppList();renderNotifications();initControls();
 $("#loginButton").onclick=()=>{$("#loginScreen").classList.add("hidden");$("#desktop").classList.remove("hidden");notify("Welcome back, vihaan.");openApp("files")};
 $("#startButton").onclick=()=>{$("#startMenu").classList.toggle("hidden");$("#quickPanel").classList.add("hidden");$("#notificationCenter").classList.add("hidden")};
 $("#notificationButton").onclick=()=>{$("#notificationCenter").classList.toggle("hidden");$("#quickPanel").classList.add("hidden");renderNotifications()};
 $("#clockButton").onclick=()=>{$("#quickPanel").classList.toggle("hidden");$("#startMenu").classList.add("hidden");$("#notificationCenter").classList.add("hidden")};
 $("#appSearch").oninput=renderAppList;
 $("#clearNotifications").onclick=()=>{state.notifications=[];renderNotifications()};
 $("#shutdownButton").onclick=()=>location.reload();
 document.addEventListener("click",e=>{if(!$("#startMenu").contains(e.target)&&!$("#startButton").contains(e.target))$("#startMenu").classList.add("hidden")});
 setInterval(updateSystemStats,1500);updateSystemStats();
}
function updateClock(){const d=new Date(),time=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});if($("#clockButton"))$("#clockButton").textContent=time;if($("#bootClock"))$("#bootClock").textContent=d.toLocaleTimeString([],{hour12:false});if($("#panelClock"))$("#panelClock").textContent=time}
function renderDesktopIcons(){const h=$("#desktopIcons");h.innerHTML="";apps.slice(0,8).forEach(a=>{const b=document.createElement("button");b.className="desktop-icon";b.innerHTML='<div class="icon">'+iconLetter(a[1])+'</div><span>'+esc(a[1])+'</span>';b.onclick=()=>openApp(a[0]);h.appendChild(b)})}
function renderPinned(){const h=$("#pinnedApps");h.innerHTML="";pinned.forEach(id=>{const a=apps.find(x=>x[0]===id);const b=document.createElement("button");b.className="pinned-app";b.innerHTML='<b>'+iconLetter(a[1])+'</b><small>'+esc(a[1])+'</small>';b.onclick=()=>{$("#startMenu").classList.add("hidden");openApp(id)};h.appendChild(b)})}
function renderAppList(){const h=$("#appList"),q=($("#appSearch").value||"").toLowerCase();h.innerHTML="";apps.filter(a=>a[1].toLowerCase().includes(q)||a[2].toLowerCase().includes(q)).forEach(a=>{const b=document.createElement("div");b.className="app-entry";b.innerHTML='<div class="app-letter">'+iconLetter(a[1])+'</div><div><b>'+esc(a[1])+'</b><small>'+esc(a[2])+'</small></div>';b.onclick=()=>{$("#startMenu").classList.add("hidden");openApp(a[0])};h.appendChild(b)})}
function initControls(){$$(".quick-card").forEach(b=>b.onclick=()=>toggleControl(b.dataset.toggle));applySettings()}
function toggleControl(k){
 if(k==="grid"){state.settings.grid=!state.settings.grid;$("#wallpaper").classList.toggle("no-grid",!state.settings.grid)}
 if(k==="compact"){state.settings.compact=!state.settings.compact;document.body.classList.toggle("compact",state.settings.compact)}
 if(k==="sound"){state.settings.sound=!state.settings.sound}
 if(k==="theme"){state.settings.theme=state.settings.theme==="neon"?"ice":"neon";document.documentElement.style.setProperty("--green",state.settings.theme==="ice"?"#78e8ff":"#8dff70")}
 safeSave("hko_settings_30",state.settings);applySettings();notify("Control center updated.")
}
function applySettings(){const s=state.settings;$("#wallpaper").classList.toggle("no-grid",!s.grid);document.body.classList.toggle("compact",s.compact);$$(".quick-card").forEach(b=>b.classList.toggle("active",(b.dataset.toggle==="grid"&&s.grid)||(b.dataset.toggle==="compact"&&s.compact)||(b.dataset.toggle==="sound"&&s.sound)||(b.dataset.toggle==="theme"&&s.theme==="neon")))}
function updateSystemStats(){const cpu=8+Math.floor(Math.random()*18),ram=320+Math.floor(Math.random()*90);if($("#quickCpu"))$("#quickCpu").textContent=cpu+"%";if($("#quickRam"))$("#quickRam").textContent=ram+" MB";if($("#quickUptime"))$("#quickUptime").textContent=Math.floor((performance.now()-state.bootStart)/60000)+":"+String(Math.floor((performance.now()-state.bootStart)/1000)%60).padStart(2,"0")}
function openApp(id){
 if(state.windows.has(id)){const w=state.windows.get(id);w.classList.remove("minimized");w.style.zIndex=++state.z;updateTaskbar();return}
 const a=apps.find(x=>x[0]===id);if(!a)return;const w=document.createElement("section");w.className="window";w.style.zIndex=++state.z;w.dataset.app=id;
 w.innerHTML='<div class="titlebar"><div class="title">'+esc(a[1])+'</div><span class="window-state">LIVE</span><button class="minimize">−</button><button class="close">×</button></div><div class="window-body"></div>';
 $("#windows").appendChild(w);state.windows.set(id,w);w.querySelector(".close").onclick=()=>{w.remove();state.windows.delete(id);updateTaskbar()};w.querySelector(".minimize").onclick=()=>{w.classList.add("minimized");updateTaskbar()};w.addEventListener("mousedown",()=>{w.style.zIndex=++state.z;updateTaskbar()});makeDraggable(w,w.querySelector(".titlebar"));renderApp(id,w.querySelector(".window-body"));updateTaskbar()
}
function updateTaskbar(){const h=$("#taskApps");h.innerHTML="";state.windows.forEach((w,id)=>{const a=apps.find(x=>x[0]===id),b=document.createElement("button");b.className="task-app "+(!w.classList.contains("minimized")?"active":"");b.textContent=a[1];b.onclick=()=>{w.classList.remove("minimized");w.style.zIndex=++state.z;updateTaskbar()};h.appendChild(b)})}
function makeDraggable(w,bar){let d=false,ox=0,oy=0;bar.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;d=true;ox=e.clientX-w.offsetLeft;oy=e.clientY-w.offsetTop;bar.setPointerCapture(e.pointerId)});bar.addEventListener("pointermove",e=>{if(!d)return;w.style.left=Math.max(0,Math.min(innerWidth-w.offsetWidth,e.clientX-ox))+"px";w.style.top=Math.max(0,Math.min(innerHeight-85,e.clientY-oy))+"px"});bar.addEventListener("pointerup",()=>d=false)}
const view={files:filesView,terminal:terminalView,browser:browserView,code:codeView,debug:debugView,network:networkView,packet:packetView,ui:uiView,museum:museumView,software:softwareView,osmuseum:osMuseumView,escape:escapeView,git:gitView,company:companyView,settings:settingsView,task:taskView,store:storeView,paint:paintView,calculator:calculatorView,media:mediaView,clock:clockView};
function renderApp(id,b){(view[id]||(()=>b.textContent="Application unavailable."))(b)}
function filesView(b){
 b.innerHTML='<div class="app-toolbar"><button class="tool-btn" id="newFile">New file</button><button class="tool-btn" id="saveFile">Save</button><button class="tool-btn" id="deleteFile">Delete</button><span class="muted" id="filePath">Select a file</span></div><div class="file-list" id="fileList"></div><textarea class="editor" id="fileEditor" placeholder="Select a file to edit..."></textarea>';
 const list=$("#fileList",b),ed=$("#fileEditor",b),path=$("#filePath",b);let cur=null;
 function render(){list.innerHTML="";Object.keys(state.fs).sort().forEach(p=>{const d=document.createElement("div");d.className="file-item";d.innerHTML='<span>'+esc(p)+'</span><span class="muted">'+state.fs[p].length+' chars</span>';d.onclick=()=>{cur=p;path.textContent=p;ed.value=state.fs[p]};list.appendChild(d)})}render();
 $("#saveFile",b).onclick=()=>{if(cur){state.fs[cur]=ed.value;saveFS();notify("File saved.")}};$("#deleteFile",b).onclick=()=>{if(cur&&confirm("Delete "+cur+"?")){delete state.fs[cur];cur=null;ed.value="";path.textContent="Select a file";saveFS();render()}};$("#newFile",b).onclick=()=>{const p=prompt("Virtual path:","/home/vihaan/new.txt");if(p){state.fs[p]="";saveFS();render()}}
}
function terminalView(b){
 b.innerHTML='<pre class="terminal" id="termOut"></pre><input class="terminal-input" id="termInput" placeholder="hko@vihaan:~$ " autocomplete="off">';const out=$("#termOut",b),inpt=$("#termInput",b),print=x=>{out.textContent+=x+"\n";out.scrollTop=out.scrollHeight};print("HindhoklaOS Terminal 3.0");print("Type help for commands.");inpt.focus();
 inpt.onkeydown=e=>{if(e.key!=="Enter")return;const raw=inpt.value.trim();inpt.value="";print("hko@vihaan:~$ "+raw);const [c,...args]=raw.split(" "),arg=args.join(" ");switch(c){
 case"help":print("help clear ls cat date whoami sysinfo open mkdir touch rm echo reboot");break;case"clear":out.textContent="";break;case"ls":Object.keys(state.fs).forEach(p=>print(p));break;case"cat":print(state.fs[arg]??"File not found.");break;case"date":print(new Date().toString());break;case"whoami":print("vihaan");break;case"sysinfo":print("HindhoklaOS 3.0 | virtual kernel | "+state.windows.size+" windows");break;case"open":if(arg&&apps.some(a=>a[0]===arg)){openApp(arg)}else print("Usage: open <app-id>");break;case"mkdir":print("Directory containers are represented by path prefixes in the virtual filesystem.");break;case"touch":if(arg){state.fs[arg]="";saveFS();print("Created "+arg)}break;case"rm":if(Object.prototype.hasOwnProperty.call(state.fs,arg)){delete state.fs[arg];saveFS();print("Removed "+arg)}else print("File not found.");break;case"echo":print(arg);break;case"reboot":location.reload();break;default:if(c)print("Command not found. Type help.")}}
}
function browserView(b){b.innerHTML='<div class="app-toolbar"><input id="url" style="flex:1;background:#080e09;border:1px solid #1c3820;color:#cfe4d0;padding:8px" value="hko://home"><button class="tool-btn" id="go">GO</button></div><div id="page" class="mini-card"></div>';const u=$("#url",b),p=$("#page",b);const go=()=>{const x=u.value.trim();p.innerHTML=x==="hko://system"?'<b>System</b><p class="muted">Kernel: HKO 3.0<br>Session: vihaan<br>Filesystem: mounted<br>Services: running</p>':x==="hko://apps"?'<b>Applications</b><p class="muted">'+apps.map(a=>esc(a[1])).join(" • ")+"</p>":'<b>Hindhokla Home</b><p class="muted">Welcome to the local virtual web.</p>'};$("#go",b).onclick=go;go()}
function codeView(b){b.innerHTML='<div class="app-toolbar"><select id="codeFile"></select><button class="tool-btn" id="saveCode">Save</button><button class="tool-btn" id="runCode">Run</button></div><textarea class="editor" id="codeEditor"></textarea><div id="codeOutput" class="muted"></div>';const s=$("#codeFile",b),e=$("#codeEditor",b),o=$("#codeOutput",b);Object.keys(state.fs).filter(p=>/\.(html|css|js|txt)$/.test(p)).forEach(p=>{const x=document.createElement("option");x.value=p;x.textContent=p;s.appendChild(x)});const load=()=>e.value=state.fs[s.value]||"";s.onchange=load;load();$("#saveCode",b).onclick=()=>{state.fs[s.value]=e.value;saveFS();notify("Code saved.")};$("#runCode",b).onclick=()=>{o.textContent="Executed "+s.value+" in the virtual workspace.";notify("Code Studio run complete.")}
}
function debugView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>'+Object.keys(state.fs).length+'</b><small>files scanned</small></div><div class="mini-card"><b>0</b><small>boot blockers</small></div><div class="mini-card"><b>PASS</b><small>integrity</small></div></div><p class="muted">Debug Detective scans the virtual filesystem and current session state.</p>'}
function networkView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>LOOP</b><small>virtual adapter</small></div><div class="mini-card"><b>127.0.0.1</b><small>local endpoint</small></div><div class="mini-card"><b>ONLINE</b><small>simulated network</small></div></div><button class="tool-btn" id="ping" style="margin-top:12px">Ping local host</button><pre class="terminal" id="pingOut"></pre>';$("#ping",b).onclick=()=>{$("#pingOut",b).textContent="PING 127.0.0.1\n64 bytes • 1ms\n64 bytes • 1ms\n64 bytes • 2ms\n3 packets transmitted, 3 received, 0% loss."}}
function packetView(b){b.innerHTML='<div class="app-toolbar"><button class="tool-btn" id="trace">Trace packet</button></div><pre class="terminal" id="traceOut">Ready.</pre>';$("#trace",b).onclick=()=>$("#traceOut",b).textContent="Packet created\n  ↓\nVirtual NIC\n  ↓\nHKO Router\n  ↓\nDestination\n\nTrace complete."}
function uiView(b){b.innerHTML='<div class="mini-card"><b>UI ARCHAEOLOGIST</b><p class="muted">Inspect interface structure, spacing, controls and interaction states. This 2.0 build uses the same glass/terminal design language throughout the system.</p></div>'}
function museumView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>WEB 1.0</b><small>Static pages and guestbooks</small></div><div class="mini-card"><b>SEARCH</b><small>Directories before modern search</small></div><div class="mini-card"><b>WEB APPS</b><small>The browser became the platform</small></div></div>'}
function softwareView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>1980s</b><small>Desktop software</small></div><div class="mini-card"><b>1990s</b><small>Shareware and boxed apps</small></div><div class="mini-card"><b>2000s</b><small>Web applications</small></div></div>'}
function osMuseumView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>CLI</b><small>Command-first systems</small></div><div class="mini-card"><b>GUI</b><small>Windows, icons and menus</small></div><div class="mini-card"><b>CONNECTED</b><small>Operating systems became networked</small></div></div>'}
function escapeView(b){b.innerHTML='<div class="mini-card"><b>ROOM 01</b><p class="muted">A locked terminal displays: 2 + 3 = ?</p><input id="answer" style="background:#080e09;border:1px solid #1c3820;color:#cfe4d0;padding:8px"><button class="tool-btn" id="solve">Submit</button><p id="escapeMsg" class="muted"></p></div>';$("#solve",b).onclick=()=>$("#escapeMsg",b).textContent=$("#answer",b).value.trim()==="5"?"LOCK OPEN • NEXT ROOM UNLOCKED":"ACCESS DENIED"}
function gitView(b){b.innerHTML='<div class="mini-card"><b>main</b><p class="muted">● Initial commit<br>│<br>● Kernel boot<br>│<br>● Desktop services<br>│<br>● 3.0 release</p></div>'}
function companyView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b id="cash">$0</b><small>virtual cash</small></div><div class="mini-card"><b id="customers">0</b><small>customers</small></div><div class="mini-card"><b>IDEA</b><small>company stage</small></div></div><button class="tool-btn" id="launch" style="margin-top:12px">Launch product</button>';let cash=0,c=0;$("#launch",b).onclick=()=>{cash+=250;c+=5;$("#cash",b).textContent="$"+cash;$("#customers",b).textContent=c;notify("Product launched into the virtual market.")}}
function settingsView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b>NEON</b><small>theme</small></div><div class="mini-card"><b>LOCAL</b><small>storage</small></div><div class="mini-card"><b>2.0</b><small>release</small></div></div><button class="tool-btn" id="resetFS" style="margin-top:12px">Reset virtual filesystem</button><button class="tool-btn" id="resetSettings" style="margin:12px 0 0 6px">Reset settings</button>';$("#resetFS",b).onclick=()=>{if(confirm("Reset virtual filesystem?")){state.fs={...fallbackFS};saveFS();notify("Filesystem reset.")}};$("#resetSettings",b).onclick=()=>{state.settings={...defaultSettings};safeSave("hko_settings_30",state.settings);applySettings();notify("Settings reset.")}}
function taskView(b){b.innerHTML='<div class="card-grid"><div class="mini-card"><b id="twindows">'+state.windows.size+'</b><small>open windows</small></div><div class="mini-card"><b>READY</b><small>window manager</small></div><div class="mini-card"><b>2.0</b><small>kernel</small></div></div><p class="muted">Taskbar entries mirror the current window manager state.</p>'}
function storeView(b){b.innerHTML='<div class="card-grid">'+apps.slice(0,9).map(a=>'<div class="mini-card"><b>'+iconLetter(a[1])+'</b><small>'+esc(a[1])+'</small></div>').join("")+"</div>"}
function paintView(b){b.innerHTML='<canvas class="paint" width="900" height="520"></canvas><div class="app-toolbar" style="margin-top:8px"><button class="tool-btn" id="clearPaint">Clear</button></div>';const c=$("canvas",b),ctx=c.getContext("2d");ctx.fillStyle="#030503";ctx.fillRect(0,0,c.width,c.height);let d=false;c.onpointerdown=e=>{d=true;draw(e)};c.onpointerup=()=>d=false;c.onpointerleave=()=>d=false;c.onpointermove=e=>{if(d)draw(e)};function draw(e){const r=c.getBoundingClientRect();ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--green");ctx.beginPath();ctx.arc((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height,3,0,Math.PI*2);ctx.fill()}$("#clearPaint",b).onclick=()=>{ctx.fillStyle="#030503";ctx.fillRect(0,0,c.width,c.height)}}
function calculatorView(b){b.innerHTML='<div class="calc"><div class="calc-display" id="calcDisplay">0</div><div class="calc-grid">'+["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"].map(x=>"<button>"+x+"</button>").join("")+"</div></div>";const d=$("#calcDisplay",b);let expr="";$$("button",b).forEach(x=>x.onclick=()=>{const v=x.textContent;if(v==="C")expr="";else if(v==="="){try{expr=String(Function("return "+expr)())}catch{expr="ERR"}}else expr+=v;d.textContent=expr||"0"})}
function mediaView(b){b.innerHTML='<div class="mini-card"><b>MEDIA PLAYER</b><p class="muted">Local playback surface ready.</p><button class="tool-btn" id="play">▶ Play</button><button class="tool-btn" id="pause">Ⅱ Pause</button><p id="mediaStatus" class="muted">Stopped</p></div>';$("#play",b).onclick=()=>$("#mediaStatus",b).textContent="Playing";$("#pause",b).onclick=()=>$("#mediaStatus",b).textContent="Paused"}
function clockView(b){b.innerHTML='<div class="mini-card" style="text-align:center"><b id="bigClock">--:--:--</b><small id="bigDate"></small></div>';const tick=()=>{const d=new Date();$("#bigClock",b).textContent=d.toLocaleTimeString([],{hour12:false});$("#bigDate",b).textContent=d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})};tick();setInterval(tick,1000)}
function startSystem(){try{init();boot()}catch(err){console.error(err);const h=$("#bootHint");if(h){h.textContent="BOOT ERROR • "+err.message;h.style.color="#ff6f6f"}setTimeout(()=>{const b=$("#bootScreen"),l=$("#loginScreen");if(b)b.classList.add("hidden");if(l)l.classList.remove("hidden")},1200)}}\nif(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startSystem,{once:true});else startSystem();
})();