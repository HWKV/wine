// HWKV Admin Dashboard - admin.js
// Supabase client `db` from config.js

const ADMIN_PASSWORD = 'WineAdminCMP';
let activeTab = 'members';

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminLoginBtn').addEventListener('click', attemptLogin);
  document.getElementById('adminPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') attemptLogin();
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

function attemptLogin() {
  const val = document.getElementById('adminPass').value;
  if (val === ADMIN_PASSWORD) {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDash').style.display = 'block';
    switchTab('members');
  } else {
    document.getElementById('adminLoginErr').textContent = 'Verkeerde wagwoord.';
  }
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = c.id === `tab-${tab}` ? '' : 'none');
  ({
    members:  loadMembers,
    tastings: loadTastings,
    messages: loadMessages,
    polls:    loadAdminPolls,
    rsvps:    loadRsvps,
    finance:  loadFinance,
    email:    initEmail,
  }[tab] || (() => {}))();
}

// ─── MEMBERS ──────────────────────────────────────────────────────────────────

async function loadMembers() {
  const { data } = await db.from('members').select('*').order('number');
  const tbody = document.getElementById('membersTableBody');
  if (!data) return;
  tbody.innerHTML = data.map(m => `<tr>
    <td>${m.number || ''}</td>
    <td>${m.first_name} ${m.surname || ''}</td>
    <td>${m.member_code}</td>
    <td>${m.room || ''}</td>
    <td>${m.member_type || ''}</td>
    <td>${m.email || ''}</td>
    <td><button onclick="copyLink('${m.member_code}')">🔗</button></td>
  </tr>`).join('');
}

function copyLink(code) {
  const url = `${location.origin}${location.pathname.replace('admin/', '')}?key=${code}`;
  navigator.clipboard.writeText(url);
}

// ─── TASTINGS ─────────────────────────────────────────────────────────────────

async function loadTastings() {
  const { data } = await db.from('tastings').select('*').order('number');
  const container = document.getElementById('tastingsAdmin');
  if (!data) return;
  container.innerHTML = `
    <button class="btn-primary" onclick="showTastingForm()">+ Nuwe Proegeleentheid</button>
    <div id="tastingFormArea"></div>
    <table class="admin-table">
      <thead><tr><th>#</th><th>Titel</th><th>Datum</th><th>Status</th><th>RSVP</th><th></th></tr></thead>
      <tbody>${data.map(t => `<tr>
        <td>${t.number}</td>
        <td>${t.title || ''}</td>
        <td>${t.tasting_date ? new Date(t.tasting_date).toLocaleDateString('af-ZA') : '—'}</td>
        <td>${t.status}</td>
        <td>${t.rsvp_method}</td>
        <td>
          <button onclick="editTasting('${t.id}')">✏️</button>
          <button onclick="toggleTastingStatus('${t.id}','${t.status}')">
            ${t.status === 'open' ? 'Sluit' : 'Maak oop'}
          </button>
        </td>
      </tr>`).join('')}</tbody>
    </table>`;
}

function showTastingForm(tasting = {}) {
  const area = document.getElementById('tastingFormArea');
  area.innerHTML = `<div class="form-card">
    <h3>${tasting.id ? 'Wysig Proegeleentheid' : 'Nuwe Proegeleentheid'}</h3>
    <input id="tf_num" type="number" placeholder="#" value="${tasting.number || ''}">
    <input id="tf_title" type="text" placeholder="Titel" value="${tasting.title || ''}">
    <input id="tf_date" type="datetime-local" value="${tasting.tasting_date ? tasting.tasting_date.slice(0,16) : ''}">
    <input id="tf_location" type="text" placeholder="Plek" value="${tasting.location || ''}">
    <input id="tf_capacity" type="number" placeholder="Kapasiteit" value="${tasting.capacity || 20}">
    <select id="tf_rsvp"><option value="fcfs" ${tasting.rsvp_method === 'fcfs' ? 'selected' : ''}>FCFS</option><option value="ballot" ${tasting.rsvp_method === 'ballot' ? 'selected' : ''}>Ballotkieser</option></select>
    <textarea id="tf_msg" placeholder="Boodskap aan lede">${tasting.message || ''}</textarea>
    <button class="btn-primary" onclick="saveTasting('${tasting.id || ''}')">Stoor</button>
    <button onclick="document.getElementById('tastingFormArea').innerHTML=''">Kanselleer</button>
  </div>`;
}

