# HindhoklaOS 5.0

HindhoklaOS is a browser-based simulated operating system built with plain HTML, CSS and JavaScript. No backend and no Base44.

## 5.0 Phase 0 • Initial Setup
- First-run Initial Setup instead of a hard-coded vihaan account
- Choose a local username on first launch
- Create and confirm a password
- Password strength indicator
- SHA-256 password hashing through the browser Web Crypto API
- Password-protected login screen
- Five-attempt login protection with a short lockout
- Reset Local Account flow returns the system to Initial Setup
- User-specific virtual home path
- Account data stays local to the browser; no server credentials are used

## 5.0 Phase 1–12 build
- Phase 1: upgraded desktop, taskbar and virtual window workflow
- Phase 2: expanded virtual filesystem with Trash, search and folders
- Phase 3: Terminal 2.0 with history, tab completion and filesystem commands
- Phase 4: Browser with virtual HKO pages, bookmarks and history
- Phase 5: Code/Files workflow and shared virtual filesystem
- Phase 6: Control Center, themes, wallpaper and keyboard shortcuts
- Phase 7: Notifications, recent activity and system monitoring
- Phase 8: App Store foundation and installable local applications
- Phase 9: Notes and Calendar productivity apps
- Phase 10: Developer Console and simulated process/system inspection
- Phase 11: persistence, recovery-oriented local storage and responsive UI polish
- Phase 12: integrated release polish, shortcuts, widgets and Easter-egg-ready architecture

## 5.0 foundation
- 5–10 second secure boot
- Spacebar boot-log scrolling and accelerated boot
- Virtual filesystem and local persistence
- Desktop, taskbar, launcher and window manager
- Terminal, Files, Browser, Code Studio, Task Manager and system tools
- Neon/ice themes and glass-style interface

## Run
Open index.html in a browser, or deploy the repository to a static host such as Netlify.

## Architecture
Everything is local to the browser. The filesystem, settings and local account metadata use localStorage. Password verification uses a browser-side SHA-256 hash. The network, browser, kernel and hardware are intentionally simulated.

## Important
HindhoklaOS is a simulation, not a real operating system. Local account protection is designed for the simulated environment and should not be treated as protection for real-world secrets.