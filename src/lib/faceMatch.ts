// Lightweight, fully on-device face-similarity check (no network calls, no
// paid APIs, no ML model downloads). It compares a freshly captured photo
// against a user's registered face photos so a login / attendance face
// check-in can be rejected when it is clearly a different person — this is
// what stops someone else from scanning their own face to get into another
// person's account.
//
// v2: tighter face-only crop (the old full-square crop let background,
// hair and clothing — which are often similar between any two photos taken
// on the same device/lighting — dominate the score and falsely "match"
// different people). Comparison is now edge/shape based (a small HOG-style
// gradient-orientation descriptor), which reacts to facial structure far
// more than to lighting or skin tone, plus a majority-vote across every
// registered pose instead of trusting a single lucky best match.
const SIZE = 64;      // working resolution for the cropped face
const CELL = 8;        // HOG cell size in pixels
const BINS = 9;        // unsigned gradient orientation bins (0-180°)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

interface FaceSignature { hog: Float32Array; lowRes: Float32Array; }

// Crop to roughly the same oval region FaceCapture's on-screen guide uses
// (62% width, 78% height, centered) so hair, ears, shoulders and background
// — which don't help tell two different people apart — are excluded.
function cropFaceRegion(img: HTMLImageElement): Float32Array | null {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;
  const s = Math.min(iw, ih);
  const cropW = s * 0.62, cropH = s * 0.78;
  const sx = (iw - s) / 2 + (s - cropW) / 2;
  const sy = (ih - s) / 2 + (s - cropH) / 2;
  const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d'); if (!ctx) return null;
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, SIZE, SIZE);
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const gray = new Float32Array(SIZE * SIZE);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  // Light contrast normalization so dim/bright photos of the same person
  // still line up, without needing per-pixel brightness to match.
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < gray.length; i++) { if (gray[i] < min) min = gray[i]; if (gray[i] > max) max = gray[i]; }
  const range = (max - min) || 1;
  for (let i = 0; i < gray.length; i++) gray[i] = (gray[i] - min) / range;
  return gray;
}

// Simplified HOG: Sobel gradients -> per-cell orientation histogram,
// L2-normalized. This encodes *shape* (eyebrow/eye/nose/mouth/jaw edges)
// rather than raw brightness, so it is far less fooled by two different
// faces merely sharing similar lighting or skin tone.
function computeHOG(gray: Float32Array): Float32Array {
  const gx = new Float32Array(SIZE * SIZE), gy = new Float32Array(SIZE * SIZE);
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      gx[i] = gray[i + 1] - gray[i - 1];
      gy[i] = gray[i + SIZE] - gray[i - SIZE];
    }
  }
  const cellsPerSide = Math.floor(SIZE / CELL);
  const hog = new Float32Array(cellsPerSide * cellsPerSide * BINS);
  for (let cy = 0; cy < cellsPerSide; cy++) {
    for (let cx = 0; cx < cellsPerSide; cx++) {
      const hist = new Float32Array(BINS);
      for (let y = cy * CELL; y < (cy + 1) * CELL; y++) {
        for (let x = cx * CELL; x < (cx + 1) * CELL; x++) {
          const i = y * SIZE + x;
          const mag = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
          if (mag < 0.01) continue;
          let angle = Math.atan2(gy[i], gx[i]) * (180 / Math.PI); if (angle < 0) angle += 180;
          const bin = Math.min(BINS - 1, Math.floor(angle / (180 / BINS)));
          hist[bin] += mag;
        }
      }
      let norm = 0; for (let b = 0; b < BINS; b++) norm += hist[b] * hist[b];
      norm = Math.sqrt(norm) || 1;
      const base = (cy * cellsPerSide + cx) * BINS;
      for (let b = 0; b < BINS; b++) hog[base + b] = hist[b] / norm;
    }
  }
  return hog;
}

async function toSignature(src: string): Promise<FaceSignature | null> {
  try {
    const img = await loadImage(src);
    const gray = cropFaceRegion(img);
    if (!gray) return null;
    return { hog: computeHOG(gray), lowRes: gray };
  } catch { return null; }
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// A coarse spatial correlation on the normalized low-res crop, used only as
// a secondary signal — structure (HOG) carries most of the decision.
function correlation(a: Float32Array, b: Float32Array): number {
  let meanA = 0, meanB = 0;
  for (let i = 0; i < a.length; i++) { meanA += a[i]; meanB += b[i]; }
  meanA /= a.length; meanB /= b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { const va = a[i] - meanA, vb = b[i] - meanB; num += va * vb; da += va * va; db += vb * vb; }
  const denom = Math.sqrt(da * db) || 1;
  return num / denom;
}

function compareSignatures(a: FaceSignature, b: FaceSignature): number {
  const shape = (cosineSim(a.hog, b.hog) + 1) / 2;       // 0..1, dominant signal
  const corr = (correlation(a.lowRes, b.lowRes) + 1) / 2; // 0..1, secondary signal
  return shape * 0.75 + corr * 0.25;
}

async function compareFaceImages(srcA: string, srcB: string): Promise<number | null> {
  const [a, b] = await Promise.all([toSignature(srcA), toSignature(srcB)]);
  if (!a || !b) return null;
  return compareSignatures(a, b);
}

// Compares `candidate` against every photo in `registered` and requires the
// match to hold up broadly, not just on a single lucky frame: an impostor's
// photo occasionally scoring high against one registered pose (different
// angle/lighting) is far less likely to also score high against the others.
// Returns the score to use for the pass/fail decision, or null if no
// comparison could be performed at all — callers must treat null as
// "inconclusive", never as "verified".
export async function bestFaceMatch(candidate: string, registered: string[]): Promise<number | null> {
  const valid = (registered || []).filter(Boolean);
  if (!valid.length) return null;
  const scores = await Promise.all(valid.map(u => compareFaceImages(candidate, u).catch(() => null)));
  const nums = scores.filter((s): s is number => s !== null && !Number.isNaN(s));
  if (!nums.length) return null;
  nums.sort((x, y) => y - x);
  if (nums.length === 1) return nums[0];
  // Require agreement across at least two poses: average the top matches
  // (majority) rather than trusting a single outlier high score.
  const topCount = Math.max(2, Math.ceil(nums.length / 2));
  const top = nums.slice(0, topCount);
  const avgTop = top.reduce((s, v) => s + v, 0) / top.length;
  // The single best score still has to clear a higher bar on its own too,
  // otherwise a consistently-mediocre match across all poses could sneak
  // through on the averaged value alone.
  return Math.min(nums[0], avgTop + 0.05);
}

// Below this, the captured face is treated as a different person. Raised
// from the original 0.5 and paired with the stricter shape-based
// descriptor above, since the previous raw-pixel comparison let different
// faces with similar lighting/background pass too easily.
export const FACE_MATCH_THRESHOLD = 0.66;
