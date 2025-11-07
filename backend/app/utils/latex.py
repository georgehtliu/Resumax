import base64
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

from app.schemas import SelectedResume

LATEX_HEADER = r"""
%-------------------------
% Resume in Latex (Jake template, adapted)
%-------------------------
\documentclass[letterpaper,11pt]{article}
\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}
\titleformat{\section}{\vspace{-4pt}\scshape\raggedright\large}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]
\pdfgentounicode=1
\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}
\newcommand{\resumeSubheading}[4]{\vspace{-2pt}\item
  \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
    \textbf{#1} & #2 \\
    \textit{\small#3} & \textit{\small #4} \\
  \end{tabular*}\vspace{-7pt}}
\newcommand{\resumeProjectHeading}[2]{\item
  \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
    \small#1 & #2 \\
  \end{tabular*}\vspace{-7pt}}
\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
"""

LATEX_FOOTER = "\n\\end{document}\n"

PLACEHOLDER_NAME = "Candidate Name"


def _escape_latex(text: str) -> str:
    if not text:
        return ""
    replacements = {
        "\\": "\\textbackslash{}",
        "{": "\\{",
        "}": "\\}",
        "$": "\\$",
        "%": "\\%",
        "#": "\\#",
        "_": "\\_",
        "^": "\\^{}",
        "~": "\\textasciitilde{}",
        "&": "\\&",
    }
    escaped = []
    for char in text:
        escaped.append(replacements.get(char, char))
    return "".join(escaped)


def _build_heading(personal_info: dict | None) -> str:
    info = personal_info or {}
    name = " ".join(filter(None, [info.get("firstName"), info.get("lastName")])) or PLACEHOLDER_NAME

    parts: list[str] = []
    if info.get("phone"):
        parts.append(f"\\underline{{{_escape_latex(info['phone'])}}}")
    if info.get("email"):
        email = _escape_latex(info["email"])
        parts.append(f"\\href{{mailto:{email}}}{{\\underline{{{email}}}}}")
    if info.get("linkedin"):
        url = _escape_latex(info["linkedin"])
        parts.append(f"\\href{{{url}}}{{\\underline{{{url}}}}}")
    if info.get("github"):
        url = _escape_latex(info["github"])
        parts.append(f"\\href{{{url}}}{{\\underline{{{url}}}}}")

    contact_line = " $|$ ".join(parts)
    return (
        "\\begin{center}\n"
        f"  \\textbf{{\\Huge \\scshape {_escape_latex(name)}}} \\\\ \\vspace{{1pt}}\n"
        f"  \\small {contact_line}\n"
        "\\end{center}\n"
    )


def _format_bullets(bullets: list) -> str:
    if not bullets:
        return ""
    items = [f"  \\resumeItem{{{_escape_latex(bullet.text if hasattr(bullet, 'text') else bullet.get('text', ''))}}}" for bullet in bullets]
    return "\\resumeItemListStart\n" + "\n".join(items) + "\n\\resumeItemListEnd"


def _build_education(education: list) -> str:
    if not education:
        return ""
    sections = []
    for entry in education:
        line = (
            "  \\resumeSubheading\n"
            f"    {{{_escape_latex(entry.school or '')}}}{{{_escape_latex(entry.endDate or '')}}}\n"
            f"    {{{_escape_latex(entry.degree or '')}{(', ' + _escape_latex(entry.field)) if entry.field else ''}}}"
            f"{{{_escape_latex(entry.startDate or '')}}}\n"
        )
        bullets = _format_bullets(entry.selectedBullets or [])
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{Education}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_experience(experiences: list) -> str:
    if not experiences:
        return ""
    sections = []
    for entry in experiences:
        line = (
            "  \\resumeSubheading\n"
            f"    {{{_escape_latex(entry.company or '')}}}{{{_escape_latex(entry.endDate or '')}}}\n"
            f"    {{{_escape_latex(entry.role or '')}}}{{{_escape_latex(entry.startDate or '')}}}\n"
        )
        bullets = _format_bullets(entry.selectedBullets or [])
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{Experience}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_projects(projects: list) -> str:
    if not projects:
        return ""
    sections = []
    for entry in projects:
        name = _escape_latex(entry.name or '')
        heading = f"\\textbf{{{name}}}"
        if entry.url:
            url = _escape_latex(entry.url)
            heading = f"\\href{{{url}}}{{{heading}}}"
        tech = f" \\emph{{{_escape_latex(entry.technologies)}}}" if entry.technologies else ''
        bullets = _format_bullets(entry.selectedBullets or [])
        line = "  \\resumeProjectHeading\n    {" + heading + tech + "}{}\n"
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{Projects}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_skills(skills: list) -> str:
    if not skills:
        return ""
    lines = []
    for group in skills:
        title = _escape_latex(group.title or 'Skills')
        skill_text = _escape_latex(", ".join(group.skills or []))
        if skill_text:
            lines.append(f"     \\textbf{{{title}}} {{: {skill_text}}}\\vspace{{2pt}}");
    if not lines:
        return ""
    body = " \\ \\\n".join(lines)
    return (
        "\\section{Skills}\n"
        " \\begin{itemize}[leftmargin=0in, label={}]\n"
        "    \\small{\\item{\n"
        f"{body}\n"
        "    }}\n"
        " \\end{itemize}\n"
    )


def _build_custom_sections(sections: list) -> str:
    if not sections:
        return ""
    parts = []
    for section in sections:
        bullets = _format_bullets(section.selectedBullets or [])
        if not bullets:
            continue
        parts.append(
            f"\\section{{{_escape_latex(section.title or 'Additional')}}}\n"
            f"{bullets}\n"
        )
    return "".join(parts)


def build_resume_latex(resume: SelectedResume) -> str:
    parts = [
        LATEX_HEADER,
        "\\begin{document}\n",
        _build_heading(resume.personalInfo.dict() if resume.personalInfo else None),
        _build_education(resume.education),
        _build_experience(resume.experiences),
        _build_projects(resume.projects),
        _build_skills(resume.skills),
        _build_custom_sections(resume.customSections),
        LATEX_FOOTER,
    ]
    return "".join(filter(None, parts))


def render_pdf_from_latex(latex_source: str) -> bytes:
    if not latex_source:
        raise ValueError("LaTeX source is empty")

    tectonic_path = shutil.which("tectonic")
    if tectonic_path is None:
        raise RuntimeError("tectonic executable not found on PATH")

    with TemporaryDirectory(prefix="latex_render_") as tmpdir:
        tex_path = Path(tmpdir) / "resume.tex"
        tex_path.write_text(latex_source, encoding="utf-8")

        result = subprocess.run(
            [tectonic_path, "--outdir", tmpdir, tex_path.name],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            raise RuntimeError(f"tectonic failed: {result.stderr.strip()}")

        pdf_path = Path(tmpdir) / "resume.pdf"
        if not pdf_path.exists():
            raise RuntimeError("PDF output not produced by tectonic")

        return pdf_path.read_bytes()


def pdf_bytes_to_base64(pdf_bytes: bytes) -> str:
    return base64.b64encode(pdf_bytes).decode("utf-8")
