"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "@/components/CameraView";
import { BillPanel } from "@/components/BillPanel";
import { RotatePrompt } from "@/components/RotatePrompt";
import type { CartItem, Detection } from "@/lib/types";
import { codeFor, priceFor, speakPrice } from "@/lib/prices";

// Dedupe: an incoming detection is "the same physical item" if there's an
// existing tracker of the same class whose center is within POS_TOL of the
// detection's center (normalized to image size). Trackers expire after
// TRACKER_TTL_MS of not being seen again.
const POS_TOL = 0.12;
const TRACKER_TTL_MS = 2000;
const CONFIDENT_MIN = 0.6;

type Tracker = {
  className: string;
  cx: number;
  cy: number;
  lastSeen: number;
  cartId: string;
};

export default function Home() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [muted, setMuted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const trackersRef = useRef<Tracker[]>([]);
  const speechQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const [orderNumber, setOrderNumber] = useState("#----");

  useEffect(() => {
    setOrderNumber("#" + Math.floor(1000 + Math.random() * 9000).toString());
    const so = (screen as unknown as { orientation?: { lock?: (t: string) => Promise<void> } }).orientation;
    so?.lock?.("landscape").catch(() => {});
  }, []);

  const speak = useCallback((text: string) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechQueueRef.current.push(text);
    const drain = () => {
      if (speakingRef.current) return;
      const next = speechQueueRef.current.shift();
      if (!next) return;
      speakingRef.current = true;
      const utter = new SpeechSynthesisUtterance(next);
      utter.rate = 1.05;
      utter.onend = () => { speakingRef.current = false; drain(); };
      utter.onerror = () => { speakingRef.current = false; drain(); };
      window.speechSynthesis.speak(utter);
    };
    drain();
  }, [muted]);

  const addToCart = useCallback((className: string, unitPrice: number | null) => {
    const id = crypto.randomUUID();
    const item: CartItem = {
      id,
      className,
      code: codeFor(className),
      unitPrice: unitPrice ?? 0,
      qty: 1,
      pending: unitPrice === null,
    };
    setItems((prev) => [...prev, item]);
    if (unitPrice !== null) speak(`${className}, ${speakPrice(unitPrice)}`);
    return id;
  }, [speak]);

  const handleDetections = useCallback((dets: Detection[]) => {
    const now = Date.now();
    trackersRef.current = trackersRef.current.filter((t) => now - t.lastSeen < TRACKER_TTL_MS);

    for (const det of dets) {
      const hasPrice = priceFor(det.className) !== null;
      if (!hasPrice || det.confidence < CONFIDENT_MIN) continue;

      const nx = det.center.x / det.imageWidth;
      const ny = det.center.y / det.imageHeight;

      const existing = trackersRef.current.find(
        (t) => t.className === det.className && Math.hypot(t.cx - nx, t.cy - ny) < POS_TOL
      );
      if (existing) {
        existing.lastSeen = now;
        existing.cx = nx;
        existing.cy = ny;
        continue;
      }
      const cartId = addToCart(det.className, priceFor(det.className));
      trackersRef.current.push({ className: det.className, cx: nx, cy: ny, lastSeen: now, cartId });
    }
  }, [addToCart]);

  const onQty = (id: string, delta: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
  const onRemove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const onManualAdd = (className: string, unitPrice: number) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), className, code: codeFor(className), unitPrice, qty: 1 }]);
    speak(`${className}, ${speakPrice(unitPrice)}`);
  };
  const onSetPrice = (id: string, unitPrice: number) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, unitPrice, pending: false } : i));
  const onSetClass = (id: string, className: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, className, code: codeFor(className) } : i));
  const onVoid = () => { setItems([]); trackersRef.current = []; };
  const onPay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1400));
    setPaying(false);
    setPaid(true);
    speak("Payment received");
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AC();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35);
      o.start(); o.stop(ac.currentTime + 0.36);
    } catch {}
  };
  const onNewCustomer = () => { setItems([]); setPaid(false); trackersRef.current = []; };

  return (
    <>
      <RotatePrompt />
      <main className="grid h-dvh w-dvw grid-cols-[minmax(0,1fr)_360px] bg-white portrait:hidden">
        <section className="relative min-h-0">
          <CameraView onDetections={handleDetections} />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
            Tray scan · tap a box to correct it
          </div>
        </section>
        <section className="relative border-l border-black/8">
          <BillPanel
            items={items}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onQty={onQty}
            onRemove={onRemove}
            onManualAdd={onManualAdd}
            onSetPrice={onSetPrice}
            onSetClass={onSetClass}
            onVoid={onVoid}
            onPay={onPay}
            paying={paying}
            paid={paid}
            onNewCustomer={onNewCustomer}
            orderNumber={orderNumber}
          />
        </section>
      </main>
    </>
  );
}
