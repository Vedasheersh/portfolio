import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { marked } from 'marked';
import yaml from 'js-yaml';
import matter from 'gray-matter';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const ROOT      = import.meta.dir;
const CONTENT   = join(ROOT, 'content');
const TEMPLATES = join(ROOT, 'templates');
const SITE      = join(ROOT, 'site');

// Ensure output dirs
mkdirSync(join(SITE, 'journal'), { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a template file */
function readTemplate(name) {
  return readFileSync(join(TEMPLATES, name), 'utf-8');
}

/** Read a content file and parse frontmatter */
function readContent(relPath) {
  const raw = readFileSync(join(CONTENT, relPath), 'utf-8');
  return matter(raw);
}

/** Read a YAML data file */
function readYaml(relPath) {
  const raw = readFileSync(join(CONTENT, relPath), 'utf-8');
  return yaml.load(raw);
}

/** Replace {{placeholder}} tokens in a string */
function render(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    // Use split/join for global replace (avoids regex escaping issues)
    out = out.split(`{{${key}}}`).join(value ?? '');
  }
  return out;
}

/** Wrap body HTML in the base template */
function wrapBase(bodyHtml, vars) {
  const base = readTemplate('base.html');

  // Build OG tags conditionally
  let ogTags = '';
  if (vars.og_title) {
    ogTags += `<meta property="og:title" content="${vars.og_title}">\n`;
  }
  if (vars.og_description) {
    ogTags += `<meta property="og:description" content="${vars.og_description}">\n`;
  }
  if (vars.og_title || vars.og_description) {
    ogTags += `<meta property="og:type" content="website">\n`;
  }
  if (vars.og_image) {
    ogTags += `<meta property="og:image" content="${vars.og_image}">\n`;
  }
  if (vars.og_title || vars.og_description) {
    ogTags += `<meta name="twitter:card" content="summary">\n`;
  }

  return render(base, {
    title: vars.title || '',
    og_tags: ogTags,
    body: bodyHtml,
  });
}

/** Convert markdown to HTML paragraphs with the site's styling */
function markdownToStyledParagraphs(md) {
  // Parse markdown to HTML
  const html = marked.parse(md, { breaks: false });

  // The home page content needs paragraphs with specific classes
  // Replace <p> tags with styled versions
  return html
    .replace(/<p>/g, '<p class="font-body text-lg leading-relaxed justified-text">\n                        ')
    .replace(/<\/p>/g, '\n                    </p>')
    // Convert em-dashes from markdown (---) to proper HTML
    .replace(/---/g, '\u2014')
    .trim();
}

// ---------------------------------------------------------------------------
// Build: Home page
// ---------------------------------------------------------------------------
function buildHome() {
  const { data, content } = readContent('index.md');
  const homeTemplate = readTemplate('home.html');

  // Convert markdown paragraphs to styled HTML
  const contentHtml = markdownToStyledParagraphs(content.trim());

  const bodyHtml = render(homeTemplate, {
    content: contentHtml,
  });

  const html = wrapBase(bodyHtml, {
    title: data.title,
    og_title: data.title,
    og_description: data.description,
    og_image: data.og_image || 'portrait1.jpg',
  });

  writeFileSync(join(SITE, 'index.html'), html);
  console.log('  Built: site/index.html');
}

// ---------------------------------------------------------------------------
// Build: Archive page
// ---------------------------------------------------------------------------
function buildArchive() {
  const archiveData = readYaml('archive.yaml');
  const archiveTemplate = readTemplate('archive.html');

  // Generate projects HTML
  let projectsHtml = '';
  for (const project of archiveData.projects) {
    projectsHtml += `
<!-- Project: ${project.title} -->
<article class="group">
<div class="flex-grow">
<div class="flex items-start justify-between gap-3 mb-1">
<h3 class="serif-display text-xl md:text-2xl font-bold leading-tight group-hover:text-primary transition-colors">${project.title}</h3>
<span class="label-meta font-bold bg-surface-container-highest px-2 py-1 text-primary whitespace-nowrap text-[10px]">${project.badge}</span>
</div>
<p class="label-meta text-[10px] tracking-wider text-on-surface-variant mb-3 italic">${project.category}</p>
<p class="font-body text-sm text-on-surface leading-relaxed justified-text">
${project.description}
</p>
<p class="label-meta text-[9px] text-outline mt-3 font-bold">${project.meta}</p>`;
    if (project.has_divider) {
      projectsHtml += `\n<hr class="mt-6 border-outline-variant/30"/>`;
    }
    projectsHtml += `
</div>
</article>
`;
  }

  // Generate publications HTML
  let publicationsHtml = '';
  for (let i = 0; i < archiveData.publications.length; i++) {
    const yearGroup = archiveData.publications[i];

    publicationsHtml += `
<!-- Year ${yearGroup.year} -->
<div class="relative">
<div class="absolute -left-12 top-0 hidden md:block">
<span class="serif-display text-lg font-bold text-outline-variant -rotate-90 block transform origin-top-right translate-y-8">${yearGroup.year}</span>
</div>
<div class="space-y-6">`;

    for (let j = 0; j < yearGroup.papers.length; j++) {
      const paper = yearGroup.papers[j];
      const isFirst = j === 0;

      publicationsHtml += `
<div class="flex flex-col gap-1.5">`;

      // Year label on mobile (only first paper in each year)
      if (isFirst) {
        publicationsHtml += `
<p class="label-meta text-primary font-bold text-[10px] md:hidden">${yearGroup.year}</p>`;
      }

      publicationsHtml += `
<div class="flex justify-between items-start gap-3">
<h4 class="serif-display text-lg font-bold leading-tight">${paper.title}</h4>`;

      if (paper.badge) {
        publicationsHtml += `
<span class="label-meta font-bold bg-surface-container-highest px-2 py-1 text-primary whitespace-nowrap text-[10px] flex-shrink-0">${paper.badge}</span>`;
      }

      publicationsHtml += `
</div>
<p class="font-body text-xs text-on-secondary-container tracking-tight">${paper.authors}</p>`;

      if (paper.citations || paper.notes) {
        publicationsHtml += `
<div class="flex gap-4 mt-1">`;
        if (paper.citations) {
          publicationsHtml += `
<span class="label-meta text-[9px] font-bold text-outline">Citations: ${paper.citations}</span>`;
        }
        if (paper.notes) {
          publicationsHtml += `
<span class="label-meta text-[9px] font-bold text-outline">${paper.notes}</span>`;
        }
        publicationsHtml += `
</div>`;
      }

      publicationsHtml += `
</div>`;
    }

    publicationsHtml += `
</div>
</div>`;

    // Add horizontal rule between year groups (not after the last one)
    if (i < archiveData.publications.length - 1) {
      publicationsHtml += `

<hr class="border-outline-variant/30"/>`;
    }
  }

  const bodyHtml = render(archiveTemplate, {
    subtitle: archiveData.subtitle,
    subtitle_text: archiveData.subtitle_text,
    subtitle_meta: archiveData.subtitle_meta,
    projects_html: projectsHtml,
    publications_html: publicationsHtml,
    impact_publications: archiveData.impact.publications,
    impact_citations: archiveData.impact.citations,
    impact_h_index: archiveData.impact.h_index,
    impact_i10_index: archiveData.impact.i10_index,
  });

  const html = wrapBase(bodyHtml, {
    title: archiveData.title,
    og_title: archiveData.title,
    og_description: archiveData.description,
    og_image: archiveData.og_image || 'portrait1.jpg',
  });

  writeFileSync(join(SITE, 'archive.html'), html);
  console.log('  Built: site/archive.html');
}

// ---------------------------------------------------------------------------
// Build: Journal index
// ---------------------------------------------------------------------------
function buildJournalIndex() {
  const { data } = readContent('journal/_index.md');
  const template = readTemplate('journal-index.html');

  // Collect journal entries (any .md file in content/journal/ except _index.md)
  const journalDir = join(CONTENT, 'journal');
  const entryFiles = readdirSync(journalDir)
    .filter(f => f.endsWith('.md') && f !== '_index.md')
    .map(f => {
      const { data: entryData } = readContent(join('journal', f));
      return {
        ...entryData,
        slug: basename(f, '.md'),
        file: f,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Generate topics HTML
  let topicsHtml = '';
  if (data.topics) {
    data.topics.forEach((topic, i) => {
      const num = String(i + 1).padStart(2, '0');
      topicsHtml += `
<li class="flex items-start gap-3">
<span class="label-meta text-primary font-bold mt-0.5">${num}</span>
<p class="font-body text-sm text-on-surface-variant leading-relaxed">${topic}</p>
</li>`;
    });
  }

  const bodyHtml = render(template, {
    subtitle: data.subtitle,
    subtitle_text: data.subtitle_text,
    editors_note: data.editors_note,
    editors_note_followup: data.editors_note_followup,
    topics_html: topicsHtml,
  });

  const html = wrapBase(bodyHtml, {
    title: data.title,
    og_title: data.title,
    og_description: data.description,
    og_image: data.og_image || 'portrait1.jpg',
  });

  writeFileSync(join(SITE, 'journal.html'), html);
  console.log('  Built: site/journal.html');

  return entryFiles;
}

// ---------------------------------------------------------------------------
// Build: Journal entries
// ---------------------------------------------------------------------------
function buildJournalEntries(entries) {
  const template = readTemplate('journal-entry.html');

  for (const entry of entries) {
    const { data, content } = readContent(join('journal', entry.file));
    const contentHtml = marked.parse(content.trim());

    const bodyHtml = render(template, {
      date: data.date || '',
      entry_title: data.title || '',
      entry_description: data.description || '',
      content: contentHtml,
    });

    const html = wrapBase(bodyHtml, {
      title: `${data.title} | Veda Sheersh Boorla`,
      og_title: `${data.title} | Veda Sheersh Boorla`,
      og_description: data.description || '',
      og_image: data.og_image || 'portrait1.jpg',
    });

    writeFileSync(join(SITE, 'journal', `${entry.slug}.html`), html);
    console.log(`  Built: site/journal/${entry.slug}.html`);
  }
}

// ---------------------------------------------------------------------------
// Build: 404 page
// ---------------------------------------------------------------------------
function build404() {
  const template = readTemplate('404.html');
  const bodyHtml = template; // No dynamic content needed

  const html = wrapBase(bodyHtml, {
    title: 'Page Not Found | Veda Sheersh Boorla',
  });

  writeFileSync(join(SITE, '404.html'), html);
  console.log('  Built: site/404.html');
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------
console.log('Building site...\n');

buildHome();
buildArchive();
const journalEntries = buildJournalIndex();
buildJournalEntries(journalEntries);
build404();

console.log('\nDone! All pages built to site/');
