"use client";
import { RotateDeviceIcon } from "@/lib/icons";

export function RotatePrompt() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-black portrait:flex landscape:hidden">
      <div className="animate-pulse text-[color:var(--brand-blue)]">
        <RotateDeviceIcon size={72} />
      </div>
      <p className="mt-6 text-lg font-medium tracking-tight">Rotate to landscape</p>
      <p className="mt-1 text-sm text-black/60">The scanner is designed for a horizontal counter view.</p>
    </div>
  );
}
