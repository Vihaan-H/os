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