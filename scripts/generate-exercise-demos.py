#!/usr/bin/env python3
"""Generate original, schematic exercise-loop GIFs using only Python stdlib + ImageMagick."""
from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "demos"
W, H = 240, 160
BG = (15, 23, 20)
GRID = (30, 43, 37)
BODY = (228, 235, 219)
ACCENT = (201, 242, 107)
BALL = (255, 135, 85)


def blank():
    return [[BG for _ in range(W)] for _ in range(H)]


def pixel(im, x, y, color):
    if 0 <= x < W and 0 <= y < H:
        im[y][x] = color


def disk(im, x, y, r, color):
    x, y = int(round(x)), int(round(y))
    for yy in range(y-r, y+r+1):
        for xx in range(x-r, x+r+1):
            if (xx-x)**2 + (yy-y)**2 <= r*r:
                pixel(im, xx, yy, color)


def line(im, a, b, color, width=4):
    x0, y0 = map(lambda v: int(round(v)), a)
    x1, y1 = map(lambda v: int(round(v)), b)
    dx, dy = abs(x1-x0), abs(y1-y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err = dx-dy
    while True:
        disk(im, x0, y0, width//2, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2*err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy


def circle(im, center, r, color, width=3):
    cx, cy = center
    for angle in range(360):
        a = math.radians(angle)
        disk(im, cx + math.cos(a)*r, cy + math.sin(a)*r, width//2, color)


def mix(a, b, t):
    return (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)


def tween(t, phase=0):
    return (1 - math.cos(2*math.pi*t + phase)) / 2


def draw_person(im, pts, ball=None):
    # points: head, neck, shoulders, elbows, hands, hip, knees, feet
    segments = [("neck", "hip"), ("shoulder", "elbowL"), ("elbowL", "handL"),
                ("shoulder", "elbowR"), ("elbowR", "handR"), ("hip", "kneeL"),
                ("kneeL", "footL"), ("hip", "kneeR"), ("kneeR", "footR")]
    for first, second in segments:
        line(im, pts[first], pts[second], BODY, 5)
    disk(im, *pts["head"], 9, BODY)
    for key in ("shoulder", "elbowL", "elbowR", "hip", "kneeL", "kneeR"):
        disk(im, *pts[key], 3, ACCENT)
    if ball:
        circle(im, ball, 7, BALL, 3)


def person_pose(kind, t):
    u = tween(t)
    p = {"head": (120, 25), "neck": (120, 46), "shoulder": (120, 53),
         "hip": (120, 91), "elbowL": (100, 67), "handL": (88, 76),
         "elbowR": (140, 67), "handR": (152, 76),
         "kneeL": (106, 119), "footL": (102, 143),
         "kneeR": (134, 119), "footR": (138, 143)}
    ball = None
    if kind in ("squat", "jump-squat", "vertical-jump", "pogo", "calf-raise"):
        drop = 25*u if kind in ("squat", "jump-squat") else 0
        airborne = math.sin(2*math.pi*t) if kind in ("vertical-jump", "pogo") else 0
        p["hip"] = (120, 91+drop-airborne*20)
        p["shoulder"] = (120, 53+drop-airborne*20)
        p["neck"] = (120, 46+drop-airborne*20)
        p["head"] = (120, 25+drop-airborne*20)
        p["kneeL"] = (106-9*u, 119+drop*.48-airborne*9)
        p["kneeR"] = (134+9*u, 119+drop*.48-airborne*9)
        p["footL"] = (102-10*u, 143-airborne*15)
        p["footR"] = (138+10*u, 143-airborne*15)
        if kind == "squat":
            p["elbowL"], p["handL"] = ((101, 65+7*u), (108, 76+8*u))
            p["elbowR"], p["handR"] = ((139, 65+7*u), (132, 76+8*u))
        elif kind in ("pogo", "calf-raise"):
            p["elbowL"], p["handL"] = ((101, 66), (98, 80))
            p["elbowR"], p["handR"] = ((139, 66), (142, 80))
        else:
            reach = u if kind in ("vertical-jump", "jump-squat") else 0.3
            p["elbowL"], p["handL"] = ((102, 56-24*reach), (92, 38-22*reach))
            p["elbowR"], p["handR"] = ((138, 56-24*reach), (148, 38-22*reach))
        if kind == "calf-raise":
            p["footL"] = (102, 143-8*u); p["footR"] = (138, 143-8*u)
        if kind == "jump-squat": ball = (165, 83+drop*.2)
    elif kind in ("hinge", "row"):
        lean = 24*u
        p["neck"] = (120+lean*.65, 46+lean*.35); p["shoulder"] = (120+lean, 53+lean*.35)
        p["head"] = (120+lean*1.25, 25+lean*.35); p["hip"] = (120-lean*.55, 91)
        p["kneeL"] = (106, 119-5*u); p["kneeR"] = (134, 119-5*u)
        if kind == "row":
            pull = 19*u
            p["elbowL"] = (98+pull, 83); p["handL"] = (91+pull, 95)
            p["elbowR"] = (142+pull, 83); p["handR"] = (149+pull, 95)
    elif kind in ("lunge", "split-squat", "step-up", "landing"):
        depth = (0.35 + .65*u) if kind != "landing" else u
        p["hip"] = (120, 88+15*depth); p["shoulder"] = (120, 50+15*depth)
        p["head"] = (120, 22+15*depth)
        p["kneeL"] = (95, 115+18*depth); p["footL"] = (75, 143)
        p["kneeR"] = (143, 112+16*depth); p["footR"] = (164 if kind == "lunge" else 144, 143)
        if kind == "step-up":
            p["kneeL"] = (100, 108-18*u); p["footL"] = (88, 122); p["kneeR"] = (143, 119); p["footR"] = (145,143)
        if kind == "landing":
            p["footL"] = (98,143); p["footR"] = (142,143)
    elif kind == "lateral-lunge":
        side = math.sin(2*math.pi*t)*24
        p["hip"]=(120+side,91+17*u); p["shoulder"]=(120+side,53+17*u); p["head"]=(120+side,25+17*u)
        p["kneeL"]=(96+side,119+13*u); p["footL"]=(72,143)
        p["kneeR"]=(144+side,119); p["footR"]=(168,143)
    elif kind in ("broad-jump", "lateral-bound"):
        side = (math.sin(2*math.pi*t)*30 if kind == "lateral-bound" else 0)
        flight = max(0, math.sin(2*math.pi*t))*25
        p["hip"]=(120+side,91-flight); p["shoulder"]=(120+side,53-flight); p["head"]=(120+side,25-flight)
        p["kneeL"]=(101+side,117-flight*.5); p["footL"]=(82+side,140-flight*.35)
        p["kneeR"]=(139+side,115-flight*.5); p["footR"]=(157+side,137-flight*.35)
        p["elbowL"]=(98,54-flight*.2); p["handL"]=(83,43-flight*.2)
        p["elbowR"]=(143,52-flight*.2); p["handR"]=(158,41-flight*.2)
    elif kind in ("sprint", "shuffle", "walking"):
        phase=math.sin(2*math.pi*t)
        stride = 8 if kind == "walking" else 22
        lift = 7 if kind == "walking" else 19
        dx=22*phase if kind == "shuffle" else 0
        p["head"]=(120+dx,29); p["shoulder"]=(120+dx,57); p["neck"]=(120+dx,51); p["hip"]=(120+dx,93)
        p["kneeL"]=(105+stride*.55*phase,113-12*max(phase,0)); p["footL"]=(100+stride*phase,143-lift*max(phase,0))
        p["kneeR"]=(135-stride*.55*phase,113-12*max(-phase,0)); p["footR"]=(140-stride*phase,143-lift*max(-phase,0))
        arm_swing = 5 if kind == "walking" else 16
        p["elbowL"]=(98-10*phase,68); p["handL"]=(108-arm_swing*phase,81)
        p["elbowR"]=(142+10*phase,68); p["handR"]=(132+arm_swing*phase,81)
    elif kind in ("stretching", "leg-swing", "mobility"):
        sway=math.sin(2*math.pi*t)
        p["head"]=(120+3*sway,25); p["hip"]=(120,91)
        p["kneeL"]=(105,119); p["footL"]=(102,143)
        p["kneeR"]=(143,112-13*abs(sway)); p["footR"]=(158+16*sway,143-24*abs(sway))
        p["elbowL"]=(97,42); p["handL"]=(87,28)
        p["elbowR"]=(143,42); p["handR"]=(153,28)
        if kind == "leg-swing":
            p["kneeR"]=(142,117-6*abs(sway)); p["footR"]=(142+22*sway,143-25*abs(sway))
            p["handL"]=(104,67); p["handR"]=(136,67)
        if kind == "mobility":
            p["hip"]=(120,103); p["kneeL"]=(87,118); p["footL"]=(70,137); p["kneeR"]=(151,118); p["footR"]=(172,137)
    elif kind == "dribble":
        p["hip"]=(120,101); p["shoulder"]=(120,63); p["head"]=(120,35)
        p["kneeL"]=(105,124); p["kneeR"]=(137,124); p["footL"]=(99,144); p["footR"]=(143,144)
        hand_y=90+20*math.sin(2*math.pi*t)
        p["elbowR"]=(145,78); p["handR"]=(157,hand_y)
        ball=(171, 130-25*(1+math.sin(2*math.pi*t))*.5)
    elif kind in ("shooting", "layup"):
        jump=max(0,math.sin(2*math.pi*t))
        p["hip"]=(120,91-18*jump); p["shoulder"]=(120,53-18*jump); p["head"]=(120,25-18*jump)
        p["kneeL"]=(106,119-8*jump); p["kneeR"]=(134,119-12*jump)
        p["footL"]=(101,143-10*jump); p["footR"]=(143,143-18*jump)
        p["elbowR"]=(143,49-16*jump); p["handR"]=(152,35-26*jump)
        p["elbowL"]=(102,54-12*jump); p["handL"]=(94,42-16*jump)
        ball=(164, 38-28*jump)
        if kind == "layup":
            p["footL"]=(93,143-12*jump); p["footR"]=(151,143-22*jump)
            p["handR"]=(148,26-26*jump); ball=(159,25-26*jump)
    elif kind == "pivot":
        shift=math.sin(2*math.pi*t)*18
        p["hip"]=(120,93); p["shoulder"]=(120+shift,53); p["head"]=(120+shift,25)
        p["kneeL"]=(102,119); p["footL"]=(98,143); p["kneeR"]=(143,119); p["footR"]=(145,143)
        p["elbowL"]=(98+shift,75); p["handL"]=(91+shift,88); p["elbowR"]=(141+shift,75); p["handR"]=(149+shift,87)
        ball=(158+shift,90)
    elif kind == "med-ball":
        turn = math.sin(2*math.pi*t)
        reach = max(0, math.sin(2*math.pi*t))
        p["shoulder"]=(120+5*turn,53); p["neck"]=(120+4*turn,46); p["head"]=(120+5*turn,25)
        p["hip"]=(120,91); p["elbowR"]=(144+9*turn,64-18*reach); p["handR"]=(157+15*turn,74-30*reach)
        p["elbowL"]=(98+5*turn,63-12*reach); p["handL"]=(88+7*turn,74-22*reach)
        ball=(166+14*turn,75-31*reach)
    elif kind == "self-massage":
        rub=3*math.sin(2*math.pi*t)
        p={"head":(120,43),"neck":(120,62),"shoulder":(120,67),"hip":(120,103),
           "elbowL":(99,84+rub),"handL":(91,99+rub),"elbowR":(140,84-rub),"handR":(148,99-rub),
           "kneeL":(86,123),"footL":(64,143),"kneeR":(153,124),"footR":(183,143)}
    elif kind == "push-up":
        y=0
        p={"head":(52,79),"neck":(67,87),"shoulder":(73,87),"hip":(130,94),
           "elbowL":(80,104-12*u),"handL":(91,125),"elbowR":(80,104-12*u),"handR":(91,125),
           "kneeL":(164,97),"footL":(207,99),"kneeR":(164,97),"footR":(207,99)}
    elif kind == "hip-thrust":
        lift=20*u
        p={"head":(48,126),"neck":(65,125),"shoulder":(72,122),"hip":(119,120-lift),
           "elbowL":(62,141),"handL":(52,144),"elbowR":(82,140),"handR":(93,144),
           "kneeL":(151,112-lift*.5),"footL":(169,143),"kneeR":(153,112-lift*.5),"footR":(171,143)}
    elif kind == "overhead-press":
        raise_y=38*u
        p["elbowL"]=(100,58-raise_y); p["handL"]=(95,44-raise_y)
        p["elbowR"]=(140,58-raise_y); p["handR"]=(145,44-raise_y)
    elif kind == "plank":
        p={"head":(52,80),"neck":(66,86),"shoulder":(72,87),"hip":(132,92),
           "elbowL":(82,105),"handL":(92,122),"elbowR":(82,105),"handR":(92,122),
           "kneeL":(166,98),"footL":(208,99),"kneeR":(166,98),"footR":(208,99)}
        if int(t*8)%2:
            p["handR"]=(98,76); p["elbowR"]=(89,85)
    elif kind == "dead-bug":
        lift=math.sin(2*math.pi*t)
        p={"head":(48,128),"neck":(65,127),"shoulder":(72,125),"hip":(120,126),
           "elbowL":(89,105),"handL":(102,83),"elbowR":(101,145),"handR":(115,147),
           "kneeL":(150,112-14*max(lift,0)),"footL":(173,100-25*max(lift,0)),
           "kneeR":(147,139),"footR":(176,145)}
    elif kind == "breathing":
        expansion=math.sin(2*math.pi*t)*4
        p["shoulder"]=(120,53-expansion); p["neck"]=(120,46-expansion); p["head"]=(120,25-expansion)
        p["elbowL"]=(99,67); p["handL"]=(93,83); p["elbowR"]=(141,67); p["handR"]=(147,83)
    return p, ball


def render_frame(kind, t):
    im=blank()
    # quiet, high-contrast studio floor and motion baseline
    for y in range(12, H, 28):
        for x in range(12, W, 28):
            pixel(im,x,y,GRID)
    line(im, (20,148),(220,148), GRID, 2)
    if kind == "step-up":
        line(im, (75,124),(110,124), GRID, 5)
        line(im, (75,124),(75,148), GRID, 4)
        line(im, (110,124),(110,148), GRID, 4)
    if kind == "cycling":
        rear, front, crank, seat, bars = (65,130), (175,130), (125,130), (112,100), (155,94)
        circle(im,rear,23,GRID,3); circle(im,front,23,GRID,3)
        for a,b in [(rear,seat),(seat,crank),(crank,rear),(seat,bars),(bars,crank),(bars,front)]:
            line(im,a,b,GRID,3)
        phase=2*math.pi*t
        knee_a=(crank[0]+21*math.cos(phase),crank[1]+15*math.sin(phase))
        foot_a=(crank[0]+33*math.cos(phase),crank[1]+23*math.sin(phase))
        knee_b=(crank[0]+21*math.cos(phase+math.pi),crank[1]+15*math.sin(phase+math.pi))
        foot_b=(crank[0]+33*math.cos(phase+math.pi),crank[1]+23*math.sin(phase+math.pi))
        p={"head":(109,45),"neck":(111,65),"shoulder":(122,72),"hip":seat,
           "elbowL":(139,74),"handL":bars,"elbowR":(140,70),"handR":bars,
           "kneeL":knee_a,"footL":foot_a,"kneeR":knee_b,"footR":foot_b}
        draw_person(im,p)
        return im
    p, ball=person_pose(kind,t)
    draw_person(im,p,ball)
    return im


def write_ppm(path, im):
    with path.open("wb") as f:
        f.write(f"P6\n{W} {H}\n255\n".encode())
        f.write(bytes(channel for row in im for rgb in row for channel in rgb))


DEMOS = ["leg-swing", "lunge", "lateral-lunge", "shuffle", "sprint", "mobility", "dribble", "layup",
         "pogo", "vertical-jump", "landing", "broad-jump", "lateral-bound", "med-ball", "jump-squat",
         "push-up", "squat", "hinge", "split-squat", "hip-thrust", "row", "overhead-press", "step-up",
         "calf-raise", "plank", "dead-bug", "breathing", "stretching", "shooting", "pivot", "cycling", "walking", "self-massage"]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in DEMOS:
        with tempfile.TemporaryDirectory(prefix="courtready-demo-") as tmp:
            tmp_path=Path(tmp)
            frames=[]
            for index in range(10):
                ppm=tmp_path / f"frame-{index:02d}.ppm"
                write_ppm(ppm,render_frame(kind,index/10))
                frames.append(str(ppm))
            target=OUT / f"{kind}.gif"
            subprocess.run(["convert","-delay","9","-loop","0",*frames,"-colors","40","-layers","Optimize",str(target)],check=True)
            print(f"{target.relative_to(ROOT)}: {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
