#!/usr/bin/env python3
"""Generate a more complex test blueprint: public/test-plan-complex.pdf

3 rooms (2 baths + kitchen/utility) with 9 fixtures, interior walls with
door gaps, windows, dimensions, north arrow and text notes as distractors.
Prints the expected fixture centers (top-down pixel coords at 72dpi) so the
AI auto-scan results can be verified.
"""

import json
import pathlib

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white

ROOT = pathlib.Path(__file__).parent.parent
OUT = ROOT / "public" / "test-plan-complex.pdf"

W, H = letter  # 612 x 792


def Y(y):
    """Convert top-down (image) y to reportlab bottom-up y."""
    return H - y


def rect_td(c, x, yt, w, h, **kw):
    c.rect(x, Y(yt + h), w, h, **kw)


def line_td(c, x1, y1, x2, y2):
    c.line(x1, Y(y1), x2, Y(y2))


def ellipse_td(c, cx, cy, rx, ry, **kw):
    c.ellipse(cx - rx, Y(cy + ry), cx + rx, Y(cy - ry), **kw)


LIGHT_BLUE = HexColor("#d6e8f0")
LIGHT_ORANGE = HexColor("#fde8d0")
LIGHT_PURPLE = HexColor("#e6def0")
LIGHT_GREEN = HexColor("#dff0dc")
LIGHT_GRAY = HexColor("#eeeeee")


# ---------------- fixture symbols (top-down center coords) ----------------
def toilet(c, cx, cy):
    rect_td(c, cx - 8, cy - 22, 16, 9, stroke=1, fill=0)  # tank
    ellipse_td(c, cx, cy, 9, 12, stroke=1, fill=0)  # bowl


def sink(c, cx, cy, fill=LIGHT_BLUE):
    c.setFillColor(fill)
    rect_td(c, cx - 10, cy - 8, 20, 16, stroke=1, fill=1)
    c.setFillColor(black)


def bathtub(c, cx, cy, fill=LIGHT_BLUE):
    c.setFillColor(fill)
    rect_td(c, cx - 26, cy - 14, 52, 28, stroke=1, fill=1)
    c.setFillColor(black)
    rect_td(c, cx - 20, cy - 9, 40, 18, stroke=1, fill=0)  # inner basin


def shower(c, cx, cy, fill=LIGHT_GREEN):
    c.setFillColor(fill)
    rect_td(c, cx - 14, cy - 14, 28, 28, stroke=1, fill=1)
    c.setFillColor(black)
    line_td(c, cx - 14, cy - 14, cx + 14, cy + 14)  # X
    line_td(c, cx - 14, cy + 14, cx + 14, cy - 14)


def water_heater(c, cx, cy, fill=LIGHT_ORANGE):
    c.setFillColor(fill)
    ellipse_td(c, cx, cy, 14, 14, stroke=1, fill=1)
    c.setFillColor(black)
    ellipse_td(c, cx, cy, 6, 6, stroke=1, fill=0)


def washer(c, cx, cy, fill=LIGHT_PURPLE):
    c.setFillColor(fill)
    rect_td(c, cx - 13, cy - 13, 26, 26, stroke=1, fill=1)
    c.setFillColor(black)
    ellipse_td(c, cx, cy, 7, 7, stroke=1, fill=0)


def double_sink(c, cx, cy, fill=LIGHT_BLUE):
    c.setFillColor(fill)
    rect_td(c, cx - 22, cy - 10, 44, 20, stroke=1, fill=1)
    c.setFillColor(black)
    line_td(c, cx, cy - 10, cx, cy + 10)  # divider


