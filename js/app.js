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

  const { data, error } = await db
    .from('members')
    .select('*')
    .eq('member_code', raw)
    .single();

  btn.disabled = false;
  btn.textContent = 'Enter';

  if (error || !data) {
    errorEl.classList.remove('hidden');
    document.getElementById('code-input').value = '';
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

  // Set language strings
  document.getElementById('section-messages-title').textContent = t('sectionMessages', lang);
  document.getElementById('section-tastings-title').textContent = t('sectionTastings', lang);
  document.getElementById('section-history-title').textContent = t('sectionHistory', lang);
  document.getElementById('section-car-title').textContent = t('sectionCar', lang);
  if (document.getElementById('section-nominations-title')) document.getElementById('section-nominations-title').textContent = t('sectionNominations', lang);
  document.getElementById('member-greeting').textContent = t('greeting', lang, currentMember.first_name);
  const lt = document.getElementById('lang-toggle');
  if (lt) lt.textContent = lang === 'Eng' ? 'EN' : 'AF';

  loadMessages();
  loadTastings();
  loadHistory();
  loadNominations();
  loadCarSection();
}

// ---- MESSAGES ----

async function loadMessages() {
  const container = document.getElementById('messages-list');
  container.innerHTML = `<p class="message-body loading-dots">Loading</p>`;

  const { data, error } = await db
    .from('messages')
    .select('*')
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

  // Get upcoming tastings
  const { data: tastings, error } = await db
    .from('tastings')
    .select('*, tasting_fee, levy')
    .neq('status', 'completed')
    .order('number', { ascending: true })
    .limit(5);

  if (error || !tastings || tastings.length === 0) {
    container.innerHTML = `<p class="rsvp-status-text" style="color:var(--muted)">${t('noTastings', lang)}</p>`;
    return;
  }

  // Get this member's RSVPs
  const tastingIds = tastings.map(t => t.id);
  const { data: myRsvps } = await db
    .from('rsvps')
    .select('*')
    .eq('member_id', currentMember.id)
    .in('tasting_id', tastingIds);

  // Get RSVP counts
  const { data: rsvpCounts } = await db
    .from('rsvps')
    .select('tasting_id, status')
    .in('tasting_id', tastingIds)
    .eq('status', 'confirmed');

  container.innerHTML = tastings.map(tasting => {
    const myRsvp = myRsvps?.find(r => r.tasting_id === tasting.id);
    const tastingFee = (tasting.tasting_fee || 0) + (tasting.levy || 0);
    const confirmedCount = rsvpCounts?.filter(r => r.tasting_id === tasting.id).length || 0;
    return renderTastingCard(tasting, myRsvp, confirmedCount, tastingFee);
  }).join('');

  // Start timers
  tastings.forEach(tasting => {
    if (tasting.rsvp_opens_at && new Date(tasting.rsvp_opens_at) > new Date()) {
      startTimer(tasting.id, tasting.rsvp_opens_at);
    }
  });
}

