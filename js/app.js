// =============================================
// HWKV — Member Portal App
// =============================================

let currentMember = null;
let lang = 'Eng';

// ---- AUTH ----

async function handleLogin() {
  const raw = document.getElementById('code-input').value.trim().toUpperCase();
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!raw) return;

  btn.disabled = true;
  btn.textContent = '·';

  const password = document.getElementById('password-input')?.value || '';

  const { data, error } = await db
    .from('members')
    .select('*')
    .eq('member_code', raw)
    .single();

  btn.disabled = false;
  btn.textContent = 'Enter Society';

  if (error || !data) {
    errorEl.classList.remove('hidden');
    document.getElementById('code-input').value = '';
    return;
  }

  // Check password - default is HWKV2026
  const memberPassword = data.password || 'HWKV2026';
  if (password !== memberPassword) {
    errorEl.classList.remove('hidden');
    document.getElementById('password-input').value = '';
    return;
  }

  errorEl.classList.add('hidden');
  currentMember = data;
  lang = data.language === 'Afr' ? 'Afr' : 'Eng';
  const langOverride = sessionStorage.getItem('hwkv_lang_override');
  if (langOverride) lang = langOverride;

  sessionStorage.setItem('hwkv_member', JSON.stringify(data));
  enterPortal();
}

function logout() {
  sessionStorage.removeItem('hwkv_member');
  currentMember = null;
  document.getElementById('code-input').value = '';
  document.getElementById('portal-screen').classList.remove('active');
  document.getElementById('login-screen').classList.add('active');
}

function enterPortal() {
  document.getElementById('login-screen').classList.remove('active');
  document.getElementById('portal-screen').classList.add('active');

  document.getElementById('section-messages-title').textContent = t('sectionMessages', lang);
  document.getElementById('section-tastings-title').textContent = t('sectionTastings', lang);
  document.getElementById('section-history-title').textContent = t('sectionHistory', lang);
  document.getElementById('section-car-title').textContent = t('sectionCar', lang);
  if (document.getElementById('section-membership-title')) document.getElementById('section-membership-title').textContent = lang === 'Afr' ? 'Lidmaatskap' : 'Membership';
  if (document.getElementById('section-nominations-title')) {
    document.getElementById('section-nominations-title').textContent = t('sectionNominations', lang);
  }
  document.getElementById('member-greeting').textContent = t('greeting', lang, currentMember.first_name);
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.textContent = lang === 'Eng' ? 'EN' : 'AF';

  loadMessages();
  loadPolls();
  loadTastings();
  loadHistory();
  loadNominations();
  loadMembership();
  loadCarSection();
  updateFooter();
}

// ---- MESSAGES ----

async function loadMessages() {
  const container = document.getElementById('messages-list');
  container.innerHTML = `<p class="message-body loading-dots">Loading</p>`;

  const { data, error } = await db
    .from('messages')
    .select('*')
    .neq('title', 'NOM_DEADLINE')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    container.innerHTML = `<p class="message-body" style="color:var(--muted)">${t('noMessages', lang)}</p>`;
    return;
  }

  container.innerHTML = data.map(m => `
    <div class="message-card ${m.pinned ? 'pinned' : ''}">
      <div class="message-title">${m.title}</div>
      <div class="message-body" style="white-space:pre-line">${m.body}</div>
      <div class="message-date">${formatDate(m.created_at)}</div>
    </div>
  `).join('');
}

// ---- POLLS ----

async function loadPolls() {
  const section = document.getElementById('polls-section');
  if (!section) return;

  const { data: polls } = await db
    .from('polls')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (!polls || polls.length === 0) {
    section.style.display = 'none';
    const divider = document.getElementById('polls-divider');
    if (divider) divider.style.display = 'none';
    return;
  }
  section.style.display = '';
  const divider = document.getElementById('polls-divider');
  if (divider) divider.style.display = '';

  const pollIds = polls.map(p => p.id);
  const { data: myResponses } = await db
    .from('poll_responses')
    .select('poll_id, response')
    .eq('member_id', currentMember.id)
    .in('poll_id', pollIds);

  const responseMap = {};
  (myResponses || []).forEach(r => { responseMap[r.poll_id] = r.response; });

  const options = [
    { val: 'yes',   en: 'Yes, I\'m around',  afr: 'Ja, ek is hier' },
    { val: 'maybe', en: 'Maybe',              afr: 'Dalk' },
    { val: 'no',    en: 'No, I\'m away',      afr: 'Nee, ek is weg' },
  ];

  document.getElementById('polls-list').innerHTML = polls.map(poll => {
    const title = lang === 'Afr' && poll.title_afr ? poll.title_afr : poll.title;
    const body  = lang === 'Afr' && poll.body_afr  ? poll.body_afr  : (poll.body || '');
    const existing = responseMap[poll.id];

    const btns = options.map(o => {
      const label = lang === 'Afr' ? o.afr : o.en;
      const active = existing === o.val ? 'style="border-color:var(--gold);background:rgba(201,168,76,0.15);color:var(--gold)"' : '';
      return `<button class="btn-rsvp secondary" ${active} onclick="submitPollResponse('${poll.id}', '${o.val}', this)">${label}</button>`;
    }).join('');

    const thanks = existing
      ? `<p style="font-size:0.72rem;color:var(--gold);margin-top:0.6rem" id="poll-thanks-${poll.id}">✓ ${lang === 'Afr' ? 'Antwoord gestoor' : 'Response saved'}</p>`
      : `<p style="font-size:0.72rem;color:var(--muted);margin-top:0.6rem;display:none" id="poll-thanks-${poll.id}"></p>`;

    return `<div class="tasting-card" id="poll-card-${poll.id}">
      <div class="message-title" style="margin-bottom:${body ? '0.4rem' : '0.75rem'}">${title}</div>
      ${body ? `<div class="message-body" style="margin-bottom:0.85rem">${body}</div>` : ''}
      <div class="rsvp-actions">${btns}</div>
      ${thanks}
    </div>`;
  }).join('');
}

