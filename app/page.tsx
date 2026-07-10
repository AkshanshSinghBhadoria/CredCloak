'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ShieldLogo } from '@/components/ShieldLogo';
import { WalletConnect } from '@/components/WalletConnect';
import { useWallet } from '@/hooks/useWallet';

export default function HomePage() {
  const { walletState, connect, disconnect, isConnecting } = useWallet();

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <ShieldLogo connected={walletState.isConnected} />
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-slate-400">Your finances, hidden. Your creditworthiness, proven.</span>
          <Badge tone="amber">Stellar Testnet</Badge>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-10 lg:grid-cols-[1fr_460px] lg:pt-20">
        <div className="animate-rise">
          
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-tight text-white sm:text-6xl">
            Prove you&apos;re creditworthy. Without showing your bank account.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            CredCloak analyzes your Stellar testnet wallet history to preview private loan readiness metrics. ZK proofs arrive in a future update, proving your creditworthiness while keeping your history completely private.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <WalletConnect walletState={walletState} connect={connect} disconnect={disconnect} isConnecting={isConnecting} />
            {walletState.isConnected && (
              <Link href="/dashboard" className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:border-indigo-400">
                Open Dashboard
              </Link>
            )}
            <Link href="/onboarding" className="rounded-xl border border-indigo-500/40 px-5 py-3 font-semibold text-indigo-300 hover:border-indigo-400 hover:text-white">
              Guided Onboarding →
            </Link>
          </div>
        </div>

        <Card className="relative overflow-hidden p-6 animate-rise">
          <div className="absolute right-6 top-6 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.85)]" />
          <p className="font-mono text-sm uppercase text-indigo-300">Readiness Preview</p>
          <p className="mt-7 font-display text-7xl font-bold text-white">82</p>
          <p className="mt-2 text-slate-400">Private score projection</p>
          <div className="mt-8 grid gap-3">
            {['Average balance verified', 'DTI below warning threshold', 'History window measured'].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3">
                <span className="text-slate-300">{item}</span>
                <span className="font-mono text-emerald-300">OK</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Connect your Stellar wallet', 'Freighter connects on testnet and exposes your public address.'],
            ['02', 'Analyze on-chain history', 'CredCloak reads Horizon payments and computes inflow, outflow, balance, and DTI.'],
            ['03', 'Preview private readiness', 'The dashboard shows the exact signals future ZK proofs will use.'],
          ].map(([step, title, body]) => (
            <Card key={step} className="p-6">
              <span className="font-mono text-sm text-indigo-300">{step}</span>
              <h2 className="mt-5 font-display text-2xl font-bold text-white">{title}</h2>
              <p className="mt-3 text-slate-400">{body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">ZK proof generation coming in a future update.</p>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-slate-500">
        <span>Built on Stellar Testnet - not for real funds.</span>
        <a href="https://github.com/" target="_blank" rel="noreferrer" className="hover:text-indigo-300">GitHub</a>
      </footer>
    </main>
  );
}
