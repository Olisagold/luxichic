import React from 'react';

interface AdminEmptyProps {
  icon: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
}

export function AdminEmpty({ icon, title, text, action }: AdminEmptyProps) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-subtle">{icon}</span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] text-subtle">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
