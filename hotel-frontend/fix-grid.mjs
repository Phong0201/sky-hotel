// Chuyen <Grid item xs={..} md={..}> (API Grid cu, MUI v9 khong con nhan, day xuong DOM
// thanh thuoc tinh item="true") sang <Grid size={{ xs: .., md: .. }}>.
// Cach chay: dat file nay o thu muc hotel-frontend roi mo Terminal tai do:  node fix-grid.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const BPS = ['xs', 'sm', 'md', 'lg', 'xl'];

function scanTag(s, start) {
  // Stack de xu ly dung chuoi, template literal `${...}` long nhau va ngoac trong sx
  const stack = [];
  let i = start;
  while (i < s.length) {
    const top = stack[stack.length - 1];
    const c = s[i];
    if (top === '"' || top === "'") {
      if (c === '\\') { i += 2; continue; }
      if (c === top) stack.pop();
    } else if (top === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') stack.pop();
      else if (c === '$' && s[i + 1] === '{') { stack.push('brace'); i += 2; continue; }
    } else {
      if (c === '"' || c === "'") stack.push(c);
      else if (c === '`') stack.push('tpl');
      else if (c === '{') stack.push('brace');
      else if (c === '}') {
        if (stack[stack.length - 1] !== 'brace') return [null, null];
        stack.pop();
      } else if (c === '>' && stack.length === 0) return [i, s.slice(start, i + 1)];
    }
    i += 1;
  }
  return [null, null];
}

function parseAttrs(inner) {
  const attrs = [];
  let i = 0;
  const n = inner.length;
  while (i < n) {
    while (i < n && /\s/.test(inner[i])) i += 1;
    if (i >= n) break;
    if (inner[i] === '/') { i += 1; continue; }
    const m = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(inner.slice(i));
    if (!m) { i += 1; continue; }
    const name = m[0];
    const j = i + name.length;
    let k = j;
    while (k < n && /\s/.test(inner[k])) k += 1;
    if (k < n && inner[k] === '=') {
      k += 1;
      while (k < n && /\s/.test(inner[k])) k += 1;
      if (inner[k] === '"' || inner[k] === "'") {
        const q = inner[k];
        let e = k + 1;
        while (e < n && inner[e] !== q) e += 1;
        attrs.push([name, inner.slice(k, e + 1), inner.slice(i, e + 1)]);
        i = e + 1;
      } else if (inner[k] === '{') {
        let depth = 0, e = k, mode = null;
        while (e < n) {
          const c = inner[e];
          if (mode) {
            if (c === '\\') { e += 2; continue; }
            if (c === mode) mode = null;
          } else {
            if (c === '"' || c === "'" || c === '`') mode = c;
            else if (c === '{') depth += 1;
            else if (c === '}') { depth -= 1; if (depth === 0) break; }
          }
          e += 1;
        }
        attrs.push([name, inner.slice(k, e + 1), inner.slice(i, e + 1)]);
        i = e + 1;
      } else {
        attrs.push([name, null, inner.slice(i, j)]);
        i = j;
      }
    } else {
      attrs.push([name, null, inner.slice(i, j)]);
      i = j;
    }
  }
  return attrs;
}

function entryOf(name, raw) {
  if (raw === null) return null;
  if (raw.startsWith('{')) return `${name}: ${raw.slice(1, -1).trim()}`;
  return `${name}: ${raw}`;
}

function transformFile(filePath) {
  const s = fs.readFileSync(filePath, 'utf-8');
  const out = [];
  let idx = 0, changed = 0;
  const pat = /<Grid\b/g;
  while (true) {
    pat.lastIndex = idx;
    const m = pat.exec(s);
    if (!m) { out.push(s.slice(idx)); break; }
    const [end, tag] = scanTag(s, m.index);
    if (end === null) {
      console.log(`  !! bo qua 1 the <Grid> khong quet duoc: ${filePath}`);
      out.push(s.slice(idx, m.index + 1)); idx = m.index + 1; continue;
    }
    let inner = tag.slice(5, -1);
    const selfClosing = inner.trimEnd().endsWith('/');
    if (selfClosing) inner = inner.trimEnd().slice(0, -1);
    const attrs = parseAttrs(inner);
    const hasItem = attrs.some(([n]) => n === 'item');
    if (!hasItem) { out.push(s.slice(idx, end + 1)); idx = end + 1; continue; }
    const sizes = [];
    for (const bp of BPS) {
      const a = attrs.find(([n]) => n === bp);
      if (a) sizes.push(`${bp}: ${a[1] === null ? 'true' : a[1].startsWith('{') ? a[1].slice(1, -1).trim() : a[1]}`);
    }
    const kept = attrs.filter(([n]) => n !== 'item' && !BPS.includes(n)).map(([, , full]) => full);
    const parts = [];
    if (sizes.length) parts.push(`size={{ ${sizes.join(', ')} }}`);
    else console.log(`  !! ${filePath}: <Grid item> khong co breakpoint, chi go bo item`);
    parts.push(...kept);
    out.push(s.slice(idx, m.index));
    out.push('<Grid ' + parts.join(' ') + (selfClosing ? ' /' : '') + '>');
    idx = end + 1;
    changed += 1;
  }
  if (changed) fs.writeFileSync(filePath, out.join(''), 'utf-8');
  return changed;
}

function walk(dir) {
  const files = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) files.push(...walk(p));
    else if (/\.jsx?$/.test(d.name)) files.push(p);
  }
  return files;
}

let total = 0;
for (const f of walk(ROOT).sort()) {
  const n = transformFile(f);
  if (n) { console.log(`${f}: ${n}`); total += n; }
}
console.log('TOTAL tags fixed:', total);
