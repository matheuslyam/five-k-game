import { normalizeAnswer, fragsToKey, parseUnlockKey, parseRoute } from './game.js';

const progressEl = document.getElementById('progress');
const missingEl = document.getElementById('missing');
const cartaEl = document.getElementById('carta');
const cartaTextEl = document.getElementById('carta-text');

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
      cartaTextEl.textContent = data.carta;
      cartaEl.hidden = false;
      setMsg(form, 'Carta aberta!', true);
      state.done = true;
      store.save(state);
      refresh();
    } else {
      setMsg(form, data.falta ? 'Falta: ' + data.falta.join(', ') : 'Chave incompleta.', false);
    }
  } catch {
    setMsg(form, 'Falha de rede. Tenta de novo.', false);
  } finally {
    setTimeout(() => setBusy(form, false), COOLDOWN_MS);
  }
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
  window.scrollTo(0, 0);
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
})();

if (!document.cookie.includes('sessao=')) {
  document.cookie = 'sessao=' + encodeURIComponent('YmlzY29pdG8tNWs=') + '; path=/; SameSite=Lax';
}

window.addEventListener('hashchange', show);
if (!window.location.hash) history.replaceState(null, '', '#/');
show();
refresh();
