import { test, expect, type Page } from '@playwright/test';
import { SceneClock } from '../lib/coast/clock';
import { environmentAt, referenceEnvironment } from '../lib/coast/scene-config';
import { sourceToScreen, screenToSource, scene } from '../lib/coast/scene-manifest';

test('clock ignores hidden intervals and clamps interrupted frames',()=>{
  const c=new SceneClock(); c.tick(100); c.tick(116); expect(c.time).toBeCloseTo(.016);
  c.suspend(); c.tick(900000); expect(c.time).toBeCloseTo(.016);
  c.tick(910000); expect(c.time).toBeCloseTo(.066);
  c.seek(5); c.tick(990000); expect(c.time).toBe(5);
});
test('future day cycle passes continuously through the reference sunset',()=>{
  expect(environmentAt(.78)).toEqual(referenceEnvironment);
  for (const p of [.779999,.780001]) {
    const env=environmentAt(p);
    expect(Math.abs(env.sunOffset[0])+Math.abs(env.sunOffset[1])).toBeLessThan(.01);
    expect(env.warmth).toBeCloseTo(1,5);
    expect(env.sky).toEqual([1,1,1]);
  }
});
test('art and interaction coordinates round trip at clipped mobile and wide sizes',()=>{
  for (const rect of [{x:0,y:0,width:1585,height:992},{x:-374,y:-123,width:780,height:780*992/1585},{x:-174,y:0,width:2400,height:984}]) {
    for (const object of Object.values(scene.objects)) {
      const back=screenToSource(sourceToScreen(object,rect),rect);
      expect(back.x).toBeCloseTo(object.x,8); expect(back.y).toBeCloseTo(object.y,8);
    }
  }
});
test('semantic content, running clock, no pause control and live reduced motion',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
  await expect(page.getByRole('heading',{level:1})).toHaveText('SOROUSH KHAJEHPOUR');
  await expect(page.locator('.bio').getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.__coast!.get().time)).toBeGreaterThan(.5);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>page.evaluate(()=>window.__coast!.get().reducedMotion)).toBe(true);
  expect(await page.evaluate(()=>window.__coast!.get().time)).toBe(0);
  const count=await page.evaluate(()=>window.__coast!.get().frames);
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__coast!.get().frames)).toBe(count);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect.poll(()=>page.evaluate(()=>window.__coast!.get().time)).toBeGreaterThan(.1);
  expect(errors).toEqual([]);
});
test('the scene fills every desktop viewport edge to edge without sideways scrolling',async({page})=>{
  for (const [width,height] of [[1440,780],[1920,1080],[1024,768],[3440,1300],[1585,992],[1280,560]]) {
    await page.setViewportSize({width,height});
    await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
    expect(await page.locator('.scene-window').boundingBox()).toEqual({x:0,y:0,width,height});
    // The canvas is one scene pixel wider than the window and shifted by the camera's fraction.
    const box=(await page.locator('.scene-canvas').boundingBox())!;
    expect(box.x).toBeLessThanOrEqual(0); expect(box.x+box.width).toBeGreaterThanOrEqual(width-.5);
    expect(box.y).toBe(0); expect(box.height).toBe(height);
    expect(await page.locator('.homepage').boundingBox()).toEqual({x:0,y:0,width,height});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeGreaterThan(height);
    const buffer=await page.locator('.scene-canvas').evaluate((c:HTMLCanvasElement)=>[c.width,c.height]);
    expect(Math.abs(buffer[0]/buffer[1]-width/height)).toBeLessThan(.01);
    for (const id of ['camera','speaker']) {
      const bounds=await page.locator(`[data-object="${id}"]`).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);
      expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(height+1);
    }
  }
});

const camera=(page:Page)=>page.evaluate(()=>window.__coast!.get().view.x);
const scrollTo=(page:Page,progress:number)=>page.evaluate(p=>{
  document.documentElement.style.scrollBehavior='auto'; document.documentElement.style.scrollSnapType='none';
  window.scrollTo(0,p*innerHeight);
},progress);
const settle=(page:Page)=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

