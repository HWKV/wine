// HWKV Member Portal - app.js
// Supabase client is exposed as `db` from config.js

let currentMember = null;
let currentLang = 'Afr';

// ─── INIT ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const keyParam = urlParams.get('key');
  if (keyParam) {
    autoLogin(keyParam.toUpperCase());
  }
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('memberCode').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

async function autoLogin(code) {
  const { data, error } = await db
    .from('members')
    .select('*')
    .eq('member_code', code)
    .single();
  if (data) loginSuccess(data);
}

async function handleLogin() {
  const raw = document.getElementById('memberCode').value.trim().toUpperCase();
  document.getElementById('loginError').textContent = '';
  if (!raw) return;
  const { data, error } = await db
    .from('members')
    .select('*')
    .eq('member_code', raw)
    .single();
  if (error || !data) {
    document.getElementById('loginError').textContent =
      currentLang === 'Afr' ? 'Ongeldige kode.' : 'Invalid code.';
    return;
  }
  loginSuccess(data);
}

function loginSuccess(member) {
  currentMember = member;
  currentLang = member.language === 'Afr' ? 'Afr' : 'Eng';
  applyLanguage(currentLang);
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('portalScreen').classList.add('active');
  document.getElementById('memberName').textContent =
    currentLang === 'Afr'
      ? `Welkom, ${member.first_name}`
      : `Welcome, ${member.first_name}`;
  document.getElementById('memberCodeDisplay').textContent = member.member_code;
  loadMessages();
  loadPolls();
  loadTastings();
}

// ─── LANGUAGE ─────────────────────────────────────────────────────────────────

function applyLanguage(lang) {
  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = lang === 'Afr' ? el.dataset.afr : el.dataset.en;
  });
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

async function loadMessages() {
  const { data } = await db
    .from('messages')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  const container = document.getElementById('messagesContainer');
  if (!data || data.length === 0) {
    container.innerHTML = `<p class="empty-state">${currentLang === 'Afr' ? 'Geen boodskappe nie.' : 'No messages.'}</p>`;
    return;
  }
  container.innerHTML = data.map(msg => {
    const title = currentLang === 'Afr' && msg.title_afr ? msg.title_afr : msg.title;
    const body = currentLang === 'Afr' && msg.body_afr ? msg.body_afr : msg.body;
    return `<div class="message-card${msg.pinned ? ' pinned' : ''}">
      ${msg.pinned ? '<span class="pin-badge">📌</span>' : ''}
      <h3>${title}</h3>
      <p>${body}</p>
      <span class="msg-date">${formatDate(msg.created_at)}</span>
    </div>`;
  }).join('');
}

// ─── POLLS ────────────────────────────────────────────────────────────────────

