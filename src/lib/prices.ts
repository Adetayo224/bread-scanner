export const PRICES: Record<string, number> = {
  "Sweet Potato Bun": 1.6,
  "Red Bean Bun": 1.6,
  "Cranberry Bun": 1.7,
  "Butter Sugar Bun": 1.6,
  "Japanese Red Bean Bun": 1.7,
  "Chicken Satay Bun": 1.7,
  "Egg Mayo Chicken Ham Bun": 1.7,
  "Cheese Chicken Sausage & Chicken Floss Bun": 1.8,
  "Chocolate Drip Bun": 1.7,
  "Vienna Chicken & Cheese Bun": 1.7,
  "Vienna Chicken Sausage Bun": 1.8,
  "Fish Otah Bun": 1.7,
  "Chicken Char Siew Bun": 1.7,
  "Chicken Luncheon Meat Bun": 1.6,
  "Sardine Bun": 1.6,
  "Chicken Sausage Bun": 1.6,
  "Curry Chicken Bun": 1.7,
  "Chicken Pie": 1.6,
  "Chicken Ham & Cheese Bun": 1.7,
  "Tuna Bread": 1.8,
  "Ikan Bilis Bun": 1.8,
  "Peanut Bun": 1.9,
  "Polo Bun": 1.9,
  "Chocolate Bits Bun": 1.9,
  "Walnut Bun": 1.9,
  "Coffee Bun": 1.9,
};

export const KNOWN_CLASSES = Object.keys(PRICES);

export function priceFor(name: string): number | null {
  return name in PRICES ? PRICES[name] : null;
}

// Short code: first letters of each word + hash-ish index for uniqueness.
export function codeFor(name: string): string {
  const initials = name
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .join("")
    .slice(0, 3);
  const idx = KNOWN_CLASSES.indexOf(name);
  const suffix = idx >= 0 ? (idx + 1).toString().padStart(2, "0") : "??";
  return `${initials}-${suffix}`;
}

export function speakPrice(price: number): string {
  const dollars = Math.floor(price);
  const cents = Math.round((price - dollars) * 100);
  if (cents === 0) return `${dollars} dollar${dollars === 1 ? "" : "s"}`;
  const centWord = cents < 10 ? `oh ${cents}` : `${cents}`;
  return `${dollars} dollar${dollars === 1 ? "" : "s"} ${centWord}`;
}
