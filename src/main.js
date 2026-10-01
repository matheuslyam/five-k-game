import { normalizeAnswer, fragsToKey } from './game.js';

const progressEl = document.getElementById('progress');
const missingEl = document.getElementById('missing');
const cartaEl = document.getElementById('carta');
const cartaTextEl = document.getElementById('carta-text');

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
      /* modo privado: segue sem persistir */
    }
  }
};

let state = Object.assign({ frags: {} }, store.load());

function setMsg(form, text, ok) {
  const el = form.parentElement.querySelector('.msg');
  if (!el) return;
  el.textContent = text; // textContent, nunca innerHTML (XSS)
  el.classList.toggle('ok', !!ok);
  el.classList.toggle('err', ok === false);
}

function setFrag(id, frag) {
  const sec = document.getElementById('sec-' + id);
  const el = sec ? sec.querySelector('.frag') : null;
  if (el) el.textContent = frag ? 'FRAG_' + id + ': ' + frag : '';
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

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function handleCheck(id, form, input) {
  const raw = input.value;
  const guess = normalizeAnswer(raw);
  if (!guess || guess.length > 100) {
    setMsg(form, 'Chute inválido (1-100 chars).', false);
    return;
  }
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
  }
}

async function handleFinal(form, input) {
  const raw = input.value;
  let frags = [1, 2, 3, 4].map((id) => state.frags[id]).filter(Boolean);
  let key = raw.trim() ? raw : fragsToKey(frags);
  if (!key) {
    setMsg(form, 'Cole os 4 frags ou complete as flags.', false);
    return;
  }
  setMsg(form, 'Desbloqueando…');
  try {
    // Se o usuário colou a chave montada, separa; senão usa os frags salvos.
    let parts = key.includes('-') ? key.split('-').map((s) => s.trim()).filter(Boolean) : frags;
    // Normaliza via API (server é autoridade); aqui só encaminha.
    const { data } = await postJSON('./api/unlock', { frags: parts });
    if (data.ok) {
      cartaTextEl.textContent = data.carta; // textContent, nunca innerHTML
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
  }
}

document.querySelectorAll('form[data-flag]').forEach((form) => {
  const id = form.getAttribute('data-flag');
  const input = form.querySelector('input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (id === '0') {
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
    /* mantém cru */
  }
  out.textContent = decoded;
  try {
    const res = await fetch('./api/headers');
    const data = await res.json();
    if (data.cookie !== undefined) out.textContent += '\n[server vê cookie]: ' + data.cookie;
  } catch {
    /* espelho indisponível, mantém local */
  }
})();

// Seta o cookie do desafio no client (valor público do puzzle, sem dado real).
if (!document.cookie.includes('sessao=')) {
  document.cookie = 'sessao=' + encodeURIComponent('YmlzY29pdG8tNWs=') + '; path=/; SameSite=Lax';
}

refresh();
