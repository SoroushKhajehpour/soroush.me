import { boundsStyle, scene, sceneObjects, type SceneAction } from "@/lib/coast/scene-manifest";

export interface SceneObjectsProps {
  onAction?: Partial<Record<SceneAction, (button: HTMLButtonElement) => void>>;
}

export function SceneObjects({ onAction }: SceneObjectsProps) {
  return (
    <div className="scene-objects">
      {sceneObjects.map(object=> {
        const action = onAction?.[object.action];
        return (
          <div className="scene-object" data-object={object.id} key={object.id} style={boundsStyle(object)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={object.src} width={object.width} height={object.height} alt="" draggable="false" />
            {action && <button className="object-action" onClick={event=>action(event.currentTarget)} aria-label={object.label} />}
          </div>
        );
      })}
      <div className="scene-object" style={boundsStyle(scene.objects.life)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coast/life.png" width={scene.objects.life.width} height={scene.objects.life.height} alt="" draggable="false" />
      </div>
    </div>
  );
}
