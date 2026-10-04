import { normalizeAnswer, fragsToKey, parseUnlockKey, parseRoute, decodeCarta } from './game.js';

const progressEl = document.getElementById('progress');
const missingEl = document.getElementById('missing');
const cartaEl = document.getElementById('carta');
const cartaTextEl = document.getElementById('carta-text');
const skipBtn = document.getElementById('btn-skip');
const posCartaEl = document.getElementById('pos-carta');
const videoEl = document.getElementById('pos-carta-video');

const VIDEO_SRC = './pos-carta-final.mp4';
const TYPE_MS = 18;
let typingTimer = 0;
let fullCarta = '';

// PORQUE: a tela dedicada #/carta/aberta é a cerimônia final (fade → typebar
// 3.5s → typing + música fade-in 5s + tick → link do vídeo → ended = nada).
// Tudo aqui é apresentação; autoridade continua no /api/unlock + guard de rota.
const ABERTA_SUSPENSE_MS = 3500;
const ABERTA_MUSIC_FADE_MS = 5000;
const ABERTA_MUSIC_VOL = 0.5;
const ABERTA_TICK_EVERY = 2;
const abertaStageEl = document.getElementById('aberta-stage');
const abertaCursorEl = document.getElementById('carta-aberta-cursor');
const abertaTextEl = document.getElementById('carta-aberta-text');
const abertaSkipBtn = document.getElementById('btn-aberta-skip');
const abertaSoundBtn = document.getElementById('btn-aberta-sound');
const abertaCtaEl = document.getElementById('aberta-video-cta');
const abertaVideoBtn = document.getElementById('btn-aberta-video');
const abertaVideoWrap = document.getElementById('aberta-video-wrap');
const abertaVideoEl = document.getElementById('aberta-video');
const bgMusicEl = document.getElementById('carta-bg-music');
const tickEl = document.getElementById('carta-tick');
let abertaSuspenseTimer = 0;
let abertaTypingTimer = 0;
let abertaMusicRamp = 0;
let abertaFull = '';
let freshCeremony = false;

function reducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

const COOLDOWN_MS = 2000;

const store = {
  load() {
    try {
      return JSON.parse(localStorage.getItem('5k-progress') || '{}');
    } catch {
      return {};
    }
  },
  save(s) {
    try {
      localStorage.setItem('5k-progress', JSON.stringify(s));
    } catch {
    }
  }
};

let state = Object.assign({ frags: {} }, store.load());

function setMsg(form, text, ok) {
  const el = form.parentElement.querySelector('.msg');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('ok', !!ok);
  el.classList.toggle('err', ok === false);
}

function setFrag(id, frag) {
  const sec = document.getElementById('sec-' + id);
  const el = sec ? sec.querySelector('.frag') : null;
  if (el) el.textContent = frag ? 'FRAG_' + id + ': ' + frag : '';
  const btn = document.querySelector(`[data-copy="${id}"]`);
  if (btn) btn.hidden = !frag;
}

function refresh() {
  const ids = [1, 2, 3, 4];
  const have = ids.filter((id) => state.frags[id]);
  const tutorial = state.tutorial ? 1 : 0;
  progressEl.textContent = have.length + tutorial + '/5';
  const missing = ids.filter((id) => !state.frags[id]);
  missingEl.textContent = missing.length ? 'Falta: ' + missing.join(', ') : 'Tudo pronto — desbloqueie a carta.';
  ids.forEach((id) => setFrag(id, state.frags[id]));
}

function setBusy(form, busy) {
  form.dataset.busy = busy ? '1' : '';
  const input = form.querySelector('input');
  const btn = form.querySelector('button[type="submit"]');
  if (input) input.disabled = !!busy;
  if (btn) btn.disabled = !!busy;
}