async function submitPollResponse(pollId, response, btnEl) {
  await db.from('poll_responses')
    .upsert({ poll_id: pollId, member_id: currentMember.id, response },
             { onConflict: 'poll_id,member_id' });

  // Update button highlights
  const card = document.getElementById(`poll-card-${pollId}`);
  card.querySelectorAll('.rsvp-actions .btn-rsvp').forEach(b => {
    b.style.borderColor = '';
    b.style.background = '';
    b.style.color = '';
  });
  btnEl.style.borderColor = 'var(--gold)';
  btnEl.style.background = 'rgba(201,168,76,0.15)';
  btnEl.style.color = 'var(--gold)';

  const thanks = document.getElementById(`poll-thanks-${pollId}`);
  if (thanks) {
    thanks.style.display = '';
    thanks.textContent = `✓ ${lang === 'Afr' ? 'Antwoord gestoor' : 'Response saved'}`;
  }
}

// ---- TASTINGS ----

async function autoUpdateTastingStatus() {
  const now = new Date().toISOString();
  await db.from('tastings').update({ status: 'open' }).eq('status', 'upcoming').lte('rsvp_opens_at', now).not('rsvp_opens_at', 'is', null);
  await db.from('tastings').update({ status: 'closed' }).eq('status', 'open').lte('rsvp_closes_at', now).not('rsvp_closes_at', 'is', null);
}

async function loadTastings() {
  await autoUpdateTastingStatus();
  const container = document.getElementById('tastings-list');
  container.innerHTML = `<p class="rsvp-status-text loading-dots">Loading</p>`;

  const { data: tastings, error } = await db
    .from('tastings')
    .select('*')
    .neq('status', 'completed')
    .order('number', { ascending: true })
    .limit(3);

  if (error || !tastings || tastings.length === 0) {
    container.innerHTML = `<p class="rsvp-status-text" style="color:var(--muted)">${t('noTastings', lang)}</p>`;
    return;
  }

  const tastingIds = tastings.map(t => t.id);
  const { data: myRsvps } = await db.from('rsvps').select('*').eq('member_id', currentMember.id).in('tasting_id', tastingIds);
  const { data: rsvpCounts } = await db.from('rsvps').select('tasting_id, status').in('tasting_id', tastingIds).eq('status', 'confirmed');

  container.innerHTML = tastings.map(tasting => {
    const myRsvp = myRsvps?.find(r => r.tasting_id === tasting.id);
    const confirmedCount = rsvpCounts?.filter(r => r.tasting_id === tasting.id).length || 0;
    const tastingFee = (tasting.tasting_fee || 0) + (tasting.levy || 0);
    return renderTastingCard(tasting, myRsvp, confirmedCount, tastingFee);
  }).join('');

  if (tastings.length >= 3) {
    container.innerHTML += `<div style="text-align:center;margin-top:1rem">
      <button class="btn-rsvp secondary" onclick="loadMoreTastings()" id="show-more-btn">${lang === 'Afr' ? 'Wys meer' : 'Show more'}</button>
    </div>`;
  }

  tastings.forEach(tasting => {
    if (tasting.rsvp_opens_at && new Date(tasting.rsvp_opens_at) > new Date()) {
      startTimer(tasting.id, tasting.rsvp_opens_at);
    }
  });
}