test('desktop draws the panorama and the nav pans the camera to each zone',async({page})=>{
  await page.setViewportSize({width:1744,height:992});
  await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
  expect(await page.evaluate(()=>window.__coast!.get().assets)).toBe('pano');
  expect(await camera(page)).toBeCloseTo(236.4,0);
  const nav=page.getByRole('navigation',{name:'Primary'});
  await nav.getByRole('link',{name:'PROJECTS'}).click();
  // The artwork's designed camera positions: Projects at 1914 and Experience at 3600 in its own coordinates.
  await expect.poll(()=>camera(page)).toBeCloseTo(1914+236,0);
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.getByRole('heading',{level:2,name:/PROJECTS/})).toBeFocused();
  await expect(page.getByRole('heading',{level:2,name:/PROJECTS/})).toBeInViewport();
  await expect(nav.getByRole('link',{name:'PROJECTS'})).toHaveAttribute('aria-current','');
  await nav.getByRole('link',{name:'EXPERIENCE'}).click();
  await expect.poll(()=>camera(page)).toBeCloseTo(3600+236,0);
  await expect(page.getByRole('heading',{level:2,name:/EXPERIENCE/})).toBeInViewport();
  expect(await page.locator('#projects .project').count()).toBe(3);
  expect(await page.locator('#experience .job').count()).toBe(4);
  const resume=nav.getByRole('link',{name:/RESUME/});
  await expect(resume).toHaveAttribute('target','_blank');
  const response=await page.request.get((await resume.getAttribute('href'))!);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('pdf');
  // A deep link opens on its zone.
  await page.goto('/#experience'); await page.waitForFunction(()=>window.__coast?.ready);
  await expect.poll(()=>camera(page)).toBeCloseTo(3600+236,0);
});

test('the objects are gone as whole sprites before the camera moves, and stay gone',async({page})=>{
  await page.setViewportSize({width:1440,height:780});
  await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
  const home=await camera(page);
  const opacity=()=>page.locator('.scene-objects').evaluate(e=>Number(getComputedStyle(e).opacity));
  expect(await opacity()).toBe(1);
  await scrollTo(page,.2); await settle(page);
  expect(await camera(page)).toBe(home);                       // fading in place
  expect(await opacity()).toBeGreaterThan(0); expect(await opacity()).toBeLessThan(1);
  for (const p of [.33,.5,1,1.8,2.5,3.6]) {
    await scrollTo(page,p); await settle(page);
    expect(await opacity()).toBe(0);
  }
  await scrollTo(page,.5); await settle(page);
  expect(await camera(page)).toBeGreaterThan(home);
  // And they come back on the way home.
  await scrollTo(page,0); await settle(page);
  expect(await opacity()).toBe(1);
});

test('keyboard reaches every zone and its links',async({page})=>{
  await page.setViewportSize({width:1440,height:780});
  await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.locator('.stage').getAttribute('data-zone')).toBe('projects');
  await page.keyboard.press('ArrowRight');
  await expect.poll(()=>page.locator('.stage').getAttribute('data-zone')).toBe('experience');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await expect.poll(()=>page.locator('.stage').getAttribute('data-zone')).toBe('home');
  // Tabbing into a project link brings the camera to Projects.
  await page.locator('#projects .project-title a').first().focus();
  await expect.poll(()=>page.locator('.stage').getAttribute('data-zone')).toBe('projects');
  await expect(page.locator('#projects .project-title a').first()).toBeInViewport();
});

test('reduced motion cuts between zones instead of panning',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:780});
  await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
  const seen=new Set<number>();
  for (let p=0;p<=3.6;p+=.15) { await scrollTo(page,p); await settle(page); seen.add(Math.round(await camera(page))); }
  expect(seen.size).toBe(3);
  await page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'EXPERIENCE'}).click();
  await settle(page);
  expect(await page.evaluate(()=>Math.round(window.scrollY/innerHeight*10)/10)).toBe(3.6);
});

test('without WebGL the clean panorama still pans, and the Home still never does',async({browser,baseURL})=>{
  const page=await browser.newPage({viewport:{width:1440,height:780}});
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this,args);
    } as typeof original;
  });
  await page.goto(baseURL!);
  await expect(page.locator('.scene-fallback').first()).toBeVisible();
  await scrollTo(page,1.8);
  const still=page.locator('.scene-fallback-panorama');
  await expect.poll(()=>still.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth===5580)).toBe(true);
  await expect(page.locator('.scene-fallback').first()).toBeHidden();
  // The panorama still is placed by the camera: its left edge is at -camera in scene px.
  const ww=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.site')!).getPropertyValue('--ww')));
  const left=(await still.boundingBox())!.x;
  expect(-left/(1440/ww)).toBeCloseTo(1914+236+(1744-ww)/2,-1);
  await expect(page.getByRole('heading',{level:2,name:/PROJECTS/})).toBeInViewport();
  await page.close();
});