// PORQUE: duplo-click/Enter spam criava N fetches concorrentes e estourava
// o 429 à toa, então o form ignora submit durante request + cooldown curto.
function guardBusy(form) {
  return form.dataset.busy === '1';
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function handleCheck(id, form, input) {
  if (guardBusy(form)) return;
  const guess = normalizeAnswer(input.value);
  if (!guess || guess.length > 100) {
    setMsg(form, 'Chute inválido (1-100 chars).', false);
    return;
  }
  setBusy(form, true);
  setMsg(form, 'Validando…');
  try {
    const { status, data } = await postJSON('./api/check', { id: Number(id), guess });
    if (status === 429) {
      setMsg(form, 'Muitas tentativas. Espera 1 min.', false);
      return;
    }
    if (data.ok) {
      state.frags[id] = data.frag;
      store.save(state);
      refresh();
      setMsg(form, 'Certo! Frag liberado.', true);
    } else {
      setMsg(form, 'Ainda não. Tenta a próxima dica.', false);
    }
  } catch {
    setMsg(form, 'Falha de rede. Tenta de novo.', false);
  } finally {
    setTimeout(() => setBusy(form, false), COOLDOWN_MS);
  }
}

function showVideo() {
  if (videoEl && !videoEl.getAttribute('src')) videoEl.setAttribute('src', VIDEO_SRC);
  if (posCartaEl) posCartaEl.hidden = false;
}

function finishTyping() {
  clearInterval(typingTimer);
  typingTimer = 0;
  cartaTextEl.textContent = fullCarta;
  if (skipBtn) skipBtn.hidden = true;
  cartaEl.scrollIntoView({ block: 'nearest' });
  showVideo();
  state.done = true;
  state.carta = fullCarta;
  store.save(state);
}

// PORQUE: a carta é o payoff emocional (máquina de escrever + autoscroll) e o
// vídeo só aparece ao concluir; pular respeita releitura e reduced-motion.
function typeCarta(text) {
  fullCarta = decodeCarta(text);
  cartaEl.hidden = false;
  if (posCartaEl) posCartaEl.hidden = true;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || fullCarta.length === 0) {
    finishTyping();
    return;
  }
  cartaTextEl.textContent = '';
  if (skipBtn) skipBtn.hidden = false;
  let i = 0;
  clearInterval(typingTimer);
  typingTimer = setInterval(() => {
    i += 1;
    cartaTextEl.textContent = fullCarta.slice(0, i);
    if (i % 24 === 0) cartaEl.scrollIntoView({ block: 'nearest' });
    if (i >= fullCarta.length) finishTyping();
  }, TYPE_MS);
}

async function handleFinal(form, input) {
  if (guardBusy(form)) return;
  const missing = [1, 2, 3, 4].filter((id) => !state.frags[id]);
  const raw = input.value;
  // PORQUE: chave parcial nunca deve chegar na rede para não virar oráculo,
  // então sem 4 frags salvos e sem input colado o front bloqueia local.
  const candidate = raw.trim()
    ? raw
    : (missing.length === 0 ? fragsToKey([1, 2, 3, 4].map((id) => state.frags[id])) : '');
  if (!candidate) {
    setMsg(form, missing.length ? 'Falta: ' + missing.join(', ') : 'Cole os 4 frags ou complete as flags.', false);
    return;
  }
  const parsed = parseUnlockKey(candidate);
  if (!parsed.ok) {
    setMsg(form, 'Chave incompleta — formato frag1-frag2-frag3-frag4.', false);
    return;
  }
  setBusy(form, true);
  setMsg(form, 'Desbloqueando…');
  try {
    const { status, data } = await postJSON('./api/unlock', { key: parsed.key });
    if (status === 429) {
      setMsg(form, 'Muitas tentativas. Espera 1 min.', false);
      return;
    }
    if (data.ok) {
      // PORQUE: o payoff agora mora na tela dedicada #/carta/aberta (fade +
      // suspense + typing + música), então aqui só persiste e navega — a
      // cerimônia decide sozinha entre encenação completa ou releitura direta.
      state.carta = decodeCarta(data.carta);
      state.done = true;
      store.save(state);
      refresh();
      freshCeremony = true;
      setMsg(form, 'Carta aberta!', true);
      window.location.hash = '#/carta/aberta';
    } else {
      setMsg(form, data.falta ? 'Falta: ' + data.falta.join(', ') : 'Chave incompleta.', false);
    }
  } catch {
    setMsg(form, 'Falha de rede. Tenta de novo.', false);
  } finally {
    setTimeout(() => setBusy(form, false), COOLDOWN_MS);
  }
}