def main():
    c = canvas.Canvas(str(OUT), pagesize=letter)
    c.setTitle("Complex Plumbing Floor Plan")

    # ---- title block ----
    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(60, Y(50), "Multi-Room Plumbing Floor Plan")
    c.setFont("Helvetica", 10)
    c.drawString(60, Y(70), 'Scale: 1/4" = 1\'-0"     Unit: 2-Bath + Kitchen/Utility')

    # ---- exterior walls (70,200)-(540,560) ----
    c.setLineWidth(3)
    rect_td(c, 70, 200, 470, 360, stroke=1, fill=0)

    # windows on exterior walls (distractors): pairs of thin lines
    c.setLineWidth(1)
    for wx in (140, 300, 460):  # top wall windows
        line_td(c, wx - 20, 198, wx + 20, 198)
        line_td(c, wx - 20, 202, wx + 20, 202)
    line_td(c, 68, 300, 68, 340)  # left wall window
    line_td(c, 72, 300, 72, 340)

    # ---- interior walls ----
    c.setLineWidth(2)
    # wall x=230 (bath1|bath2), y 200-400, door gap y 360-390
    line_td(c, 230, 200, 230, 360)
    line_td(c, 230, 390, 230, 400)
    # wall x=390 (bath2|kitchen), y 200-400, door gap y 300-330
    line_td(c, 390, 200, 390, 300)
    line_td(c, 390, 330, 390, 400)
    # wall y=400 (rooms|hallway), door gaps x 120-150 and x 440-470
    line_td(c, 70, 400, 120, 400)
    line_td(c, 150, 400, 440, 400)
    line_td(c, 470, 400, 540, 400)

    # door swings (distractor arcs/lines)
    c.setLineWidth(1)
    line_td(c, 230, 360, 260, 360)
    line_td(c, 390, 330, 420, 330)
    line_td(c, 120, 400, 120, 430)
    line_td(c, 470, 400, 470, 430)

    # ---- fixtures ----
    # Bathroom 1 (left, x 70-230)
    toilet(c, 120, 250)
    sink(c, 195, 245)
    bathtub(c, 130, 340)
    # Bathroom 2 (middle, x 230-390)
    toilet(c, 280, 250)
    sink(c, 355, 245)
    shower(c, 335, 335)
    # Kitchen/Utility (right, x 390-540)
    double_sink(c, 435, 240)
    water_heater(c, 500, 250)
    washer(c, 495, 345)

    # ---- kitchen counter line (distractor) ----
    c.setLineWidth(1)
    rect_td(c, 400, 220, 60, 60, stroke=1, fill=0)

    # ---- dimension lines (distractors) ----
    line_td(c, 70, 590, 540, 590)
    line_td(c, 70, 585, 70, 595)
    line_td(c, 540, 585, 540, 595)
    c.setFont("Helvetica", 9)
    c.drawCentredString(305, Y(605), "24'-0\"")
    line_td(c, 600, 200, 600, 560)
    line_td(c, 595, 200, 605, 200)
    line_td(c, 595, 560, 605, 560)
    c.saveState()
    c.translate(596, Y(380))
    c.rotate(90)
    c.drawCentredString(0, 0, "18'-0\"")
    c.restoreState()

    # ---- north arrow (distractor) ----
    ellipse_td(c, 560, 120, 16, 16, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(560, Y(124), "N")
    line_td(c, 560, 132, 560, 142)

    # ---- text notes (distractors) ----
    c.setFont("Helvetica", 8)
    c.drawString(80, Y(180), "NOTE: All fixtures low-flow.")
    c.drawString(400, Y(180), "Water main entry at utility wall.")

    c.showPage()
    c.save()

    expected = [
        {"name": "Toilet", "x": 120, "y": 250, "room": "Bath 1"},
        {"name": "Sink", "x": 195, "y": 245, "room": "Bath 1"},
        {"name": "Bathtub", "x": 130, "y": 340, "room": "Bath 1"},
        {"name": "Toilet", "x": 280, "y": 250, "room": "Bath 2"},
        {"name": "Sink", "x": 355, "y": 245, "room": "Bath 2"},
        {"name": "Shower", "x": 335, "y": 335, "room": "Bath 2"},
        {"name": "Sink (double)", "x": 435, "y": 240, "room": "Kitchen"},
        {"name": "Water Heater", "x": 500, "y": 250, "room": "Kitchen"},
        {"name": "Washer", "x": 495, "y": 345, "room": "Kitchen"},
    ]
    print(f"Wrote {OUT}")
    print("Expected fixture centers (72dpi top-down px):")
    print(json.dumps(expected, indent=2))


if __name__ == "__main__":
    main()
