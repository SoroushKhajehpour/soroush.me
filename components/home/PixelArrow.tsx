/* 7 × 7 bitmap arrows, drawn on a crisp grid so they read as part of the pixel lettering. */
const shapes = {
  "up-right": "M3 0h4v1H3zM5 1h2v1H5zM4 2h1v1H4zM6 2h1v1H6zM3 3h1v1H3zM6 3h1v1H6zM2 4h1v1H2zM1 5h1v1H1zM0 6h1v1H0z",
  down: "M3 0h1v7H3zM0 3h1v1H0zM6 3h1v1H6zM1 4h1v1H1zM5 4h1v1H5zM2 5h1v1H2zM4 5h1v1H4z",
};

export function PixelArrow({ direction = "up-right" }: { direction?: keyof typeof shapes }) {
  return (
    <svg className="pixel-arrow" viewBox="0 0 7 7" aria-hidden="true" shapeRendering="crispEdges">
      <path d={shapes[direction]} fill="currentColor" />
    </svg>
  );
}
