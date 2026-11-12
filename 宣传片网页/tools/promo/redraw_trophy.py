# 奖杯杯身的刻花（上皇冠 · User Group · 下皇冠）抹掉重画：设定图里字是乱码，两个皇冠也歪歪扭扭
# 抹：杯身的明暗基本是竖条（圆杯子），每一列用刻花区上下两边的颜色按行插值当「没刻字的杯身」，比它暗/偏红的像素就是刻花，换成杯身色
# 画：按同一个排版重画皇冠 + User Group + 小皇冠，刻痕颜色取原刻花，下沿加一道亮边
# 用法：redraw_trophy.py 原图 输出 中心x 上y 下y 半宽
import numpy as np, cv2, sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]; CX, YA, YB, HW = map(int, sys.argv[3:7])
im = np.asarray(Image.open(src).convert('RGBA')).astype(np.float32); rgb = im[..., :3].copy()
x0, x1 = CX - HW, CX + HW
top = rgb[YA - 5:YA - 1, x0:x1].mean(0); bot = rgb[YB + 1:YB + 5, x0:x1].mean(0)
u = ((np.arange(YA, YB) - YA) / (YB - YA))[:, None, None]
ref = top[None] * (1 - u) + bot[None] * u
reg = rgb[YA:YB, x0:x1]; Lr = reg @ np.array([.3, .59, .11]); Lf = ref @ np.array([.3, .59, .11])
dk = (Lr <= 70).astype(np.uint8); nd, ld, sd, _ = cv2.connectedComponentsWithStats(dk, connectivity=8)
big = np.array([False] + [sd[i, 4] > 300 for i in range(1, nd)])[ld]   # 大块深色（手套、杯口描边）不动；小块深色是旧刻花的描边，一起抹掉
gold = ~big & (im[YA:YB, x0:x1, 3] > 200)
eng = gold & ((Lf - Lr > 14) | ((reg[..., 0] - reg[..., 2]) - (ref[..., 0] - ref[..., 2]) > 22) & (Lf - Lr > 4))
eng = cv2.morphologyEx(eng.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
tcol = np.percentile(reg[eng > 0], 30, axis=0)
# 整块刻花区直接换成插值出来的杯身（不留原图细节，免得旧刻花留下影子），边缘羽化 8px；手套、描边这些深色处不动
zone = np.zeros(reg.shape[:2], np.float32); zone[4:-4, 4:-4] = 1; zone = cv2.GaussianBlur(zone, (0, 0), 4)
g2 = cv2.erode(gold.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(np.float32); g2 = cv2.GaussianBlur(g2, (0, 0), 1)
mk = (zone * g2)[..., None]
clean = rgb.copy(); clean[YA:YB, x0:x1] = reg * (1 - mk) + ref * mk
H = YB - YA; W = 2 * HW; S = 6
cv = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(cv)
def crown(cx, ty, w, h):
    cx, ty, w, h = cx * S, ty * S, w * S, h * S
    bh = h * 0.22; by = ty + h - bh; r = w * 0.07
    pts = [(cx - w * 0.5, by), (cx - w * 0.5, ty + h * 0.3), (cx - w * 0.26, ty + h * 0.56), (cx, ty + h * 0.08), (cx + w * 0.26, ty + h * 0.56), (cx + w * 0.5, ty + h * 0.3), (cx + w * 0.5, by)]
    d.polygon(pts, fill=255)
    for px, py in [(cx - w * 0.5, ty + h * 0.3), (cx, ty + h * 0.08), (cx + w * 0.5, ty + h * 0.3)]: d.ellipse([px - r, py - r * 1.7, px + r, py + r * 0.3], fill=255)
    d.rounded_rectangle([cx - w * 0.52, by + bh * 0.18, cx + w * 0.52, ty + h], radius=bh * 0.3, fill=255)   # 帽圈
    for k in (-1, 0, 1): q = cx + k * w * 0.28; e = bh * 0.22; d.polygon([(q, by + bh * 0.59 - e), (q + e, by + bh * 0.59), (q, by + bh * 0.59 + e), (q - e, by + bh * 0.59)], fill=0)   # 帽圈上的小菱形
crown(W / 2, H * 0.02, W * 0.40, H * 0.33)
F = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'; t = 'User Group'
font = ImageFont.truetype(F, 100); l, tp, r_, bt = font.getbbox(t)
fs = round(100 * min(W * 0.92 * S / (r_ - l), H * 0.17 * S / (bt - tp))); font = ImageFont.truetype(F, fs); l, tp, r_, bt = font.getbbox(t)
d.text(((W * S - (r_ - l)) / 2 - l, H * 0.43 * S - tp), t, font=font, fill=255)
crown(W / 2, H * 0.70, W * 0.30, H * 0.26)
c = np.asarray(cv.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
A = np.zeros(rgb.shape[:2], np.float32); A[YA:YB, x0:x1] = c * gold
hi = np.roll(A, 2, axis=0) * (1 - A)
o = clean * (1 - A[..., None]) + tcol * A[..., None]
o = o * (1 - 0.4 * hi[..., None]) + np.array([255, 238, 170]) * 0.4 * hi[..., None]
res = np.dstack([o, im[..., 3]]).clip(0, 255).round().astype(np.uint8)
Image.fromarray(res).save(out, 'WEBP', quality=92, method=6)
a = im[..., 3:4] / 255; pad = 30; Z = (slice(max(0, YA - pad), YB + pad), slice(max(0, x0 - pad), x1 + pad))
z = lambda q: (q[Z] * a[Z] + np.array([60, 140, 60]) * (1 - a[Z])).astype(np.uint8)
cmp = np.hstack([z(im[..., :3]), z(clean), z(res[..., :3].astype(np.float32))]); Image.fromarray(cmp).resize((cmp.shape[1] * 3, cmp.shape[0] * 3), Image.LANCZOS).save(out + '.cmp.jpg', quality=90)
