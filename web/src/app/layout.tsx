import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

import { SolanaProviders } from './providers';

const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

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
      <body className={`${display.variable} ${mono.variable} antialiased`}>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
