import json
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "config" / "ramsReviews.json"
OUT_DIR = ROOT / "public" / "rams" / "reviews"

PAGE_W = 1240
PAGE_H = 1754
MARGIN = 58
BLACK = (20, 20, 24)
GREY = (70, 70, 78)
LIGHT = (246, 246, 247)
MAGENTA = (188, 0, 150)

HAZARDS_LEFT = [
    "Demolition",
    "Hot Works",
    "Steel Erection",
    "Work At Height",
    "Roof Work / Work Near Fragile Materials",
    "Temporary Works including Scaffolding",
    "Breaking Ground / Digging",
    "Working in Excavations",
    "Confined Space Work",
    "Lifting Operations",
    "Overhead Services",
    "Electrical Work",
    "Use of Plant and Equipment",
    "PAT Testing",
    "Restricted Access and Egress",
    "Vehicle / Plant Movements",
    "Segregation",
    "Fire / Explosion",
    "Sharp Objects",
    "Poor Ground Conditions",
    "Non English Speaking Operatives",
    "Flying Particles",
]

HAZARDS_RIGHT = [
    "Licensed Asbestos Removal",
    "Non-Licensed Asbestos Removal",
    "Dust",
    "Noise",
    "Vibration",
    "Manual Handling",
    "Epoxy Resins",
    "Methyl methacrylate (MMA)",
    "UV (Solar) Radiation",
    "Leptospirosis",
    "Psittacosis",
    "Needle Stick Injury",
    "Hazardous Substances",
    "Falls of materials",
    "Working on / adjacent to water",
    "Adverse weather",
    "Other Hazards: Please Specify:",
    "COVID-19",
]

QUESTION_TEXT = {
    "q1": "1. Are appropriate controls contained in the RAMs to mitigate the risks arising from the hazards identified overleaf?",
    "q2": "2. Do they cover all the likely significant hazards that will be encountered in the work?",
    "q2p": "2. Are Uplands Permits to Work required? If so state which ones in the comments section.",
    "q3": "3. Is the area of work and scope of works clearly defined?",
    "q4": "4. Are supervisory and communications arrangements clearly defined? State the name of the Contractors Supervisor in the comments section.",
    "q5": "5. Has the responsibility for monitoring the operations, to which the method statement relates, been clearly defined?",
    "q6": "6. Does the document identify the training requirements for personnel engaged on the work?",
    "q7": "7. HAS EITHER OF THE FOLLOWING BEEN CARRIED OUT IN RELATION TO NON ENGLISH SPEAKING OPERATIVES: A. A Bi-lingual Supervisor has translated the RAMs to the Non English speaking Operatives in the presence of an Uplands Manager B. RAMs have been provided in the Non English speaking operative's native language.",
    "q8": "8. Has the impact of the work on other contractors, visitors, and public areas been assessed? & if so have controls been proposed to protect them?",
    "q9": "9. Are arrangements for emergencies adequately addressed?",
    "q10": "10. Has the appropriate personal protective equipment been identified?",
    "q11": "11. Are environmental aspects such as waste disposal, contaminated spoil, water pollution etc., adequately addressed?",
    "q12": "12. Is there anything else that the RAMs needs to address?",
}

STATUS_TEXT = {
    "A": "No Comments, Satisfactory",
    "B": "Minor Comments. Satisfactory Subject to Incorporation of Comments Below",
    "C": "Unsatisfactory, please revise and Re submit to include comments below:",
}


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


F10 = font(18)
F8 = font(14)
F9 = font(16)
F11 = font(20)
F12 = font(22)
F12B = font(22, True)
F14 = font(26)
F14B = font(26, True)
F18B = font(34, True)
F28B = font(52, True)


def wrap(draw, text, width, fnt):
    if not text:
        return [""]
    avg = max(draw.textlength("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", font=fnt) / 52, 1)
    chars = max(8, int(width / avg))
    lines = []
    for paragraph in str(text).split("\n"):
        lines.extend(textwrap.wrap(paragraph, width=chars) or [""])
    return lines


def draw_wrapped(draw, xy, text, width, fnt, fill=BLACK, line_gap=5, max_lines=None):
    x, y = xy
    lines = wrap(draw, text, width, fnt)
    if max_lines:
        lines = lines[:max_lines]
    line_h = fnt.getbbox("Ag")[3] - fnt.getbbox("Ag")[1] + line_gap
    for line in lines:
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h
    return y


