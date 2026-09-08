#!/usr/bin/env python3
import pathlib
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

ROOT = pathlib.Path(__file__).parent.parent
OUTPUT_PDF = ROOT / "public" / "test-electrical-plan.pdf"
DEFAULT_TEST_PDF = ROOT / "public" / "test-plan.pdf"

def draw_symbol_duplex(c, x, y, label=""):
    c.saveState()
    c.setLineWidth(1.2)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.setFillColor(colors.HexColor("#3b82f6"))
    # Circle with 2 parallel lines
    c.circle(x, y, 6, stroke=1, fill=0)
    c.line(x - 4, y - 9, x - 4, y + 9)
    c.line(x + 4, y - 9, x + 4, y + 9)
    if label:
        c.setFont("Helvetica-Bold", 6)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(x + 8, y - 2, label)
    c.restoreState()

def draw_symbol_gfci(c, x, y):
    c.saveState()
    draw_symbol_duplex(c, x, y)
    c.setFont("Helvetica-Bold", 5.5)
    c.setFillColor(colors.HexColor("#dc2626"))
    c.drawString(x + 8, y - 2, "GFI")
    c.restoreState()

def draw_symbol_switch(c, x, y, text="S"):
    c.saveState()
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#2563eb"))
    c.drawString(x - 3, y - 4, text)
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#2563eb"))
    c.line(x + 4, y + 2, x + 10, y + 7)
    c.restoreState()

def draw_symbol_troffer(c, x, y, width=32, height=16):
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#0284c7"))
    c.setFillColor(colors.HexColor("#e0f2fe"))
    c.rect(x - width/2, y - height/2, width, height, stroke=1, fill=1)
    c.line(x - width/2, y - height/2, x + width/2, y + height/2)
    c.line(x - width/2, y + height/2, x + width/2, y - height/2)
    c.restoreState()

def draw_symbol_downlight(c, x, y):
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#0369a1"))
    c.setFillColor(colors.HexColor("#bae6fd"))
    c.circle(x, y, 7, stroke=1, fill=1)
    c.line(x - 7, y, x + 7, y)
    c.line(x, y - 7, x, y + 7)
    c.restoreState()

