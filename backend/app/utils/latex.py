import base64
import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory

from app.schemas import SelectedResume

LATEX_HEADER = r"""
%-------------------------
% Resume in Latex - Minimal Tectonic-Compatible Version
% Author : Jake Gutierrez (adapted for tectonic)
%-------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{XCharter}

\pagestyle{empty}

% Adjust margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{#1 \vspace{-2pt}}
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubSubheading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \textit{\small#1} & \textit{\small #2} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\bullet$}

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
        phone = _escape_latex(info['phone'])
        parts.append(f"\\underline{{{phone}}}")
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
        f"    \\textbf{{\\Huge \\scshape {_escape_latex(name)}}} \\\\ \\vspace{{1pt}}\n"
        f"    \\small {contact_line}\n"
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
        degree_text = _escape_latex(entry.degree or "")
        field_text = _escape_latex(entry.field or "") if entry.field else ""
        if degree_text and field_text:
            degree_line = f"{degree_text}, {field_text}"
        elif field_text:
            degree_line = field_text
        else:
            degree_line = degree_text
        start = _escape_latex(entry.startDate or "")
        end = _escape_latex(entry.endDate or "") or "Present"
        date_range = f"{start} -- {end}" if start else end
        line = (
            "  \\resumeSubheading\n"
            f"    {{{_escape_latex(entry.school or '')}}}{{{date_range}}}\n"
            f"    {{{degree_line}}}{{}}\n"
        )
        bullets = _format_bullets(entry.selectedBullets or [])
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{Education}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_experience(experiences: list) -> str:
    if not experiences:
        return ""
    sections = []
    for entry in experiences:
        start = _escape_latex(entry.startDate or "")
        end = _escape_latex(entry.endDate or "") or "Present"
        date_range = f"{start} -- {end}" if start else end
        location = _escape_latex(getattr(entry, "location", None) or "")
        line = (
            "  \\resumeSubheading\n"
            f"    {{{_escape_latex(entry.company or '')}}}{{{date_range}}}\n"
            f"    {{{_escape_latex(entry.role or '')}}}{{{location}}}\n"
        )
        bullets = _format_bullets(entry.selectedBullets or [])
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{EXPERIENCE}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_projects(projects: list) -> str:
    if not projects:
        return ""
    sections = []
    for entry in projects:
        name = _escape_latex(getattr(entry, "name", "") or "")
        url_value = getattr(entry, "url", None)
        if url_value:
            url = _escape_latex(url_value)
            heading = f"\\href{{{url}}}{{\\textbf{{{name}}}}}"
        else:
            heading = f"\\textbf{{{name}}}"
        tech_value = getattr(entry, "technologies", None)
        tech = f" $|$ \\emph{{{_escape_latex(tech_value)}}}" if tech_value else ''
        bullets = _format_bullets(getattr(entry, "selectedBullets", None) or [])
        line = "  \\resumeProjectHeading\n    {" + heading + tech + "}{}\n"
        sections.append(line + ("\n" + bullets if bullets else ""))
    return "\\section{PROJECTS}\n\\resumeSubHeadingListStart\n" + "\n\n".join(sections) + "\n\\resumeSubHeadingListEnd\n"


def _build_skills(skills: list) -> str:
    if not skills:
        return ""
    lines = []
    for group in skills:
        title = _escape_latex(group.title or 'Skills')
        skill_text = _escape_latex(", ".join(group.skills or []))
        if skill_text:
            lines.append(f"\\textbf{{{title}}}: {{{skill_text}}}")
    if not lines:
        return ""
    # Join with proper line breaks - add [2pt] spacing between lines, but NOT after last line
    if len(lines) == 1:
        body = lines[0]
    else:
        body = " \\\\[2pt]\n     ".join(lines)
    return f"\\section{{SKILLS}}\n \\begin{{itemize}}[leftmargin=0in, label={{}}]\n    \\small{{\\item{{\n     {body}\n    }}}}\n \\end{{itemize}}\n"


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
            cwd=tmpdir,
        )

        if result.returncode != 0:
            raise RuntimeError(f"tectonic failed: {result.stderr.strip()}")

        pdf_path = Path(tmpdir) / "resume.pdf"
        if not pdf_path.exists():
            raise RuntimeError("PDF output not produced by tectonic")

        return pdf_path.read_bytes()


def pdf_bytes_to_base64(pdf_bytes: bytes) -> str:
    return base64.b64encode(pdf_bytes).decode("utf-8")


def render_html_from_pdf(pdf_bytes: bytes, use_docker: bool = None) -> str:
    """
    Convert PDF to HTML using pdf2htmlEX.
    Returns the HTML content as a string.
    
    Args:
        pdf_bytes: PDF file bytes
        use_docker: If True, use Docker to run pdf2htmlEX instead of local installation.
                   If None, checks PDF2HTMLEX_USE_DOCKER environment variable.
    
    pdf2htmlEX options:
    - --zoom 1.0: 100% zoom factor
    - --process-outline 0: Don't generate outline
    - --embed-css 1: Embed CSS in HTML (single file output)
    - --embed-font 1: Embed fonts (self-contained)
    - --embed-image 1: Embed images (self-contained)
    - --split-pages 0: Single page output
    - --page-filename: Output filename
    """
    # Check environment variable if use_docker not explicitly set
    if use_docker is None:
        use_docker = os.getenv("PDF2HTMLEX_USE_DOCKER", "false").lower() in ("true", "1", "yes")
    
    if use_docker:
        # Use Docker to run pdf2htmlEX
        docker_path = shutil.which("docker")
        if docker_path is None:
            raise RuntimeError(
                "docker executable not found on PATH. "
                "Install Docker or build pdf2htmlEX from source (see INSTALL_PDF2HTMLEX.md)"
            )
        
        with TemporaryDirectory(prefix="pdf2html_") as tmpdir:
            pdf_path = Path(tmpdir) / "resume.pdf"
            pdf_path.write_bytes(pdf_bytes)
            
            # Run pdf2htmlEX in Docker container
            # Using locally built image (pdf2htmlex:local)
            # Build it with: docker build -f Dockerfile.pdf2htmlex -t pdf2htmlex:local .
            result = subprocess.run(
                [
                    docker_path, "run", "--rm",
                    "-v", f"{tmpdir}:/workspace",
                    "-w", "/workspace",
                    "pdf2htmlex:local",
                    "pdf2htmlEX",
                    "--zoom", "1.0",
                    "--process-outline", "0",
                    "--embed-css", "1",
                    "--embed-font", "1",
                    "--embed-image", "1",
                    "--split-pages", "0",
                    "--page-filename", "resume.html",
                    "resume.pdf"
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"pdf2htmlEX (Docker) failed: {result.stderr.strip()}")
            
            html_path = Path(tmpdir) / "resume.html"
            if not html_path.exists():
                raise RuntimeError("HTML output not produced by pdf2htmlEX")
            
            return html_path.read_text(encoding="utf-8")
    else:
        # Use local pdf2htmlEX installation
        pdf2htmlex_path = shutil.which("pdf2htmlEX")
        if pdf2htmlex_path is None:
            raise RuntimeError(
                "pdf2htmlEX executable not found on PATH. "
                "Install pdf2htmlEX from source (see INSTALL_PDF2HTMLEX.md) or "
                "set PDF2HTMLEX_USE_DOCKER=true to use Docker instead."
            )
        
        with TemporaryDirectory(prefix="pdf2html_") as tmpdir:
            pdf_path = Path(tmpdir) / "resume.pdf"
            pdf_path.write_bytes(pdf_bytes)
            
            result = subprocess.run(
                [
                    pdf2htmlex_path,
                    "--dest-dir", tmpdir,
                    "--zoom", "1.0",
                    "--process-outline", "0",
                    "--embed-css", "1",
                    "--embed-font", "1",
                    "--embed-image", "1",
                    "--split-pages", "0",
                    "--page-filename", "resume.html",
                    pdf_path.name
                ],
                capture_output=True,
                text=True,
                check=False,
                cwd=tmpdir,
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"pdf2htmlEX failed: {result.stderr.strip()}")
            
            html_path = Path(tmpdir) / "resume.html"
            if not html_path.exists():
                raise RuntimeError("HTML output not produced by pdf2htmlEX")
            
            return html_path.read_text(encoding="utf-8")
