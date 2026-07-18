"""Post-reduction shimmer/drift at the 32x48 contract. Alpha-aware."""
import sys, pathlib
from PIL import Image
def stats(d):
    fs=sorted(pathlib.Path(d).glob("n*.png")); prev=None; out=[]
    for p in fs:
        im=Image.open(p).convert("RGBA"); px=im.load(); w,h=im.size
        xs=[x for y in range(h) for x in range(w) if px[x,y][3]>0]
        ys=[y for y in range(h) for x in range(w) if px[x,y][3]>0]
        chg=0; tot=0
        if prev is not None:
            for y in range(h):
                for x in range(w):
                    a,b=px[x,y],prev[x,y]
                    if a[3]>0 or b[3]>0:
                        tot+=1
                        if abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2])>60 or (a[3]>0)!=(b[3]>0): chg+=1
        out.append((p.stem,min(xs),max(xs),min(ys),max(ys),chg,tot)); prev=px
    return out
for d in sys.argv[1:]:
    r=stats(d); print(f"\n=== {pathlib.Path(d).name} ===")
    for n,x0,x1,y0,y1,chg,tot in r:
        pct = 100*chg/tot if tot else 0
        print(f"  {n}  bbox x[{x0:2d},{x1:2d}] y[{y0:2d},{y1:2d}]  changed px {chg:4d} ({pct:5.1f}% of body)")
    print(f"  left-edge span {max(v[1] for v in r)-min(v[1] for v in r)} px, "
          f"width span {max(v[2]-v[1] for v in r)-min(v[2]-v[1] for v in r)} px, "
          f"top span {max(v[3] for v in r)-min(v[3] for v in r)} px")
