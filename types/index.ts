// ============================================================
// READSX — Global Type Definitions
// ============================================================

export type LogLevel = 'action' | 'success' | 'debounce' | 'block' | 'info' | 'warn';

export interface TerminalLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
}

export type PersonaTone = 'witty' | 'professional' | 'techguru';

export interface PersonaConfig {
  id: PersonaTone;
  label: string;
  description: string;
  icon: string;
  systemPrompt: string;
  hashtagStyle: string[];
  engagementStyle: string;
}

export interface SessionState {
  isActive: boolean;
  isAuthenticated: boolean;
  cookiesEncrypted?: string;
  localStorageEncrypted?: string;
  userAgent: string;
  fingerprint: BrowserFingerprint;
  lastHeartbeat?: number;
  recoveryAttempts: number;
}

export interface BrowserFingerprint {
  platform: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
  timezone: string;
  language: string;
  languages: string[];
  webglVendor: string;
  webglRenderer: string;
  audioContextFingerprint: string;
  canvasNoise: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  touchPoints: number;
}

export interface TrendItem {
  id: string;
  topic: string;
  source: 'reddit' | 'github' | 'news' | 'twitter';
  score: number;
  summary: string;
  suggestedHook: string;
  generatedAt: number;
  tags: string[];
  url?: string;
}

export interface GeneratedContent {
  id: string;
  tweet: string;
  thread?: string[];
  tone: PersonaTone;
  topic: string;
  estimatedEngagement: number;
  hashtags: string[];
  generatedAt: number;
}

export interface AutomationTask {
  id: string;
  type: 'tweet' | 'reply' | 'like' | 'retweet' | 'follow' | 'dm' | 'scan';
  status: 'queued' | 'running' | 'success' | 'failed' | 'blocked';
  payload: Record<string, unknown>;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retries: number;
}

export interface HealthMetrics {
  cpu: number;
  memory: { used: number; total: number; percent: number };
  network: { rx: number; tx: number };
  browserConnected: boolean;
  sessionActive: boolean;
  tasksQueued: number;
  tasksCompleted: number;
  tasksFailed: number;
  uptime: number;
}

export interface ScreenshotFrame {
  data: string; // base64 PNG
  timestamp: number;
  url?: string;
}

export interface TwoFAChallenge {
  sessionId: string;
  screenshotBase64: string;
  challengeType: 'sms' | 'email' | 'authenticator' | 'unknown';
  timestamp: number;
}

export interface DashboardState {
  logs: TerminalLog[];
  session: SessionState | null;
  health: HealthMetrics | null;
  currentTask: AutomationTask | null;
  taskQueue: AutomationTask[];
  activeTone: PersonaTone;
  trends: TrendItem[];
  generatedContent: GeneratedContent[];
  screenshot: ScreenshotFrame | null;
  twoFAChallenge: TwoFAChallenge | null;
  isScanning: boolean;
}
