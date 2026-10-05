import JSZip from 'jszip';
import './styles.css';

const GOOD_TEAMS = new Set(['townsfolk', 'outsider', '镇民', '外来者']);
const EVIL_TEAMS = new Set(['minion', 'demon', '爪牙', '恶魔']);
const CORE_TEAMS = new Set([...GOOD_TEAMS, ...EVIL_TEAMS]);
const TEAM_LABELS = { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者', fabled: '传奇角色', other: '其他', 镇民: '镇民', 外来者: '外来者', 爪牙: '爪牙', 恶魔: '恶魔' };

const defaults = {
  diameter: 1, dpi: 350, padding: 0, imageScale: .8, imageOffset: -.05,
  backgroundType: 'transparent', backgroundColor: '#f0eadc', backgroundImage: null,
  layout: 'line', fontSize: 37, textY: .8, curveRadius: .38, strokeWidth: 2,
  showGuide: false, guidePadding: 27, strictMode: true, fontFamily: 'TokenSerif'
};

const state = { settings: { ...defaults }, tokens: [], sourceTokens: [], title: '', currentToken: null, imageCache: new Map(), renderVersion: 0 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const refs = {
  hero: $('#hero'), workspace: $('#workspace'), dropzone: $('#dropzone'), jsonInput: $('#jsonInput'),
  grid: $('#tokenGrid'), count: $('#tokenCount'), canvasInfo: $('#canvasInfo'), title: $('#scriptTitle'),
  notice: $('#notice'), empty: $('#emptyFilter'), downloadAll: $('#downloadAllBtn'), drawer: $('#editorDrawer'),
  editorCanvas: $('#editorCanvas'), toast: $('#toast')
};

const controls = {
  diameter: $('#diameter'), dpi: $('#dpi'), padding: $('#padding'), imageScale: $('#imageScale'),
  imageOffset: $('#imageOffset'), backgroundType: $('#backgroundType'), backgroundColor: $('#backgroundColor'),
  fontSize: $('#fontSize'), textY: $('#textY'), curveRadius: $('#curveRadius'), strokeWidth: $('#strokeWidth'),
  showGuide: $('#showGuide'), guidePadding: $('#guidePadding'), strictMode: $('#strictMode')
};

const demo = [
  { id: 'washerwoman', name: '洗衣妇', team: 'townsfolk', image: 'https://oss.gstonegames.com/data_file/clocktower/web/icons/washerwoman.png' },
  { id: 'fortune_teller', name: '占卜师', team: 'townsfolk', image: 'https://oss.gstonegames.com/data_file/clocktower/web/icons/fortune_teller.png' },
  { id: 'witch', name: '女巫', team: 'minion', image: 'https://oss.gstonegames.com/data_file/clocktower/web/icons/witch.png' },
  { id: 'po', name: '珀', team: 'demon', image: 'https://oss.gstonegames.com/data_file/clocktower/web/icons/po.png' }
];

function normalizeTeam(value = '') {
  const raw = String(value ?? '').trim();
  const team = raw.toLowerCase();
  return ({ 镇民: 'townsfolk', 外来者: 'outsider', 爪牙: 'minion', 恶魔: 'demon', 旅行者: 'traveler', 传奇角色: 'fabled' })[raw] || team || 'other';
}

function parseScript(data, filename) {
  const list = Array.isArray(data) ? data : data.characters || data.roles || data.script;
  if (!Array.isArray(list)) throw new Error(`${filename}：顶层必须是角色数组`);
  const meta = list.find((item) => item && item.id === '_meta');
  const tokens = list.filter((item) => item && item.id !== '_meta' && item.name && item.image).map((item, index) => ({
    uid: crypto.randomUUID?.() || `${Date.now()}-${index}-${Math.random()}`,
    id: String(item.id || `${filename}-${index}`), name: String(item.name).trim(),
    team: normalizeTeam(item.sch_team || item.team), image: String(item.image), imageOverride: null,
    source: filename, error: '', excluded: false
  }));
  return { title: meta?.name || filename.replace(/\.json$/i, ''), tokens };
}

async function loadFiles(files) {
  const errors = []; const incoming = []; const titles = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(await file.text());
      const script = parseScript(parsed, file.name);
      incoming.push(...script.tokens); titles.push(script.title);
    } catch (error) { errors.push(error.message || `${file.name} 解析失败`); }
  }
  if (!incoming.length) { showToast(errors[0] || '没有找到可用角色'); return; }
  const seen = new Set(state.sourceTokens.map((token) => `${token.id}|${token.name}`));
  for (const token of incoming) {
    const key = `${token.id}|${token.name}`;
    if (!seen.has(key)) { state.sourceTokens.push(token); seen.add(key); }
  }
  state.title = [...new Set([state.title, ...titles].filter(Boolean))].join(' · ');
  applyFilter();
  refs.hero.classList.add('is-hidden'); refs.workspace.classList.remove('is-hidden');
  if (errors.length) showNotice(`${errors.length} 个文件未能读取：${errors.join('；')}`); else hideNotice();
  renderGrid();
}

