/**
 * Geometry of the held camera sprite, public/coast/camera-rear.png (1536 × 1024), measured
 * from the PNG itself: the LCD is the flat #121517 interior (378–1123 × 310–756), inset
 * 4 px so content never touches the bezel; buttons are the dark control shapes on the
 * right. Everything is stored as fractions of the image, so it scales with the artwork.
 */
export const rear = { src: "/coast/camera-rear.png", width: 1536, height: 1024 } as const;

type Box = readonly [x0: number, y0: number, x1: number, y1: number];
const box = ([x0, y0, x1, y1]: Box) => ({
  left: x0 / rear.width, top: y0 / rear.height,
  width: (x1 - x0) / rear.width, height: (y1 - y0) / rear.height,
});

export const rearGeometry = {
  /** Opaque body and strap. */
  body: box([41, 188, 1462, 863]),
  lcd: box([382, 314, 1120, 753]),
  playback: box([1217, 333, 1339, 424]),
  up: box([1247, 466, 1316, 530]),
  down: box([1247, 610, 1316, 674]),
  left: box([1185, 535, 1249, 605]),
  right: box([1314, 535, 1378, 605]),
  select: box([1251, 537, 1312, 602]),
  lower: box([1217, 699, 1308, 762]),
} as const;
export type RearPart = keyof typeof rearGeometry;
