import Image from 'next/image';
import clsx from 'clsx';

export function ShieldLogo({ connected = false }: { connected?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className={clsx('grid h-11 w-11 place-items-center rounded-xl border border-indigo-300/25 bg-indigo-500/10', connected && 'animate-shield')}>
        <Image src="/credcloak-logo.svg" alt="CredCloak shield" width={34} height={34} priority />
      </span>
      <span className="font-display text-xl font-bold tracking-normal text-white">CredCloak</span>
    </span>
  );
}