def draw_wrapped_box(draw, xy, text, width, height, fnt, fill=BLACK, line_gap=3):
    x, y = xy
    selected_font = fnt
    selected_lines = wrap(draw, text, width, selected_font)
    for size in [16, 14, 12, 11, 10]:
        trial_font = font(size)
        line_h = trial_font.getbbox("Ag")[3] - trial_font.getbbox("Ag")[1] + line_gap
        max_lines = max(1, int(height / line_h))
        trial_lines = wrap(draw, text, width, trial_font)
        if len(trial_lines) <= max_lines:
            selected_font = trial_font
            selected_lines = trial_lines
            break
    line_h = selected_font.getbbox("Ag")[3] - selected_font.getbbox("Ag")[1] + line_gap
    max_lines = max(1, int(height / line_h))
    lines = selected_lines
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,;:") + "..."
    for line in lines:
        draw.text((x, y), line, font=selected_font, fill=fill)
        y += line_h
    return y


def cell(draw, x0, y0, x1, y1, text="", fnt=F11, fill=None, bold=False, align="left"):
    if fill:
        draw.rectangle((x0, y0, x1, y1), fill=fill)
    draw.rectangle((x0, y0, x1, y1), outline=BLACK, width=2)
    if text:
        tx = x0 + 12
        if align == "center":
            tw = draw.textlength(text, font=fnt)
            tx = x0 + ((x1 - x0) - tw) / 2
        draw.text((tx, y0 + 10), text, font=fnt, fill=BLACK)


def checkbox(draw, x, y, checked=False):
    draw.rectangle((x, y, x + 20, y + 20), outline=BLACK, width=2)
    if checked:
        draw.line((x + 4, y + 11, x + 9, y + 17, x + 18, y + 3), fill=BLACK, width=3)


def logo(draw, x, y):
    draw.text((x, y), "UPL", font=F28B, fill=BLACK)
    draw.polygon([(x + 128, y + 44), (x + 148, y), (x + 168, y + 44)], fill=MAGENTA)
    draw.text((x + 178, y), "NDS", font=F28B, fill=BLACK)
    draw.line((x + 4, y + 62, x + 112, y + 62), fill=MAGENTA, width=3)
    draw.line((x + 180, y + 62, x + 302, y + 62), fill=MAGENTA, width=3)
    draw.text((x + 74, y + 68), "CONSTRUCTING CHANGE", font=F10, fill=GREY)


def header(draw, title_label=""):
    x = MARGIN
    y = 30
    cell(draw, x, y, x + 260, y + 110, "Document Reference:", F10)
    draw.text((x + 44, y + 48), "UHSF20.1", font=F18B, fill=BLACK)
    cell(draw, x + 260, y, PAGE_W - MARGIN - 350, y + 110, title_label, F10)
    draw.text((x + 390, y + 40), "RAMS REVIEW FORM", font=F18B, fill=BLACK)
    cell(draw, PAGE_W - MARGIN - 350, y, PAGE_W - MARGIN, y + 110)
    logo(draw, PAGE_W - MARGIN - 330, y + 22)


def footer(draw, page):
    y = PAGE_H - 84
    widths = [220, 160, 205, 200, PAGE_W - (MARGIN * 2) - 785]
    labels = [
        "Date Reviewed:\n30-06-2025 Rev3",
        "Document Type:\nFORM",
        "Document Created By:\nHSEQ DEPT",
        "Status:\nAPPROVED",
        f"PAGE {page} of 2",
    ]
    x = MARGIN + 12
    for width, label in zip(widths, labels):
        cell(draw, x, y, x + width, y + 52)
        lines = label.split("\n")
        if len(lines) == 2:
            draw.text((x + 14, y + 6), lines[0], font=F10, fill=GREY)
            draw.text((x + 40, y + 27), lines[1], font=F10, fill=BLACK)
        else:
            tw = draw.textlength(label, font=F10)
            draw.text((x + (width - tw) / 2, y + 19), label, font=F10, fill=BLACK)
        x += width


