// ============================================================
// READSX — Global Dashboard State (Zustand)
// ============================================================

'use client';

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  DashboardState,
  TerminalLog,
  LogLevel,
  AutomationTask,
  HealthMetrics,
  TrendItem,
  GeneratedContent,
  ScreenshotFrame,
  PersonaTone,
  TwoFAChallenge,
} from '@/types';

interface DashboardStore extends DashboardState {
  // Terminal
  addLog: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void;
  clearLogs: () => void;

  // Health
  setHealth: (health: HealthMetrics) => void;

  // Tasks
  enqueueTask: (task: Omit<AutomationTask, 'id' | 'status' | 'retries'>) => void;
  updateTask: (id: string, updates: Partial<AutomationTask>) => void;
  setCurrentTask: (task: AutomationTask | null) => void;

  // Persona
  setTone: (tone: PersonaTone) => void;

  // Trends
  setTrends: (trends: TrendItem[]) => void;
  setIsScanning: (v: boolean) => void;

  // Content
  addGeneratedContent: (content: GeneratedContent) => void;
  clearContent: () => void;

  // Screenshot
  setScreenshot: (frame: ScreenshotFrame | null) => void;

  // 2FA
  set2FAChallenge: (challenge: TwoFAChallenge | null) => void;

  // Session
  setSessionActive: (v: boolean) => void;
  setSessionAuthenticated: (v: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Initial state
  logs: [],
  session: null,
  health: null,
  currentTask: null,
  taskQueue: [],
  activeTone: 'techguru',
  trends: [],
  generatedContent: [],
  screenshot: null,
  twoFAChallenge: null,
  isScanning: false,

  // Terminal
  addLog: (level, message, meta) =>
    set((state) => ({
      logs: [
        ...state.logs.slice(-199), // keep last 200
        { id: uuid(), timestamp: Date.now(), level, message, meta },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  // Health
  setHealth: (health) => set({ health }),

  // Tasks
  enqueueTask: (task) =>
    set((state) => ({
      taskQueue: [
        ...state.taskQueue,
        { ...task, id: uuid(), status: 'queued', retries: 0 },
      ],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      taskQueue: state.taskQueue.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  setCurrentTask: (task) => set({ currentTask: task }),

  // Persona
  setTone: (activeTone) => set({ activeTone }),

  // Trends
  setTrends: (trends) => set({ trends }),
  setIsScanning: (isScanning) => set({ isScanning }),

  // Content
  addGeneratedContent: (content) =>
    set((state) => ({
      generatedContent: [content, ...state.generatedContent.slice(0, 29)],
    })),

  clearContent: () => set({ generatedContent: [] }),

  // Screenshot
  setScreenshot: (screenshot) => set({ screenshot }),

  // 2FA
  set2FAChallenge: (twoFAChallenge) => set({ twoFAChallenge }),

  // Session
  setSessionActive: (isActive) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, isActive }
        : {
            isActive,
            isAuthenticated: false,
            userAgent: '',
            fingerprint: {} as never,
            recoveryAttempts: 0,
          },
    })),

  setSessionAuthenticated: (isAuthenticated) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, isAuthenticated }
        : {
            isActive: false,
            isAuthenticated,
            userAgent: '',
            fingerprint: {} as never,
            recoveryAttempts: 0,
          },
    })),
}));
