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
uniform vec2 uSize;   // whole scene (scene px)
uniform vec2 uBuf;    // drawing buffer = the visible window
uniform vec2 uView;   // top-left of the visible window in the scene
uniform vec2 uSunPos;
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
vec4 field(vec2 p) { return texture2D(uShore,texUV(p)); }
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
  float shore = distanceToShore(p);
  vec4 flow = texture2D(uFlow,texUV(p));
  vec2 normal = normalize(flow.rg*2.0-1.0);

  if (p.y < 422.0) {
    vec2 hp = p-uSunOffset;
    // Streaks of cloud drift slowly, each row at its own pace.
    float cloud = (sin(uTime*0.13+hp.y*0.05)-sin(hp.y*0.05))*9.0*settle;
    cloud *= smoothstep(150.0,330.0,length(hp-uSunPos-vec2(64.0,63.0))); // keep the sun's own glow still
    hp.x += floor(cloud+0.5);
    if (hp.x>=0.0 && hp.x<uSize.x && hp.y>=0.0 && hp.y<422.0) {
      vec4 halo = texture2D(uAtmosphere,vec2(hp.x/uSize.x,1.0-hp.y/422.0));
      float glow = 1.0+0.05*settle*sin(uTime*0.7);
      color = mix(color,halo.rgb,clamp(halo.a*uWarmth*glow,0.0,1.0));
    }
    vec2 sp = p-uSunPos-uSunOffset;
    if (sp.x>=0.0 && sp.y>=0.0 && sp.x<129.0 && sp.y<127.0) {
      vec4 sun = texture2D(uSun,vec2(sp.x/129.0,1.0-sp.y/127.0));
      color = mix(color,sun.rgb,sun.a);
    }
    color *= uSkyTint;
  } else {
    color *= uSandTint;
  }

  // All contributions (including foam and reflection) share this hard land constraint.
  if (p.y >= 422.0 && shore <= uRunup && flow.b < 0.5) {
    float phase = -p.x*0.0028;
    // Two wash trains of different periods keep the wash from looking mechanical.
    float swash = ((wash(phase+uTime*TAU/8.8)-wash(phase))*0.7
                 + (wash(phase*1.7+1.3+uTime*TAU/13.3)-wash(phase*1.7+1.3))*0.3)*0.5*uRunup*uMotion;
    float boundary = 1.0-smoothstep(8.0,90.0,abs(shore));
    float reflectionHere = texture2D(uDetail,texUV(p)).g;
    vec2 drift = waveOffset(p,uTime)*uMotion*smoothstep(3.0,60.0,-shore);
    // The sun's glitter path wobbles row by row.
    vec2 shimmer = vec2(floor(sin(p.y*0.8+uTime*2.4)*2.0+sin(p.y*0.37-uTime*1.6)*1.5+0.5)*reflectionHere*settle,0.0);
    vec2 displacement = drift+shimmer-normal*swash*boundary;
    // Quantize movement, not the original image. Its fine rectangular detail survives.
    displacement = floor(displacement+0.5);
    vec2 q = p + displacement;
    q.y = max(q.y,422.5);
    vec4 water = texture2D(uWater,texUV(q));
    if (water.a > 0.5) {
      vec3 waterColor = water.rgb;
      vec4 detail = texture2D(uDetail,texUV(q));
      float depth = field(p).b;
      float travelling = sin(p.y*0.041-p.x*0.004-uTime*0.71)
                       - sin(p.y*0.041-p.x*0.004);
      // Broad bands of light roll shoreward with the swells.
      waterColor *= 1.0 + travelling*0.07*depth*(1.0-detail.r)*uMotion;
      // Foam dashes blink and sparkle as light catches the moving surface.
      vec2 cell = floor(q/vec2(9.0,3.0));
      float tick = floor(uTime*2.4+hash21(cell)*8.0);
      float blink = hash21(cell+tick*1.7);
      waterColor = mix(waterColor,vec3(0.6,0.63,0.67),step(0.8,blink)*detail.r*0.7*settle);
      float spark = step(0.93,hash21(floor(q/2.0)+floor(uTime*3.0)*3.1));
      waterColor = mix(waterColor,vec3(1.0,0.9,0.72),spark*detail.g*0.55*settle);
      if (abs(uSunOffset.x)>0.01 || abs(uReflection-1.0)>0.001) {
        float r = detail.g;
        waterColor = mix(waterColor,vec3(coastLuminance(waterColor)),r);
        vec2 rp = q-vec2(uSunOffset.x,0.0);
        float shiftedR = texture2D(uDetail,texUV(rp)).g;
        vec3 shifted = texture2D(uWater,texUV(rp)).rgb;
        waterColor = mix(waterColor,shifted,shiftedR*uReflection);
      }
      color = waterColor*uWaterTint;
    } else if (shore < 0.0) {
      color *= 0.93; // sand the wash has just left is still wet
    }
  }
  gl_FragColor = vec4(color,1.0);
  #include <colorspace_fragment>
}
`;
