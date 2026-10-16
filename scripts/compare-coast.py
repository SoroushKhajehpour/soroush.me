"""Compare canonical browser rendering and verify protected pixels over ten phases."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification'
def read(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.int16)
ref=read(ROOT/'assets/reference/homepage_design.png')
actual=read(OUT/'canonical.png')
diff=np.abs(ref-actual)
Image.fromarray(((ref+actual)/2).astype(np.uint8)).save(OUT/'overlay.png')
heat=np.zeros_like(ref);heat[:,:,0]=np.clip(diff.max(2)*5,0,255);heat[:,:,2]=np.clip(diff.mean(2)*2,0,255)
Image.fromarray(heat.astype(np.uint8)).save(OUT/'difference.png')
regions={'whole':[0,0,1585,992],'title':[74,66,1031,131],'bio':[79,140,675,300],
 'water':[0,422,880,790],'sun':[940,270,1160,422],'camera':[887,765,1127,893],
 'speaker':[1215,651,1494,847],'life':[959,887,1048,929]}
report={}
for name,(x,y,w,h) in regions.items():
 a=diff[y:h,x:w]
 report[name]={'meanAbsoluteChannelError':round(float(a.mean()),5),
  'maximumChannelError':int(a.max()),'exactPixelsPercent':round(float((a.max(2)==0).mean()*100),3)}
art_mask=np.ones(ref.shape[:2],dtype=bool)
art_mask[140:300,79:675]=False
report['outsideBio']={'maximumChannelError':int(diff[art_mask].max()),
 'exactPixelsPercent':round(float((diff.max(2)[art_mask]==0).mean()*100),3)}
manifest=json.loads((ROOT/'public/coast/manifest.json').read_text())
left=manifest['padLeft']
# The canonical capture shows the original 1585 px illustration, i.e. the centre of the wider scene.
protected=(np.array(Image.open(ROOT/'public/coast/protected-land.png'))>0)[:,left:left+1585]
# Dry sand and the objects must never change. Clouds and the sun's glow now drift, so the sky is excluded.
protected[:manifest['horizon']]=False
base=read(OUT/'phases/0.png')
invariants=[]
for p in sorted((OUT/'phases').glob('*.png'),key=lambda p:float(p.stem)):
 d=np.abs(base-read(p))
 max_protected=int(d[protected].max())
 invariants.append({'seconds':float(p.stem),'maxProtectedChange':max_protected,'changedWaterPixels':int((d.max(2)>0).sum())})
 assert max_protected==0, f'Water escaped its allowed mask at {p.stem}s: {max_protected}'
assert any(i['changedWaterPixels']>1000 for i in invariants), 'Water did not animate'
result={'reference':report,'shorelineInvariants':invariants}
(OUT/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