function clearAbertaTimers() {
  clearTimeout(abertaSuspenseTimer);
  clearInterval(abertaTypingTimer);
  clearInterval(abertaMusicRamp);
  abertaSuspenseTimer = 0;
  abertaTypingTimer = 0;
  abertaMusicRamp = 0;
}

function teardownAberta() {
  clearAbertaTimers();
  try {
    bgMusicEl?.pause();
  } catch {
  }
}

function setSoundLabel() {
  if (!abertaSoundBtn) return;
  const playing = bgMusicEl && !bgMusicEl.paused && !bgMusicEl.ended;
  abertaSoundBtn.textContent = playing ? '♪ música: on' : '♪ música: off';
}

// PORQUE: o play() após o suspense (3.5s fora do gesto) pode cair no
// bloqueio de autoplay do in-app/Safari; falhar silencioso + toggle manual
// mantém a cerimônia intacta sem travar o typing.
function startAbertaMusic() {
  if (!bgMusicEl || reducedMotion()) {
    setSoundLabel();
    return;
  }
  clearInterval(abertaMusicRamp);
  try {
    bgMusicEl.volume = 0;
    const p = bgMusicEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => setSoundLabel());
    const steps = 50;
    const stepMs = ABERTA_MUSIC_FADE_MS / steps;
    let n = 0;
    setSoundLabel();
    abertaMusicRamp = setInterval(() => {
      n += 1;
      try {
        bgMusicEl.volume = Math.min(ABERTA_MUSIC_VOL, (ABERTA_MUSIC_VOL * n) / steps);
      } catch {
      }
      if (n >= steps) {
        clearInterval(abertaMusicRamp);
        abertaMusicRamp = 0;
      }
    }, stepMs);
  } catch {
    setSoundLabel();
  }
}

// PORQUE: reiniciar o clack a cada N chars funciona tanto para sample curto
// quanto para gravação longa (só o transiente inicial repete) e evita
// saturar o mobile com um play por char.
function playTick() {
  if (!tickEl || reducedMotion()) return;
  try {
    tickEl.volume = 0.12;
    tickEl.currentTime = 0;
    const p = tickEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
  }
}

function finishAbertaTyping() {
  clearTimeout(abertaSuspenseTimer);
  clearInterval(abertaTypingTimer);
  abertaSuspenseTimer = 0;
  abertaTypingTimer = 0;
  // o fade da música continua em paralelo — a ambiência não morre no fim.
  if (abertaTextEl) abertaTextEl.textContent = abertaFull;
  if (abertaCursorEl) abertaCursorEl.hidden = true;
  if (abertaSkipBtn) abertaSkipBtn.hidden = true;
  if (abertaSoundBtn) abertaSoundBtn.hidden = false;
  if (abertaCtaEl) abertaCtaEl.hidden = false;
  setSoundLabel();
  abertaCtaEl?.scrollIntoView({ block: 'nearest' });
}

function startAbertaTyping() {
  if (!abertaTextEl) return;
  clearAbertaTimers();
  if (abertaCursorEl) abertaCursorEl.hidden = true;
  if (abertaSkipBtn) abertaSkipBtn.hidden = false;
  if (abertaSoundBtn) abertaSoundBtn.hidden = false;
  if (reducedMotion() || abertaFull.length === 0) {
    finishAbertaTyping();
    return;
  }
  startAbertaMusic();
  abertaTextEl.textContent = '';
  let i = 0;
  abertaTypingTimer = setInterval(() => {
    i += 1;
    abertaTextEl.textContent = abertaFull.slice(0, i);
    if (i % ABERTA_TICK_EVERY === 0) playTick();
    if (i % 24 === 0) abertaTextEl.scrollIntoView({ block: 'end' });
    if (i >= abertaFull.length) finishAbertaTyping();
  }, TYPE_MS);
}