test('phones stack the zones under the unchanged hero and draw only the Home scene',async({page})=>{
  for (const [width,height] of [[390,844],[820,1180],[1280,560]]) {
    await page.setViewportSize({width,height});
    await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
    expect(await page.evaluate(()=>window.__coast!.get().assets)).toBe('home');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'EXPERIENCE'}).click();
    await expect(page.getByRole('heading',{level:2,name:/EXPERIENCE/})).toBeInViewport();
    const strip=(await page.locator('#projects .zone-strip').boundingBox())!;
    expect(strip.width).toBeCloseTo(width,0);
  }
});

test('waves visibly travel: the sea changes substantially within a few seconds',async({page})=>{
  await page.setViewportSize({width:1440,height:780});
  await page.goto('/?scene=reference'); await page.waitForFunction(()=>window.__coast?.ready);
  const frame=async(time:number)=>{
    await page.evaluate(t=>window.__coast!.set({time:t,paused:true}),time);
    return page.screenshot({clip:{x:0,y:340,width:1440,height:440}});
  };
  const a=await frame(0), b=await frame(1.5), c=await frame(4.3);
  expect(a.equals(b)).toBe(false); expect(b.equals(c)).toBe(false);
  // Count changed pixels via the browser, which can decode PNGs.
  const changed=await page.evaluate(async([x,y]:[string,string])=>{
    const load=(s:string)=>new Promise<ImageData>(r=>{const i=new Image();i.onload=()=>{const k=document.createElement('canvas');k.width=i.width;k.height=i.height;const g=k.getContext('2d')!;g.drawImage(i,0,0);r(g.getImageData(0,0,i.width,i.height));};i.src=s;});
    const [p,q]=await Promise.all([load(x),load(y)]);
    let n=0;for(let i=0;i<p.data.length;i+=4) if(Math.abs(p.data[i]-q.data[i])>24) n++;
    return n/(p.width*p.height);
  },['data:image/png;base64,'+a.toString('base64'),'data:image/png;base64,'+c.toString('base64')] as [string,string]);
  expect(changed).toBeGreaterThan(.12);
});
test('reduced motion starts still and small screens retain the complete objects',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for (const width of [320,390,700,701,1280,1920]) {
    await page.setViewportSize({width,height:844});
    await page.goto('/'); await page.waitForFunction(()=>window.__coast?.ready);
    const state=await page.evaluate(()=>window.__coast!.get());
    expect(state.time).toBe(0); expect(state.running).toBe(false);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    for (const id of ['camera','speaker']) {
      const bounds=await page.locator(`[data-object="${id}"]`).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width+1);
    }
  }
});
test('no WebGL and missing textures retain a visible static scene',async({browser,baseURL})=>{
  for (const failure of ['context','asset']) {
    const page=await browser.newPage();
    if (failure==='context') await page.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:Parameters<typeof original>){
        if (String(args[0]).startsWith('webgl')) return null;
        return original.apply(this,args);
      } as typeof original;
    });
    else await page.route('**/coast/water.png',route=>route.abort());
    await page.goto(baseURL!);
    await expect(page.locator('.scene-fallback')).toBeVisible();
    await expect.poll(()=>page.locator('.scene-fallback').evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await page.close();
  }
});
test('visibility events suspend the loop and resume without a clock jump',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>window.__coast?.ready);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const before=await page.evaluate(()=>window.__coast!.get());
  expect(before.running).toBe(false);
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>window.__coast!.get().frames)).toBe(before.frames);
  await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(()=>page.evaluate(()=>window.__coast!.get().time)).toBeGreaterThan(before.time);
  const elapsed=await page.evaluate(()=>window.__coast!.get().time)-before.time;
  expect(elapsed).toBeLessThan(.2);
});
test('context loss returns to the still without losing the bio',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>window.__coast?.ready);
  await page.evaluate(()=>document.querySelector('canvas')!.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(page.locator('.scene-window')).toHaveAttribute('data-ready','false');
  await expect(page.locator('.scene-fallback')).toBeVisible();
  await expect(page.locator('.bio').getByRole('listitem')).toHaveCount(2);
});
