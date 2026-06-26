import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx('rounded-xl border border-cloak-border bg-cloak-panel/92 shadow-[0_14px_40px_rgba(0,0,0,0.2)]', className),
      )}
      {...props}
    />
  );
}
