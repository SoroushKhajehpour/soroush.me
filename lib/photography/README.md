# Camera gallery photos

Clicking the camera on the beach picks it up; its LCD shows the photographs listed in `photos.ts`. The list starts empty, and the LCD then shows `NO IMAGES`.

Each entry:

```ts
{
  id: "unique-photo-id",
  src: "/photography/your-image.jpg", // or a full URL
  width: 3000,                         // original size
  height: 2000,
  alt: "A description of the actual photograph",
  cloudinaryId: "folder/your-image",   // optional
  filename: "your-image.jpg",          // optional
  date: "2026-10-19",                  // optional; only the real date
}
```

**Hosting.** Photos don't need to be committed. To serve them from Cloudinary, set `NEXT_PUBLIC_CLOUDINARY_CLOUD` to your cloud name (it is public, not a secret) and give each photo a `cloudinaryId`; `photoUrl()` then requests sized, auto-format images (`f_auto,q_auto,c_limit,w_…`). Without it, `src` is used as is. Thumbnails are requested at about 256 px, the open photo at the LCD's device width, and the neighbouring photos are preloaded.

**Camera artwork.** `lib/photography/camera-rear.ts` holds the LCD and button positions measured from `public/coast/camera-rear.png`, as fractions of the image. Re-measure if the sprite changes.