function renderTastingCard(tasting, myRsvp, confirmedCount, tastingFee = 0) {
  const now = new Date();
  const opensAt = tasting.rsvp_opens_at ? new Date(tasting.rsvp_opens_at) : null;
  const closesAt = tasting.rsvp_closes_at ? new Date(tasting.rsvp_closes_at) : null;
  const spotsLeft = TASTING_CAPACITY - confirmedCount;

  const rsvpIsOpen = tasting.status === 'open' && (!opensAt || opensAt <= now) && (!closesAt || closesAt > now);
  const rsvpNotYetOpen = opensAt && opensAt > now;

  // Badge
  let badge = '';
  if (myRsvp?.status === 'confirmed') badge = `<span class="tasting-badge confirmed">${t('badgeConfirmed', lang)}</span>`;
  else if (myRsvp?.status === 'waitlist') badge = `<span class="tasting-badge waitlist">${t('badgeWaitlist', lang)}</span>`;
  else if (rsvpIsOpen) badge = `<span class="tasting-badge open">${t('badgeOpen', lang)}</span>`;
  else if (tasting.status === 'upcoming') badge = `<span class="tasting-badge">${t('badgeUpcoming', lang)}</span>`;
  else badge = `<span class="tasting-badge">${t('badgeClosed', lang)}</span>`;

  // Timer block
  let timerHtml = '';
  if (rsvpNotYetOpen) {
    timerHtml = `
      <div class="rsvp-timer">
        <div class="timer-label">${t('rsvpOpensIn', lang)}</div>
        <div class="timer-display" id="timer-${tasting.id}">--:--:--</div>
      </div>`;
  } else if (rsvpIsOpen) {
    timerHtml = `<div class="timer-label" style="margin-bottom:0.75rem; color: var(--gold)">${t('rsvpOpen', lang)}</div>`;
  }

  // RSVP actions
  let actionsHtml = '';
  if (myRsvp) {
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
  } else if (rsvpIsOpen) {
    const methodNote = tasting.rsvp_method === 'ballot'
      ? `<span class="rsvp-status-text">${t('ballotNote', lang)}</span>`
      : `<span class="rsvp-status-text">${t('fcfsNote', lang)}</span>`;

    actionsHtml = `
      <div class="rsvp-actions">
        <button class="btn-rsvp" onclick="submitRsvp('${tasting.id}', '${tasting.rsvp_method}')" ${spotsLeft <= 0 && tasting.rsvp_method === 'fcfs' ? 'disabled' : ''}>${t('rsvpNow', lang)}</button>
        ${methodNote}
      </div>`;
  }

  return `
    <div class="tasting-card" id="tasting-card-${tasting.id}">
      <div class="tasting-header">
        <div class="tasting-title">${tasting.title || 'Tasting ' + tasting.number}</div>
        ${badge}
      </div>
      <div class="tasting-meta">
        <span>${tasting.tasting_date ? formatDate(tasting.tasting_date) : '—'}</span>
        ${tasting.location ? `<span>${tasting.location}</span>` : ''}
      </div>
      <div class="tasting-spots">
        ${spotsLeft > 0 ? `<span style="color:var(--white)">${confirmedCount}/${TASTING_CAPACITY}</span> ${lang === 'Afr' ? 'plekke bespreek' : 'places taken'}` : `<span style="color:var(--error)">${t('spotsFull', lang)}</span>`}
      </div>
      ${timerHtml}
      ${actionsHtml}
      ${tasting.message ? `<div class="message-body" style="margin-top:1rem; padding-top:1rem; border-top:1px solid var(--border)">${tasting.message}</div>` : ''}
      ${myRsvp?.status === 'confirmed' && !myRsvp?.sponsored ? `
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
          <div style="background:var(--surface);border:1px solid var(--border);padding:0.75rem 1rem;font-size:0.72rem;color:var(--muted);line-height:1.6">
            ${lang === 'Afr' 
              ? `Gebruik jou lidmaatskapkode <span style="color:var(--gold);font-family:monospace">${currentMember.member_code}</span> as verwysing. Stuur bewys van betaling na die Sekretariaat indien verlang.`
              : `Use your membership code <span style="color:var(--gold);font-family:monospace">${currentMember.member_code}</span> as payment reference. Send proof of payment to the Secretariat if required.`}
          </div>
        </div>` : ''}
    </div>
  `;
}

// ---- RSVP ACTIONS ----

async function submitRsvp(tastingId, method) {
  const { data: existing } = await db
    .from('rsvps')
    .select('id')
    .eq('member_id', currentMember.id)
    .eq('tasting_id', tastingId)
    .single();

  if (existing) return; // already RSVPd

  // For fcfs: check spots
  let status = 'confirmed';
  if (method === 'fcfs') {
    const { data: confirmed } = await db
      .from('rsvps')
      .select('id')
      .eq('tasting_id', tastingId)
      .eq('status', 'confirmed');

    if ((confirmed?.length || 0) >= TASTING_CAPACITY) {
      status = 'waitlist';
    }
  } else {
    // ballot — all are pending
    status = 'pending';
  }

  const { error } = await db.from('rsvps').insert({
    member_id: currentMember.id,
    tasting_id: tastingId,
    status: status
  });

  if (!error) loadTastings();
}

