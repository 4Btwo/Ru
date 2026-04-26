"""
Gera o og-image.png (1200x630) para preview no WhatsApp, Telegram etc.
Execute uma vez: python3 scripts/generate-og-image.py
Requer Pillow: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
out  = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')

img = Image.new('RGB', (W, H), '#0a0a0f')
d   = ImageDraw.Draw(img)

# Gradiente radial simulado (círculos concêntricos com alpha)
cx, cy = W // 2, H // 2
for r in range(320, 0, -4):
    alpha = int(60 * (1 - r / 320))
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255, 45, 85, alpha))
    img.paste(Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB'))

# Pulse rings
for r, alpha in [(200, 30), (140, 55), (90, 80)]:
    d.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(255, 45, 85, alpha), width=2)

# Centro vermelho
d.ellipse([cx-36, cy-36, cx+36, cy+36], fill='#ff2d55')
d.ellipse([cx-14, cy-14, cx+14, cy+14], fill='#ffffff')

# Texto — usa fonte padrão (sem necessidade de fontes externas)
try:
    font_big  = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 64)
    font_sub  = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 28)
    font_tag  = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except:
    font_big = font_sub = font_tag = ImageFont.load_default()

title    = 'Urbyn'
subtitle = 'O que está acontecendo agora na sua cidade?'
tags     = ['🍻 Bares', '🚗 Trânsito', '🎉 Eventos', '🔥 Hotspots']

# Título
bbox = d.textbbox((0, 0), title, font=font_big)
tw = bbox[2] - bbox[0]
d.text(((W - tw) // 2, cy + 60), title, font=font_big, fill='#f0f0ff')

# Subtítulo
bbox2 = d.textbbox((0, 0), subtitle, font=font_sub)
sw = bbox2[2] - bbox2[0]
d.text(((W - sw) // 2, cy + 140), subtitle, font=font_sub, fill='#6666aa')

# Tags
tag_y = cy + 200
tag_gap = 20
total_w = sum(d.textbbox((0,0), t, font=font_tag)[2] + 40 for t in tags) + tag_gap * (len(tags)-1)
tx = (W - total_w) // 2
for tag in tags:
    bw = d.textbbox((0,0), tag, font=font_tag)[2] + 40
    d.rounded_rectangle([tx, tag_y, tx+bw, tag_y+36], radius=18,
                         fill='#12121a', outline='#2a2a3d', width=1)
    d.text((tx + 20, tag_y + 8), tag, font=font_tag, fill='#f0f0ff')
    tx += bw + tag_gap

os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out, 'PNG', optimize=True)
print(f'og-image.png salvo em {os.path.abspath(out)}')
