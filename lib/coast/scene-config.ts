export const profile = {
  name: "SOROUSH KHAJEHPOUR",
  details: [
    "computer engineering @ uwaterloo",
    "software developer intern @ KA Imaging",
    "prev software intern @ roam",
    "seeking summer 2027 internships",
  ],
};

export type RGB = readonly [number, number, number];
export interface Environment {
  sunOffset: readonly [number, number];
  sky: RGB;
  water: RGB;
  sand: RGB;
  warmth: number;
  reflection: number;
}

export const referenceEnvironment: Environment = {
  sunOffset: [0, 0], sky: [1, 1, 1], water: [1, 1, 1], sand: [1, 1, 1],
  warmth: 1, reflection: 1,
};

export interface SceneState {
  time: number;
  seed: number;
  paused: boolean;
  motion: number;
  maxRunup: number;
  environment: Environment;
}

export const defaultState: SceneState = {
  time: 0, seed: 17, paused: false, motion: 1, maxRunup: 22,
  environment: referenceEnvironment,
};

// Wavelength (source px), period (seconds), displacement (px), direction (radians).
// Swells travel toward the beach. Together they can compress the surface by at most
// ~100%, so crests slide and bunch without folding over one another.
export const waves = [
  [310, 9.6, 8.5, 0.14],
  [170, 6.4, 4.2, -0.2],
  [92, 4.3, 1.8, 0.32],
  [50, 2.9, 0.7, -0.12],
] as const;

/** Optional art-directed palette, independent of animation time; never auto-enabled. */
export function environmentAt(progress: number): Environment {
  const p = Math.min(1, Math.max(0, progress));
  const smooth = (a: number,b: number,t: number) => {
    const x=Math.min(1,Math.max(0,(t-a)/(b-a)));
    return x*x*(3-2*x);
  };
  const elevation = (t:number)=>Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.22)/.68)));
  const daylight = smooth(.17,.27,p)*(1-smooth(.82,.96,p));
  const midday = smooth(.27,.42,p)*(1-smooth(.65,.78,p));
  // The continuous curve passes through the authored sunset; this keeps exact defaults.
  if (p === .78) return referenceEnvironment;
  return {
    sunOffset: [(p - 0.78) * 360, -(elevation(p)-elevation(.78))*310],
    sky: [0.16 + daylight * 0.84, 0.22 + daylight * 0.78, 0.36 + daylight * 0.64],
    water: [0.22 + daylight * 0.78, 0.3 + daylight * 0.7, 0.4 + daylight * 0.6],
    sand: [0.35 + daylight * 0.65, 0.4 + daylight * 0.6, 0.5 + daylight * 0.5],
    warmth: (1-midday*.8)*daylight,
    reflection: (1-midday*.6)*daylight,
  };
}