async function withdrawRsvp(rsvpId, tastingId) {
  await db.from('rsvps').delete().eq('id', rsvpId);

  // If fcfs: promote first waitlist person
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
  const el = document.getElementById(`timer-${tastingId}`);
  if (!el) return;

  const interval = setInterval(() => {
    const diff = target - Date.now();
    if (diff <= 0) {
      clearInterval(interval);
      loadTastings(); // Refresh to show open RSVP
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const d = Math.floor(diff / 86400000);

    if (el) {
      el.textContent = d > 0
        ? `${d}d ${pad(h % 24)}:${pad(m)}:${pad(s)}`
        : `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
  }, 1000);
}

// ---- UTILS ----

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
  // Check URL for member code (secretive link method)
  const params = new URLSearchParams(window.location.search);
  const codeFromUrl = params.get('key');
  if (codeFromUrl) {
    document.getElementById('code-input').value = codeFromUrl.toUpperCase();
    // Auto-login after short delay for effect
    setTimeout(handleLogin, 300);
  }

  // Check session
  const saved = sessionStorage.getItem('hwkv_member');
  if (saved) {
    currentMember = JSON.parse(saved);
    lang = currentMember.language === 'Afr' ? 'Afr' : 'Eng';
    enterPortal();
    return;
  }

  // Enter on keypress
  document.getElementById('code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});

// =============================================
// PAST TASTINGS HISTORY
// =============================================

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
    container.innerHTML = `<p class="rsvp-status-text" style="color:var(--muted)">${t('noHistory', lang)}</p>`;
    return;
  }

  container.innerHTML = past
    .sort((a, b) => new Date(b.tastings.tasting_date) - new Date(a.tastings.tasting_date))
    .map(r => `
      <div class="history-card">
        <div>
          <div class="tasting-title">${r.tastings.title || 'Tasting ' + r.tastings.number}</div>
          <div class="history-meta">${r.tastings.tasting_date ? formatDate(r.tastings.tasting_date) : '—'}</div>
        </div>
        <span class="badge-small green" style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.5rem;border:1px solid;display:inline-block">
          ${t('badgeConfirmed', lang)}
        </span>
      </div>
    `).join('');
}

// =============================================
// CAR / TRANSPORT REGISTRATION
// =============================================

async function loadCarSection() {
  const container = document.getElementById('car-content');
  if (!container) return;

  const { data: car } = await db
    .from('cars')
    .select('*')
    .eq('member_id', currentMember.id)
    .single();

  if (car) {
    container.innerHTML = `
      <div class="car-card">
        <div class="car-registered">
          <div>
            <div style="font-family:var(--font-serif);font-size:0.95rem">${car.make_model}</div>
            <div class="car-detail">${car.registration} · ${car.seats} ${lang === 'Afr' ? 'sitplekke' : 'seats'}</div>
            <div class="car-detail" style="margin-top:0.3rem">
              ${car.available
                ? `<span style="color:var(--gold)">● ${lang === 'Afr' ? 'Beskikbaar' : 'Available'}</span>`
                : `<span style="color:var(--muted)">● ${lang === 'Afr' ? 'Nie beskikbaar' : 'Not available'}</span>`}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem">
            <button class="btn-rsvp" onclick="showCarForm(${JSON.stringify(car).replace(/"/g, '&quot;')})">${t('carUpdate', lang)}</button>
            <button class="btn-rsvp secondary" onclick="removeCar('${car.id}')">${t('carRemove', lang)}</button>
          </div>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="car-card">
        <p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">${t('carRegisterTitle', lang)}</p>
        <div class="car-form" id="car-form">
          <input id="car-make" placeholder="${t('carMake', lang)}" />
          <input id="car-reg" placeholder="${t('carReg', lang)}" />
          <input id="car-seats" type="number" placeholder="${t('carSeats', lang)}" min="1" max="8" />
          <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--muted);cursor:pointer">
            <input type="checkbox" id="car-avail" checked style="accent-color:var(--gold)" />
            ${t('carAvailable', lang)}
          </label>
          <button class="btn-rsvp" style="margin-top:0.5rem;align-self:flex-start" onclick="saveCar(null)">${t('carSave', lang)}</button>
        </div>
      </div>
    `;
  }
}

function showCarForm(car) {
  const container = document.getElementById('car-content');
  container.innerHTML = `
    <div class="car-card">
      <div class="car-form">
        <input id="car-make" value="${car.make_model}" placeholder="${t('carMake', lang)}" />
        <input id="car-reg" value="${car.registration}" placeholder="${t('carReg', lang)}" />
        <input id="car-seats" type="number" value="${car.seats}" min="1" max="8" placeholder="${t('carSeats', lang)}" />
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:var(--muted);cursor:pointer">
          <input type="checkbox" id="car-avail" ${car.available ? 'checked' : ''} style="accent-color:var(--gold)" />
          ${t('carAvailable', lang)}
        </label>
        <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
          <button class="btn-rsvp" onclick="saveCar('${car.id}')">${t('carSave', lang)}</button>
          <button class="btn-rsvp secondary" onclick="loadCarSection()">Cancel</button>
        </div>
      </div>
    </div>
  `;
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

  // Also update has_car on member
  await db.from('members').update({ has_car: true }).eq('id', currentMember.id);

  loadCarSection();
}

async function removeCar(id) {
  await db.from('cars').delete().eq('id', id);
  await db.from('members').update({ has_car: false }).eq('id', currentMember.id);
  loadCarSection();
}

// =============================================
// LANGUAGE TOGGLE
// =============================================

function toggleLanguage() {
  lang = lang === 'Eng' ? 'Afr' : 'Eng';
  document.getElementById('lang-toggle').textContent = lang === 'Eng' ? 'EN' : 'AF';

  // Save preference
  if (currentMember) {
    localStorage.setItem('hwkv_lang_override', lang);
  }

  // Refresh all sections
  document.getElementById('section-messages-title').textContent = t('sectionMessages', lang);
  document.getElementById('section-tastings-title').textContent = t('sectionTastings', lang);
  document.getElementById('section-history-title').textContent = t('sectionHistory', lang);
  document.getElementById('section-car-title').textContent = t('sectionCar', lang);
  if (document.getElementById('section-nominations-title')) document.getElementById('section-nominations-title').textContent = t('sectionNominations', lang);
  document.getElementById('member-greeting').textContent = t('greeting', lang, currentMember.first_name);

  loadMessages();
  loadTastings();
  loadHistory();
  loadNominations();
  loadCarSection();
}

// =============================================
// NOMINATIONS
// =============================================

async function loadNominations() {
  const container = document.getElementById('nominations-content');
  const titleEl = document.getElementById('section-nominations-title');
  if (!container) return;
  if (titleEl) titleEl.textContent = t('sectionNominations', lang);

  // Get nomination deadline from messages table (special pinned message with title 'NOM_DEADLINE')
  const { data: deadlineMsg } = await db.from('messages')
    .select('body').eq('title', 'NOM_DEADLINE').single();

  const deadline = deadlineMsg ? new Date(deadlineMsg.body) : null;
  const deadlinePassed = deadline && deadline < new Date();

  // Get member's existing nominations
  const { data: myNoms } = await db.from('nominations')
    .select('*')
    .eq('nominated_by', currentMember.id)
    .order('created_at', { ascending: false });

  const usedNoms = myNoms?.length || 0;
  const maxNoms = 1; // Each founding member gets 1 nomination
  const remaining = Math.max(0, maxNoms - usedNoms);

  let html = '';

  // Deadline notice
  if (deadline) {
    const dStr = deadline.toLocaleDateString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    html += `<div style="font-size:0.72rem;color:${deadlinePassed ? 'var(--error)' : 'var(--muted)'};margin-bottom:1rem;padding:0.75rem 1rem;border:1px solid ${deadlinePassed ? 'var(--error)' : 'var(--border)'}">
      ${t('nominationDeadline', lang)}: <strong style="color:var(--white)">${dStr}</strong>
    </div>`;
  }

  // Remaining count
  html += `<div style="font-size:0.8rem;color:var(--muted);margin-bottom:1.25rem">
    ${remaining > 0 ? t('nominationsRemaining', lang, remaining) : t('nominationsNone', lang)}
  </div>`;

  // Past nominations
  if (myNoms && myNoms.length > 0) {
    html += `<div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem">${t('nomYours', lang)}</div>`;
    html += myNoms.map(n => `
      <div style="background:var(--surface);border:1px solid var(--border);padding:1rem 1.25rem;margin-bottom:0.75rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
          <div style="font-family:var(--font-serif)">${n.first_name} ${n.surname}</div>
          <span style="font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.2rem 0.5rem;border:1px solid ${n.status === 'approved' ? '#3a6b4a' : n.status === 'declined' ? 'var(--error)' : 'var(--border)'};color:${n.status === 'approved' ? '#6bbf80' : n.status === 'declined' ? '#c0605a' : 'var(--muted)'}">
            ${t('nom' + n.status.charAt(0).toUpperCase() + n.status.slice(1), lang)}
          </span>
        </div>
        ${n.room ? `<div style="font-size:0.72rem;color:var(--muted);margin-top:0.25rem">Room ${n.room}</div>` : ''}
        ${n.member_code_assigned ? `<div style="font-size:0.72rem;color:var(--gold);margin-top:0.25rem">Code: ${n.member_code_assigned}</div>` : ''}
      </div>
    `).join('');
  }

  // Nomination form
  if (remaining > 0 && !deadlinePassed) {
    html += `
      <div style="background:var(--surface);border:1px solid var(--border);padding:1.25rem 1.5rem;margin-top:0.75rem">
        <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:1rem">${t('nominateBtn', lang)}</div>
        <div style="display:flex;flex-direction:column;gap:0.75rem">
          <input id="nom-first" placeholder="${t('nomFirstName', lang)}" style="background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--white);font-size:0.85rem;padding:0.5rem 0;outline:none;transition:border-color 0.2s" onfocus="this.style.borderBottomColor='var(--gold)'" onblur="this.style.borderBottomColor='var(--border)'" />
          <input id="nom-surname" placeholder="${t('nomSurname', lang)}" style="background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--white);font-size:0.85rem;padding:0.5rem 0;outline:none;transition:border-color 0.2s" onfocus="this.style.borderBottomColor='var(--gold)'" onblur="this.style.borderBottomColor='var(--border)'" />
          <input id="nom-room" placeholder="${t('nomRoom', lang)}" style="background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--white);font-size:0.85rem;padding:0.5rem 0;outline:none;transition:border-color 0.2s" onfocus="this.style.borderBottomColor='var(--gold)'" onblur="this.style.borderBottomColor='var(--border)'" />
          <textarea id="nom-motivation" placeholder="${t('nomMotivation', lang)}" style="background:transparent;border:1px solid var(--border);color:var(--white);font-size:0.85rem;padding:0.75rem;outline:none;min-height:120px;resize:vertical;font-family:var(--font-sans);transition:border-color 0.2s" onfocus="this.style.borderColor='var(--gold)'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <button class="btn-rsvp" style="align-self:flex-start;margin-top:0.25rem" onclick="submitNomination()">${t('nominateBtn', lang)}</button>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function submitNomination() {
  const first = document.getElementById('nom-first')?.value?.trim();
  const surname = document.getElementById('nom-surname')?.value?.trim();
  const room = document.getElementById('nom-room')?.value?.trim();
  const motivation = document.getElementById('nom-motivation')?.value?.trim();

  if (!first || !surname || !motivation) {
    alert(lang === 'Afr' ? 'Vul asseblief alle velde in.' : 'Please fill in all fields.');
    return;
  }

  const { error } = await db.from('nominations').insert({
    nominated_by: currentMember.id,
    first_name: first,
    surname: surname,
    room: room || null,
    motivation: motivation,
    status: 'pending'
  });

  if (error) {
    alert('Error submitting nomination. Please try again.');
    return;
  }

  loadNominations();
}

// =============================================
// NOMINATIONS
// =============================================

async function loadNominations() {
  const container = document.getElementById('nominations-content');
  if (!container) return;

  document.getElementById('section-nominations-title').textContent = t('sectionNominations', lang);

  // Get settings
  const { data: settings } = await db.from('settings').select('key, value');
  const deadline = settings?.find(s => s.key === 'nomination_deadline')?.value;
  const isOpen = settings?.find(s => s.key === 'nominations_open')?.value !== 'false';

  // Check if member already nominated
  const { data: existing } = await db
    .from('nominations')
    .select('*')
    .eq('nominated_by', currentMember.id)
    .single();

  let html = '';

  // Deadline display
  if (deadline) {
    const d = new Date(deadline);
    html += `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:1rem">
      <span style="color:var(--gold);letter-spacing:0.1em;text-transform:uppercase;font-size:0.6rem">${t('nominationDeadline', lang)}</span>
      &nbsp;${d.toLocaleString(lang === 'Afr' ? 'af-ZA' : 'en-ZA', {day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}
    </div>`;
  }

  if (!isOpen) {
    html += `<p style="color:var(--muted);font-size:0.8rem">${t('nominationClosed', lang)}</p>`;
    container.innerHTML = html;
    return;
  }

  if (existing) {
    const statusColor = existing.status === 'approved' ? '#6bbf80' : existing.status === 'denied' ? '#c0605a' : 'var(--muted)';
    const statusText = existing.status === 'approved' ? t('nominationApproved', lang)
      : existing.status === 'denied' ? t('nominationDenied', lang)
      : t('nominationPending', lang);

    html += `
      <div class="message-card">
        <div class="message-title">${existing.first_name} ${existing.surname}</div>
        <div class="message-body" style="margin-top:0.3rem">${existing.room ? existing.room : ''}</div>
        <div style="margin-top:0.75rem;font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:${statusColor}">${statusText}</div>
      </div>`;
  } else if (currentMember.member_type === 'Founding Member' || currentMember.member_type === 'Owner') {
    html += `
      <p style="font-size:0.8rem;color:var(--muted);margin-bottom:1rem">${t('nominationRight', lang)}</p>
      <div id="nom-form-container">
        <button class="btn-rsvp" onclick="showNomForm()">${t('nominateBtn', lang)}</button>
      </div>`;
  }

  container.innerHTML = html;
}

function showNomForm() {
  document.getElementById('nom-form-container').innerHTML = `
    <div class="car-card">
      <div class="car-form">
        <input id="nom-firstname" placeholder="${t('nomFirstName', lang)}" />
        <input id="nom-surname" placeholder="${t('nomSurname', lang)}" />
        <input id="nom-room" placeholder="${t('nomRoom', lang)}" />
        <textarea id="nom-motivation" placeholder="${t('nomMotivation', lang)}" style="background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--white);font-family:var(--font-sans);font-size:0.85rem;padding:0.5rem 0;outline:none;resize:vertical;min-height:120px;width:100%"></textarea>
        <div style="display:flex;gap:0.75rem;margin-top:0.5rem">
          <button class="btn-rsvp" onclick="submitNomination()">${t('nomSubmit', lang)}</button>
          <button class="btn-rsvp secondary" onclick="loadNominations()">${t('nomCancel', lang)}</button>
        </div>
      </div>
    </div>
  `;
}

async function submitNomination() {
  const firstName = document.getElementById('nom-firstname').value.trim();
  const surname = document.getElementById('nom-surname').value.trim();
  const room = document.getElementById('nom-room').value.trim();
  const motivation = document.getElementById('nom-motivation').value.trim();

  if (!firstName || !surname || !motivation) {
    alert(lang === 'Afr' ? 'Vul asseblief alle verpligte velde in.' : 'Please fill in all required fields.');
    return;
  }

  const { error } = await db.from('nominations').insert({
    nominated_by: currentMember.id,
    first_name: firstName,
    surname: surname,
    room: room || null,
    motivation: motivation,
    status: 'pending'
  });

  if (!error) loadNominations();
}
