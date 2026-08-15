import { NextRequest, NextResponse } from "next/server";
import type { Detection, Polygon } from "@/lib/types";

const WORKFLOW_URL =
  "https://serverless.roboflow.com/infer/workflows/research-veracorpus-com/bread-type-detection-vbread-type-detection-mnift-3-yolo26m-t1-logic";

export const runtime = "nodejs";
export const maxDuration = 30;

type RoboflowPrediction = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
};

type RoboflowResponse = {
  outputs: Array<{
    predictions: {
      image: { width: number; height: number };
      predictions: RoboflowPrediction[];
    };
  }>;
};

function bboxToPolygon(p: RoboflowPrediction): Polygon {
  const x0 = p.x - p.width / 2;
  const y0 = p.y - p.height / 2;
  const x1 = p.x + p.width / 2;
  const y1 = p.y + p.height / 2;
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ROBOFLOW_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: { image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const image = body.image;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "missing image" }, { status: 400 });
  }
  // Accept data URLs too; strip prefix.
  const base64 = image.startsWith("data:") ? image.split(",", 2)[1] ?? "" : image;

  const rfResp = await fetch(WORKFLOW_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      inputs: { image: { type: "base64", value: base64 } },
    }),
  });

  if (!rfResp.ok) {
    const text = await rfResp.text().catch(() => "");
    return NextResponse.json(
      { error: "roboflow error", status: rfResp.status, detail: text.slice(0, 500) },
      { status: 502 }
    );
  }

  const data = (await rfResp.json()) as RoboflowResponse;
  const first = data?.outputs?.[0]?.predictions;
  if (!first) {
    return NextResponse.json({ detections: [], imageWidth: 0, imageHeight: 0 });
  }

  const detections: Detection[] = first.predictions.map((p) => ({
    id: p.detection_id,
    className: p.class,
    confidence: p.confidence,
    polygon: bboxToPolygon(p),
    center: { x: p.x, y: p.y },
    imageWidth: first.image.width,
    imageHeight: first.image.height,
  }));

  return NextResponse.json({
    detections,
    imageWidth: first.image.width,
    imageHeight: first.image.height,
  });
}
