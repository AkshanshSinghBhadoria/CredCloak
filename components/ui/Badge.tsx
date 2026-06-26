import { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const tones = {
  indigo: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  green: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  red: 'border-red-400/30 bg-red-500/10 text-red-200',
  gray: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
};

export function Badge({
  tone = 'gray',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={twMerge(clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', tones[tone], className))}
      {...props}
    />
  );
}
