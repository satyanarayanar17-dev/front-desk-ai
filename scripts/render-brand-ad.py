"""Render CallWoven's caption-led motion advert with its original logo."""
from PIL import Image, ImageDraw, ImageFont
import math, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/media'
OUT.mkdir(exist_ok=True)
W, H, FPS, SECONDS = 1280, 720, 24, 30
INK, MUTED, TEAL = '#102c30', '#426064', '#297780'
SANS = '/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf'
BOLD = '/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
SERIF = '/usr/share/fonts/opentype/urw-base35/NimbusRoman-Regular.otf'
fonts = {k: ImageFont.truetype(p, s) for k,p,s in [('title',SERIF,70),('body',SANS,29),('small',SANS,21),('bold',BOLD,30),('cta',BOLD,34)]}
logo = Image.open(ROOT/'public/brand/callwoven-logo.png').convert('RGBA')
logo.thumbnail((280,75), Image.Resampling.LANCZOS)
hero_logo = Image.open(ROOT/'public/brand/callwoven-logo.png').convert('RGBA')
hero_logo.thumbnail((640,160), Image.Resampling.LANCZOS)
scenes = [
 ('WHEN YOUR TEAM IS BUSY', ['Every call is', 'an opportunity.'], 'Keep enquiries moving when reception can’t answer.'),
 ('MEET CALLWOVEN', ['A calm voice.', 'A clear next step.'], 'AI reception for overflow and after-hours calls.'),
 ('TAILORED TO YOUR BUSINESS', ['Routine questions.', 'Details captured.'], 'Using the information and call-handling rules you approve.'),
 ('YOUR TEAM STAYS IN CONTROL', ['Clear summaries.', 'Ready for follow-up.'], 'Your team reviews the enquiry and contacts the caller.'),
 ('LET’S TALK', ['Hear CallWoven.', 'Start a 7-day pilot.'], 'Discuss a setup tailored to your business.'),
]

def ease(x):
 return 1-(1-max(0,min(1,x)))**3
def text(d, xy, value, font='body', fill=INK, center=False):
 if center:
  b=d.textbbox((0,0),value,font=fonts[font]);xy=(xy[0]-(b[2]-b[0])/2,xy[1])
 d.text(xy,value,font=fonts[font],fill=fill)
def frame(t):
 idx=min(4,int(t//6));local=t-idx*6
 bg=Image.new('RGB',(W,H),'#fafaf6');d=ImageDraw.Draw(bg)
 # Simple moving colour fields provide continuity between scenes.
 drift=int(18*math.sin(t*.45))
 d.ellipse((880+drift,-250,1550+drift,500),fill='#e2f1f3')
 d.ellipse((-260,430+drift,440,1050+drift),fill='#f7dfe0')
 bg.paste(logo,(70,42),logo)
 text(d,(1200,66),'AI RECEPTION','small',MUTED,False)
 # Keep the upper-right label inside the canvas.
 d.rectangle((1080,48,1280,95),fill='#e2f1f3')
 text(d,(1110,65),'AI RECEPTION','small',MUTED)
 layer=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(layer)
 shift=int(30*(1-ease(local/.8)))
 tag,lines,sub=scenes[idx]
 text(ld,(80,177+shift),tag,'small',TEAL)
 for j,line in enumerate(lines):text(ld,(76,216+j*79+shift),line,'title')
 # Short captions stay within the left text column.
 subtitles={0:['Keep enquiries moving when','reception can’t answer.'],1:['AI reception for overflow','and after-hours calls.'],2:['Using the information and','call-handling rules you approve.'],3:['Your team reviews the enquiry','and contacts the caller.'],4:['Discuss a setup tailored','to your business.']}
 for j,line in enumerate(subtitles[idx]):text(ld,(80,410+j*37+shift),line,'body',MUTED)
 ld.rounded_rectangle((750,185,1190,530),radius=28,fill='#ffffff',outline='#d6e4e5',width=2)
 if idx==0:
  text(ld,(970,225),'Incoming enquiry','bold',center=True)
  text(ld,(970,274),'Your team is occupied','body',MUTED,True)
  for j in range(3):
   active=local>1+j*.6
   ld.rounded_rectangle((795,334+j*53,1145,374+j*53),radius=12,fill='#f7dfe0' if active else '#f4f6f6')
   text(ld,(820,343+j*53),['New patient enquiry','Appointment request','Callback needed'][j],'small')
 elif idx in (1,2):
  text(ld,(970,224),'CallWoven is listening','bold',center=True)
  for j in range(23):
   height=22+62*(.5+.5*math.sin(t*4+j*.8))
   x=799+j*15;ld.rounded_rectangle((x,345-height/2,x+7,345+height/2),radius=3,fill=TEAL)
  text(ld,(970,437),'Approved answers. Clear details.','small',MUTED,True)
 elif idx==3:
  text(ld,(790,223),'New enquiry summary','bold')
  for j,(label,value) in enumerate([('REQUEST','New-patient check-up'),('PREFERENCE','Afternoon callback'),('NEXT STEP','Reception to follow up')]):
   y=291+j*69; text(ld,(790,y),label,'small',TEAL);text(ld,(790,y+25),value,'body')
  text(ld,(970,495),'Illustrative enquiry','small',MUTED,True)
 else:
  small=hero_logo.copy();small.thumbnail((370,110),Image.Resampling.LANCZOS)
  layer.paste(small,(785,250),small)
  ld.rounded_rectangle((792,395,1148,463),radius=34,fill=INK)
  text(ld,(970,413),'Start a 7-day pilot','body','#ffffff',True)
  text(ld,(970,490),'callwoven.com','body',TEAL,True)
 alpha=ease(local/.65)
 if local>5.55:alpha*=max(0,(6-local)/.45)
 layer.putalpha(layer.getchannel('A').point(lambda p:int(p*alpha)))
 bg=Image.alpha_composite(bg.convert('RGBA'),layer).convert('RGB');d=ImageDraw.Draw(bg)
 text(d,(80,624),'For dental practices and local service businesses.','small',MUTED)
 text(d,(80,657),'Administrative support • Your team makes the decisions','small',MUTED)
 text(d,(1100,652),'callwoven.com','small',TEAL,True)
 d.rounded_rectangle((80,698,1200,701),radius=2,fill='#d6e4e5')
 d.rounded_rectangle((80,698,80+int(1120*t/SECONDS),701),radius=2,fill=TEAL)
 return bg

frame(25.2).save(OUT/'callwoven-ad-poster.jpg',quality=92)
proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'callwoven-ad.mp4')],stdin=subprocess.PIPE)
for n in range(FPS*SECONDS):proc.stdin.write(frame(n/FPS).tobytes())
proc.stdin.close()
if proc.wait():raise RuntimeError('Video encode failed')
print(OUT/'callwoven-ad.mp4')
