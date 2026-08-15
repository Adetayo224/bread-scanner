"use client";
import { useState } from "react";
import type { CartItem } from "@/lib/types";
import { KNOWN_CLASSES, codeFor, priceFor } from "@/lib/prices";
import { MinusIcon, PlusIcon, TrashIcon, PayIcon, VoidIcon, SpeakerIcon, MuteIcon, BreadIcon, CheckIcon } from "@/lib/icons";

type Props = {
  items: CartItem[];
  muted: boolean;
  onToggleMute: () => void;
  onQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onManualAdd: (className: string, unitPrice: number) => void;
  onSetPrice: (id: string, unitPrice: number) => void;
  onSetClass: (id: string, className: string) => void;
  onVoid: () => void;
  onPay: () => Promise<void> | void;
  paying: boolean;
  paid: boolean;
  onNewCustomer: () => void;
  orderNumber: string;
};

export function BillPanel(p: Props) {
  const [showManual, setShowManual] = useState(false);
  const total = p.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const anyPending = p.items.some((i) => i.pending);

  return (
    <aside className="flex h-full w-full flex-col bg-white text-black">
      <header className="flex items-start justify-between border-b border-black/8 px-5 pb-4 pt-5">
        <div>
          <div className="flex items-center gap-2 text-[color:var(--brand-blue)]">
            <BreadIcon size={22} />
            <div className="text-[15px] font-semibold tracking-tight">Bakery Counter</div>
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-widest text-black/50">
            Order {p.orderNumber}
          </div>
          <div className="mt-2 text-[12px] leading-snug text-black/60">
            {p.paid
              ? "Payment received. Ready for the next customer."
              : p.paying
              ? "Processing payment…"
              : p.items.length === 0
              ? "Place items on the tray to begin."
              : "Waiting for the customer to choose how to pay."}
          </div>
        </div>
        <button
          onClick={p.onToggleMute}
          className="rounded-full border border-black/10 p-2 text-black/70 hover:bg-black/5"
          aria-label={p.muted ? "Unmute" : "Mute"}
        >
          {p.muted ? <MuteIcon size={16} /> : <SpeakerIcon size={16} />}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2">
        {p.items.length === 0 && (
          <div className="mt-16 text-center text-sm text-black/40">No items yet</div>
        )}
        <ul className="space-y-1.5">
          {p.items.map((it) => (
            <li
              key={it.id}
              className={`group rounded-xl border border-black/5 bg-white px-3 py-2.5 hover:border-black/15 ${
                it.pending ? "ring-1 ring-amber-300 bg-amber-50/40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 text-black/60">
                  <BreadIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium tracking-tight">{it.className}</div>
                  <div className="mt-0.5 text-[10.5px] font-mono uppercase tracking-wider text-black/45">
                    {it.code}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-black/10">
                  <button className="p-1.5 text-black/60 hover:text-black" onClick={() => p.onQty(it.id, -1)} aria-label="decrement">
                    <MinusIcon size={14} />
                  </button>
                  <span className="w-5 text-center text-[13px] tabular-nums">{it.qty}</span>
                  <button className="p-1.5 text-black/60 hover:text-black" onClick={() => p.onQty(it.id, +1)} aria-label="increment">
                    <PlusIcon size={14} />
                  </button>
                </div>
                <div className="w-16 text-right text-[13.5px] font-semibold tabular-nums">
                  {it.pending ? <span className="text-amber-600">Needs $</span> : `$${(it.unitPrice * it.qty).toFixed(2)}`}
                </div>
                <button className="p-1.5 text-black/30 hover:text-red-500" onClick={() => p.onRemove(it.id)} aria-label="remove">
                  <TrashIcon size={15} />
                </button>
              </div>
              {it.pending && (
                <InlinePriceForm
                  onSubmit={(cls, price) => {
                    if (cls !== it.className) p.onSetClass(it.id, cls);
                    p.onSetPrice(it.id, price);
                  }}
                  defaultClass={it.className}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-black/8 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <button
            className="text-[12px] font-medium text-[color:var(--brand-blue)] hover:underline"
            onClick={() => setShowManual((v) => !v)}
          >
            + Add item manually
          </button>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-widest text-black/45">Total</div>
            <div className="text-[26px] font-semibold tracking-tight tabular-nums">
              ${total.toFixed(2)}
            </div>
          </div>
        </div>

        {showManual && (
          <div className="mt-3 rounded-xl border border-black/10 p-3">
            <InlinePriceForm
              submitLabel="Add"
              onSubmit={(cls, price) => {
                p.onManualAdd(cls, price);
                setShowManual(false);
              }}
            />
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={p.onVoid}
            disabled={p.items.length === 0 || p.paying}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-[12px] font-medium text-black/70 hover:bg-black/5 disabled:opacity-40"
          >
            <VoidIcon size={14} /> Void
          </button>
          {p.paid ? (
            <button
              onClick={p.onNewCustomer}
              className="flex-1 rounded-lg bg-black px-4 py-3 text-[14px] font-semibold text-white hover:bg-black/85"
            >
              New customer
            </button>
          ) : (
            <button
              onClick={p.onPay}
              disabled={p.items.length === 0 || p.paying || anyPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[color:var(--brand-blue)] px-4 py-3 text-[14px] font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-40"
            >
              {p.paying ? "Processing…" : (<><PayIcon size={16} /> Pay ${total.toFixed(2)}</>)}
            </button>
          )}
        </div>
        {anyPending && !p.paid && (
          <div className="mt-2 text-[11px] text-amber-600">
            Set a price on pending items before paying.
          </div>
        )}
      </div>

      {p.paid && <PaidOverlay />}
    </aside>
  );
}

function InlinePriceForm({
  onSubmit,
  defaultClass,
  submitLabel = "Save",
}: {
  onSubmit: (cls: string, price: number) => void;
  defaultClass?: string;
  submitLabel?: string;
}) {
  const [cls, setCls] = useState(defaultClass && KNOWN_CLASSES.includes(defaultClass) ? defaultClass : KNOWN_CLASSES[0]);
  const [price, setPrice] = useState<string>(() => {
    const p = defaultClass ? priceFor(defaultClass) : null;
    return p !== null ? p.toFixed(2) : "";
  });
  return (
    <form
      className="mt-2 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseFloat(price);
        if (isNaN(n) || n < 0) return;
        onSubmit(cls, Math.round(n * 100) / 100);
      }}
    >
      <select
        value={cls}
        onChange={(e) => {
          const v = e.target.value;
          setCls(v);
          const p = priceFor(v);
          if (p !== null) setPrice(p.toFixed(2));
        }}
        className="min-w-0 flex-1 truncate rounded-md border border-black/15 bg-white px-2 py-1.5 text-[12px]"
      >
        {KNOWN_CLASSES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
        <option value="Unknown">Unknown / Other</option>
      </select>
      <div className="flex items-center rounded-md border border-black/15 px-2 py-1.5 text-[12px]">
        <span className="text-black/45">$</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          inputMode="decimal"
          className="w-14 bg-transparent outline-none tabular-nums"
        />
      </div>
      <button
        type="submit"
        className="rounded-md bg-black px-3 py-1.5 text-[12px] font-medium text-white hover:bg-black/85"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function PaidOverlay() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
      <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-white shadow-lg animate-[fadeInUp_0.35s_ease-out]">
        <CheckIcon size={20} />
        <span className="text-sm font-semibold">Payment received</span>
      </div>
    </div>
  );
}