// PORQUE: a rota aberta é só vitrine — sem carta persistida (unlock real)
// ela volta para #/carta em vez de mostrar tela vazia (mesma regra anti
// softlock do parseRoute). Releitura (done) pula suspense/música autoplay.
function enterAberta() {
  if (!abertaStageEl || !abertaTextEl) return;
  const carta = decodeCarta(state.carta);
  if (!carta) {
    window.location.hash = '#/carta';
    return;
  }
  teardownAberta();
  abertaFull = carta;
  abertaTextEl.textContent = '';
  if (abertaVideoWrap) abertaVideoWrap.hidden = true;
  if (abertaCtaEl) abertaCtaEl.hidden = true;
  if (abertaSkipBtn) abertaSkipBtn.hidden = true;
  if (abertaSoundBtn) abertaSoundBtn.hidden = true;
  // reinicia o fade lento a cada entrada
  abertaStageEl.classList.remove('aberta-fade');
  void abertaStageEl.offsetWidth;
  abertaStageEl.classList.add('aberta-fade');
  window.scrollTo(0, 0);

  const ceremony = freshCeremony && !reducedMotion();
  freshCeremony = false;
  if (!ceremony) {
    abertaFull = carta;
    if (abertaTextEl) abertaTextEl.textContent = abertaFull;
    if (abertaCursorEl) abertaCursorEl.hidden = true;
    if (abertaCtaEl) abertaCtaEl.hidden = false;
    if (abertaSoundBtn) abertaSoundBtn.hidden = false;
    setSoundLabel();
    return;
  }
  if (abertaCursorEl) abertaCursorEl.hidden = false;
  abertaSuspenseTimer = setTimeout(() => {
    abertaSuspenseTimer = 0;
    startAbertaTyping();
  }, ABERTA_SUSPENSE_MS);
}

async function copyFrag(id, btn) {
  const frag = state.frags[id];
  if (!frag) return;
  let ok = false;
  try {
    // PORQUE: clipboard API falha no in-app do Instagram/sem permissão,
    // então o fallback com textarea garante o copy sem travar o jogador.
    await navigator.clipboard.writeText(frag);
    ok = true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = frag;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch {
      ok = false;
    }
  }
  const sec = document.getElementById('sec-' + id);
  const form = sec ? sec.querySelector('form') : null;
  if (form) setMsg(form, ok ? 'Chave copiada!' : 'Não copiou — selecione o frag manual.', ok);
  if (ok && btn) {
    const label = btn.textContent;
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = label; }, COOLDOWN_MS);
  }
}

// PORQUE: rota #/ é só navegação cliente e nunca prova posse de frag,
// então a carta continua escondida até o server validar a chave 4/4.
function currentRoute() {
  return parseRoute(window.location.hash);
}

function show() {
  const r = currentRoute();
  document.querySelectorAll('.page').forEach((p) => {
    p.hidden = p.dataset.route !== r;
  });
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.getAttribute('data-nav') === r) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const page = document.querySelector(`.page[data-route="${r}"]`);
  const h2 = page ? page.querySelector('h2') : null;
  if (h2) {
    h2.setAttribute('tabindex', '-1');
    h2.focus({ preventScroll: true });
  }
  // PORQUE: a cerimônia é tela única — hero/nav e footer somem só nessa
  // rota para não competir com a carta (todo o resto continua igual).
  document.body.classList.toggle('on-aberta', r === '#/carta/aberta');
  window.scrollTo(0, 0);
  // PORQUE: sair da cerimônia não pode deixar música fantasma nem timer
  // rodando — e entrar nela sempre recomeça do estado correto.
  if (r === '#/carta/aberta') enterAberta();
  else teardownAberta();
}

document.querySelectorAll('form[data-flag]').forEach((form) => {
  const id = form.getAttribute('data-flag');
  const input = form.querySelector('input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (id === '0') {
      if (guardBusy(form)) return;
      const v = normalizeAnswer(input.value);
      if (v === 'bem-vindo') {
        state.tutorial = true;
        store.save(state);
        refresh();
        setMsg(form, 'Isso! Agora tenta a Flag 1.', true);
      } else {
        setMsg(form, 'Volta para 5k{bem-vindo} e valida.', false);
      }
      return;
    }
    if (id === 'final') {
      handleFinal(form, input);
      return;
    }
    handleCheck(id, form, input);
  });
});

document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', () => copyFrag(btn.getAttribute('data-copy'), btn));
});