def details_page(form, reviewer):
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(img)
    header(draw)

    y = 160
    draw.text((MARGIN + 28, y), "METHOD STATEMENT / RISK ASSESSMENT DETAILS", font=F14B, fill=BLACK)
    y += 32
    x = MARGIN + 34
    w = PAGE_W - (MARGIN * 2) - 68
    row_h = 40
    cell(draw, x, y, x + 240, y + row_h, "Name of company:", F11)
    cell(draw, x + 240, y, x + 555, y + row_h, form["company"], F11)
    cell(draw, x + 555, y, x + 735, y + row_h, "Account:", F11)
    cell(draw, x + 735, y, x + w, y + row_h, form.get("account", ""), F11)
    y += row_h
    cell(draw, x, y, x + 240, y + row_h, "Site", F11)
    cell(draw, x + 240, y, x + 555, y + row_h, form.get("site", ""), F11)
    cell(draw, x + 555, y, x + 735, y + row_h, "Submitted by:", F11)
    cell(draw, x + 735, y, x + w, y + row_h, form.get("submittedBy", ""), F11)
    y += row_h
    cell(draw, x, y, x + 240, y + row_h, "Title:", F11)
    cell(draw, x + 240, y, x + w, y + row_h, form["title"], F11)
    y += row_h
    cell(draw, x, y, x + 555, y + row_h, "Date submitted to Uplands for review:", F11)
    cell(draw, x + 555, y, x + w, y + row_h, form.get("dateSubmitted", ""), F11)

    y += 76
    draw.text((MARGIN + 28, y), "UPLANDS REVIEW", font=F14B, fill=BLACK)
    y += 30
    cell(draw, x, y, x + w, y + 40, "Uplands Review Details", F11)
    y += 40
    cell(draw, x, y, x + 110, y + row_h, "Name:", F11)
    cell(draw, x + 110, y, x + 555, y + row_h, reviewer["name"], F11)
    cell(draw, x + 555, y, x + 675, y + row_h, "Position:", F11)
    cell(draw, x + 675, y, x + w, y + row_h, reviewer["position"], F11)
    y += row_h
    cell(draw, x, y, x + 110, y + row_h, "Signed:", F11)
    cell(draw, x + 110, y, x + 555, y + row_h, "")
    cell(draw, x + 555, y, x + 675, y + row_h, "Date:", F11)
    cell(draw, x + 675, y, x + w, y + row_h, reviewer["date"], F11)
    y += row_h
    for status in ["A", "B", "C"]:
        cell(draw, x, y, x + 110, y + row_h, status, F11, align="center")
        cell(draw, x + 110, y, x + w - 76, y + row_h, STATUS_TEXT[status], F11)
        cell(draw, x + w - 76, y, x + w, y + row_h)
        if form["status"] == status:
            draw.line((x + w - 48, y + 22, x + w - 39, y + 31, x + w - 24, y + 10), fill=BLACK, width=4)
        y += row_h
    cell(draw, x, y, x + 240, y + 76, "Date sent for\namendments to be\nadded:", F11)
    cell(draw, x + 240, y, x + 555, y + 76)
    cell(draw, x + 555, y, x + 760, y + 76, "Date received back\nwith amendment\nadded:", F11)
    cell(draw, x + 760, y, x + w, y + 76)
    y += 76
    cell(draw, x, y, x + 240, y + 96, "General Comments:", F11)
    cell(draw, x + 240, y, x + w, y + 96)
    draw_wrapped(draw, (x + 252, y + 10), form.get("generalComments", ""), w - 270, F10, max_lines=4)

    y += 116
    draw.text(
        (x + 12, y),
        "All Hazards identified MUST have the appropriate CONTROLS MEASURES identified and explained in the RAMs.",
        font=F11,
        fill=BLACK,
    )
    y += 36
    yes = set(form.get("hazardsYes", []))
    col_w = w // 2
    h_row = 28
    for i in range(max(len(HAZARDS_LEFT), len(HAZARDS_RIGHT))):
        yy = y + i * h_row
        if i < len(HAZARDS_LEFT):
            draw_hazard(draw, x, yy, x + col_w, yy + h_row, HAZARDS_LEFT[i], HAZARDS_LEFT[i] in yes)
        else:
            cell(draw, x, yy, x + col_w, yy + h_row)
        if i < len(HAZARDS_RIGHT):
            draw_hazard(draw, x + col_w, yy, x + w, yy + h_row, HAZARDS_RIGHT[i], HAZARDS_RIGHT[i] in yes)
        else:
            cell(draw, x + col_w, yy, x + w, yy + h_row)

    footer(draw, 1)
    return img


