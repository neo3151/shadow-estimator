import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 24, "SHADOW ESTIMATOR — Electrical Takeoff & Product Roadmap")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(36, 11 * inch - 28, 8.5 * inch - 36, 11 * inch - 28)
        
        # Footer (all pages)
        self.setFont("Helvetica", 8)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 20, page_text)
        self.drawString(36, 20, "CONFIDENTIAL — Internal Electrical Project Status & Roadmap Report")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 30, 8.5 * inch - 36, 30)
        
        self.restoreState()

def build_pdf(filename="Shadow_Estimator_Project_Summary_and_Roadmap.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=32,
        bottomMargin=32
    )
    
    # Palette
    PRIMARY = colors.HexColor("#0F172A")      # Slate 900
    ACCENT = colors.HexColor("#2563EB")       # Blue 600
    SECONDARY = colors.HexColor("#0284C7")    # Sky 600
    TEXT_DARK = colors.HexColor("#1E293B")    # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B")   # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")     # Slate 50
    BORDER_COLOR = colors.HexColor("#E2E8F0") # Slate 200

    base_styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=23,
        textColor=PRIMARY,
        spaceAfter=2
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12,
        textColor=ACCENT,
        spaceAfter=6
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=14.5,
        textColor=PRIMARY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11.5,
        textColor=ACCENT,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_DARK,
        spaceAfter=3
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=9,
        firstLineIndent=-6,
        spaceAfter=2
    )
    
    table_text = ParagraphStyle(
        'TableText',
        parent=base_styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=TEXT_DARK
    )
    
    table_header = ParagraphStyle(
        'TableHeader',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10.5,
        textColor=colors.white
    )

    badge_planned = ParagraphStyle(
        'BadgePlanned',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#1D4ED8")
    )

    badge_progress = ParagraphStyle(
        'BadgeProgress',
        parent=base_styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#D97706")
    )

    story = []

    # Title Block & Metadata
    story.append(Paragraph("SHADOW ESTIMATOR — ELECTRICAL EDITION", title_style))
    story.append(Paragraph("Electrical Project Status Summary, Technical Backlog & Deliverables Timeline", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=6))

    meta_data = [
        [
            Paragraph("<b>Project Name:</b> Shadow Estimator (Dedicated Electrical Blueprint Takeoff)", table_text),
            Paragraph("<b>Current Date:</b> August 2026", table_text)
        ],
        [
            Paragraph("<b>Architecture:</b> Next.js 14 App Router, React 18, `@google/genai` (Gemini 2.13)", table_text),
            Paragraph("<b>Primary Trade Focus:</b> Electrical (Power, Lighting, Gear & Conduit)", table_text)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[4.3 * inch, 3.4 * inch])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 3),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # Executive Overview
    story.append(Paragraph("1. Executive Overview & Electrical Trade Focus", h1_style))
    story.append(Paragraph(
        "<b>Shadow Estimator</b> is an AI-assisted blueprint takeoff and material estimating platform repurposed to focus <b>solely on Electrical construction</b>. "
        "It converts raw electrical plan drawings (power plans, lighting layouts, panel schedules, single-line diagrams) into structured line-item electrical estimates by pairing computer vision AI with electrical material catalogs, conduit tools, and automated accessory rules.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Metric Highlights Table
    metric_data = [
        [
            Paragraph("<font size=11 color='#2563EB'><b>4,200+</b></font><br/><b>Electrical Materials</b><br/><font color='#64748B' size=6.5>Conduit, Wire, Outlets, Panels</font>", table_text),
            Paragraph("<font size=11 color='#059669'><b>Gemini 2.13</b></font><br/><b>Electrical AI Engine</b><br/><font color='#64748B' size=6.5>Receptacle & Lighting takeoff</font>", table_text),
            Paragraph("<font size=11 color='#0284C7'><b>Conduit & MC</b></font><br/><b>Linear Feet Measurement</b><br/><font color='#64748B' size=6.5>EMT, PVC, Romex & MC Cable</font>", table_text),
            Paragraph("<font size=11 color='#D97706'><b>Instant</b></font><br/><b>Box & Strap Rules</b><br/><font color='#64748B' size=6.5>Auto J-Box & fitting calculation</font>", table_text),
        ]
    ]
    metric_table = Table(metric_data, colWidths=[1.925 * inch] * 4)
    metric_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('PADDING', (0,0), (-1,-1), 4.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(metric_table)
    story.append(Spacer(1, 8))

    # Section 2: Current Progress
    story.append(Paragraph("2. Operational Core Modules & Electrical Adaptation", h1_style))
    
    story.append(Paragraph("<b>A. Electrical Blueprint Takeoff Engine</b> (<code>TakeoffViewer.js</code>, <code>/api/takeoff/convert</code>)", h2_style))
    story.append(Paragraph("• <b>Dedicated Electrical Tooling:</b> Pre-configured symbol tools for Branch Power (Duplex/GFCI/Quad), Switches & Dimmers, Lighting Fixtures (2x4 Troffers, Can Lights, Highbays), Distribution Gear (Panels, Transformers, J-Boxes), and Fire Alarm.", bullet_style))
    story.append(Paragraph("• <b>Conduit & Cable Measurement:</b> Drag-to-measure tool for linear conduit runs (EMT, PVC, MC Cable, Romex NM-B) with auto-calculated footage.", bullet_style))

    story.append(Paragraph("<b>B. Electrical AI Vision Recognition</b> (<code>/api/takeoff/autoscan</code>, <code>smart-scan</code>)", h2_style))
    story.append(Paragraph("• <b>Electrical Symbol Recognition:</b> Custom Gemini Vision prompts tuned specifically for electrical legend symbols, outlet drops, switches, panel locations, and fixture counts.", bullet_style))
    story.append(Paragraph("• <b>Batch Processing Optimization:</b> Requests queued in batches to eliminate rate limits on large multi-sheet electrical drawing sets.", bullet_style))

    story.append(Paragraph("<b>C. Electrical Material Pricing & Assembly Matrix</b> (<code>/estimate</code>)", h2_style))
    story.append(Paragraph("• <b>Electrical Material Catalog:</b> National average pricing for conduit, copper wire, boxes, devices, lighting fixtures, and panel gear.", bullet_style))
    story.append(Paragraph("• <b>Electrical Dependency Rules:</b> Automatically adds mud rings, locknuts, set-screw connectors, and assembly labor when primary devices or conduits are added.", bullet_style))

    # PAGE BREAK HERE to give Page 2 Section 3, Section 4, Section 5 clean layout
    story.append(PageBreak())

    # Section 3: Potential Tasks
    story.append(Paragraph("3. Technical Backlog: Electrical Focus Roadmap", h1_style))
    story.append(Paragraph(
        "To maximize value for electrical contractors, the engineering backlog focuses exclusively on electrical trade workflow enhancements:",
        body_style
    ))

    tasks_table_data = [
        [
            Paragraph("Electrical Module / Feature", table_header),
            Paragraph("Technical Scope & Key Objectives", table_header),
            Paragraph("Priority", table_header),
            Paragraph("Status", table_header)
        ],
        [
            Paragraph("<b>Panel Schedule OCR Parser</b>", table_text),
            Paragraph("Extract circuit breaker amperages, wire sizes, and load totals directly from electrical panel schedules via AI OCR.", table_text),
            Paragraph("<font color='#DC2626'><b>High</b></font>", table_text),
            Paragraph("<b>Planned</b>", badge_planned)
        ],
        [
            Paragraph("<b>Conduit Fill & Wire Sizing Calculator</b>", table_text),
            Paragraph("Automated NEC conduit fill calculation for EMT/PVC runs based on wire count (#12, #10, #8 THHN) and conduit size.", table_text),
            Paragraph("<font color='#DC2626'><b>High</b></font>", table_text),
            Paragraph("<b>Planned</b>", badge_planned)
        ],
        [
            Paragraph("<b>Single-Line Diagram Recognizer</b>", table_text),
            Paragraph("Detect transformers, main switchboards, sub-panels, and feeder conduits from Electrical Riser / Single-Line diagrams.", table_text),
            Paragraph("<font color='#D97706'><b>Medium</b></font>", table_text),
            Paragraph("<b>In Progress</b>", badge_progress)
        ],
        [
            Paragraph("<b>Lighting Fixture Schedule Sync</b>", table_text),
            Paragraph("Parse Lighting Fixture Schedules (Type A, B, C) and automatically map symbol counts to catalog fixture SKUs.", table_text),
            Paragraph("<font color='#DC2626'><b>High</b></font>", table_text),
            Paragraph("<b>Planned</b>", badge_planned)
        ],
        [
            Paragraph("<b>Live Electrical Supplier API Sync</b>", table_text),
            Paragraph("Real-time price syncing with electrical supply houses (Graybar, Rexel, Home Depot Pro) for localized wire & copper pricing.", table_text),
            Paragraph("<font color='#D97706'><b>Medium</b></font>", table_text),
            Paragraph("<b>Planned</b>", badge_planned)
        ],
        [
            Paragraph("<b>Electrical Bid & Estimate Export</b>", table_text),
            Paragraph("Generate branded Electrical Client Bid Proposals, Excel material schedules, and export to Accubid / QuickBooks.", table_text),
            Paragraph("<font color='#2563EB'><b>Standard</b></font>", table_text),
            Paragraph("<b>Planned</b>", badge_planned)
        ]
    ]

    tasks_table = Table(tasks_table_data, colWidths=[1.85 * inch, 3.85 * inch, 0.9 * inch, 1.1 * inch])
    tasks_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 3.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(tasks_table)
    story.append(Spacer(1, 10))

    # Section 4: Timeline & Deliverables Roadmap
    story.append(Paragraph("4. Electrical Development Timeline & Schedule", h1_style))

    timeline_data = [
        [
            Paragraph("Milestone & Phase", table_header),
            Paragraph("Timeline Window", table_header),
            Paragraph("Deliverables & Core Milestones", table_header),
            Paragraph("Estimated Duration", table_header)
        ],
        [
            Paragraph("<b>Phase 1: Electrical Takeoff & Legend Scan</b>", table_text),
            Paragraph("<b>Weeks 1 – 3</b><br/>(Q3 2026)", table_text),
            Paragraph("• Electrical symbol legend scan & custom trade mapping<br/>• Scale calibration for linear conduit & MC cable runs", table_text),
            Paragraph("3 Weeks<br/>(Sprint 1-2)", table_text)
        ],
        [
            Paragraph("<b>Phase 2: Panel Schedules & Fixture OCR</b>", table_text),
            Paragraph("<b>Weeks 4 – 7</b><br/>(Q4 2026)", table_text),
            Paragraph("• AI OCR parser for Panel Schedules & Lighting Fixture Schedules<br/>• Single-Line / Riser diagram feeder takeoff", table_text),
            Paragraph("4 Weeks<br/>(Sprint 3-4)", table_text)
        ],
        [
            Paragraph("<b>Phase 3: NEC Calculation Engine</b>", table_text),
            Paragraph("<b>Weeks 8 – 11</b><br/>(Q4 2026)", table_text),
            Paragraph("• Automated NEC conduit fill & wire sizing calculator<br/>• Multi-tenant electrical project cloud database (PostgreSQL)", table_text),
            Paragraph("4 Weeks<br/>(Sprint 5-6)", table_text)
        ],
        [
            Paragraph("<b>Phase 4: Electrical Supplier APIs & Bidding</b>", table_text),
            Paragraph("<b>Weeks 12 – 16</b><br/>(Q1 2027)", table_text),
            Paragraph("• Live distributor pricing sync (Graybar, Rexel, Home Depot)<br/>• Branded Electrical Proposal generator & Accubid/QuickBooks export", table_text),
            Paragraph("5 Weeks<br/>(Sprint 7-9)", table_text)
        ]
    ]

    timeline_table = Table(timeline_data, colWidths=[1.85 * inch, 1.35 * inch, 3.4 * inch, 1.1 * inch])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT])
    ]))
    story.append(timeline_table)
    story.append(Spacer(1, 10))

    # Section 5: Risk Mitigation & Immediate Action Items
    story.append(Paragraph("5. Technical Risks & Recommended Next Steps", h1_style))
    story.append(Paragraph("• <b>Symbol Variance:</b> Standardize prompt templates to handle variations between IEEE/ANSI electrical blueprint symbols across architect sets.", bullet_style))
    story.append(Paragraph("• <b>Volatile Commodity Prices:</b> Implement daily or real-time copper/wire price sync adapters so material cost estimates reflect live market rates.", bullet_style))
    story.append(Paragraph("• <b>Immediate Priority:</b> Complete Phase 1 electrical symbol calibration and panel schedule OCR parser implementation.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=0.75, color=BORDER_COLOR, spaceBefore=4, spaceAfter=6))
    story.append(Paragraph("<i>Report generated automatically by Antigravity AI Pair Programmer. Project workspace: <code>shadow-estimator</code>. Focus: Electrical Trade.</i>", ParagraphStyle('Footnote', parent=body_style, fontSize=7.5, textColor=TEXT_MUTED, alignment=1)))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF build complete: {filename}")

if __name__ == "__main__":
    build_pdf()
