"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Detection } from "@/lib/types";
import { classify } from "@/lib/types";
import { KNOWN_CLASSES, priceFor } from "@/lib/prices";
import { CameraSwapIcon } from "@/lib/icons";

type Props = {
  onDetections: (dets: Detection[]) => void;
  intervalMs?: number;
};

const CAPTURE_MAX_DIM = 720; // downscale before base64 to keep requests small

export function CameraView({ onDetections, intervalMs = 1800 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [needsGesture, setNeedsGesture] = useState(true); // require an explicit tap first (iOS-friendly, and shows a diagnostic if it fails)
  const [detections, setDetections] = useState<Detection[]>([]);
  const [picker, setPicker] = useState<{ det: Detection; x: number; y: number } | null>(null);
  const inFlight = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      setError("Camera blocked: page is not a secure context. Load over https:// or localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API not available in this browser.");
      return;
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch((e) => {
          setError("Video play() failed: " + (e instanceof Error ? e.message : String(e)));
        });
      }
      setNeedsGesture(false);
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : "Camera unavailable";
      console.error("getUserMedia failed", e);
      setError(msg);
    }
  }, [facing]);

  // Refresh stream when the facing direction changes (after first start)
  useEffect(() => {
    if (!needsGesture) startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  // Capture + detect loop
  const captureAndDetect = useCallback(async () => {
    if (inFlight.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const canvas = captureRef.current ?? document.createElement("canvas");
    captureRef.current = canvas;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(1, CAPTURE_MAX_DIM / Math.max(vw, vh));
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    inFlight.current = true;
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { detections: Detection[] };
      setDetections(json.detections ?? []);
      onDetections(json.detections ?? []);
    } catch {
      // network hiccup, next tick will retry
    } finally {
      inFlight.current = false;
    }
  }, [onDetections]);

  useEffect(() => {
    const id = window.setInterval(captureAndDetect, intervalMs);
    return () => window.clearInterval(id);
  }, [captureAndDetect, intervalMs]);

  // Draw overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!video.videoWidth) return;

    // The video is object-cover — figure out the displayed source rect.
    const vAspect = video.videoWidth / video.videoHeight;
    const dAspect = rect.width / rect.height;
    let drawW: number, drawH: number, offX: number, offY: number;
    if (vAspect > dAspect) {
      // video wider than display: cropped horizontally
      drawH = rect.height;
      drawW = drawH * vAspect;
      offX = (rect.width - drawW) / 2;
      offY = 0;
    } else {
      drawW = rect.width;
      drawH = drawW / vAspect;
      offX = 0;
      offY = (rect.height - drawH) / 2;
    }
    const sx = drawW / video.videoWidth;
    const sy = drawH / video.videoHeight;

    for (const det of detections) {
      // Roboflow returns coords in original image (not downscaled — it works from
      // whatever we sent). We sent the downscaled capture, but Roboflow's
      // reported image w/h match that. So map from detection image → video pixels
      // by ratio of video size to reported image size.
      const rx = video.videoWidth / det.imageWidth;
      const ry = video.videoHeight / det.imageHeight;
      const pts = det.polygon.map((p) => ({
        x: offX + p.x * rx * sx,
        y: offY + p.y * ry * sy,
      }));

      const hasPrice = priceFor(det.className) !== null;
      const kind = classify(det.confidence, hasPrice);
      const color =
        kind === "confident" ? "#1E63FF" : kind === "review" ? "#F59E0B" : "#EF4444";

      // Rounded polygon (softens sharp bbox corners)
      drawRoundedPoly(ctx, pts, 18, color);

      // Label pill
      const label = hasPrice
        ? `${det.className} · ${Math.round(det.confidence * 100)}%`
        : det.className
        ? `${det.className} — no price`
        : "Unknown — tap to add";
      drawPill(ctx, pts[0].x, pts[0].y - 10, label, color);
    }
  }, [detections]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return;
    const rect = overlay.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Reverse-map to find the detection under the click
    const vAspect = video.videoWidth / video.videoHeight;
    const dAspect = rect.width / rect.height;
    let drawW: number, drawH: number, offX: number, offY: number;
    if (vAspect > dAspect) {
      drawH = rect.height;
      drawW = drawH * vAspect;
      offX = (rect.width - drawW) / 2;
      offY = 0;
    } else {
      drawW = rect.width;
      drawH = drawW / vAspect;
      offX = 0;
      offY = (rect.height - drawH) / 2;
    }
    for (const det of detections) {
      const rx = video.videoWidth / det.imageWidth;
      const ry = video.videoHeight / det.imageHeight;
      const sx = drawW / video.videoWidth;
      const sy = drawH / video.videoHeight;
      const xs = det.polygon.map((p) => offX + p.x * rx * sx);
      const ys = det.polygon.map((p) => offY + p.y * ry * sy);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        setPicker({ det, x: cx, y: cy });
        return;
      }
    }
    setPicker(null);
  };

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas
        ref={overlayRef}
        onClick={onCanvasClick}
        className="absolute inset-0 h-full w-full"
      />
      <button
        onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-2 text-xs font-medium text-black shadow-sm backdrop-blur hover:bg-white"
        aria-label="Switch camera"
      >
        <CameraSwapIcon size={16} />
        Flip
      </button>
      {needsGesture && (
        <button
          onClick={startCamera}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black text-white"
        >
          <span className="rounded-full bg-[color:var(--brand-blue)] px-5 py-3 text-sm font-semibold shadow-lg">
            Tap to start camera
          </span>
          <span className="text-[11px] text-white/60">
            Browsers require a tap before accessing the camera.
          </span>
        </button>
      )}
      {error && (
        <div className="absolute left-4 top-4 z-20 max-w-sm rounded-lg bg-red-500/95 px-3 py-2 text-xs text-white shadow-lg">
          <div className="font-semibold">Camera error</div>
          <div className="mt-0.5">{error}</div>
        </div>
      )}
      {picker && (
        <ClassPicker
          x={picker.x}
          y={picker.y}
          current={picker.det.className}
          onPick={(cls) => {
            // Emit a synthetic single-detection event so the cart can add it.
            const forced: Detection = {
              ...picker.det,
              className: cls,
              confidence: 1,
              id: `${picker.det.id}-manual-${Date.now()}`,
            };
            onDetections([forced]);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function drawRoundedPoly(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  radius: number,
  color: string
) {
  if (pts.length < 3) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color + "1A"; // 10% alpha fill
  ctx.lineWidth = 3;
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    // Corner rounding via arcTo
    const inset = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const r = Math.min(radius, len / 2);
      return { x: a.x + (dx / len) * r, y: a.y + (dy / len) * r };
    };
    const a = inset(p1, p0);
    const b = inset(p1, p2);
    if (i === 0) ctx.moveTo(a.x, a.y);
    else ctx.lineTo(a.x, a.y);
    ctx.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string
) {
  ctx.save();
  ctx.font = "600 12px system-ui, -apple-system, sans-serif";
  const padX = 8, padY = 5;
  const metrics = ctx.measureText(text);
  const w = metrics.width + padX * 2;
  const h = 22;
  const r = h / 2;
  const px = x, py = y - h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + w, py, px + w, py + h, r);
  ctx.arcTo(px + w, py + h, px, py + h, r);
  ctx.arcTo(px, py + h, px, py, r);
  ctx.arcTo(px, py, px + w, py, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, px + padX, py + h / 2);
  ctx.restore();
}

function ClassPicker({
  x,
  y,
  current,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  current: string;
  onPick: (cls: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="absolute z-10 max-h-72 w-64 overflow-auto rounded-xl border border-black/10 bg-white shadow-lg"
        style={{ left: Math.min(x, 400), top: Math.min(y, 300) }}
      >
        <div className="border-b border-black/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-black/50">
          Correct this item
        </div>
        {KNOWN_CLASSES.map((cls) => (
          <button
            key={cls}
            onClick={() => onPick(cls)}
            className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-black/5 ${
              cls === current ? "bg-blue-50 font-medium" : ""
            }`}
          >
            {cls}
          </button>
        ))}
      </div>
    </>
  );
}
