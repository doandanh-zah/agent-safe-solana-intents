import type { Metadata } from 'next';
import './globals.css';

import { SolanaProviders } from './providers';

export const metadata: Metadata = {
  title: 'Agent-Safe Solana Intents — Demo',
  description: 'Intent → Policy → Transaction rails for agent-safe Solana automation.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
