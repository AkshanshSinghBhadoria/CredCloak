import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from '@/app/providers';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'CredCloak | Private Loan Readiness on Stellar',
  description: 'Analyze Stellar testnet wallet history and preview private loan readiness metrics.',
  icons: {
    icon: '/credcloak-logo.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