document.getElementById('btn-headers')?.addEventListener('click', async () => {
  const out = document.getElementById('headers-out');
  out.hidden = false;
  out.textContent = 'Carregando…';
  try {
    const res = await fetch('./api/headers');
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch {
    out.textContent = 'Falha de rede.';
  }
});

// PORQUE: 90% joga no in-app sem view-source, então o Espelho busca o HTML
// da própria página e revela o alt onde o sal2 se esconde.
document.getElementById('btn-sal')?.addEventListener('click', async () => {
  const out = document.getElementById('sal-out');
  out.hidden = false;
  out.textContent = 'Carregando…';
  try {
    const res = await fetch('./index.html');
    const html = await res.text();
    const m = html.match(/class="selo-img"[^>]*alt="([^"]+)"/);
    out.textContent = m ? 'O alt da imagem diz: ' + m[1] : 'Não achei — procure por alt= no HTML.';
  } catch {
    out.textContent = 'Falha de rede.';
  }
});

document.getElementById('btn-cookie')?.addEventListener('click', async () => {
  const out = document.getElementById('cookie-out');
  out.hidden = false;
  const raw = document.cookie || '(vazio — use o Espelho da API)';
  let decoded = raw;
  try {
    const m = raw.match(/sessao=([^;]+)/);
    if (m) decoded = raw + '\ndecode: ' + atob(decodeURIComponent(m[1]));
  } catch {
  }
  out.textContent = decoded;
  try {
    const res = await fetch('./api/headers');
    const data = await res.json();
    if (data.cookie !== undefined) out.textContent += '\n[server vê cookie]: ' + data.cookie;
  } catch {
  }
});

if (!document.cookie.includes('sessao=')) {
  document.cookie = 'sessao=' + encodeURIComponent('ZmFsc2lmaWNhci1vcmlnZW0=') + '; path=/; SameSite=Lax';
}

skipBtn?.addEventListener('click', () => {
  if (typingTimer) finishTyping();
});

abertaSkipBtn?.addEventListener('click', () => {
  if (abertaTypingTimer || abertaSuspenseTimer) {
    clearTimeout(abertaSuspenseTimer);
    abertaSuspenseTimer = 0;
    finishAbertaTyping();
  }
});

abertaSoundBtn?.addEventListener('click', async () => {
  if (!bgMusicEl) return;
  try {
    if (bgMusicEl.paused) {
      clearInterval(abertaMusicRamp);
      abertaMusicRamp = 0;
      bgMusicEl.volume = ABERTA_MUSIC_VOL;
      await bgMusicEl.play();
    } else {
      bgMusicEl.pause();
    }
  } catch {
  }
  setSoundLabel();
});

abertaVideoBtn?.addEventListener('click', async () => {
  if (!abertaVideoWrap || !abertaVideoEl) return;
  // PORQUE: o vídeo tem áudio próprio — a ambiência pausa para não brigar.
  try {
    bgMusicEl?.pause();
  } catch {
  }
  setSoundLabel();
  if (!abertaVideoEl.getAttribute('src')) abertaVideoEl.setAttribute('src', VIDEO_SRC);
  abertaVideoWrap.hidden = false;
  if (abertaCtaEl) abertaCtaEl.hidden = true;
  try {
    await abertaVideoEl.play();
  } catch {
  }
  abertaVideoWrap.scrollIntoView({ block: 'nearest' });
});

// PORQUE: decisão do autor — quando o vídeo pós-carta acaba, não há mais
// nada: a experiência termina parada no último frame, sem CTA extra.
abertaVideoEl?.addEventListener('ended', () => {
});

document.getElementById('btn-fullscreen')?.addEventListener('click', async () => {
  try {
    if (!videoEl) return;
    if (videoEl.requestFullscreen) await videoEl.requestFullscreen();
    else if (videoEl.webkitEnterFullscreen) videoEl.webkitEnterFullscreen();
  } catch {
  }
});

window.addEventListener('hashchange', show);
if (!window.location.hash) history.replaceState(null, '', '#/');
show();
refresh();

// PORQUE: carta + vídeo ficam liberados para rever — quem já desbloqueou
// vê o texto completo e o player sem precisar resolver de novo.
if (state.carta) {
  fullCarta = decodeCarta(state.carta);
  cartaTextEl.textContent = fullCarta;
  cartaEl.hidden = false;
  showVideo();
}
// Se recarregou direto na cerimônia com carta salva, entra em modo
// releitura (texto + CTA, sem suspense) via show() → enterAberta().