def draw_hazard(draw, x0, y0, x1, y1, label, is_yes):
    label_w = (x1 - x0) - 120
    if label.startswith("Other Hazards"):
        cell(draw, x0, y0, x0 + label_w, y1, label, F9)
        cell(draw, x0 + label_w, y0, x1, y1)
        return
    cell(draw, x0, y0, x0 + label_w, y1, label, F9)
    cell(draw, x0 + label_w, y0, x1, y1)
    draw.text((x0 + label_w + 10, y0 + 6), "Yes", font=F9, fill=BLACK)
    checkbox(draw, x0 + label_w + 48, y0 + 5, is_yes)
    draw.text((x0 + label_w + 74, y0 + 6), "No", font=F9, fill=BLACK)
    checkbox(draw, x0 + label_w + 102, y0 + 5, not is_yes)


def questions_page(form):
    img = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(img)
    header(draw, "Title:")

    x = MARGIN + 28
    y = 166
    w = PAGE_W - (MARGIN * 2) - 56
    cell(draw, x, y, x + 470, y + 42, "Pressure Systems", F11)
    cell(draw, x + 470, y, x + 660, y + 42)
    draw.text((x + 500, y + 10), "Yes", font=F11, fill=BLACK)
    checkbox(draw, x + 542, y + 10, form.get("pressureSystems") == "Yes")
    draw.text((x + 590, y + 10), "No", font=F11, fill=BLACK)
    checkbox(draw, x + 626, y + 10, form.get("pressureSystems") != "Yes")
    cell(draw, x + 660, y, x + w, y + 42)
    y += 42

    head_h = 46
    q_w = 520
    yes_w = 80
    no_w = 80
    comments_w = w - q_w - yes_w - no_w
    cell(draw, x, y, x + q_w, y + head_h, "QUESTION", F12B, LIGHT, align="center")
    cell(draw, x + q_w, y, x + q_w + yes_w, y + head_h, "YES", F12B, LIGHT, align="center")
    cell(draw, x + q_w + yes_w, y, x + q_w + yes_w + no_w, y + head_h, "NO", F12B, LIGHT, align="center")
    cell(draw, x + q_w + yes_w + no_w, y, x + w, y + head_h, "COMMENTS", F12B, LIGHT, align="center")
    y += head_h

    row_heights = [104, 90, 102, 82, 96, 84, 88, 150, 92, 88, 76, 86, 92]
    for (qid, answer, comment), row_h in zip(form["questions"], row_heights):
        cell(draw, x, y, x + q_w, y + row_h)
        cell(draw, x + q_w, y, x + q_w + yes_w, y + row_h)
        cell(draw, x + q_w + yes_w, y, x + q_w + yes_w + no_w, y + row_h)
        cell(draw, x + q_w + yes_w + no_w, y, x + w, y + row_h)
        draw_wrapped_box(draw, (x + 12, y + 10), QUESTION_TEXT[qid], q_w - 24, row_h - 18, F9)
        checkbox(draw, x + q_w + 30, y + 32, answer == "Yes")
        checkbox(draw, x + q_w + yes_w + 30, y + 32, answer == "No")
        draw_wrapped_box(draw, (x + q_w + yes_w + no_w + 12, y + 10), comment, comments_w - 24, row_h - 18, F9)
        y += row_h

    note = (
        "Note: By accepting this method statement Uplands do not assume responsibility for any errors or omissions by the author. "
        "The contractor is not relieved of statutory obligation to provide, monitor and revise their safe system of work during progress "
        "with the activity. All revisions to the document or the system of work must be agreed with Uplands prior to execution of the work."
    )
    draw_wrapped_box(draw, (x, y + 8), note, w, 58, F8)
    footer(draw, 2)
    return img


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA_PATH.read_text())
    for form in data["forms"]:
        if not form.get("frontHref") or not form.get("questions"):
            continue
        front = details_page(form, data["reviewer"])
        back = questions_page(form)
        front_path = ROOT / "public" / form["frontHref"].lstrip("/")
        back_path = ROOT / "public" / form["backHref"].lstrip("/")
        pdf_path = ROOT / "public" / form["downloadHref"].lstrip("/")
        front.save(front_path, quality=92)
        back.save(back_path, quality=92)
        front.convert("RGB").save(pdf_path, save_all=True, append_images=[back.convert("RGB")], resolution=150.0)
        print(pdf_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