def draw_symbol_panel(c, x, y, width=16, height=36, name="LP-1"):
    c.saveState()
    c.setLineWidth(1.5)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(x - width/2, y - height/2, width, height, stroke=1, fill=1)
    # Fill half diagonal
    p = c.beginPath()
    p.moveTo(x - width/2, y - height/2)
    p.lineTo(x + width/2, y - height/2)
    p.lineTo(x + width/2, y + height/2)
    p.close()
    c.setFillColor(colors.HexColor("#f59e0b"))
    c.drawPath(p, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(x + width/2 + 4, y - 3, name)
    c.restoreState()

def draw_symbol_jbox(c, x, y, label="J"):
    c.saveState()
    c.setLineWidth(1.2)
    c.setStrokeColor(colors.HexColor("#475569"))
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(x - 6, y - 6, 12, 12, stroke=1, fill=1)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(x - 2.5, y - 2.5, label)
    c.restoreState()

def draw_symbol_smoke(c, x, y):
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#dc2626"))
    c.circle(x, y, 7, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(colors.HexColor("#dc2626"))
    c.drawString(x - 4, y - 2.5, "SD")
    c.restoreState()

def generate_electrical_blueprint():
    c = canvas.Canvas(str(OUTPUT_PDF), pagesize=landscape(letter))
    width, height = landscape(letter) # 11" x 8.5" = 792 x 612 pt

    # Outer Blueprint Border
    c.setLineWidth(2)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.rect(18, 18, width - 36, height - 36)

    # Title Block Header
    c.setFillColor(colors.HexColor("#0f172a"))
    c.rect(24, height - 58, width - 48, 32, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(34, height - 44, "COMMERCIAL ELECTRICAL POWER & LIGHTING PLAN")
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 34, height - 44, "APEX TECHNOLOGY CENTER — SUITE 200 | SHEET E-101")

    # Metadata Strip
    c.setFillColor(colors.HexColor("#f1f5f9"))
    c.rect(24, height - 80, width - 48, 18, fill=1, stroke=1)
    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(34, height - 73, "SCALE: 1/4\" = 1'-0\"")
    c.drawString(160, height - 73, "VOLTAGE: 120/208V 3-PHASE 4-WIRE")
    c.drawString(380, height - 73, "DATE: AUGUST 2026")
    c.drawString(540, height - 73, "DRAWN BY: SHADOW ELECTRICAL ENG")

    # Drawing Canvas Area (Left 510 pt)
    plan_x = 30
    plan_y = 30
    plan_w = 480
    plan_h = 490

    # Grid background for CAD feel
    c.saveState()
    c.setLineWidth(0.3)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    for gx in range(int(plan_x), int(plan_x + plan_w), 20):
        c.line(gx, plan_y, gx, plan_y + plan_h)
    for gy in range(int(plan_y), int(plan_y + plan_h), 20):
        c.line(plan_x, gy, plan_x + plan_w, gy)
    c.restoreState()

    # Outer Architectural Walls
    c.setLineWidth(3)
    c.setStrokeColor(colors.HexColor("#1e293b"))
    c.rect(plan_x + 10, plan_y + 10, plan_w - 20, plan_h - 20)

    # Interior Partition Walls
    c.setLineWidth(1.8)
    # Horizontal hall wall
    c.line(plan_x + 10, plan_y + 160, plan_x + plan_w - 10, plan_y + 160)
    c.line(plan_x + 10, plan_y + 220, plan_x + plan_w - 10, plan_y + 220)
    # Vertical office walls
    c.line(plan_x + 160, plan_y + 220, plan_x + 160, plan_y + plan_h - 10)
    c.line(plan_x + 320, plan_y + 220, plan_x + 320, plan_y + plan_h - 10)
    # Bottom room walls
    c.line(plan_x + 180, plan_y + 10, plan_x + 180, plan_y + 160)
    c.line(plan_x + 340, plan_y + 10, plan_x + 340, plan_y + 160)

    # Room Labels
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(plan_x + 40, plan_y + 440, "OFFICE 101")
    c.drawString(plan_x + 190, plan_y + 440, "OFFICE 102")
    c.drawString(plan_x + 350, plan_y + 440, "CONF. ROOM 103")
    c.drawString(plan_x + 160, plan_y + 185, "CORRIDOR / HALLWAY 100")
    c.drawString(plan_x + 40, plan_y + 120, "ELECTRICAL ROOM")
    c.drawString(plan_x + 210, plan_y + 120, "BREAK ROOM")
    c.drawString(plan_x + 370, plan_y + 120, "RESTROOM")

    # ==========================================
    # ELECTRICAL FIXTURES PLACEMENT
    # ==========================================

    # Panel LP-1 in Electrical Room
    draw_symbol_panel(c, plan_x + 35, plan_y + 80, 14, 34, "LP-1")
    draw_symbol_jbox(c, plan_x + 80, plan_y + 130, "J")

    # Office 101: 2x4 Troffers + Duplex + Switch
    draw_symbol_troffer(c, plan_x + 85, plan_y + 360, 36, 18)
    draw_symbol_troffer(c, plan_x + 85, plan_y + 280, 36, 18)
    draw_symbol_duplex(c, plan_x + 15, plan_y + 380)
    draw_symbol_duplex(c, plan_x + 15, plan_y + 260)
    draw_symbol_duplex(c, plan_x + 85, plan_y + 470)
    draw_symbol_switch(c, plan_x + 145, plan_y + 235, "S")
    draw_symbol_smoke(c, plan_x + 85, plan_y + 420)

    # Office 102: 2x4 Troffers + Duplex + Switch
    draw_symbol_troffer(c, plan_x + 240, plan_y + 360, 36, 18)
    draw_symbol_troffer(c, plan_x + 240, plan_y + 280, 36, 18)
    draw_symbol_duplex(c, plan_x + 165, plan_y + 380)
    draw_symbol_duplex(c, plan_x + 315, plan_y + 380)
    draw_symbol_duplex(c, plan_x + 240, plan_y + 470)
    draw_symbol_switch(c, plan_x + 170, plan_y + 235, "S")
    draw_symbol_smoke(c, plan_x + 240, plan_y + 420)

    # Conference Room 103: Downlights + Quad/GFCI + 3-Way Switch
    draw_symbol_downlight(c, plan_x + 370, plan_y + 380)
    draw_symbol_downlight(c, plan_x + 430, plan_y + 380)
    draw_symbol_downlight(c, plan_x + 370, plan_y + 280)
    draw_symbol_downlight(c, plan_x + 430, plan_y + 280)
    draw_symbol_duplex(c, plan_x + 325, plan_y + 350, "QUAD")
    draw_symbol_duplex(c, plan_x + 470, plan_y + 350)
    draw_symbol_switch(c, plan_x + 330, plan_y + 235, "S3")

    # Corridor: Can Lights + 3-Way Switches
    draw_symbol_downlight(c, plan_x + 80, plan_y + 190)
    draw_symbol_downlight(c, plan_x + 240, plan_y + 190)
    draw_symbol_downlight(c, plan_x + 400, plan_y + 190)
    draw_symbol_switch(c, plan_x + 20, plan_y + 195, "S3")
    draw_symbol_switch(c, plan_x + 465, plan_y + 195, "S3")

    # Breakroom: Troffer + GFCI Outlets
    draw_symbol_troffer(c, plan_x + 260, plan_y + 80, 36, 18)
    draw_symbol_gfci(c, plan_x + 190, plan_y + 140)
    draw_symbol_gfci(c, plan_x + 330, plan_y + 140)
    draw_symbol_switch(c, plan_x + 190, plan_y + 30, "S")

    # Restroom: Can Light + Motion Sensor + GFCI
    draw_symbol_downlight(c, plan_x + 410, plan_y + 80)
    draw_symbol_gfci(c, plan_x + 465, plan_y + 120)
    draw_symbol_switch(c, plan_x + 350, plan_y + 30, "Occ")

    # Wiring Home-Run Arc Lines (Conduit Runs)
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#2563eb"))
    c.setDash(4, 3)
    # Arc from Office 101 Troffers to LP-1
    c.arc(plan_x + 40, plan_y + 90, plan_x + 120, plan_y + 280, 180, 90)
    # Arc from Office 102 to LP-1
    c.arc(plan_x + 40, plan_y + 90, plan_x + 250, plan_y + 280, 180, 90)
    # Arc from Breakroom GFCI to LP-1
    c.arc(plan_x + 40, plan_y + 80, plan_x + 200, plan_y + 140, 180, 90)
    c.restoreState()

    # Home-run Arrow pointing to LP-1
    c.saveState()
    c.setLineWidth(1.5)
    c.setStrokeColor(colors.HexColor("#dc2626"))
    c.setFillColor(colors.HexColor("#dc2626"))
    c.line(plan_x + 80, plan_y + 280, plan_x + 55, plan_y + 115)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(plan_x + 85, plan_y + 280, "CKT 1,3,5 TO LP-1")
    c.restoreState()

    # Scale bar in plan
    c.saveState()
    c.setLineWidth(1.5)
    c.setStrokeColor(colors.HexColor("#0f172a"))
    c.line(plan_x + 340, plan_y + 25, plan_x + 440, plan_y + 25)
    c.line(plan_x + 340, plan_y + 21, plan_x + 340, plan_y + 29)
    c.line(plan_x + 440, plan_y + 21, plan_x + 440, plan_y + 29)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(plan_x + 375, plan_y + 32, "10'-0\"")
    c.restoreState()

    # ==========================================
    # RIGHT SIDE PANELS: SYMBOL LEGEND & PANEL SCHEDULE
    # ==========================================

    right_x = 525
    right_w = 245

    # 1. Symbol Legend Title
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(right_x, height - 120, right_w, 20, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(right_x + 8, height - 107, "ELECTRICAL SYMBOL LEGEND")

    # Legend Items Box
    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.rect(right_x, height - 280, right_w, 155)

    legend_items = [
        ("Duplex Receptacle 20A", lambda cx, cy: draw_symbol_duplex(c, cx, cy)),
        ("GFCI Receptacle 20A", lambda cx, cy: draw_symbol_gfci(c, cx, cy)),
        ("Single-Pole Switch", lambda cx, cy: draw_symbol_switch(c, cx, cy, "S")),
        ("3-Way Switch", lambda cx, cy: draw_symbol_switch(c, cx, cy, "S3")),
        ("2x4 LED Lay-in Troffer", lambda cx, cy: draw_symbol_troffer(c, cx, cy, 22, 10)),
        ("Recessed LED Can Light", lambda cx, cy: draw_symbol_downlight(c, cx, cy)),
        ("Panelboard LP-1 (200A)", lambda cx, cy: draw_symbol_panel(c, cx, cy, 10, 20, "")),
        ("Junction Box (J-Box)", lambda cx, cy: draw_symbol_jbox(c, cx, cy, "J")),
    ]

    ly = height - 138
    for label, fn in legend_items:
        fn(right_x + 18, ly)
        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.drawString(right_x + 42, ly - 2.5, label)
        ly -= 18.5

    # 2. Panel LP-1 Schedule Header
    c.setFillColor(colors.HexColor("#0f172a"))
    c.rect(right_x, height - 310, right_w, 20, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(right_x + 8, height - 297, "PANEL SCHEDULE — LP-1 (120/208V)")

    # Schedule Table
    styles = getSampleStyleSheet()
    th_style = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, textColor=colors.white, alignment=1)
    tb_style = ParagraphStyle('TB', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, textColor=colors.HexColor("#1e293b"))

    sched_data = [
        [Paragraph("CKT", th_style), Paragraph("DESCRIPTION", th_style), Paragraph("TRIP", th_style), Paragraph("WIRE", th_style)],
        [Paragraph("1", tb_style), Paragraph("Office 101/102 Troffers", tb_style), Paragraph("20A/1P", tb_style), Paragraph("#12 THHN", tb_style)],
        [Paragraph("2", tb_style), Paragraph("Office Receptacles", tb_style), Paragraph("20A/1P", tb_style), Paragraph("#12 THHN", tb_style)],
        [Paragraph("3", tb_style), Paragraph("Conf. Room Power/AV", tb_style), Paragraph("20A/1P", tb_style), Paragraph("#12 THHN", tb_style)],
        [Paragraph("4", tb_style), Paragraph("Breakroom GFCI Drops", tb_style), Paragraph("20A/1P", tb_style), Paragraph("#12 THHN", tb_style)],
        [Paragraph("5", tb_style), Paragraph("Corridor/Exit Lights", tb_style), Paragraph("20A/1P", tb_style), Paragraph("#12 THHN", tb_style)],
        [Paragraph("6,8", tb_style), Paragraph("AC-1 Disconnect", tb_style), Paragraph("30A/2P", tb_style), Paragraph("#10 THHN", tb_style)],
    ]

    sched_table = Table(sched_data, colWidths=[24, 115, 48, 58])
    sched_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#334155")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 2.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")])
    ]))
    sched_table.wrapOn(c, right_w, 200)
    sched_table.drawOn(c, right_x, height - 445)

    # 3. Electrical Notes & Specification Box
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(right_x, height - 475, right_w, 18, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(right_x + 8, height - 463, "GENERAL ELECTRICAL NOTES")

    c.setLineWidth(1)
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(right_x, height - 565, right_w, 85, fill=1, stroke=1)

    c.setFont("Helvetica", 6.8)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(right_x + 6, height - 490, "1. ALL WIRING TO BE COPPER THHN/THWN IN EMT CONDUIT.")
    c.drawString(right_x + 6, height - 504, "2. MAXIMUM 8 DUPLEX RECEPTACLES PER 20A BRANCH CKT.")
    c.drawString(right_x + 6, height - 518, "3. PROVIDE GFCI PROTECTION FOR ALL COUNTERTOPS.")
    c.drawString(right_x + 6, height - 532, "4. MOUNT SWITCHES AT 48\" A.F.F., RECEPTACLES AT 18\" A.F.F.")
    c.drawString(right_x + 6, height - 546, "5. ALL WORK TO COMPLY WITH NEC 2026 & LOCAL CODES.")

    c.save()
    print(f"Generated electrical blueprint PDF: {OUTPUT_PDF}")

    # Copy to default test-plan.pdf location
    with open(OUTPUT_PDF, "rb") as src, open(DEFAULT_TEST_PDF, "wb") as dst:
        dst.write(src.read())
    print(f"Updated default sample plan: {DEFAULT_TEST_PDF}")

if __name__ == "__main__":
    generate_electrical_blueprint()
