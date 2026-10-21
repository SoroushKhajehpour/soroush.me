export const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uGround;
uniform sampler2D uWater;
uniform sampler2D uAtmosphere;
uniform sampler2D uSun;
uniform sampler2D uShore;
uniform sampler2D uFlow;
uniform sampler2D uDetail;
uniform sampler2D uPatchGround; // original Home layers around the objects (see extract-panorama.py)
uniform sampler2D uPatchWater;
uniform vec4 uPatch;            // its world rectangle: x0, y0, x1, y1
uniform float uObjects;         // 1 while the original Home art is wanted under the objects
uniform sampler2D uCamera;      // the Home objects, drawn into the scene so they pan locked to it
uniform sampler2D uSpeakerSand;  // the sand under the playable speaker (components/home/Speaker.tsx)
uniform sampler2D uLife;
uniform vec4 uCameraRect;       // x, y, width, height in world px
uniform float uCameraVisible;   // 0 while the camera has been picked up (CameraGallery)
uniform sampler2D uCameraSand;  // the clean sand under it, then
uniform vec4 uCameraSandRect;
uniform vec4 uSpeakerSandRect;
uniform vec4 uLifeRect;
uniform vec2 uSize;   // whole world (scene px)
uniform vec2 uBuf;    // drawing buffer = the visible window
uniform vec2 uView;   // top-left of the visible window in the world
uniform vec2 uSunPos;
uniform float uDataTop;  // first world row covered by the water and data layers
uniform vec2 uAtmoSize;  // the Home sky layer (atmosphere) covers x < uAtmoSize.x
uniform float uJoin;     // Home sky layers apply left of this column only
uniform vec2 uDusk;      // sunset-only effects fade out across this x range
uniform float uTime;
uniform float uSeed;
uniform float uMotion;
uniform float uRunup;
uniform vec4 uWaves[4];
uniform vec2 uSunOffset;
uniform vec3 uSkyTint;
uniform vec3 uWaterTint;
uniform vec3 uSandTint;
uniform float uWarmth;
uniform float uReflection;
const float TAU = 6.28318530718;

