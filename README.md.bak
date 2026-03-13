# READSX — Sovereign AI Social Media Management Suite

> **Zero-Failure. Absolute Autonomy.**

A high-end, production-grade X/Twitter automation suite with real-time monitoring, AI-powered content intelligence, and stealth browser orchestration.

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js 18+
- A Gemini API key (free): https://aistudio.google.com/app/apikey

### 2. Install
```bash
cd readsx
npm install
npx playwright install chromium
```

### 3. Configure
```bash
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

### 4. Run
```bash
npm run dev
```

Open http://localhost:3000

---

## 🏗️ Architecture

```
readsx/
├── app/
│   ├── page.tsx                    # Main dashboard UI
│   ├── layout.tsx                  # Root layout (Obsidian theme)
│   ├── globals.css                 # Cyber-dark design system
│   └── api/
│       ├── automation/route.ts     # Core automation controller
│       ├── terminal/route.ts       # SSE log streaming
│       ├── screenshot/route.ts     # SSE screenshot streaming
│       ├── trends/route.ts         # Trend aggregation + Gemini synthesis
│       ├── generate/route.ts       # AI content generation
│       ├── session/route.ts        # Session vault management
│       └── health/route.ts         # System metrics
├── components/
│   ├── dashboard/
│   │   ├── LiveTerminal.tsx        # xterm.js terminal with SSE
│   │   ├── HealthMatrix.tsx        # CPU/RAM/Network monitor
│   │   ├── ScreenshotViewer.tsx    # Real-time browser viewport
│   │   └── CommandCenter.tsx       # Automation control panel
│   ├── intelligence/
│   │   ├── TrendScanner.tsx        # Trend display + scanning
│   │   ├── PersonaMatrix.tsx       # AI persona switcher
│   │   └── ContentGenerator.tsx    # Tweet/thread/reply generator
│   └── automation/
│       ├── SessionVault.tsx        # Session management UI
│       └── ManualOverdrive.tsx     # Remote JS injection console
├── lib/
│   ├── automation/
│   │   ├── stealth.ts              # Fingerprint injection + human emulation
│   │   ├── session.ts              # Encrypted session vault
│   │   └── twitter.ts              # All Twitter actions
│   ├── intelligence/
│   │   ├── gemini.ts               # Gemini 2.0 Flash AI layer
│   │   └── trends.ts               # Reddit/GitHub/News scrapers
│   └── store.ts                    # Zustand global state
└── types/index.ts                  # TypeScript definitions
```

---

## 🕵️ Stealth Features

| Feature | Implementation |
|---------|---------------|
| Native Click | `dispatchEvent` (no `page.click()`) |
| Mouse Pathing | Bézier curve interpolation |
| Typing | 150-400ms jitter + backspace simulation |
| Fingerprints | iPhone 15 Pro Max / MacBook Pro M3 |
| WebGL | Vendor/renderer spoofing |
| Canvas | Noise injection |
| AudioContext | Buffer float noise |
| Navigator | Full property override |
| Session | AES-256 encrypted vault |

---

## 🧠 AI Intelligence

### Personas
- **Witty/Sarcastic** — Viral hooks, memes, relatable humor
- **Professional/Analytic** — B2B authority, thought leadership
- **Tech Guru** — Deep-dive coding, AI, system design

### Capabilities
- `generateTweet(topic, tone)` — Single tweet with engagement scoring
- `generateThread(topic, tone, length)` — Multi-tweet threads
- `generateSmartReply(tweet, image, tone)` — Context-aware replies
- `analyzeTweetImage(base64)` — Vision analysis for visual context
- `extractViralHooks(content)` — Pull hooks from any content
- `synthesizeTrends(items, tone)` — Trend-to-hook transformation

---

## 📊 Dashboard Panels

### ⚡ Command Center
Direct automation execution — tweet, reply, like, retweet, follow, scan

### 🧠 Intelligence
Trend Scanner → Content Generator → queue to browser

### 🍪 Session
Browser init, vault save/load, heartbeat, fingerprint selection

### 🔥 Overdrive
Remote JavaScript console with direct browser injection

---

## 🛡️ Self-Healing Protocol

1. **Heartbeat** — checks for Home feed every N minutes
2. **Soft Recovery** — navigate to `/explore` → `/home` before giving up
3. **2FA Detection** — freezes on challenge, captures screenshot, awaits code
4. **Selector Fallback** — multi-selector arrays with priority ordering
5. **Network Resilience** — `net::ERR_ABORTED` fallback navigation

---

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google AI Studio key |
| `SESSION_ENCRYPTION_KEY` | ✅ | AES-256 session encryption |
| `NEWS_API_KEY` | ❌ | NewsAPI.org (falls back to HN) |
| `TELEGRAM_BOT_TOKEN` | ❌ | 2FA Telegram notifications |
| `TELEGRAM_CHAT_ID` | ❌ | Your Telegram chat ID |

---

## ⚠️ Important Notes

1. This tool interacts with X/Twitter. Use responsibly and in compliance with their Terms of Service.
2. The stealth features are designed to simulate natural human behavior — not to circumvent platform security for malicious purposes.
3. Store your `SESSION_ENCRYPTION_KEY` securely — it protects your browser session data.
4. The `.readsx/` directory is created at project root for vault storage. Add it to `.gitignore`.

---

*Readsx — Sovereign AI Command Center*