function applyFilter() {
  state.tokens = state.sourceTokens.filter((token) => !state.settings.strictMode || CORE_TEAMS.has(token.team));
}

function outputSize() {
  const core = Math.max(64, Math.round(state.settings.diameter * state.settings.dpi));
  return { core, full: core + state.settings.padding * 2 };
}

function safeName(value) { return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'token'; }
function teamKind(team) { return GOOD_TEAMS.has(team) ? 'blue' : EVIL_TEAMS.has(team) ? 'red' : 'neutral'; }

function imageSource(token) {
  if (token.imageOverride) return token.imageOverride;
  if (/^(blob:|data:)/.test(token.image)) return token.image;
  return token.image;
}

function fetchImage(url) {
  if (state.imageCache.has(url)) return state.imageCache.get(url);
  const promise = new Promise((resolve, reject) => {
    const direct = new Image(); direct.crossOrigin = 'anonymous'; direct.decoding = 'async';
    direct.onload = () => resolve(direct);
    direct.onerror = () => {
      if (/^(blob:|data:)/.test(url)) { reject(new Error('图片无法读取')); return; }
      const proxied = new Image(); proxied.crossOrigin = 'anonymous'; proxied.decoding = 'async';
      proxied.onload = () => resolve(proxied);
      proxied.onerror = () => reject(new Error('远程图片加载失败'));
      proxied.src = `/api/image?url=${encodeURIComponent(url)}`;
    };
    direct.src = url;
  });
  state.imageCache.set(url, promise);
  promise.catch(() => state.imageCache.delete(url));
  return promise;
}

function coverImage(ctx, image, x, y, size) {
  const ratio = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
  ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height); ctx.restore();
}

function drawPlaceholder(ctx, x, y, size) {
  ctx.save(); ctx.fillStyle = '#d9cdbd'; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a7b6d'; ctx.font = `${size * .2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☾', x + size / 2, y + size / 2); ctx.restore();
}

function textGradient(ctx, kind, top, bottom) {
  const gradient = ctx.createLinearGradient(0, top, 0, bottom);
  if (kind === 'blue') { gradient.addColorStop(0, '#22dcfd'); gradient.addColorStop(1, '#5865b9'); }
  else if (kind === 'red') { gradient.addColorStop(0, '#dc2929'); gradient.addColorStop(1, '#68040e'); }
  else { gradient.addColorStop(0, '#fff0a5'); gradient.addColorStop(1, '#b98b27'); }
  return gradient;
}