vec2 texUV(vec2 p) { return vec2(p.x/uSize.x, 1.0-p.y/uSize.y); }
// Water and data layers start at the horizon row.
vec2 dataUV(vec2 p) { return vec2(p.x/uSize.x, 1.0-(p.y-uDataTop)/(uSize.y-uDataTop)); }
vec4 field(vec2 p) { return texture2D(uShore,dataUV(p)); }
float inPatch(vec2 p) { return step(uPatch.x,p.x)*step(p.x,uPatch.z-0.5)*step(uPatch.y,p.y)*step(p.y,uPatch.w-0.5); }
vec2 patchUV(vec2 p) { return vec2((p.x-uPatch.x)/(uPatch.z-uPatch.x), 1.0-(p.y-uPatch.y)/(uPatch.w-uPatch.y)); }
float distanceToShore(vec2 p) {
  vec4 f = field(p);
  return (floor(f.r*255.0+0.5)*256.0+floor(f.g*255.0+0.5))/16.0-1024.0;
}
float coastLuminance(vec3 c) { return dot(c,vec3(0.2126,0.7152,0.0722)); }
float hash21(vec2 p) {
  p = fract(p*vec2(123.34,456.21));
  p += dot(p,p+45.32);
  return fract(p.x*p.y);
}
// Swells travelling toward the beach. Each component is a source-relative
// displacement, W(p,t)-W(p,0), so the reference phase stays an exact identity.
vec2 waveOffset(vec2 p, float time) {
  float perspective = smoothstep(422.0, 980.0, p.y);
  float scale = 0.16 + 0.84*perspective;
  float stretch = 0.4 + 0.6*perspective; // crests bunch up toward the horizon
  vec2 value = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    vec2 direction = vec2(sin(w.w), cos(w.w));
    float coord = dot(p, direction);
    float phase = coord*TAU/(w.x*stretch) + sin(p.x*0.004+float(i))*0.9 + uSeed*0.37*float(i+1);
    float nextPhase = phase - time*TAU/w.y;
    value += direction*(sin(nextPhase)-sin(phase))*w.z;
  }
  // Rows of dashes also slide sideways as swells pass, like wind-driven chop.
  float row = p.y*0.021;
  value.x += (sin(row - time*0.9 + p.x*0.002) - sin(row + p.x*0.002))*3.2;
  return value * scale * smoothstep(422.0,443.0,p.y);
}
vec3 sprite(sampler2D image, vec4 rect, vec2 p, vec3 under) {
  vec2 s = p-rect.xy;
  if (s.x<0.0 || s.y<0.0 || s.x>=rect.z || s.y>=rect.w) return under;
  vec4 c = texture2D(image,vec2(s.x/rect.z,1.0-s.y/rect.w));
  return mix(under,c.rgb,c.a);
}
// Water sampled at a fractional horizontal position: neighbouring texels are blended so
// far-off dashes glide instead of popping a whole pixel at a time. Vertically it stays on
// whole rows, so foam lines keep their crisp edges.
vec4 glideWater(vec2 q) {
  float x = q.x-0.5;
  float x0 = floor(x);
  float f = x-x0;
  vec2 a = vec2(x0+0.5,floor(q.y)+0.5);
  vec4 w0 = texture2D(uWater,dataUV(a));
  vec4 w1 = texture2D(uWater,dataUV(a+vec2(1.0,0.0)));
  if (w0.a > 0.5 && w1.a > 0.5) return vec4(mix(w0.rgb,w1.rgb,f),1.0);
  return f < 0.5 ? w0 : w1;
}
float wash(float phase) {
  // Slightly faster incoming wash, slower retreat. Bounded in [-1,1].
  return (sin(phase)+0.22*sin(2.0*phase))/1.22;
}
void main() {
  vec2 p = floor(vec2(vUv.x,1.0-vUv.y)*uBuf) + uView + 0.5;
  // Ambient life fades in over the first moments so t=0 is the exact reference.
  float settle = smoothstep(0.0,1.5,uTime)*uMotion;
  vec4 ground = texture2D(uGround,texUV(p));
  vec3 color = ground.rgb;
  float original = inPatch(p)*uObjects;
  // Once the camera has been picked up, the sand it lay on is clean: the Home plate keeps
  // traces of the camera right at its edges, normally hidden under it.
  if (uCameraVisible < 0.5) {
    vec2 c = p-uCameraSandRect.xy;
    if (c.x >= 0.0 && c.y >= 0.0 && c.x < uCameraSandRect.z && c.y < uCameraSandRect.w) {
      original = 0.0;
      color = texture2D(uCameraSand,vec2(c.x/uCameraSandRect.z,1.0-c.y/uCameraSandRect.w)).rgb;
    }
  }
  if (original > 0.0) color = mix(color,texture2D(uPatchGround,patchUV(p)).rgb,original);
  float shore = distanceToShore(p);
  // The speaker painted into the Home art is replaced by the playable one, a DOM sprite
  // that bounces to the music; here it is the sand it stands on, with its shadow.
  vec2 ss = p-uSpeakerSandRect.xy;
  if (shore > 0.0 && ss.x >= 0.0 && ss.y >= 0.0 && ss.x < uSpeakerSandRect.z && ss.y < uSpeakerSandRect.w)
    color = texture2D(uSpeakerSand,vec2(ss.x/uSpeakerSandRect.z,1.0-ss.y/uSpeakerSandRect.w)).rgb;
  vec4 flow = texture2D(uFlow,dataUV(p));
  // 0 where the sunset lights the scene, 1 where the panorama has turned to dusk and night.
  float dusk = smoothstep(uDusk.x,uDusk.y,p.x);
  vec2 normal = normalize(flow.rg*2.0-1.0);

  if (p.y < 422.0 && p.x < uJoin) {
    vec2 hp = p-uSunOffset;
    // Streaks of cloud drift slowly, each row at its own pace.
    float cloud = (sin(uTime*0.13+hp.y*0.05)-sin(hp.y*0.05))*9.0*settle;
    cloud *= smoothstep(150.0,330.0,length(hp-uSunPos-vec2(64.0,63.0))); // keep the sun's own glow still
    cloud *= 1.0-smoothstep(uJoin-320.0,uJoin-80.0,p.x);                  // and the clouds at the join
    hp.x += floor(cloud+0.5);
    if (hp.x>=0.0 && hp.x<uAtmoSize.x && hp.y>=0.0 && hp.y<422.0) {
      vec4 halo = texture2D(uAtmosphere,vec2(hp.x/uAtmoSize.x,1.0-hp.y/422.0));
      float glow = 1.0+0.05*settle*sin(uTime*0.7);
      color = mix(color,halo.rgb,clamp(halo.a*uWarmth*glow,0.0,1.0));
    }
    vec2 sp = p-uSunPos-uSunOffset;
    if (sp.x>=0.0 && sp.y>=0.0 && sp.x<129.0 && sp.y<127.0) {
      vec4 sun = texture2D(uSun,vec2(sp.x/129.0,1.0-sp.y/127.0));
      color = mix(color,sun.rgb,sun.a);
    }
    color *= uSkyTint;
  } else if (p.y < 422.0) {
    color *= uSkyTint;
  } else {
    color *= uSandTint;
  }

  // All contributions (including foam and reflection) share this hard land constraint.
  // Everything near the horizon is far away: the wash, its reach and the swell all shrink
  // with distance, so a shore just under the horizon moves a few pixels, not 22.
  float near = mix(0.16,1.0,smoothstep(430.0,700.0,p.y));
  float reach = uRunup*near;
  if (p.y >= 422.0 && shore <= reach && flow.b < 0.5) {
    float phase = -p.x*0.0028;
    // Two wash trains of different periods keep the wash from looking mechanical.
    float swash = ((wash(phase+uTime*TAU/8.8)-wash(phase))*0.7
                 + (wash(phase*1.7+1.3+uTime*TAU/13.3)-wash(phase*1.7+1.3))*0.3)*0.5*reach*uMotion;
    float boundary = 1.0-smoothstep(8.0*near,130.0*near,abs(shore));
    float reflectionHere = texture2D(uDetail,dataUV(p)).g;
    vec2 drift = waveOffset(p,uTime)*uMotion*smoothstep(3.0*near,90.0*near,-shore);
    // The dusk and night art has tall, dense crests: a strong vertical swell would stretch
    // them into streaks, so there the swell mostly travels sideways along the crests.
    drift.y *= mix(1.0,0.4,dusk);
    drift.x *= mix(1.0,1.3,dusk);
    // The sun's glitter path wobbles row by row.
    vec2 shimmer = vec2(floor(sin(p.y*0.8+uTime*2.4)*2.0+sin(p.y*0.37-uTime*1.6)*1.5+0.5)*reflectionHere*settle,0.0);
    vec2 displacement = drift+shimmer-normal*swash*boundary;
    // Vertical movement stays on whole scene pixels; horizontal glides (glideWater).
    vec2 q = p + vec2(displacement.x,floor(displacement.y+0.5));
    q.y = max(q.y,422.5);
    vec4 water = glideWater(q);
    q = floor(q)+0.5;
    if (water.a > 0.5) {
      vec3 waterColor = water.rgb;
      float originalWater = inPatch(q)*uObjects;
      if (originalWater > 0.0) waterColor = mix(waterColor,texture2D(uPatchWater,patchUV(q)).rgb,originalWater);
      vec4 detail = texture2D(uDetail,dataUV(q));
      float depth = field(p).b;
      float travelling = sin(p.y*0.041-p.x*0.004-uTime*0.71)
                       - sin(p.y*0.041-p.x*0.004);
      // Broad bands of light roll shoreward with the swells.
      waterColor *= 1.0 + travelling*0.07*depth*(1.0-detail.r)*uMotion;
      // Foam dashes blink and sparkle as light catches the moving surface.
      vec2 cell = floor(q/vec2(9.0,3.0));
      float tick = floor(uTime*2.4+hash21(cell)*8.0);
      float blink = hash21(cell+tick*1.7);
      // Under the sunset a dash dims to the Home grey; at dusk and night it dims toward its own sea.
      vec3 dimmed = mix(vec3(0.6,0.63,0.67),waterColor*0.72,dusk);
      waterColor = mix(waterColor,dimmed,step(0.8,blink)*detail.r*0.7*settle);
      float spark = step(0.93,hash21(floor(q/2.0)+floor(uTime*3.0)*3.1));
      waterColor = mix(waterColor,vec3(1.0,0.9,0.72),spark*detail.g*0.55*settle);
      if (abs(uSunOffset.x)>0.01 || abs(uReflection-1.0)>0.001) {
        float r = detail.g;
        waterColor = mix(waterColor,vec3(coastLuminance(waterColor)),r);
        vec2 rp = q-vec2(uSunOffset.x,0.0);
        float shiftedR = texture2D(uDetail,dataUV(rp)).g;
        vec3 shifted = texture2D(uWater,dataUV(rp)).rgb;
        waterColor = mix(waterColor,shifted,shiftedR*uReflection);
      }
      waterColor *= uWaterTint;
      // Where the wash runs up over dry sand it thins to a translucent film at its edge, with
      // a faint bright lip, and the sand beneath shows through darkened by the water.
      if (shore > 0.0) {
        float film = clamp(-distanceToShore(q)/(7.0*near),0.0,1.0);
        vec3 wetSand = color*0.86;
        waterColor = mix(mix(wetSand,waterColor,0.55),waterColor,film);
        waterColor += vec3(0.05)*(1.0-film)*settle;
      }
      color = waterColor;
    } else if (shore < 0.0) {
      color *= 0.93; // sand the wash has just left is still wet
    }
  }
  // The Home objects sit on top of everything, drawn at the same scene pixels as the art.
  if (uCameraVisible > 0.5) color = sprite(uCamera,uCameraRect,p,color);
  color = sprite(uLife,uLifeRect,p,color);
  gl_FragColor = vec4(color,1.0);
  #include <colorspace_fragment>
}
`;

// Second pass: the scene (rendered at scene pixels) is enlarged to the screen's device
// pixels with sharp bilinear filtering: every scene pixel stays a crisp square, only its
// edges are blended across one device pixel. That keeps pixel art sharp at any zoom
// factor and lets the camera sit between scene pixels, so panning is perfectly smooth.
export const presentFragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uImageSize;  // scene buffer, in scene px
uniform vec2 uScale;      // device px per scene px
uniform vec2 uOffset;     // camera position inside the buffer's first scene pixel
uniform vec2 uCanvas;     // canvas size in device px
void main() {
  vec2 device = vec2(vUv.x,1.0-vUv.y)*uCanvas;
  vec2 t = device/uScale + uOffset;
  vec2 seam = floor(t+0.5);
  vec2 texelsPerDevice = 1.0/uScale;
  t = seam + clamp((t-seam)/texelsPerDevice,-0.5,0.5);
  gl_FragColor = texture2D(uImage,vec2(t.x/uImageSize.x,1.0-t.y/uImageSize.y));
  #include <colorspace_fragment>
}
`;
