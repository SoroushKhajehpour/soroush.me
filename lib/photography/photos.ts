/**
 * The camera's memory card: Soroush's photographs, in shuffled order. With none listed
 * the LCD shows NO IMAGES. See README.md in this folder.
 */
export interface Photograph {
  id: string;
  /** A local path (/photography/…) or full URL. Used when no Cloudinary id is given. */
  src: string;
  /** Original dimensions, so the LCD can lay the image out before it loads. */
  width: number;
  height: number;
  alt: string;
  /** Public id in Cloudinary; with NEXT_PUBLIC_CLOUDINARY_CLOUD set it is served from there. */
  cloudinaryId?: string;
  filename?: string;
  /** Only the real capture date. */
  date?: string;
}

export const photographs: Photograph[] = [
  { id: "photo-11", src: "/photography/photo-11.jpg", width: 665, height: 1182, alt: "A cat in a reindeer hat" },
  { id: "photo-13", src: "/photography/photo-13.jpg", width: 665, height: 1180, alt: "Canoeing on a turquoise mountain lake" },
  { id: "photo-01", src: "/photography/photo-01.jpg", width: 1600, height: 1200, alt: "Four friends on a snowy sidewalk at night" },
  { id: "photo-02", src: "/photography/photo-02.jpg", width: 768, height: 1024, alt: "Night selfie with friends on a snowy path" },
  { id: "photo-08", src: "/photography/photo-08.jpg", width: 665, height: 1182, alt: "A campfire on the beach at night" },
  { id: "photo-05", src: "/photography/photo-05.jpg", width: 665, height: 1182, alt: "A resort pool lit up at night" },
  { id: "photo-12", src: "/photography/photo-12.jpg", width: 768, height: 1024, alt: "Two kids with a toy guitar" },
  { id: "photo-06", src: "/photography/photo-06.jpg", width: 768, height: 1024, alt: "Two friends in front of Niagara Falls at night" },
  { id: "photo-04", src: "/photography/photo-04.jpg", width: 1024, height: 768, alt: "Friends in costume holding a giant driver's licence banner" },
  { id: "photo-07", src: "/photography/photo-07.jpg", width: 665, height: 1182, alt: "Late-night coding with a Monster at a hackathon" },
  { id: "photo-10", src: "/photography/photo-10.jpg", width: 360, height: 638, alt: "A waterfront patio at dusk with a yacht" },
  { id: "photo-09", src: "/photography/photo-09.jpg", width: 665, height: 1182, alt: "Two plates of kabob and saffron rice" },
  { id: "photo-03", src: "/photography/photo-03.jpg", width: 714, height: 1100, alt: "Standing in an alley under red neon hearts" },
  { id: "photo-14", src: "/photography/photo-14.jpg", width: 769, height: 1022, alt: "Mirror selfie in a white shirt" },
];

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;

/** A URL for the photo at about `width` device pixels wide. */
export function photoUrl(photo: Photograph, width: number) {
  const w = Math.max(64, Math.round(width / 64) * 64);  // a few cache-friendly sizes
  if (cloud && photo.cloudinaryId) {
    return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_limit,w_${w}/${photo.cloudinaryId}`;
  }
  return photo.src;
}
