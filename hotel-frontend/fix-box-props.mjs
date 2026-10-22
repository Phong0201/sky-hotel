// Chuyển các "system props" đặt thẳng lên <Box>/<Paper>/<Card> (display, justifyContent,
// alignItems, minHeight, mb, gap...) vào trong sx — vì MUI v9 đẩy chúng xuống DOM
// thành thuộc tính HTML vô nghĩa (vừa báo warning vừa MẤT style).
// Cách chạy: đặt file này ở thư mục hotel-frontend rồi mở Terminal tại đó:  node fix-box-props.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const BOX_SYS = new Set(['display','flexDirection','flexWrap','justifyContent','alignItems','alignContent',
 'flexGrow','flexShrink','flexBasis','gap','rowGap','columnGap','width','height','minWidth',
 'maxWidth','minHeight','maxHeight','m','mt','mb','ml','mr','mx','my','p','pt','pb','pl','pr',
 'px','py','color','bgcolor','textAlign','fontSize','fontWeight','lineHeight','position','top',
 'left','right','bottom','zIndex','overflow','overflowX','overflowY','borderRadius','boxShadow',
 'visibility','whiteSpace','textOverflow','cursor','order','flex']);
const GRID_SYS = new Set(['justifyContent','alignItems','alignContent']);
const TARGETS = { Box: BOX_SYS, Paper: BOX_SYS, Card: BOX_SYS, Grid: GRID_SYS };
const TEXTFIELD_MAP = { InputProps: 'input', InputLabelProps: 'inputLabel', inputProps: 'htmlInput' };

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
  const pat = /<(Box|Paper|Card|Grid|TextField)\b/g;
  while (true) {
    pat.lastIndex = idx;
    const m = pat.exec(s);
    if (!m) { out.push(s.slice(idx)); break; }
    const tagName = m[1];
    const [end, tag] = scanTag(s, m.index);
    if (end === null) {
      console.log(`  !! bo qua 1 the <${tagName}> khong quet duoc: ${filePath}`);
      out.push(s.slice(idx, m.index + 1)); idx = m.index + 1; continue;
    }
    let inner = tag.slice(tagName.length + 1, -1);
    const selfClosing = inner.trimEnd().endsWith('/');
    if (selfClosing) inner = inner.trimEnd().slice(0, -1);
    const attrs = parseAttrs(inner);
    if (tagName === 'TextField') {
      const isLegacy = ([n, v]) => Object.prototype.hasOwnProperty.call(TEXTFIELD_MAP, n) && v !== null;
      const legacy = attrs.filter(isLegacy);
      if (legacy.length === 0) { out.push(s.slice(idx, end + 1)); idx = end + 1; continue; }
      const slot = attrs.find(([n]) => n === 'slotProps');
      if (slot && !slot[1].startsWith('{{')) {
        console.log(`  !! ${filePath}: TextField co slotProps khong phai object, can gop tay`);
        out.push(s.slice(idx, end + 1)); idx = end + 1; continue;
      }
      const entries = legacy.map(([n, v]) => `${TEXTFIELD_MAP[n]}: ${v.slice(1, -1).trim()}`);
      const texts = [];
      let done = false;
      for (const [n, v, full] of attrs) {
        if (isLegacy([n, v])) continue;
        if (n === 'slotProps' && v !== null) {
          texts.push('slotProps={{ ' + entries.join(', ') + ', ' + v.slice(2));
          done = true;
        } else texts.push(full);
      }
      if (!done) texts.push('slotProps={{ ' + entries.join(', ') + ' }}');
      out.push(s.slice(idx, m.index));
      out.push(`<${tagName} ` + texts.join(' ') + (selfClosing ? ' /' : '') + '>');
      idx = end + 1;
      changed += 1;
      continue;
    }
    const sysProps = TARGETS[tagName];
    const isBad = ([n, v]) => sysProps.has(n) && v !== null;
    const bad = attrs.filter(isBad);
    if (bad.length === 0) { out.push(s.slice(idx, end + 1)); idx = end + 1; continue; }
    const entries = bad.map(([n, v]) => entryOf(n, v));
    const keptTexts = [];
    let insertDone = false;
    for (const [n, v, full] of attrs) {
      if (isBad([n, v])) continue;
      if (n === 'sx' && v !== null) {
        let newv;
        if (v.startsWith('{{')) newv = '{{ ' + entries.join(', ') + ', ' + v.slice(2);
        else if (v.startsWith('{')) newv = '{[{ ' + entries.join(', ') + ' }, ' + v.slice(1, -1).trim() + ']}';
        else newv = v;
        keptTexts.push('sx=' + newv);
        insertDone = true;
      } else {
        keptTexts.push(full);
      }
    }
    if (!insertDone) keptTexts.unshift('sx={{ ' + entries.join(', ') + ' }}');
    const newTag = `<${tagName} ` + keptTexts.join(' ') + (selfClosing ? ' /' : '') + '>';
    out.push(s.slice(idx, m.index));
    out.push(newTag);
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