async function loadPolls() {
  const { data: polls } = await db
    .from('polls')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  const container = document.getElementById('pollsContainer');
  const section = document.getElementById('pollsSection');

  if (!polls || polls.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  // Fetch this member's existing responses
  const pollIds = polls.map(p => p.id);
  const { data: myResponses } = await db
    .from('poll_responses')
    .select('poll_id, response')
    .eq('member_id', currentMember.id)
    .in('poll_id', pollIds);

  const responseMap = {};
  (myResponses || []).forEach(r => { responseMap[r.poll_id] = r.response; });

  container.innerHTML = polls.map(poll => {
    const title = currentLang === 'Afr' && poll.title_afr ? poll.title_afr : poll.title;
    const body = currentLang === 'Afr' && poll.body_afr ? poll.body_afr : poll.body;
    const existing = responseMap[poll.id];

    const options = [
      { val: 'yes',   en: 'Yes, I\'m around',  afr: 'Ja, ek is hier' },
      { val: 'maybe', en: 'Maybe',              afr: 'Dalk' },
      { val: 'no',    en: 'No, I\'m away',      afr: 'Nee, ek is weg' },
    ];

    const btns = options.map(o => {
      const label = currentLang === 'Afr' ? o.afr : o.en;
      const active = existing === o.val ? ' poll-btn-active' : '';
      return `<button class="poll-btn${active}" onclick="submitPollResponse('${poll.id}', '${o.val}', this)">${label}</button>`;
    }).join('');

    const thanksMsg = existing
      ? `<p class="poll-thanks">${currentLang === 'Afr' ? '✓ Jou antwoord is gestoor.' : '✓ Response saved.'}</p>`
      : '';

    return `<div class="poll-card" id="poll-${poll.id}">
      <h3>${title}</h3>
      ${body ? `<p class="poll-body">${body}</p>` : ''}
      <div class="poll-options">${btns}</div>
      ${thanksMsg}
    </div>`;
  }).join('');
}

async function submitPollResponse(pollId, response, btnEl) {
  // Upsert response
  const { error } = await db
    .from('poll_responses')
    .upsert({ poll_id: pollId, member_id: currentMember.id, response },
             { onConflict: 'poll_id,member_id' });

  if (error) {
    console.error('Poll response error:', error);
    return;
  }

  // Update button states
  const card = document.getElementById(`poll-${pollId}`);
  card.querySelectorAll('.poll-btn').forEach(b => b.classList.remove('poll-btn-active'));
  btnEl.classList.add('poll-btn-active');

  // Show thanks if not already there
  let thanks = card.querySelector('.poll-thanks');
  if (!thanks) {
    thanks = document.createElement('p');
    thanks.className = 'poll-thanks';
    card.appendChild(thanks);
  }
  thanks.textContent = currentLang === 'Afr' ? '✓ Jou antwoord is gestoor.' : '✓ Response saved.';
}

// ─── TASTINGS ─────────────────────────────────────────────────────────────────

async function loadTastings() {
  const { data: tastings } = await db
    .from('tastings')
    .select('*')
    .neq('status', 'completed')
    .order('tasting_date', { ascending: true });

  const container = document.getElementById('tastingsContainer');
  if (!tastings || tastings.length === 0) {
    container.innerHTML = `<p class="empty-state">${currentLang === 'Afr' ? 'Geen aanstaande proeë nie.' : 'No upcoming tastings.'}</p>`;
    return;
  }

  // Fetch member's RSVPs
  const tastingIds = tastings.map(t => t.id);
  const { data: myRsvps } = await db
    .from('rsvps')
    .select('tasting_id, status, payment_confirmed')
    .eq('member_id', currentMember.id)
    .in('tasting_id', tastingIds);

  const rsvpMap = {};
  (myRsvps || []).forEach(r => { rsvpMap[r.tasting_id] = r; });

  container.innerHTML = tastings.map(t => renderTasting(t, rsvpMap[t.id])).join('');

  // Start countdown timers
  tastings.forEach(t => startCountdown(t));
}

function renderTasting(tasting, myRsvp) {
  const dateStr = tasting.tasting_date ? formatDate(tasting.tasting_date) : '—';
  const statusLabel = {
    upcoming: currentLang === 'Afr' ? 'Binnekort' : 'Upcoming',
    open:     currentLang === 'Afr' ? 'Oop' : 'Open',
    closed:   currentLang === 'Afr' ? 'Gesluit' : 'Closed',
    completed:currentLang === 'Afr' ? 'Voltooi' : 'Completed',
  }[tasting.status] || tasting.status;

  let rsvpSection = '';
  if (tasting.status === 'open') {
    if (myRsvp) {
      const statusText = {
        confirmed: currentLang === 'Afr' ? '✓ Bevestig' : '✓ Confirmed',
        waitlist:  currentLang === 'Afr' ? 'Waglys' : 'Waitlist',
        pending:   currentLang === 'Afr' ? 'Hangende' : 'Pending',
        declined:  currentLang === 'Afr' ? 'Afgesê' : 'Declined',
      }[myRsvp.status] || myRsvp.status;
      rsvpSection = `<p class="rsvp-status rsvp-${myRsvp.status}">${statusText}</p>`;
      if (myRsvp.status === 'confirmed' && !myRsvp.payment_confirmed) {
        rsvpSection += `<button class="btn-small" onclick="confirmPayment('${tasting.id}')">
          ${currentLang === 'Afr' ? 'Bevestig betaling' : 'Confirm payment'}</button>`;
      }
    } else {
      rsvpSection = `<button class="btn-primary" onclick="submitRsvp('${tasting.id}')">
        ${currentLang === 'Afr' ? 'RSVP' : 'RSVP'}</button>`;
    }
  }

  return `<div class="tasting-card">
    <div class="tasting-header">
      <span class="tasting-num">#${tasting.number}</span>
      <span class="tasting-status status-${tasting.status}">${statusLabel}</span>
    </div>
    <h3>${tasting.title || (currentLang === 'Afr' ? 'Proegeleentheid' : 'Wine Tasting')}</h3>
    <p class="tasting-meta">${dateStr}${tasting.location ? ' · ' + tasting.location : ''}</p>
    ${tasting.tasting_date ? `<div class="countdown" id="countdown-${tasting.id}"></div>` : ''}
    ${tasting.message ? `<p class="tasting-msg">${tasting.message}</p>` : ''}
    ${rsvpSection}
  </div>`;
}

async function submitRsvp(tastingId) {
  const { error } = await db.from('rsvps').insert({
    tasting_id: tastingId,
    member_id: currentMember.id,
    status: 'pending',
  });
  if (!error) loadTastings();
}

async function confirmPayment(tastingId) {
  const { data: rsvp } = await db.from('rsvps').select('id').eq('tasting_id', tastingId).eq('member_id', currentMember.id).single();
  if (rsvp) {
    await db.from('rsvps').update({ payment_confirmed: true }).eq('id', rsvp.id);
    loadTastings();
  }
}

function startCountdown(tasting) {
  if (!tasting.tasting_date) return;
  const el = document.getElementById(`countdown-${tasting.id}`);
  if (!el) return;
  const target = new Date(tasting.tasting_date).getTime();
  const tick = () => {
    const diff = target - Date.now();
    if (diff <= 0) { el.textContent = ''; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = currentLang === 'Afr'
      ? `${d}d ${h}u ${m}m`
      : `${d}d ${h}h ${m}m`;
  };
  tick();
  setInterval(tick, 60000);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(
    currentLang === 'Afr' ? 'af-ZA' : 'en-ZA',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
}
