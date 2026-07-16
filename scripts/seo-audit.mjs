import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve('app');
const COMPONENTS_DIR = path.resolve('components');

const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RED = '\x1b[31m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_BLUE = '\x1b[34m';

console.log(`${ANSI_BOLD}${ANSI_BLUE}🔍 Starting SEO & Web Accessibility Audit...${ANSI_RESET}\n`);

// Helper to recursively list files
function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(name);
    }
  }
  return fileList;
}

const appFiles = getFiles(APP_DIR);
const componentFiles = getFiles(COMPONENTS_DIR);
const allFiles = [...appFiles, ...componentFiles];

let warnings = 0;
let errors = 0;
let passes = 0;

function reportPass(message) {
  passes++;
  console.log(`  ${ANSI_GREEN}✓${ANSI_RESET} ${message}`);
}

function reportWarning(message) {
  warnings++;
  console.log(`  ${ANSI_YELLOW}⚠ WARNING:${ANSI_RESET} ${message}`);
}

function reportError(message) {
  errors++;
  console.log(`  ${ANSI_RED}✗ ERROR:${ANSI_RESET} ${message}`);
}

// 1. Audit Next.js Metadata (App Router titles/descriptions)
console.log(`${ANSI_BOLD}1. Next.js App Router Metadata Audit${ANSI_RESET}`);
let metadataFound = false;
let hasTitle = false;
let hasDescription = false;
let hasKeywords = false;

for (const file of appFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('const metadata') || content.includes('metadata: Metadata')) {
    metadataFound = true;
    if (content.match(/title:\s*['"`]/)) hasTitle = true;
    if (content.match(/description:\s*['"`]/)) hasDescription = true;
    if (content.match(/keywords:\s*\[/)) hasKeywords = true;
  }
}

if (!metadataFound) {
  reportError('No Next.js Metadata object exports found in app layouts/pages.');
} else {
  if (hasTitle) reportPass('Descriptive page title metadata is defined.');
  else reportError('Title metadata is missing or not statically defined.');

  if (hasDescription) reportPass('Meta descriptions metadata is defined.');
  else reportError('Meta description metadata is missing.');

  if (hasKeywords) reportPass('Meta keywords tags defined.');
  else reportWarning('Meta keywords not defined in metadata.');
}
console.log('');

// 2. Heading Structure Audit (Exactly one <h1> per page view)
console.log(`${ANSI_BOLD}2. Heading Hierarchy & Structure Audit${ANSI_RESET}`);
let h1Count = 0;
let h1Files = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Simple regex for <h1> or <h1
  const matches = content.match(/<h1[\s>]/g);
  if (matches) {
    h1Count += matches.length;
    h1Files.push({ file: path.relative(process.cwd(), file), count: matches.length });
  }
}

if (h1Count === 0) {
  reportWarning('No <h1> tags found in the application pages/components. Ensure at least one primary page heading exists.');
} else if (h1Count > 2) {
  // Allow up to 2 for sidebar branding + main layout title, but flag if excessive
  reportWarning(`Found ${h1Count} <h1> elements across files: ${JSON.stringify(h1Files)}. Best practice is a single <h1> per page.`);
} else {
  reportPass(`Semantic heading hierarchy is clean (${h1Count} <h1> tags found).`);
}
console.log('');

// 3. Semantic HTML5 Elements Audit
console.log(`${ANSI_BOLD}3. Semantic HTML5 Layout Audit${ANSI_RESET}`);
const semanticTags = ['header', 'nav', 'main', 'footer', 'section', 'article', 'aside'];
const semanticStats = {};
semanticTags.forEach(tag => { semanticStats[tag] = 0; });

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  semanticTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[\\s>]`, 'g');
    const matches = content.match(regex);
    if (matches) {
      semanticStats[tag] += matches.length;
    }
  });
}

const activeTags = Object.entries(semanticStats).filter(([_, count]) => count > 0);
if (activeTags.length < 3) {
  reportWarning(`Low usage of semantic HTML5 layout tags (only found ${activeTags.map(t => t[0]).join(', ')}). Consider replacing some standard divs with semantic landmarks.`);
} else {
  reportPass(`Semantic HTML5 tags detected: ${activeTags.map(([tag, count]) => `${tag} (x${count})`).join(', ')}.`);
}
console.log('');

// 4. Interactive Elements Unique IDs Audit (For accessibility & testing)
console.log(`${ANSI_BOLD}4. Unique IDs on Interactive Elements (Accessibility & QA)${ANSI_RESET}`);
let interactiveCount = 0;
let missingIdCount = 0;
const ids = new Set();
const duplicateIds = new Set();

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(process.cwd(), file);
  
  // Find buttons, anchors, inputs, selects, etc.
  // Match jsx tags: <button, <a, <input, <select
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const isInteractiveTag = /<(button|input|select|textarea)([\s>]|$)/.test(line);
    if (isInteractiveTag) {
      interactiveCount++;
      // Check for id attribute
      const idMatch = line.match(/id=\{?['"`]([^'"`]+)['"`]\}?/);
      if (idMatch) {
        const id = idMatch[1];
        if (ids.has(id)) {
          duplicateIds.add(id);
        }
        ids.add(id);
      } else {
        missingIdCount++;
        // Print warning for first few missing IDs
        if (missingIdCount <= 5) {
          console.log(`  ${ANSI_YELLOW}⚠${ANSI_RESET} Missing 'id' in ${relativePath}:${index + 1}: \`${line.trim()}\``);
        }
      }
    }
  });
}

if (missingIdCount > 0) {
  reportWarning(`${missingIdCount} interactive elements are missing 'id' attributes. (Total checked: ${interactiveCount}).`);
} else {
  reportPass(`All ${interactiveCount} interactive elements have unique ID descriptors.`);
}

if (duplicateIds.size > 0) {
  reportError(`Duplicate DOM ID attribute values detected: ${Array.from(duplicateIds).join(', ')}.`);
} else {
  reportPass('No duplicate DOM ID attributes found across components.');
}
console.log('');

// Summary Report
console.log(`${ANSI_BOLD}📊 AUDIT SUMMARY:${ANSI_RESET}`);
console.log(`  Passes:   ${ANSI_GREEN}${passes}${ANSI_RESET}`);
console.log(`  Warnings: ${ANSI_YELLOW}${warnings}${ANSI_RESET}`);
console.log(`  Errors:   ${ANSI_RED}${errors}${ANSI_RESET}\n`);

if (errors > 0) {
  console.log(`${ANSI_RED}${ANSI_BOLD}✗ Audit failed with ${errors} critical errors. Please resolve them for optimum SEO and accessibility.${ANSI_RESET}`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${ANSI_YELLOW}${ANSI_BOLD}⚠ Audit passed with warnings. Consider optimizing the issues noted above.${ANSI_RESET}`);
  process.exit(0);
} else {
  console.log(`${ANSI_GREEN}${ANSI_BOLD}✓ SEO & Web Accessibility Audit passed perfectly! Good job!${ANSI_RESET}`);
  process.exit(0);
}
