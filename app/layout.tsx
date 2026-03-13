import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Readsx — Sovereign AI Command Center',
  description: 'High-End Social Media Management Suite. Zero-Failure. Absolute Autonomy.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-grid bg-grid-md min-h-screen" style={{ backgroundColor: 'var(--color-void)' }}>
        {/* Global background effects */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,136,255,0.06) 0%, transparent 70%),
              radial-gradient(ellipse 60% 50% at -10% 80%, rgba(0,245,255,0.04) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 110% 20%, rgba(155,93,255,0.03) 0%, transparent 60%)
            `,
          }}
        />
        {/* Scanline effect */}
        <div
          className="fixed inset-0 pointer-events-none z-0 scanline-overlay opacity-30"
          style={{ zIndex: 1 }}
        />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
