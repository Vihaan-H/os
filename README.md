# HindhoklaOS 3.0

HindhoklaOS is a browser-based simulated operating system built with plain HTML, CSS and JavaScript. No backend and no Base44.

## 3.0 highlights
- Old-school compact secure boot restored and expanded
- 5–10 second believable boot sequence
- Progressive hardware, filesystem and service checks
- Spacebar boot-log scrolling/acceleration
- Secure virtual login for `vihaan`
- Glassy desktop, draggable/resizable windows and live taskbar
- Control Center with theme, grid, compact UI and SFX toggles
- Notification Center with persistent session notifications
- Virtual filesystem persisted with localStorage
- Stronger Terminal commands: `ls`, `cat`, `touch`, `rm`, `open`, `reboot`, etc.
- Files app now supports create, edit, save and delete
- Code Studio save/run workflow
- Functional network ping simulation
- Functional taskbar, window minimize/restore and app launcher
- Existing museums, games, visual tools and simulators retained

## Run
Open `index.html` in a browser, or use any static server in GitHub Codespaces.

## Architecture
Everything is local to the browser. The filesystem and settings use localStorage. Network, browser, kernel and hardware are intentionally simulated.

## 3.0 boot fix
Startup is guarded against DOM timing errors, storage keys are versioned, and a recovery path opens the login screen if startup throws an exception.
