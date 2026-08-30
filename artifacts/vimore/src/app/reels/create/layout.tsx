import React from 'react';

export default function ReelCreateLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] bg-black overflow-hidden">{children}</div>;
}