function paintGlyph(ctx, glyph, x, y, fontPx, strokePx, fill, shadowOffset) {
  ctx.font = `${fontPx}px ${state.settings.fontFamily}, "Noto Serif SC", serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (shadowOffset) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillText(glyph, x, y + shadowOffset); }
  if (strokePx > 0) { ctx.strokeStyle = '#0b0908'; ctx.lineWidth = strokePx; ctx.strokeText(glyph, x, y); }
  ctx.fillStyle = fill; ctx.fillText(glyph, x, y);
}

async function renderToken(canvas, token, exportMode = false) {
  const { core, full } = outputSize();
  const targetFull = exportMode ? full : Math.min(full, 700);
  const scale = targetFull / full; const content = core * scale; const pad = state.settings.padding * scale;
  canvas.width = targetFull; canvas.height = targetFull;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, targetFull, targetFull);

  if (state.settings.backgroundType === 'color') { ctx.fillStyle = state.settings.backgroundColor; ctx.fillRect(pad, pad, content, content); }
  if (state.settings.backgroundType === 'image' && state.settings.backgroundImage) {
    try { const bg = await fetchImage(state.settings.backgroundImage); ctx.drawImage(bg, pad, pad, content, content); } catch { /* transparent fallback */ }
  }

  const circle = content * state.settings.imageScale;
  const imageX = pad + (content - circle) / 2;
  const imageY = pad + (content - circle) / 2 + content * state.settings.imageOffset;
  try { const image = await fetchImage(imageSource(token)); coverImage(ctx, image, imageX, imageY, circle); token.error = ''; }
  catch { drawPlaceholder(ctx, imageX, imageY, circle); token.error = '图片加载失败'; }

  const kind = teamKind(token.team); const fontScale = content / 350;
  let fontPx = state.settings.fontSize * fontScale; const stroke = state.settings.strokeWidth * fontScale;
  const chars = [...token.name]; if (chars.length >= 4) fontPx -= (chars.length - 3) * 2 * fontScale;
  const fill = textGradient(ctx, kind, pad + content * .62, pad + content * .92);
  const shadow = -1 * fontScale;
  if (state.settings.layout === 'curve' && chars.length > 1) {
    const cx = pad + content / 2, cy = pad + content / 2, radius = content * state.settings.curveRadius;
    const arc = Math.min(40 + (chars.length - 2) * 17, 120); const start = 90 + arc / 2; const step = -arc / Math.max(chars.length - 1, 1);
    chars.forEach((glyph, index) => {
      const rad = (start + step * index) * Math.PI / 180;
      paintGlyph(ctx, glyph, cx + radius * Math.cos(rad), cy + radius * Math.sin(rad), fontPx, stroke, fill, shadow);
    });
  } else {
    const spacing = Math.max(0, (6 - Math.max(0, chars.length - 3) * .75) * fontScale);
    ctx.font = `${fontPx}px ${state.settings.fontFamily}, "Noto Serif SC", serif`;
    const widths = chars.map((glyph) => ctx.measureText(glyph).width); const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    let x = pad + content / 2 - total / 2; const yAdjust = Math.max(0, chars.length - 3) * .03;
    const y = pad + content * Math.max(.5, state.settings.textY - yAdjust);
    chars.forEach((glyph, index) => { paintGlyph(ctx, glyph, x + widths[index] / 2, y, fontPx, stroke, fill, shadow); x += widths[index] + spacing; });
  }

  if (state.settings.showGuide) {
    const inset = state.settings.guidePadding * scale, diameter = content - inset * 2;
    ctx.save(); ctx.strokeStyle = '#2bb673'; ctx.lineWidth = Math.max(1, 3 * fontScale); ctx.setLineDash([10 * scale, 10 * scale]);
    ctx.beginPath(); ctx.arc(pad + content / 2, pad + content / 2, diameter / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  return canvas;
}

function renderGrid() {
  const version = ++state.renderVersion; refs.grid.innerHTML = '';
  refs.title.textContent = state.title || '未命名剧本'; refs.count.textContent = state.tokens.length;
  const { full } = outputSize(); refs.canvasInfo.textContent = `${full} × ${full} px`;
  refs.downloadAll.disabled = state.tokens.length === 0; refs.empty.classList.toggle('is-hidden', state.tokens.length !== 0);
  const fragment = document.createDocumentFragment();
  state.tokens.forEach((token) => {
    const card = document.createElement('article'); card.className = 'token-card'; card.dataset.uid = token.uid;
    const kind = teamKind(token.team);
    card.innerHTML = `<div class="canvas-wrap"><canvas aria-label="${escapeHtml(token.name)} Token 预览"></canvas></div><div class="card-actions"><button data-action="edit" title="编辑">✎</button><button data-action="download" title="下载">↓</button></div><div class="card-meta"><strong>${escapeHtml(token.name)}</strong><span class="team-dot team-${kind}">${TEAM_LABELS[token.team] || token.team}</span></div>`;
    fragment.appendChild(card);
    queueMicrotask(async () => { if (version !== state.renderVersion) return; await renderToken(card.querySelector('canvas'), token); });
  });
  refs.grid.appendChild(fragment);
}

function rerenderDebounced() {
  clearTimeout(rerenderDebounced.timer); rerenderDebounced.timer = setTimeout(() => {
    renderGrid(); if (state.currentToken) renderToken(refs.editorCanvas, state.currentToken);
  }, 100);
}

function updateSettings() {
  const s = state.settings;
  s.diameter = Number(controls.diameter.value); s.dpi = Number(controls.dpi.value); s.padding = Number(controls.padding.value);
  s.imageScale = Number(controls.imageScale.value) / 100; s.imageOffset = Number(controls.imageOffset.value) / 100;
  s.backgroundType = controls.backgroundType.value; s.backgroundColor = controls.backgroundColor.value;
  s.fontSize = Number(controls.fontSize.value); s.textY = Number(controls.textY.value) / 100; s.curveRadius = Number(controls.curveRadius.value) / 100;
  s.strokeWidth = Number(controls.strokeWidth.value); s.showGuide = controls.showGuide.checked; s.guidePadding = Number(controls.guidePadding.value);
  s.strictMode = controls.strictMode.checked; applyFilter(); updateOutputs(); rerenderDebounced();
}

function updateOutputs() {
  $('#paddingOut').value = `${state.settings.padding} px`; $('#imageScaleOut').value = `${Math.round(state.settings.imageScale * 100)}%`;
  $('#imageOffsetOut').value = `${state.settings.imageOffset < 0 ? '−' : '+'}${Math.abs(Math.round(state.settings.imageOffset * 100))}%`;
  $('#fontSizeOut').value = `${state.settings.fontSize} px`; $('#textYOut').value = `${Math.round(state.settings.textY * 100)}%`;
  $('#curveRadiusOut').value = `${Math.round(state.settings.curveRadius * 100)}%`; $('#strokeWidthOut').value = `${state.settings.strokeWidth} px`;
  $('#guidePaddingOut').value = `${state.settings.guidePadding} px`;
  $('#backgroundColorRow').classList.toggle('is-hidden', state.settings.backgroundType !== 'color');
  $('#backgroundImageRow').classList.toggle('is-hidden', state.settings.backgroundType !== 'image');
  $$('.curve-only').forEach((el) => el.classList.toggle('is-hidden', state.settings.layout !== 'curve'));
}

function syncControls() {
  const s = state.settings;
  controls.diameter.value = s.diameter; controls.dpi.value = s.dpi; controls.padding.value = s.padding;
  controls.imageScale.value = s.imageScale * 100; controls.imageOffset.value = s.imageOffset * 100;
  controls.backgroundType.value = s.backgroundType; controls.backgroundColor.value = s.backgroundColor;
  controls.fontSize.value = s.fontSize; controls.textY.value = s.textY * 100; controls.curveRadius.value = s.curveRadius * 100;
  controls.strokeWidth.value = s.strokeWidth; controls.showGuide.checked = s.showGuide; controls.guidePadding.value = s.guidePadding;
  controls.strictMode.checked = s.strictMode; $$('.segmented button').forEach((b) => b.classList.toggle('active', b.dataset.layout === s.layout)); updateOutputs();
}

function openEditor(token) {
  state.currentToken = token; $('#editName').value = token.name; $('#editTeam').value = TEAM_LABELS[token.team] ? token.team : 'other'; $('#editImage').value = /^(blob:|data:)/.test(token.image) ? '' : token.image;
  refs.drawer.classList.add('open'); refs.drawer.setAttribute('aria-hidden', 'false'); renderToken(refs.editorCanvas, token);
}
function closeEditor() { refs.drawer.classList.remove('open'); refs.drawer.setAttribute('aria-hidden', 'true'); state.currentToken = null; }

async function canvasBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法生成 PNG')), 'image/png')); }
function saveBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }

async function downloadToken(token) {
  showToast(`正在生成「${token.name}」…`); const canvas = document.createElement('canvas');
  try { await renderToken(canvas, token, true); saveBlob(await canvasBlob(canvas), `${safeName(token.name)}_token.png`); showToast('PNG 已生成'); }
  catch (error) { showToast(error.message || '生成失败'); }
}

async function downloadAll() {
  if (!state.tokens.length) return; refs.downloadAll.disabled = true; const zip = new JSZip(); const used = new Map();
  try {
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i]; refs.downloadAll.querySelector('span').textContent = `生成 ${i + 1}/${state.tokens.length}`;
      const canvas = document.createElement('canvas'); await renderToken(canvas, token, true); const blob = await canvasBlob(canvas);
      const base = safeName(token.name); const count = used.get(base) || 0; used.set(base, count + 1);
      zip.file(`${base}${count ? `_${count}` : ''}_token.png`, blob);
    }
    zip.file('README.txt', `由 BOTC TokenMaker 生成\n剧本：${state.title}\nToken：${state.tokens.length} 枚\n画布：${outputSize().full} × ${outputSize().full} px\n`);
    const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    saveBlob(archive, `${safeName(state.title || 'BOTC_Tokens')}.zip`); showToast('整套 Token 已打包');
  } catch (error) { showToast(error.message || '批量生成失败'); }
  finally { refs.downloadAll.disabled = false; refs.downloadAll.querySelector('span').textContent = '下载全部'; }
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function showToast(message) { refs.toast.textContent = message; refs.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => refs.toast.classList.remove('show'), 2400); }
function showNotice(message) { refs.notice.textContent = message; refs.notice.classList.remove('is-hidden'); }
function hideNotice() { refs.notice.classList.add('is-hidden'); }

function bindEvents() {
  refs.dropzone.addEventListener('click', () => refs.jsonInput.click()); refs.dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') refs.jsonInput.click(); });
  refs.jsonInput.addEventListener('change', (e) => { loadFiles([...e.target.files]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach((name) => refs.dropzone.addEventListener(name, (e) => { e.preventDefault(); refs.dropzone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((name) => refs.dropzone.addEventListener(name, (e) => { e.preventDefault(); refs.dropzone.classList.remove('dragging'); }));
  refs.dropzone.addEventListener('drop', (e) => loadFiles([...e.dataTransfer.files].filter((file) => file.name.endsWith('.json'))));
  Object.values(controls).forEach((control) => { control.addEventListener('input', updateSettings); control.addEventListener('change', updateSettings); });
  $$('.segmented button').forEach((button) => button.addEventListener('click', () => { state.settings.layout = button.dataset.layout; syncControls(); rerenderDebounced(); }));
  $('#backgroundInput').addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; if (state.settings.backgroundImage?.startsWith('blob:')) URL.revokeObjectURL(state.settings.backgroundImage); state.settings.backgroundImage = URL.createObjectURL(file); rerenderDebounced(); });
  $('#fontInput').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; try { const family = `CustomTokenFont-${Date.now()}`; const face = new FontFace(family, await file.arrayBuffer()); await face.load(); document.fonts.add(face); state.settings.fontFamily = family; rerenderDebounced(); showToast(`已载入字体：${file.name}`); } catch { showToast('字体载入失败'); } });
  $('#resetBtn').addEventListener('click', () => { state.settings = { ...defaults }; syncControls(); applyFilter(); renderGrid(); showToast('已恢复默认参数'); });
  $('#addMoreBtn').addEventListener('click', () => refs.jsonInput.click()); $('#loadDemoBtn').addEventListener('click', () => { state.sourceTokens = demo.map((item, i) => ({ ...item, uid: `demo-${i}`, imageOverride: null, source: '示例', error: '' })); state.title = '暗流涌动 · 预览'; applyFilter(); refs.hero.classList.add('is-hidden'); refs.workspace.classList.remove('is-hidden'); renderGrid(); });
  refs.grid.addEventListener('click', (e) => { const button = e.target.closest('button[data-action]'); if (!button) return; const token = state.tokens.find((item) => item.uid === button.closest('.token-card').dataset.uid); if (button.dataset.action === 'edit') openEditor(token); else downloadToken(token); });
  $$('.view-tools button').forEach((button) => button.addEventListener('click', () => { $$('.view-tools button').forEach((b) => b.classList.remove('active')); button.classList.add('active'); refs.grid.classList.toggle('list-view', button.dataset.view === 'list'); }));
  $('#drawerBackdrop').addEventListener('click', closeEditor); $('#closeDrawer').addEventListener('click', closeEditor);
  $('#editName').addEventListener('input', (e) => { if (!state.currentToken) return; state.currentToken.name = e.target.value || '未命名'; renderToken(refs.editorCanvas, state.currentToken); rerenderDebounced(); });
  $('#editTeam').addEventListener('change', (e) => { if (!state.currentToken) return; state.currentToken.team = e.target.value; renderToken(refs.editorCanvas, state.currentToken); rerenderDebounced(); });
  $('#editImage').addEventListener('change', (e) => { if (!state.currentToken || !e.target.value) return; state.currentToken.image = e.target.value; state.currentToken.imageOverride = null; renderToken(refs.editorCanvas, state.currentToken); rerenderDebounced(); });
  $('#editImageFile').addEventListener('change', (e) => { const file = e.target.files[0]; if (!file || !state.currentToken) return; if (state.currentToken.imageOverride?.startsWith('blob:')) URL.revokeObjectURL(state.currentToken.imageOverride); state.currentToken.imageOverride = URL.createObjectURL(file); renderToken(refs.editorCanvas, state.currentToken); rerenderDebounced(); });
  $('#downloadOneBtn').addEventListener('click', () => state.currentToken && downloadToken(state.currentToken)); refs.downloadAll.addEventListener('click', downloadAll);
}

syncControls(); bindEvents();