async function editTasting(id) {
  const { data } = await db.from('tastings').select('*').eq('id', id).single();
  if (data) showTastingForm(data);
}

async function saveTasting(id) {
  const payload = {
    number: parseInt(document.getElementById('tf_num').value),
    title: document.getElementById('tf_title').value,
    tasting_date: document.getElementById('tf_date').value || null,
    location: document.getElementById('tf_location').value,
    capacity: parseInt(document.getElementById('tf_capacity').value),
    rsvp_method: document.getElementById('tf_rsvp').value,
    message: document.getElementById('tf_msg').value,
  };
  if (id) {
    await db.from('tastings').update(payload).eq('id', id);
  } else {
    await db.from('tastings').insert({ ...payload, status: 'upcoming' });
  }
  loadTastings();
}

async function toggleTastingStatus(id, current) {
  const next = current === 'open' ? 'closed' : 'open';
  await db.from('tastings').update({ status: next }).eq('id', id);
  loadTastings();
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

async function loadMessages() {
  const { data } = await db.from('messages').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('messagesAdmin');
  container.innerHTML = `
    <div class="form-card">
      <h3>Nuwe Boodskap</h3>
      <input id="msg_title" type="text" placeholder="Titel (EN)">
      <input id="msg_title_afr" type="text" placeholder="Titel (AFR)">
      <textarea id="msg_body" placeholder="Inhoud (EN)"></textarea>
      <textarea id="msg_body_afr" placeholder="Inhoud (AFR)"></textarea>
      <label><input type="checkbox" id="msg_pinned"> Vasgesteek</label>
      <button class="btn-primary" onclick="postMessage()">Plaas</button>
    </div>
    <table class="admin-table">
      <thead><tr><th>Titel</th><th>Datum</th><th>📌</th><th></th></tr></thead>
      <tbody>${(data || []).map(m => `<tr>
        <td>${m.title}</td>
        <td>${new Date(m.created_at).toLocaleDateString('af-ZA')}</td>
        <td>${m.pinned ? '📌' : ''}</td>
        <td><button onclick="deleteMessage('${m.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table>`;
}

async function postMessage() {
  await db.from('messages').insert({
    title: document.getElementById('msg_title').value,
    title_afr: document.getElementById('msg_title_afr').value,
    body: document.getElementById('msg_body').value,
    body_afr: document.getElementById('msg_body_afr').value,
    pinned: document.getElementById('msg_pinned').checked,
  });
  loadMessages();
}

async function deleteMessage(id) {
  if (confirm('Vee uit?')) {
    await db.from('messages').delete().eq('id', id);
    loadMessages();
  }
}

// ─── POLLS ────────────────────────────────────────────────────────────────────

async function loadAdminPolls() {
  const { data: polls } = await db.from('polls').select('*').order('created_at', { ascending: false });
  const container = document.getElementById('pollsAdmin');

  // For each poll, fetch response counts
  let responseSummaries = {};
  if (polls && polls.length > 0) {
    const { data: allResponses } = await db
      .from('poll_responses')
      .select('poll_id, response')
      .in('poll_id', polls.map(p => p.id));

    (allResponses || []).forEach(r => {
      if (!responseSummaries[r.poll_id]) responseSummaries[r.poll_id] = { yes: 0, maybe: 0, no: 0 };
      responseSummaries[r.poll_id][r.response] = (responseSummaries[r.poll_id][r.response] || 0) + 1;
    });
  }

  const tableRows = (polls || []).map(p => {
    const s = responseSummaries[p.id] || { yes: 0, maybe: 0, no: 0 };
    const total = s.yes + s.maybe + s.no;
    return `<tr>
      <td>${p.title}</td>
      <td class="poll-count yes-count">✅ ${s.yes}</td>
      <td class="poll-count maybe-count">🤷 ${s.maybe}</td>
      <td class="poll-count no-count">❌ ${s.no}</td>
      <td>${total}</td>
      <td><span class="status-badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Aktief' : 'Gesluit'}</span></td>
      <td>
        <button onclick="togglePoll('${p.id}', ${p.active})">${p.active ? 'Sluit' : 'Heropen'}</button>
        <button onclick="viewPollDetails('${p.id}')">👁️</button>
        <button onclick="deletePoll('${p.id}')">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="form-card">
      <h3>Nuwe Beskikbaarheidspeil</h3>
      <input id="poll_title" type="text" placeholder="Titel (EN) — e.g. Are you in town this weekend?">
      <input id="poll_title_afr" type="text" placeholder="Titel (AFR) — e.g. Is jy hierdie naweek in die dorp?">
      <textarea id="poll_body" placeholder="Opsionele beskrywing (EN)" rows="2"></textarea>
      <textarea id="poll_body_afr" placeholder="Opsionele beskrywing (AFR)" rows="2"></textarea>
      <button class="btn-primary" onclick="createPoll()">Plaas Peil</button>
    </div>

    <table class="admin-table" id="pollsTable">
      <thead>
        <tr>
          <th>Vraag</th>
          <th>✅ Ja</th>
          <th>🤷 Dalk</th>
          <th>❌ Nee</th>
          <th>Totaal</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${tableRows || '<tr><td colspan="7">Geen peile nie.</td></tr>'}</tbody>
    </table>
    <div id="pollDetailArea"></div>`;
}

async function createPoll() {
  const title = document.getElementById('poll_title').value.trim();
  const title_afr = document.getElementById('poll_title_afr').value.trim();
  if (!title && !title_afr) return;
  await db.from('polls').insert({
    title: title || title_afr,
    title_afr: title_afr || title,
    body: document.getElementById('poll_body').value.trim() || null,
    body_afr: document.getElementById('poll_body_afr').value.trim() || null,
    active: true,
  });
  loadAdminPolls();
}

async function togglePoll(id, currentlyActive) {
  await db.from('polls').update({ active: !currentlyActive }).eq('id', id);
  loadAdminPolls();
}

async function deletePoll(id) {
  if (confirm('Vee peil uit? Alle antwoorde gaan verlore.')) {
    await db.from('polls').delete().eq('id', id);
    loadAdminPolls();
  }
}

async function viewPollDetails(pollId) {
  const { data: responses } = await db
    .from('poll_responses')
    .select('response, members(first_name, surname, member_code)')
    .eq('poll_id', pollId);

  const area = document.getElementById('pollDetailArea');
  if (!responses || responses.length === 0) {
    area.innerHTML = '<p>Geen antwoorde nie.</p>';
    return;
  }

  const groups = { yes: [], maybe: [], no: [] };
  responses.forEach(r => {
    const name = r.members ? `${r.members.first_name} ${r.members.surname || ''}`.trim() : '?';
    groups[r.response]?.push(name);
  });

  area.innerHTML = `<div class="poll-detail-card">
    <h4>Antwoorde</h4>
    <div class="poll-detail-row"><strong>✅ Ja (${groups.yes.length}):</strong> ${groups.yes.join(', ') || '—'}</div>
    <div class="poll-detail-row"><strong>🤷 Dalk (${groups.maybe.length}):</strong> ${groups.maybe.join(', ') || '—'}</div>
    <div class="poll-detail-row"><strong>❌ Nee (${groups.no.length}):</strong> ${groups.no.join(', ') || '—'}</div>
    <button onclick="document.getElementById('pollDetailArea').innerHTML=''">Sluit</button>
  </div>`;
}

// ─── RSVPs ────────────────────────────────────────────────────────────────────

async function loadRsvps() {
  const { data: tastings } = await db.from('tastings').select('id, number, title, rsvp_method').order('number');
  const container = document.getElementById('rsvpsAdmin');
  if (!tastings || tastings.length === 0) { container.innerHTML = 'Geen proeë.'; return; }

  const selOptions = tastings.map(t => `<option value="${t.id}">#${t.number} ${t.title || ''}</option>`).join('');
  container.innerHTML = `
    <select id="rsvpTastingSelect" onchange="loadRsvpList()">${selOptions}</select>
    <div id="rsvpList"></div>`;
  loadRsvpList();
}

async function loadRsvpList() {
  const tastingId = document.getElementById('rsvpTastingSelect').value;
  const { data } = await db
    .from('rsvps')
    .select('*, members(first_name, surname, member_code)')
    .eq('tasting_id', tastingId);

  const { data: tasting } = await db.from('tastings').select('rsvp_method').eq('id', tastingId).single();

  const rows = (data || []).map(r => `<tr>
    <td>${r.members?.first_name} ${r.members?.surname || ''}</td>
    <td>${r.members?.member_code}</td>
    <td>${r.status}</td>
    <td>${r.payment_confirmed ? '✓' : ''}</td>
    <td>
      <select onchange="updateRsvpStatus('${r.id}', this.value)">
        ${['pending','confirmed','waitlist','declined'].map(s => `<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </td>
  </tr>`).join('');

  let ballotBtn = '';
  if (tasting?.rsvp_method === 'ballot') {
    ballotBtn = `<button class="btn-primary" onclick="runBallot('${tastingId}')">🎲 Voer Ballotkieser uit</button>`;
  }

  document.getElementById('rsvpList').innerHTML = `
    ${ballotBtn}
    <table class="admin-table">
      <thead><tr><th>Naam</th><th>Kode</th><th>Status</th><th>Betaal</th><th>Wysig</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

async function updateRsvpStatus(id, status) {
  await db.from('rsvps').update({ status }).eq('id', id);
}

async function runBallot(tastingId) {
  const { data: tasting } = await db.from('tastings').select('capacity').eq('id', tastingId).single();
  const { data: pending } = await db.from('rsvps').select('id').eq('tasting_id', tastingId).eq('status', 'pending');
  if (!pending || pending.length === 0) { alert('Geen hangende RSVPs.'); return; }

  const shuffled = pending.sort(() => Math.random() - 0.5);
  const cap = tasting?.capacity || 20;
  const confirmed = shuffled.slice(0, cap).map(r => r.id);
  const waitlist = shuffled.slice(cap).map(r => r.id);

  for (const id of confirmed) await db.from('rsvps').update({ status: 'confirmed' }).eq('id', id);
  for (const id of waitlist) await db.from('rsvps').update({ status: 'waitlist' }).eq('id', id);

  loadRsvpList();
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────

async function loadFinance() {
  const { data: tastings } = await db.from('tastings').select('id, number, title').order('number');
  const container = document.getElementById('financeAdmin');
  if (!tastings || tastings.length === 0) { container.innerHTML = 'Geen proeë.'; return; }

  container.innerHTML = `
    <select id="finTastingSelect" onchange="calcFinance()">
      ${tastings.map(t => `<option value="${t.id}">#${t.number} ${t.title || ''}</option>`).join('')}
    </select>
    <div class="form-card">
      <label>Totale proekoste (R): <input id="fin_cost" type="number" value="0" oninput="calcFinance()"></label>
      <label>Vervoerkoste (R): <input id="fin_transport" type="number" value="0" oninput="calcFinance()"></label>
    </div>
    <div id="finResult"></div>`;
  calcFinance();
}

async function calcFinance() {
  const tastingId = document.getElementById('finTastingSelect').value;
  const cost = parseFloat(document.getElementById('fin_cost').value) || 0;
  const transport = parseFloat(document.getElementById('fin_transport').value) || 0;

  const { data: rsvps } = await db.from('rsvps').select('members(first_name, surname)').eq('tasting_id', tastingId).eq('status', 'confirmed');
  const count = (rsvps || []).length;
  if (count === 0) { document.getElementById('finResult').innerHTML = '<p>Geen bevestigde RSVPs.</p>'; return; }

  const perPerson = ((cost + transport) / count).toFixed(2);
  document.getElementById('finResult').innerHTML = `
    <div class="stat-card">
      <p>Bevestigde gaste: <strong>${count}</strong></p>
      <p>Totale koste: <strong>R${(cost + transport).toFixed(2)}</strong></p>
      <p>Per persoon: <strong>R${perPerson}</strong></p>
    </div>`;
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

function initEmail() {
  const container = document.getElementById('emailAdmin');
  container.innerHTML = `
    <div class="form-card">
      <h3>Stuur E-pos aan Lede</h3>
      <input id="email_subject" type="text" placeholder="Onderwerp">
      <textarea id="email_body" placeholder="Boodskapinhoud" rows="6"></textarea>
      <label><input type="checkbox" id="email_all" checked> Alle aktiewe lede</label>
      <button class="btn-primary" onclick="sendEmail()">Stuur</button>
      <p id="emailStatus"></p>
    </div>`;
}

async function sendEmail() {
  const subject = document.getElementById('email_subject').value;
  const body = document.getElementById('email_body').value;
  const status = document.getElementById('emailStatus');
  status.textContent = 'Stuur...';

  const { data: members } = await db.from('members').select('email').eq('active', true).not('email', 'is', null);
  const emails = (members || []).map(m => m.email).filter(Boolean);

  try {
    const { data, error } = await db.functions.invoke('send-email', {
      body: { to: emails, subject, html: body.replace(/\n/g, '<br>') },
    });
    if (error) throw error;
    status.textContent = `✓ Gestuur aan ${emails.length} lede.`;
  } catch (err) {
    status.textContent = `Fout: ${err.message}`;
  }
}
