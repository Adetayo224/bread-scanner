// A polygon in image-pixel coordinates. Detection boxes are stored as
// 4-point polygons so a segmentation model swap only touches the parser.
export type Polygon = { x: number; y: number }[];

export type Detection = {
  id: string; // detection_id from Roboflow (or synthetic for unknowns)
  className: string; // class label (may be "" for unknown)
  confidence: number; // 0..1
  polygon: Polygon; // clockwise from top-left when derived from a bbox
  center: { x: number; y: number };
  imageWidth: number;
  imageHeight: number;
};

export type CartItem = {
  id: string;
  className: string; // "Unknown" allowed
  code: string;
  unitPrice: number; // 0 if pending manual entry
  qty: number;
  pending?: boolean; // needs manual price
};

export type Confidence = "confident" | "review" | "unknown";
export function classify(conf: number, hasPrice: boolean): Confidence {
  if (!hasPrice) return "unknown";
  if (conf >= 0.9) return "confident";
  if (conf >= 0.7) return "review";
  return "unknown";
}
