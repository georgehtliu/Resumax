const LATEX_HEADER = String.raw`
%-------------------------
% Resume in Latex
% Author : Jake Gutierrez (adapted)
% License : MIT
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

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

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

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
`;

const LATEX_FOOTER = String.raw`\end{document}`;

const PLACEHOLDER_NAME = 'Candidate Name';

function escapeLatex(text = '') {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/%/g, '\\%')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/&/g, '\\&');
}

function buildHeading(personalInfo) {
  const info = personalInfo || {};
  const name = [info.firstName, info.lastName].filter(Boolean).join(' ') || PLACEHOLDER_NAME;

  const contactParts = [];
  if (info.phone) contactParts.push(`\\underline{${escapeLatex(info.phone)}}`);
  if (info.email) contactParts.push(`\\href{mailto:${escapeLatex(info.email)}}{\\underline{${escapeLatex(info.email)}}}`);
  if (info.linkedin) contactParts.push(`\\href{${escapeLatex(info.linkedin)}}{\\underline{${escapeLatex(info.linkedin)}}}`);
  if (info.github) contactParts.push(`\\href{${escapeLatex(info.github)}}{\\underline{${escapeLatex(info.github)}}}`);

  const contactLine = contactParts.join(' $|$ ');

  return `\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(name)}} \\ \\vspace{1pt}
    \\small ${contactLine}
\\end{center}
`;
}

function buildEducationSection(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const bullets = (entry.selectedBullets || entry.bullets || []).map((bullet) => `  \\resumeItem{${escapeLatex(bullet.text || '')}}`).join('\n');
    const list = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : '';

    return `  \\resumeSubheading
      {${escapeLatex(entry.school || '')}}{${escapeLatex(entry.endDate || '')}}
      {${escapeLatex(entry.degree || '')}${entry.field ? `, ${escapeLatex(entry.field)}` : ''}}{${escapeLatex(entry.startDate || '')}}
${list}`;
  }).join('\n\n');

  return `\\section{Education}
\\resumeSubHeadingListStart
${sectionBody}
\\resumeSubHeadingListEnd
`;
}

function buildExperienceSection(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const bullets = (entry.selectedBullets || []).map((bullet) => `  \\resumeItem{${escapeLatex(bullet.text || '')}}`).join('\n');
    const list = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : '';

    return `  \\resumeSubheading
      {${escapeLatex(entry.company || '')}}{${escapeLatex(entry.endDate || '')}}
      {${escapeLatex(entry.role || '')}}{${escapeLatex(entry.startDate || '')}}
${list}`;
  }).join('\n\n');

  return `\\section{Experience}
\\resumeSubHeadingListStart
${sectionBody}
\\resumeSubHeadingListEnd
`;
}

function buildProjectsSection(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const sectionBody = entries.map((entry) => {
    const heading = entry.url
      ? `\\href{${escapeLatex(entry.url)}}{\\textbf{${escapeLatex(entry.name || '')}}}`
      : `\\textbf{${escapeLatex(entry.name || '')}}`;
    const tech = entry.technologies ? ` \\emph{${escapeLatex(entry.technologies)}}` : '';
    const bullets = (entry.selectedBullets || []).map((bullet) => `  \\resumeItem{${escapeLatex(bullet.text || '')}}`).join('\n');
    const list = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : '';

    return `  \\resumeProjectHeading
    {${heading}${tech}}{}
${list}`;
  }).join('\n\n');

  return `\\section{Projects}
\\resumeSubHeadingListStart
${sectionBody}
\\resumeSubHeadingListEnd
`;
}

function buildSkillsSection(skillGroups = []) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return '';
  }

  const lines = skillGroups
    .filter((group) => group && (group.title || (group.skills && group.skills.length)))
    .map((group) => `     \\textbf{${escapeLatex(group.title || 'Skills')}} {: ${escapeLatex((group.skills || []).join(', '))}}\\vspace{2pt}`);

  if (lines.length === 0) {
    return '';
  }

  return `\\section{Skills}
 \\begin{itemize}[leftmargin=0in, label={}]
    \\small{\\item{
${lines.join(' \\ \\n')}
    }}
 \\end{itemize}
`;
}

function buildCustomSections(sections = []) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return '';
  }

  return sections.map((section) => {
    const header = escapeLatex(section.title || 'Additional');
    const bullets = (section.selectedBullets || []).map((bullet) => `  \\resumeItem{${escapeLatex(bullet.text || '')}}`).join('\n');
    const list = bullets ? `\\resumeItemListStart\n${bullets}\n\\resumeItemListEnd` : '';

    if (!list) {
      return '';
    }

    return `\\section{${header}}
\\resumeItemListStart
${bullets}
\\resumeItemListEnd
`;
  }).join('\n');
}

export function buildLatexDocument(resume) {
  const structured = resume || {};

  const parts = [
    LATEX_HEADER,
    '\\begin{document}\n',
    buildHeading(structured.personalInfo),
    buildEducationSection(structured.education),
    buildExperienceSection(structured.experiences),
    buildProjectsSection(structured.projects),
    buildSkillsSection(structured.skills),
    buildCustomSections(structured.customSections),
    LATEX_FOOTER
  ].filter(Boolean);

  return parts.join('\n');
}