function renderTastingCard(tasting, myRsvp, confirmedCount, tastingFee) {
  tastingFee = tastingFee || 0;
  const now = new Date();
  const opensAt = tasting.rsvp_opens_at ? new Date(tasting.rsvp_opens_at) : null;
  const closesAt = tasting.rsvp_closes_at ? new Date(tasting.rsvp_closes_at) : null;
  const cap = tasting.capacity || TASTING_CAPACITY;
  const spotsLeft = cap - confirmedCount;
  const rsvpIsOpen = tasting.status === 'open' && (!opensAt || opensAt <= now) && (!closesAt || closesAt > now);
  const rsvpNotYetOpen = opensAt && opensAt > now;

  let badge = '';
  if (myRsvp?.status === 'confirmed') badge = `<span class="tasting-badge confirmed">${t('badgeConfirmed', lang)}</span>`;
  else if (myRsvp?.status === 'waitlist') badge = `<span class="tasting-badge waitlist">${t('badgeWaitlist', lang)}</span>`;
  else if (myRsvp?.status === 'declined') badge = `<span class="tasting-badge">${lang === 'Afr' ? 'Afgesê' : 'Declined'}</span>`;
  else if (rsvpIsOpen) badge = `<span class="tasting-badge open">${t('badgeOpen', lang)}</span>`;
  else if (tasting.status === 'upcoming') badge = `<span class="tasting-badge">${t('badgeUpcoming', lang)}</span>`;
  else badge = `<span class="tasting-badge">${t('badgeClosed', lang)}</span>`;

  let timerHtml = '';
  if (rsvpNotYetOpen) {
    timerHtml = `
      <div class="rsvp-timer">
        <div class="timer-label">${t('rsvpOpensIn', lang)}</div>
        <div class="timer-display" id="timer-${tasting.id}">--:--:--</div>
      </div>`;
  } else if (rsvpIsOpen) {
    timerHtml = `<div class="timer-label" style="margin-bottom:0.75rem;color:var(--gold)">${t('rsvpOpen', lang)}</div>`;
  }

  let actionsHtml = '';
  if (myRsvp && myRsvp.status !== 'declined') {
    const statusText = myRsvp.status === 'confirmed' ? t('statusConfirmed', lang)
      : myRsvp.status === 'waitlist' ? t('statusWaitlist', lang)
      : t('statusPending', lang);

    actionsHtml = `
      <div class="rsvp-actions">
        <span class="rsvp-status-text ${myRsvp.status}">${statusText}</span>
        ${rsvpIsOpen ? `<button class="btn-rsvp secondary" onclick="withdrawRsvp('${myRsvp.id}', '${tasting.id}')">${t('withdrawRsvp', lang)}</button>` : ''}
      </div>
      ${myRsvp.status === 'confirmed' ? `
        <label class="payment-confirm" style="margin-top:0.75rem">
          <input type="checkbox" ${myRsvp.payment_confirmed ? 'checked' : ''} onchange="confirmPayment('${myRsvp.id}', this.checked)" />
          ${t('paymentLabel', lang)}
        </label>` : ''}
    `;
  } else if (myRsvp?.status === 'declined') {
    actionsHtml = `<div class="rsvp-actions">
      <span class="rsvp-status-text">${lang === 'Afr' ? 'U het afgesê' : 'You declined'}</span>
      ${rsvpIsOpen ? `<button class="btn-rsvp secondary" onclick="withdrawRsvp('${myRsvp.id}', '${tasting.id}')">${lang === 'Afr' ? 'Verander' : 'Change'}</button>` : ''}
    </div>`;
  } else if (rsvpIsOpen) {
    const methodNote = tasting.rsvp_method === 'ballot'
      ? `<span class="rsvp-status-text">${t('ballotNote', lang)}</span>`
      : `<span class="rsvp-status-text">${t('fcfsNote', lang)}</span>`;

    actionsHtml = `
      <div class="rsvp-actions">
        <button class="btn-rsvp" onclick="submitRsvp('${tasting.id}', '${tasting.rsvp_method}')" ${spotsLeft <= 0 && tasting.rsvp_method === 'fcfs' ? 'disabled' : ''}>${t('rsvpNow', lang)}</button>
        <button class="btn-rsvp secondary" onclick="submitRsvp('${tasting.id}', '${tasting.rsvp_method}', true)">${lang === 'Afr' ? 'Kan nie bywoon nie' : 'Cannot attend'}</button>
        ${methodNote}
      </div>`;
  }

  const paymentHtml = myRsvp?.status === 'confirmed' && !myRsvp?.sponsored ? `
    <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem">
        <div>
          <div style="font-size:0.6rem;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:0.2rem">${lang === 'Afr' ? 'Verskuldig' : 'Amount Owed'}</div>
          <div style="font-size:1.1rem;color:var(--gold)">R ${tastingFee > 0 ? tastingFee.toFixed(2) : (myRsvp.amount_owed || 0).toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:0.6rem;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:0.2rem">${lang === 'Afr' ? 'Betaal' : 'Paid'}</div>
          <div style="font-size:1.1rem;color:${(myRsvp.amount_paid || 0) >= tastingFee && tastingFee > 0 ? '#6bbf80' : '#c0605a'}">R ${(myRsvp.amount_paid || 0).toFixed(2)}</div>
        </div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:0.75rem 1rem;font-size:0.72rem;color:var(--muted);line-height:1.6">
        ${lang === 'Afr'
          ? 'Gebruik jou lidmaatskapkode <span style="color:var(--gold);font-family:monospace">' + currentMember.member_code + '</span> as verwysing. Stuur bewys van betaling na die Sekretariaat indien verlang.'
          : 'Use your membership code <span style="color:var(--gold);font-family:monospace">' + currentMember.member_code + '</span> as payment reference. Send proof of payment to the Secretariat if required.'}
      </div>
    </div>` : '';

  return `
    <div class="tasting-card" id="tasting-card-${tasting.id}">
      <div class="tasting-header">
        <div class="tasting-title">${tasting.title || 'Tasting ' + tasting.number}</div>
        ${badge}
      </div>
      <div class="tasting-meta">
        <span>${tasting.tasting_date ? formatDate(tasting.tasting_date) + ' · ' + new Date(tasting.tasting_date).toLocaleTimeString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {hour:'2-digit',minute:'2-digit'}) : '—'}</span>
        ${tasting.location ? `<span>${tasting.location}</span>` : ''}
        ${tastingFee > 0 ? `<span style="font-family:var(--font-serif);font-size:1rem;color:var(--gold);margin-left:auto">R ${tastingFee.toFixed(2)}</span>` : ''}
      </div>
      <div class="tasting-spots">
        ${spotsLeft > 0
          ? `<span>${confirmedCount}/${cap}</span> ${lang === 'Afr' ? 'plekke bespreek' : 'places taken'}`
          : `<span style="color:#e05a4e">${t('spotsFull', lang)}</span>`}
      </div>
      <div class="spots-bar">
        <div class="spots-bar-fill" style="width:${Math.min(100, Math.round((confirmedCount / cap) * 100))}%"></div>
      </div>
      ${timerHtml}
      ${actionsHtml}
      ${tasting.message ? `<div class="message-body" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);white-space:pre-line">${tasting.message}</div>` : ''}
      ${paymentHtml}
    </div>
  `;
}

// ---- RSVP ACTIONS ----

async function submitRsvp(tastingId, method, declined) {
  declined = declined || false;

  const { data: existing } = await db
    .from('rsvps')
    .select('id')
    .eq('member_id', currentMember.id)
    .eq('tasting_id', tastingId)
    .single();

  if (existing) return;

  if (declined) {
    await db.from('rsvps').insert({ member_id: currentMember.id, tasting_id: tastingId, status: 'declined' });
    loadTastings();
    return;
  }

  let status = 'confirmed';
  if (method === 'fcfs') {
    const { data: confirmed } = await db.from('rsvps').select('id').eq('tasting_id', tastingId).eq('status', 'confirmed');
    if ((confirmed?.length || 0) >= TASTING_CAPACITY) status = 'waitlist';
  } else {
    status = 'pending';
  }

  await db.from('rsvps').insert({ member_id: currentMember.id, tasting_id: tastingId, status });
  loadTastings();
}

async function withdrawRsvp(rsvpId, tastingId) {
  await db.from('rsvps').delete().eq('id', rsvpId);

  const { data: waitlist } = await db
    .from('rsvps')
    .select('id')
    .eq('tasting_id', tastingId)
    .eq('status', 'waitlist')
    .order('submitted_at', { ascending: true })
    .limit(1);

  if (waitlist?.length > 0) {
    await db.from('rsvps').update({ status: 'confirmed' }).eq('id', waitlist[0].id);
  }

  loadTastings();
}

async function confirmPayment(rsvpId, checked) {
  await db.from('rsvps').update({ payment_confirmed: checked }).eq('id', rsvpId);
}

// ---- TIMER ----

function startTimer(tastingId, opensAt) {
  const target = new Date(opensAt).getTime();
  const el = document.getElementById('timer-' + tastingId);
  if (!el) return;

  const interval = setInterval(() => {
    const diff = target - Date.now();
    if (diff <= 0) { clearInterval(interval); loadTastings(); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (el) el.textContent = d > 0 ? d + 'd ' + pad(h % 24) + ':' + pad(m) + ':' + pad(s) : pad(h) + ':' + pad(m) + ':' + pad(s);
  }, 1000);
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', { weekday:'short', day:'numeric', month:'long', year:'numeric' });
}

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get('key');
  if (codeFromUrl) {
    document.getElementById('code-input').value = codeFromUrl.toUpperCase();
    setTimeout(handleLogin, 300);
  }

  const saved = sessionStorage.getItem('hwkv_member');
  if (saved) {
    currentMember = JSON.parse(saved);
    lang = currentMember.language === 'Afr' ? 'Afr' : 'Eng';
    const langOverride = sessionStorage.getItem('hwkv_lang_override');
    if (langOverride) lang = langOverride;
    enterPortal();
    return;
  }

  document.getElementById('code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ---- LANGUAGE TOGGLE ----

function toggleLanguage() {
  lang = lang === 'Eng' ? 'Afr' : 'Eng';
  document.getElementById('lang-toggle').textContent = lang === 'Eng' ? 'EN' : 'AF';
  if (currentMember) sessionStorage.setItem('hwkv_lang_override', lang);

  document.getElementById('section-messages-title').textContent = t('sectionMessages', lang);
  document.getElementById('section-tastings-title').textContent = t('sectionTastings', lang);
  document.getElementById('section-history-title').textContent = t('sectionHistory', lang);
  document.getElementById('section-car-title').textContent = t('sectionCar', lang);
  if (document.getElementById('section-membership-title')) document.getElementById('section-membership-title').textContent = lang === 'Afr' ? 'Lidmaatskap' : 'Membership';
  if (document.getElementById('section-nominations-title')) {
    document.getElementById('section-nominations-title').textContent = t('sectionNominations', lang);
  }
  document.getElementById('member-greeting').textContent = t('greeting', lang, currentMember.first_name);

  loadMessages();
  loadPolls();
  loadTastings();
  loadHistory();
  loadNominations();
  loadMembership();
  loadCarSection();
  updateFooter();
}

// ---- HISTORY ----

async function loadHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const { data: rsvps } = await db
    .from('rsvps')
    .select('*, tastings(id, title, number, tasting_date, status)')
    .eq('member_id', currentMember.id)
    .eq('status', 'confirmed');

  const past = rsvps?.filter(r => r.tastings?.status === 'completed') || [];

  if (past.length === 0) {
    container.innerHTML = '<p class="rsvp-status-text" style="color:var(--muted)">' + t('noHistory', lang) + '</p>';
    return;
  }

  container.innerHTML = past
    .sort((a, b) => new Date(b.tastings.tasting_date) - new Date(a.tastings.tasting_date))
    .map(r => `
      <div class="history-card">
        <div>
          <div class="tasting-title" style="font-size:0.9rem">${r.tastings.title || 'Tasting ' + r.tastings.number}</div>
          <div class="history-meta">${r.tastings.tasting_date ? formatDate(r.tastings.tasting_date) : '—'}</div>
        </div>
        <span class="badge-small green">${t('badgeConfirmed', lang)}</span>
      </div>
    `).join('');
}

// ---- CAR / TRANSPORT ----

async function loadCarSection() {
  const container = document.getElementById('car-content');
  if (!container) return;

  const { data: car } = await db.from('cars').select('*').eq('member_id', currentMember.id).single();

  if (car) {
    container.innerHTML = `
      <div class="car-card">
        <div class="car-registered">
          <div>
            <div style="font-family:var(--font-serif);font-size:1rem;color:var(--cream)">${car.make_model}</div>
            <div class="car-detail">${car.registration || ''} · ${car.seats} ${lang === 'Afr' ? 'sitplekke' : 'seats'}</div>
            <div class="car-detail" style="margin-top:0.3rem">
              ${car.available
                ? '<span style="color:var(--gold)">● ' + (lang === 'Afr' ? 'Beskikbaar' : 'Available') + '</span>'
                : '<span style="color:var(--muted)">● ' + (lang === 'Afr' ? 'Nie beskikbaar' : 'Not available') + '</span>'}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            <button class="btn-rsvp" onclick="showCarForm(${JSON.stringify(car).replace(/"/g, '&quot;')})">${t('carUpdate', lang)}</button>
            <button class="btn-rsvp secondary" onclick="removeCar('${car.id}')">${t('carRemove', lang)}</button>
          </div>
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="car-card">
        <p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">${t('carRegisterTitle', lang)}</p>
        <div class="car-form">
          <input id="car-make" placeholder="${t('carMake', lang)}" />
          <input id="car-reg" placeholder="${t('carReg', lang)}" />
          <input id="car-seats" type="number" placeholder="${t('carSeats', lang)}" min="1" max="8" />
          <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--muted);cursor:pointer">
            <input type="checkbox" id="car-avail" checked style="accent-color:var(--gold)" />
            ${t('carAvailable', lang)}
          </label>
          <button class="btn-rsvp" style="align-self:flex-start" onclick="saveCar(null)">${t('carSave', lang)}</button>
        </div>
      </div>`;
  }
}

function showCarForm(car) {
  const container = document.getElementById('car-content');
  container.innerHTML = `
    <div class="car-card">
      <div class="car-form">
        <input id="car-make" value="${car.make_model}" placeholder="${t('carMake', lang)}" />
        <input id="car-reg" value="${car.registration || ''}" placeholder="${t('carReg', lang)}" />
        <input id="car-seats" type="number" value="${car.seats}" min="1" max="8" />
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--muted);cursor:pointer">
          <input type="checkbox" id="car-avail" ${car.available ? 'checked' : ''} style="accent-color:var(--gold)" />
          ${t('carAvailable', lang)}
        </label>
        <div style="display:flex;gap:0.75rem">
          <button class="btn-rsvp" onclick="saveCar('${car.id}')">${t('carSave', lang)}</button>
          <button class="btn-rsvp secondary" onclick="loadCarSection()">Cancel</button>
        </div>
      </div>
    </div>`;
}

async function saveCar(existingId) {
  const payload = {
    member_id: currentMember.id,
    make_model: document.getElementById('car-make').value,
    registration: document.getElementById('car-reg').value,
    seats: parseInt(document.getElementById('car-seats').value) || 4,
    available: document.getElementById('car-avail').checked,
  };

  if (existingId) {
    await db.from('cars').update(payload).eq('id', existingId);
  } else {
    await db.from('cars').insert(payload);
  }

  await db.from('members').update({ has_car: true }).eq('id', currentMember.id);
  loadCarSection();
}

async function removeCar(id) {
  await db.from('cars').delete().eq('id', id);
  await db.from('members').update({ has_car: false }).eq('id', currentMember.id);
  loadCarSection();
}

// ---- NOMINATIONS ----

async function loadNominations() {
  const container = document.getElementById('nominations-content');
  if (!container) return;

  const titleEl = document.getElementById('section-nominations-title');
  if (titleEl) titleEl.textContent = t('sectionNominations', lang);

  const { data: settings } = await db.from('settings').select('key, value');
  const deadline = settings?.find(s => s.key === 'nomination_deadline')?.value;
  const isOpen = settings?.find(s => s.key === 'nominations_open')?.value !== 'false';

  // Get current nomination period
  const { data: periodSetting } = await db.from('settings').select('value').eq('key', 'nomination_period').single();
  const currentPeriod = parseInt(periodSetting?.value || '1');

  // Get nominations for this period (period stored on nomination or just use all if no period column)
  const { data: nominations } = await db
    .from('nominations')
    .select('*')
    .eq('nominated_by', currentMember.id)
    .eq('period', currentPeriod);

  // Fallback: if period column doesn't exist yet, get all nominations
  const { data: allNominations } = await db
    .from('nominations')
    .select('*')
    .eq('nominated_by', currentMember.id)
    .order('created_at', { ascending: false });

  const periodNoms = nominations || allNominations || [];
  const existing = periodNoms.length > 0 ? periodNoms[0] : null;

  let html = '';

  if (deadline && new Date(deadline) > new Date()) {
    const d = new Date(deadline);
    const diff = d - new Date();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const timeLeft = days > 0 ? days + 'd ' + hours + 'h' : hours + 'h';
    html += '<div style="font-size:0.7rem;color:var(--muted);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">'
      + '<span style="color:var(--gold);letter-spacing:0.1em;text-transform:uppercase;font-size:0.55rem">' + t('nominationDeadline', lang) + '</span>'
      + '<span>' + d.toLocaleDateString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {day:'numeric',month:'long',year:'numeric'}) + ' ' + d.toLocaleTimeString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {hour:'2-digit',minute:'2-digit'}) + '</span>'
      + '<span style="color:var(--gold-dim);font-size:0.65rem">(' + timeLeft + ' ' + (lang === 'Afr' ? 'oor' : 'remaining') + ')</span>'
      + '</div>';
  } else if (deadline && new Date(deadline) <= new Date()) {
    html += '<div style="font-size:0.65rem;color:#c0605a;margin-bottom:1rem">' + (lang === 'Afr' ? 'Nominasie-sperdatum het verloop.' : 'Nomination deadline has passed.') + '</div>';
  }

  if (!isOpen) {
    html += '<p style="color:var(--muted);font-size:0.8rem">' + t('nominationClosed', lang) + '</p>';
    container.innerHTML = html;
    return;
  }

  if (existing && existing.status !== 'denied') {
    const statusColor = existing.status === 'approved' ? '#6bbf80' : 'var(--muted)';
    const statusText = existing.status === 'approved' ? t('nominationApproved', lang) : t('nominationPending', lang);
    html += '<div class="message-card">'
      + '<div class="message-title">' + existing.first_name + ' ' + existing.surname + '</div>'
      + '<div style="margin-top:0.75rem;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:' + statusColor + '">' + statusText + '</div>'
      + '</div>';
  } else if (currentMember.member_type === 'Founding Member' || currentMember.member_type === 'Owner') {
    if (existing && existing.status === 'denied') {
      html += '<div style="font-size:0.72rem;color:#c0605a;margin-bottom:0.75rem">' + (lang === 'Afr' ? 'U vorige nominasie is nie goedgekeur nie. U kan n nuwe een indien.' : 'Your previous nomination was not approved. You may submit a new one.') + '</div>';
    }
    html += '<p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">' + t('nominationRight', lang) + '</p>'
      + '<div id="nom-form-container"><button class="btn-rsvp" onclick="showNomForm()">' + t('nominateBtn', lang) + '</button></div>';
  }

  container.innerHTML = html;
}

function showNomForm() {
  document.getElementById('nom-form-container').innerHTML = `
    <div class="car-card">
      <div class="car-form">
        <input id="nom-firstname" placeholder="${t('nomFirstName', lang)}" />
        <input id="nom-surname" placeholder="${t('nomSurname', lang)}" />
        <input id="nom-email" type="email" placeholder="${lang === 'Afr' ? 'E-posadres' : 'Email Address'}" />
        <textarea id="nom-motivation" placeholder="${t('nomMotivation', lang)}" style="min-height:120px"></textarea>
        <div style="display:flex;gap:0.75rem">
          <button class="btn-rsvp" onclick="submitNomination()">${t('nomSubmit', lang)}</button>
          <button class="btn-rsvp secondary" onclick="loadNominations()">${t('nomCancel', lang)}</button>
        </div>
      </div>
    </div>`;
}

async function submitNomination() {
  const firstName = document.getElementById('nom-firstname').value.trim();
  const surname = document.getElementById('nom-surname').value.trim();
  const email = document.getElementById('nom-email').value.trim();
  const motivation = document.getElementById('nom-motivation').value.trim();

  if (!firstName || !surname || !motivation) {
    alert(lang === 'Afr' ? 'Vul asseblief alle verpligte velde in.' : 'Please fill in all required fields.');
    return;
  }

  // Get current period
  const { data: pSetting } = await db.from('settings').select('value').eq('key', 'nomination_period').single();
  const period = parseInt(pSetting?.value || '1');

  const { error } = await db.from('nominations').insert({
    nominated_by: currentMember.id,
    first_name: firstName,
    surname: surname,
    email: email || null,
    motivation: motivation,
    status: 'pending',
    period: period
  });

  if (!error) loadNominations();
}

// ---- SHOW MORE TASTINGS ----

async function loadMoreTastings() {
  const container = document.getElementById('tastings-list');
  const btn = document.getElementById('show-more-btn');
  if (btn) btn.parentElement.remove();

  const { data: more } = await db
    .from('tastings')
    .select('*')
    .neq('status', 'completed')
    .order('number', { ascending: true });

  if (!more) return;

  const tastingIds = more.map(t => t.id);
  const { data: myRsvps } = await db.from('rsvps').select('*').eq('member_id', currentMember.id).in('tasting_id', tastingIds);
  const { data: rsvpCounts } = await db.from('rsvps').select('tasting_id, status').in('tasting_id', tastingIds).eq('status', 'confirmed');

  container.innerHTML = more.map(tasting => {
    const myRsvp = myRsvps?.find(r => r.tasting_id === tasting.id);
    const confirmedCount = rsvpCounts?.filter(r => r.tasting_id === tasting.id).length || 0;
    const tastingFee = (tasting.tasting_fee || 0) + (tasting.levy || 0);
    return renderTastingCard(tasting, myRsvp, confirmedCount, tastingFee);
  }).join('');

  more.forEach(tasting => {
    if (tasting.rsvp_opens_at && new Date(tasting.rsvp_opens_at) > new Date()) {
      startTimer(tasting.id, tasting.rsvp_opens_at);
    }
  });
}


// ---- CHANGE PASSWORD ----

async function changePassword() {
  const newPass = document.getElementById('new-password').value;
  const confirmPass = document.getElementById('confirm-password').value;
  const msg = document.getElementById('password-msg');

  if (!newPass || newPass.length < 6) {
    msg.style.color = '#e05a4e';
    msg.textContent = lang === 'Afr' ? 'Wagwoord moet minstens 6 karakters wees.' : 'Password must be at least 6 characters.';
    return;
  }

  if (newPass !== confirmPass) {
    msg.style.color = '#e05a4e';
    msg.textContent = lang === 'Afr' ? 'Wagwoorde stem nie ooreen nie.' : 'Passwords do not match.';
    return;
  }

  const { error } = await db.from('members').update({ password: newPass }).eq('id', currentMember.id);

  if (error) {
    msg.style.color = '#e05a4e';
    msg.textContent = 'Error updating password.';
    return;
  }

  // Update session
  currentMember.password = newPass;
  sessionStorage.setItem('hwkv_member', JSON.stringify(currentMember));

  msg.style.color = '#6bbf80';
  msg.textContent = lang === 'Afr' ? 'Wagwoord suksesvol opgedateer.' : 'Password updated successfully.';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
}


// ---- FOOTER ----

function updateFooter() {
  const el = document.getElementById('footer-tag');
  if (!el) return;
  // Derive generation from code prefix
  const code = currentMember.member_code || '';
  const prefix = code.split('-')[0] || 'HWKV';
  el.textContent = prefix + ' XXII · HWKV';
}

// ---- MEMBERSHIP INFO ----

async function loadMembership() {
  const container = document.getElementById('membership-content');
  if (!container) return;

  // Get nomination count
  const { data: noms } = await db.from('nominations').select('id, status').eq('nominated_by', currentMember.id);
  const nomCount = noms?.length || 0;
  const nomApproved = noms?.filter(n => n.status === 'approved').length || 0;

  const m = currentMember;
  const lang_ = lang;

  container.innerHTML = `
    <div class="car-card" id="membership-view">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem">
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Voornaam' : 'First Name'}</div>
          <div style="font-size:0.9rem;color:var(--cream)">${m.first_name || '—'}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Van' : 'Surname'}</div>
          <div style="font-size:0.9rem;color:var(--cream)">${m.surname || '—'}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Lidmaatskapkode' : 'Member Code'}</div>
          <div style="font-size:0.85rem;color:var(--gold);font-family:monospace">${m.member_code}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Tipe' : 'Type'}</div>
          <div style="font-size:0.85rem;color:var(--cream)">${m.member_type || '—'}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Kamer' : 'Room'}</div>
          <div style="font-size:0.85rem;color:var(--cream)">${m.room || '—'}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">Email</div>
          <div style="font-size:0.78rem;color:var(--cream)">${m.email || '—'}</div>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Aanvaar' : 'Accepted'}</div>
          <span class="badge-small ${m.membership_accepted ? 'green' : ''}">${m.membership_accepted ? (lang_ === 'Afr' ? 'Ja' : 'Yes') : (lang_ === 'Afr' ? 'Nee' : 'No')}</span>
        </div>
        <div>
          <div style="font-size:0.58rem;letter-spacing:0.12em;color:var(--muted);text-transform:uppercase;margin-bottom:0.25rem">${lang_ === 'Afr' ? 'Nominasies' : 'Nominations'}</div>
          <div style="font-size:0.85rem;color:var(--cream)">${nomApproved} ${lang_ === 'Afr' ? 'goedgekeur' : 'approved'} / ${nomCount} ${lang_ === 'Afr' ? 'ingedien' : 'submitted'}</div>
        </div>
      </div>
      <button class="btn-rsvp secondary" style="font-size:0.65rem" onclick="showMembershipEdit()">${lang_ === 'Afr' ? 'Wysig' : 'Edit Details'}</button>
    </div>
  `;
}

function showMembershipEdit() {
  const m = currentMember;
  const container = document.getElementById('membership-content');
  container.innerHTML = `
    <div class="car-card">
      <div class="car-form">
        <input id="ms-firstname" placeholder="${lang === 'Afr' ? 'Voornaam' : 'First Name'}" value="${m.first_name || ''}" />
        <input id="ms-surname" placeholder="${lang === 'Afr' ? 'Van' : 'Surname'}" value="${m.surname || ''}" />
        <input id="ms-room" placeholder="${lang === 'Afr' ? 'Kamer' : 'Room'}" value="${m.room || ''}" />
        <input id="ms-email" type="email" placeholder="Email" value="${m.email || ''}" />
        <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
          <button class="btn-rsvp" onclick="saveMembershipDetails()">${lang === 'Afr' ? 'Stoor' : 'Save'}</button>
          <button class="btn-rsvp secondary" onclick="loadMembership()">${lang === 'Afr' ? 'Kanselleer' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  `;
}

async function saveMembershipDetails() {
  const payload = {
    first_name: document.getElementById('ms-firstname').value.trim(),
    surname: document.getElementById('ms-surname').value.trim(),
    room: document.getElementById('ms-room').value.trim() || null,
    email: document.getElementById('ms-email').value.trim() || null,
  };

  const { error } = await db.from('members').update(payload).eq('id', currentMember.id);

  if (!error) {
    Object.assign(currentMember, payload);
    sessionStorage.setItem('hwkv_member', JSON.stringify(currentMember));
    loadMembership();
    // Update greeting
    document.getElementById('member-greeting').textContent = t('greeting', lang, currentMember.first_name);
  }
}
