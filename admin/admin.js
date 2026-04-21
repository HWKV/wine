// =============================================
// HWKV — Admin Dashboard
// =============================================

// Simple passphrase auth (client-side, good enough for private use)
// Set your passphrase here:
const ADMIN_PASSPHRASE = 'WineAdminCMP';

function adminLogin() {
  const val = document.getElementById('admin-pass-input').value;
  if (val === ADMIN_PASSPHRASE) {
    sessionStorage.setItem('hwkv_admin', '1');
    document.getElementById('admin-login').classList.remove('active');
    document.getElementById('admin-portal').classList.add('active');
    loadMembers();
  } else {
    document.getElementById('admin-login-error').classList.remove('hidden');
  }
}

function adminLogout() {
  sessionStorage.removeItem('hwkv_admin');
  location.reload();
}

// ---- TABS ----

function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  event.target.classList.add('active');

  if (name === 'members') loadMembers();
  if (name === 'tastings') loadAdminTastings();
  if (name === 'messages') loadAdminMessages();
  if (name === 'rsvps') loadTastingFilter();
  if (name === 'finance') initFinanceTab();
  if (name === 'email') { const k = localStorage.getItem('hwkv_resend_key'); if(k) document.getElementById('resend-key-input').value = k; }
  if (name === 'vehicles') loadVehicles();
  if (name === 'nominations') loadAdminNominations();
  if (name === 'nominations') loadAdminNominations();
}

// ---- MEMBERS ----

async function loadMembers() {
  const container = document.getElementById('members-table-container');
  const { data } = await db.from('members').select('*').order('number');

  if (!data) { container.innerHTML = '<p style="color:var(--muted)">No members.</p>'; return; }

  const baseUrl = window.location.origin + window.location.pathname.replace('/admin/', '/');

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Code</th>
          <th>Type</th>
          <th>Lang</th>
          <th>Accepted</th>
          <th>Paid</th>
          <th>Link</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${data.map(m => `
          <tr>
            <td style="color:var(--muted)">${m.number || '—'}</td>
            <td>${m.first_name} ${m.surname || ''}</td>
            <td style="font-size:0.65rem;letter-spacing:0.05em;color:var(--gold)">${m.member_code}</td>
            <td><span class="badge-small ${m.member_type === 'Founding Member' ? 'gold' : ''}">${m.member_type}</span></td>
            <td>${m.language}</td>
            <td>${m.membership_accepted ? '<span class="badge-small green">Yes</span>' : '<span class="badge-small">No</span>'}</td>
            <td>${m.membership_paid ? '<span class="badge-small green">Yes</span>' : '<span class="badge-small">No</span>'}</td>
            <td>
              <div class="link-box" onclick="copyLink('${baseUrl}?key=${m.member_code}')" title="Click to copy">
                ?key=${m.member_code}
              </div>
            </td>
            <td>
              <button class="btn-admin" onclick="openEditMember('${m.id}')">Edit</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied');
  });
}

function openAddMember() {
  document.getElementById('modal-content').innerHTML = memberForm(null);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function openEditMember(id) {
  const { data } = await db.from('members').select('*').eq('id', id).single();
  document.getElementById('modal-content').innerHTML = memberForm(data);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function memberForm(m) {
  return `
    <div class="modal-title">${m ? 'Edit Member' : 'Add Member'}</div>
    <input type="hidden" id="fm-id" value="${m?.id || ''}" />
    <div class="form-group"><label>First Name</label><input id="fm-first" value="${m?.first_name || ''}" /></div>
    <div class="form-group"><label>Surname</label><input id="fm-surname" value="${m?.surname || ''}" /></div>
    <div class="form-group"><label>Room</label><input id="fm-room" value="${m?.room || ''}" /></div>
    <div class="form-group"><label>Language</label>
      <select id="fm-lang">
        <option value="Eng" ${m?.language === 'Eng' ? 'selected' : ''}>English</option>
        <option value="Afr" ${m?.language === 'Afr' ? 'selected' : ''}>Afrikaans</option>
      </select>
    </div>
    <div class="form-group"><label>Member Code</label><input id="fm-code" value="${m?.member_code || ''}" /></div>
    <div class="form-group"><label>Member Type</label>
      <select id="fm-type">
        <option value="Owner" ${m?.member_type === 'Owner' ? 'selected' : ''}>Owner</option>
        <option value="Founding Member" ${m?.member_type === 'Founding Member' ? 'selected' : ''}>Founding Member</option>
        <option value="General" ${m?.member_type === 'General' ? 'selected' : ''}>General</option>
        <option value="Driver" ${m?.member_type === 'Driver' ? 'selected' : ''}>Driver</option>
        <option value="Other" ${m?.member_type === 'Other' ? 'selected' : ''}>Other</option>
      </select>
    </div>
    <div class="form-group"><label>Email</label><input id="fm-email" type="email" value="${m?.email || ''}" placeholder="studentnr@sun.ac.za" /></div>
    <div class="form-group"><label>Nominated By (code)</label><input id="fm-nominated" value="${m?.nominated_by || ''}" /></div>
    <div class="form-group" style="flex-direction:row;gap:1rem;align-items:center">
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
        <input type="checkbox" id="fm-accepted" ${m?.membership_accepted ? 'checked' : ''} style="accent-color:var(--gold)" /> Accepted
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
        <input type="checkbox" id="fm-paid" ${m?.membership_paid ? 'checked' : ''} style="accent-color:var(--gold)" /> Paid
      </label>
      <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer">
        <input type="checkbox" id="fm-car" ${m?.has_car ? 'checked' : ''} style="accent-color:var(--gold)" /> Has Car
      </label>
    </div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveMember()">Save</button>
    </div>
  `;
}

async function saveMember() {
  const id = document.getElementById('fm-id').value;
  const payload = {
    first_name: document.getElementById('fm-first').value,
    surname: document.getElementById('fm-surname').value,
    room: document.getElementById('fm-room').value,
    language: document.getElementById('fm-lang').value,
    member_code: document.getElementById('fm-code').value.toUpperCase(),
    member_type: document.getElementById('fm-type').value,
    email: document.getElementById('fm-email').value || null,
    nominated_by: document.getElementById('fm-nominated').value || null,
    membership_accepted: document.getElementById('fm-accepted').checked,
    membership_paid: document.getElementById('fm-paid').checked,
    has_car: document.getElementById('fm-car').checked,
  };

  if (id) {
    await db.from('members').update(payload).eq('id', id);
  } else {
    await db.from('members').insert(payload);
  }

  closeModal();
  loadMembers();
}

// ---- TASTINGS ----

async function loadAdminTastings() {
  const container = document.getElementById('tastings-admin-container');
  const { data } = await db.from('tastings').select('*').order('number', { ascending: true });

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">No tastings yet.</p>';
    return;
  }

  container.innerHTML = data.map(t => `
    <div style="background:var(--surface);border:1px solid var(--border);padding:1.25rem;margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--font-serif);font-size:1rem;margin-bottom:0.3rem">${t.title || 'Tasting ' + t.number}</div>
          <div style="font-size:0.7rem;color:var(--muted)">${t.tasting_date ? new Date(t.tasting_date).toLocaleString('en-ZA') : 'Date TBC'} · Capacity: ${t.capacity} · Method: <strong style="color:var(--gold)">${t.rsvp_method === 'ballot' ? 'Ballot' : 'FCFS'}</strong></div>
          <div style="font-size:0.65rem;color:var(--muted);margin-top:0.25rem">RSVP: ${t.rsvp_opens_at ? new Date(t.rsvp_opens_at).toLocaleString('en-ZA') : '—'} → ${t.rsvp_closes_at ? new Date(t.rsvp_closes_at).toLocaleString('en-ZA') : '—'}</div>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <span class="badge-small ${t.status === 'open' ? 'green' : t.status === 'completed' ? '' : 'gold'}">${t.status}</span>
          <button class="btn-admin" onclick="openEditTasting('${t.id}')">Edit</button>
          <button class="btn-admin danger" onclick="deleteTasting('${t.id}')">Delete</button>
          <button class="btn-admin" onclick="toggleTastingStatus('${t.id}', '${t.status}')">
            ${t.status === 'upcoming' ? 'Open RSVP' : t.status === 'open' ? 'Close RSVP' : 'Reopen'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleTastingStatus(id, current) {
  const next = current === 'upcoming' ? 'open' : current === 'open' ? 'closed' : 'open';
  await db.from('tastings').update({ status: next }).eq('id', id);
  loadAdminTastings();
}

function openAddTasting() {
  document.getElementById('modal-content').innerHTML = tastingForm(null);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function openEditTasting(id) {
  const { data } = await db.from('tastings').select('*').eq('id', id).single();
  document.getElementById('modal-content').innerHTML = tastingForm(data);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function toLocalDatetimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tastingForm(t) {
  return `
    <div class="modal-title">${t ? 'Edit Tasting' : 'New Tasting'}</div>
    <input type="hidden" id="ft-id" value="${t?.id || ''}" />
    <div class="form-group"><label>Number</label><input id="ft-number" type="number" value="${t?.number || ''}" /></div>
    <div class="form-group"><label>Title</label><input id="ft-title" value="${t?.title || ''}" placeholder="e.g. First Tasting — Stellenbosch" /></div>
    <div class="form-group"><label>Date & Time</label><input id="ft-date" type="datetime-local" value="${toLocalDatetimeValue(t?.tasting_date)}" /></div>
    <div class="form-group"><label>Location (revealed after RSVP)</label><input id="ft-location" value="${t?.location || ''}" /></div>
    <div class="form-group"><label>Capacity</label><input id="ft-capacity" type="number" value="${t?.capacity || 20}" /></div>
    <div class="form-group"><label>RSVP Method</label>
      <select id="ft-method">
        <option value="fcfs" ${t?.rsvp_method === 'fcfs' ? 'selected' : ''}>First Come, First Served</option>
        <option value="ballot" ${t?.rsvp_method === 'ballot' ? 'selected' : ''}>Ballot (draw)</option>
      </select>
    </div>
    <div class="form-group"><label>RSVP Opens</label><input id="ft-opens" type="datetime-local" value="${toLocalDatetimeValue(t?.rsvp_opens_at)}" /></div>
    <div class="form-group"><label>RSVP Closes</label><input id="ft-closes" type="datetime-local" value="${toLocalDatetimeValue(t?.rsvp_closes_at)}" /></div>
    <div class="form-group"><label>Message to Members (optional)</label><textarea id="ft-message">${t?.message || ''}</textarea></div>
    <div style="border-top:1px solid var(--border);margin:1rem 0;padding-top:1rem">
      <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:1rem">Financials</div>
      <div class="form-group"><label>Tasting Fee (R) per member</label><input id="ft-fee" type="number" step="0.01" value="${t?.tasting_fee || ''}" placeholder="0.00" /></div>
      <div class="form-group"><label>Levy (R) — optional top-up per member</label><input id="ft-levy" type="number" step="0.01" value="${t?.levy || ''}" placeholder="0.00" /></div>
    </div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveTasting()">Save</button>
    </div>
  `;
}

async function saveTasting() {
  const id = document.getElementById('ft-id').value;
  const payload = {
    number: parseInt(document.getElementById('ft-number').value),
    title: document.getElementById('ft-title').value,
    tasting_date: document.getElementById('ft-date').value || null,
    location: document.getElementById('ft-location').value,
    capacity: parseInt(document.getElementById('ft-capacity').value) || 20,
    rsvp_method: document.getElementById('ft-method').value,
    rsvp_opens_at: document.getElementById('ft-opens').value || null,
    rsvp_closes_at: document.getElementById('ft-closes').value || null,
    message: document.getElementById('ft-message').value || null,
    tasting_fee: parseFloat(document.getElementById('ft-fee').value) || 0,
    levy: parseFloat(document.getElementById('ft-levy').value) || 0,
  };

  if (id) {
    await db.from('tastings').update(payload).eq('id', id);
  } else {
    await db.from('tastings').insert(payload);
  }

  closeModal();
  loadAdminTastings();
}

// ---- MESSAGES ----

async function loadAdminMessages() {
  const container = document.getElementById('messages-admin-container');
  const { data } = await db.from('messages').select('*').order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">No messages yet.</p>';
    return;
  }

  container.innerHTML = data.map(m => `
    <div style="background:var(--surface);border:1px solid ${m.pinned ? 'var(--gold)' : 'var(--border)'};padding:1.25rem;margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--font-serif);margin-bottom:0.3rem">${m.title}</div>
          <div style="font-size:0.78rem;color:var(--muted);max-width:500px;white-space:pre-line">${m.body.substring(0, 120)}${m.body.length > 120 ? '...' : ''}</div>
          <div style="font-size:0.6rem;color:var(--muted);margin-top:0.5rem">${new Date(m.created_at).toLocaleDateString('en-ZA')} · ${m.language}</div>
        </div>
        <div style="display:flex;gap:0.5rem">
          ${m.pinned ? '<span class="badge-small gold">Pinned</span>' : ''}
          <button class="btn-admin" onclick="togglePin('${m.id}', ${m.pinned})">${m.pinned ? 'Unpin' : 'Pin'}</button>
          <button class="btn-admin" onclick="openEditMessage('${m.id}', \`${m.title.replace(/`/g,'\\`')}\`, \`${m.body.replace(/`/g,'\\`')}\`, ${m.pinned}, '${m.language}')">Edit</button>
          <button class="btn-admin danger" onclick="deleteMessage('${m.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddMessage() {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Post Message</div>
    <div class="form-group"><label>Title</label><input id="msg-title" placeholder="e.g. Nominations are open" /></div>
    <div class="form-group"><label>Body</label><textarea id="msg-body" placeholder="Write your message here..."></textarea></div>
    <div class="form-group"><label>Language</label>
      <select id="msg-lang">
        <option value="both">Both (all members)</option>
        <option value="Eng">English only</option>
        <option value="Afr">Afrikaans only</option>
      </select>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem">
      <input type="checkbox" id="msg-pinned" style="accent-color:var(--gold)" />
      <label for="msg-pinned" style="font-size:0.7rem;color:var(--muted);text-transform:none;letter-spacing:0;cursor:pointer">Pin this message (shows first, highlighted)</label>
    </div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="postMessage()">Post</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function postMessage() {
  const payload = {
    title: document.getElementById('msg-title').value,
    body: document.getElementById('msg-body').value,
    language: document.getElementById('msg-lang').value,
    pinned: document.getElementById('msg-pinned').checked,
  };
  await db.from('messages').insert(payload);
  closeModal();
  loadAdminMessages();
}

async function togglePin(id, current) {
  await db.from('messages').update({ pinned: !current }).eq('id', id);
  loadAdminMessages();
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  await db.from('messages').delete().eq('id', id);
  loadAdminMessages();
}

// ---- RSVPs ----

async function loadTastingFilter() {
  const select = document.getElementById('tasting-filter');
  const { data } = await db.from('tastings').select('id, title, number, tasting_date').order('tasting_date');
  if (!data) return;

  select.innerHTML = '<option value="">Select tasting...</option>' +
    data.map(t => `<option value="${t.id}" data-method="${t.rsvp_method}">${t.title || 'Tasting ' + t.number}</option>`).join('');
}

async function loadRsvps() {
  const tastingId = document.getElementById('tasting-filter').value;
  const container = document.getElementById('rsvps-admin-container');
  const ballotBtn = document.getElementById('btn-run-ballot');

  if (!tastingId) { container.innerHTML = ''; ballotBtn.style.display = 'none'; return; }

  // Get tasting info
  const { data: tasting } = await db.from('tastings').select('*').eq('id', tastingId).single();

  ballotBtn.style.display = tasting?.rsvp_method === 'ballot' ? 'inline-block' : 'none';
  ballotBtn.onclick = () => runBallot(tastingId, tasting.capacity);

  // Get RSVPs with member info
  const { data: rsvps } = await db
    .from('rsvps')
    .select('*, members(first_name, surname, member_code, member_type, room)')
    .eq('tasting_id', tastingId)
    .order('submitted_at');

  if (!rsvps || rsvps.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">No RSVPs yet.</p>';
    return;
  }

  const confirmed = rsvps.filter(r => r.status === 'confirmed');
  const pending = rsvps.filter(r => r.status === 'pending');
  const waitlist = rsvps.filter(r => r.status === 'waitlist');

  container.innerHTML = `
    <div style="font-size:0.7rem;color:var(--muted);margin-bottom:1rem">
      ${confirmed.length} confirmed · ${pending.length} pending · ${waitlist.length} waitlist · Capacity: ${tasting?.capacity || 20}
    </div>
    <table class="admin-table">
      <thead>
        <tr><th>#</th><th>Name</th><th>Code</th><th>Room</th><th>Status</th><th>Payment</th><th>Submitted</th><th></th></tr>
      </thead>
      <tbody>
        ${rsvps.map((r, i) => `
          <tr>
            <td style="color:var(--muted)">${i + 1}</td>
            <td>${r.members?.first_name} ${r.members?.surname || ''}</td>
            <td style="font-size:0.65rem;color:var(--gold)">${r.members?.member_code}</td>
            <td style="color:var(--muted)">${r.members?.room || '—'}</td>
            <td><span class="badge-small ${r.status === 'confirmed' ? 'green' : r.status === 'waitlist' ? '' : 'gold'}">${r.status}</span></td>
            <td>${r.payment_confirmed ? '<span class="badge-small green">Confirmed</span>' : '<span class="badge-small">Pending</span>'}</td>
            <td style="font-size:0.65rem;color:var(--muted)">${new Date(r.submitted_at).toLocaleString('en-ZA', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
            <td>
              <select style="background:var(--surface);color:var(--white);border:1px solid var(--border);font-size:0.65rem;padding:0.25rem" onchange="updateRsvpStatus('${r.id}', this.value)">
                <option value="confirmed" ${r.status==='confirmed'?'selected':''}>Confirmed</option>
                <option value="pending" ${r.status==='pending'?'selected':''}>Pending</option>
                <option value="waitlist" ${r.status==='waitlist'?'selected':''}>Waitlist</option>
                <option value="declined" ${r.status==='declined'?'selected':''}>Declined</option>
              </select>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function updateRsvpStatus(id, status) {
  await db.from('rsvps').update({ status }).eq('id', id);
}

async function runBallot(tastingId, capacity) {
  if (!confirm(`Run ballot? This will randomly select ${capacity} confirmed members from all pending entries.`)) return;

  const { data: pending } = await db
    .from('rsvps')
    .select('id')
    .eq('tasting_id', tastingId)
    .eq('status', 'pending');

  if (!pending || pending.length === 0) { showToast('No pending entries'); return; }

  // Shuffle
  const shuffled = [...pending].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, capacity).map(r => r.id);
  const waitlist = shuffled.slice(capacity).map(r => r.id);

  // Update selected to confirmed
  for (const id of selected) {
    await db.from('rsvps').update({ status: 'confirmed' }).eq('id', id);
  }
  // Update rest to waitlist
  for (const id of waitlist) {
    await db.from('rsvps').update({ status: 'waitlist' }).eq('id', id);
  }

  showToast(`Ballot complete: ${selected.length} confirmed, ${waitlist.length} on waitlist`);
  loadRsvps();
}

// ---- MODAL ----

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ---- TOAST ----

function showToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--gold);color:var(--gold);padding:0.6rem 1.5rem;font-size:0.7rem;letter-spacing:0.1em;z-index:999';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ---- INIT ----

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('hwkv_admin')) {
    document.getElementById('admin-login').classList.remove('active');
    document.getElementById('admin-portal').classList.add('active');
    loadMembers();
  }

  document.getElementById('admin-pass-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
});

// =============================================
// FINANCE
// =============================================

async function initFinanceTab() {
  const select = document.getElementById('finance-tasting-filter');
  const { data } = await db.from('tastings').select('id, title, number, tasting_date, tasting_fee, levy').order('tasting_date', { ascending: false });
  if (!data) return;
  select.innerHTML = '<option value="">Select tasting...</option>' +
    data.map(t => `<option value="${t.id}">${t.title || 'Tasting ' + t.number} ${t.tasting_date ? '· ' + new Date(t.tasting_date).toLocaleDateString('en-ZA') : ''}</option>`).join('');
}

async function loadFinance() {
  const tastingId = document.getElementById('finance-tasting-filter').value;
  const calcBtn = document.getElementById('btn-calculate');
  if (!tastingId) {
    document.getElementById('finance-summary').innerHTML = '';
    document.getElementById('finance-drivers').innerHTML = '';
    document.getElementById('finance-members').innerHTML = '';
    calcBtn.style.display = 'none';
    return;
  }

  calcBtn.style.display = 'inline-block';
  calcBtn.onclick = () => calculateAmounts(tastingId);

  // Load tasting
  const { data: tasting } = await db.from('tastings').select('*').eq('id', tastingId).single();

  // Load confirmed RSVPs with member info
  const { data: rsvps } = await db
    .from('rsvps')
    .select('*, members(id, first_name, surname, member_code, has_car)')
    .eq('tasting_id', tastingId)
    .eq('status', 'confirmed');

  // Load drivers for this tasting
  const { data: drivers } = await db
    .from('tasting_drivers')
    .select('*, members(id, first_name, surname, member_code)')
    .eq('tasting_id', tastingId);

  const confirmedCount = rsvps?.length || 0;
  const payingCount = rsvps?.filter(r => !r.sponsored).length || 0;
  const totalDriverReimbursement = drivers?.reduce((sum, d) => sum + (d.reimbursement || 0), 0) || 0;
  const transportPerMember = payingCount > 0 ? totalDriverReimbursement / payingCount : 0;
  const totalPerMember = (tasting.tasting_fee || 0) + transportPerMember + (tasting.levy || 0);
  const totalExpected = totalPerMember * payingCount;
  const totalPaid = rsvps?.reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0;
  const totalOutstanding = totalExpected - totalPaid;

  // Summary card
  document.getElementById('finance-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1rem">
      ${summaryTile('Tasting Fee', `R ${(tasting.tasting_fee || 0).toFixed(2)}`)}
      ${summaryTile('Transport Pool', `R ${totalDriverReimbursement.toFixed(2)}`)}
      ${summaryTile('Transport / Member', `R ${transportPerMember.toFixed(2)}`)}
      ${summaryTile('Levy', `R ${(tasting.levy || 0).toFixed(2)}`)}
      ${summaryTile('Total / Member', `R ${totalPerMember.toFixed(2)}`, 'gold')}
      ${summaryTile('Attending', `${confirmedCount} (${payingCount} paying)`)}
      ${summaryTile('Expected', `R ${totalExpected.toFixed(2)}`)}
      ${summaryTile('Collected', `R ${totalPaid.toFixed(2)}`)}
      ${summaryTile('Outstanding', `R ${totalOutstanding.toFixed(2)}`, totalOutstanding > 0 ? 'red' : 'green')}
    </div>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.5rem">
      <button class="btn-admin" onclick="openEditFees('${tastingId}', ${tasting.tasting_fee || 0}, ${tasting.levy || 0})">Edit Fees</button>
    </div>
  `;

  // Drivers section
  document.getElementById('finance-drivers').innerHTML = `
    <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem">Drivers</div>
    ${drivers && drivers.length > 0 ? `
      <table class="admin-table" style="margin-bottom:0.75rem">
        <thead><tr><th>Driver</th><th>Reimbursement</th><th>Paid</th><th></th></tr></thead>
        <tbody>
          ${drivers.map(d => `
            <tr>
              <td>${d.members?.first_name} ${d.members?.surname || ''} <span style="color:var(--muted);font-size:0.65rem">${d.members?.member_code}</span></td>
              <td>R ${(d.reimbursement || 0).toFixed(2)}</td>
              <td>${d.reimbursement_paid
                ? '<span class="badge-small green">Paid</span>'
                : `<button class="btn-admin" onclick="markDriverPaid('${d.id}')">Mark Paid</button>`}
              </td>
              <td><button class="btn-admin danger" onclick="removeDriver('${d.id}')">Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.75rem">No drivers assigned.</p>'}
    <button class="btn-admin" onclick="openAddDriver('${tastingId}')">+ Add Driver</button>
  `;

  // Members finance table
  document.getElementById('finance-members').innerHTML = `
    <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem;margin-top:1rem">Member Payments</div>
    <table class="admin-table">
      <thead><tr><th>Member</th><th>Sponsored</th><th>Owed</th><th>Paid</th><th>Outstanding</th><th>Actions</th></tr></thead>
      <tbody>
        ${(rsvps || []).map(r => {
          const owed = r.sponsored ? 0 : totalPerMember;
          const paid = r.amount_paid || 0;
          const outstanding = owed - paid;
          return `
            <tr>
              <td>${r.members?.first_name} ${r.members?.surname || ''}<br><span style="font-size:0.62rem;color:var(--muted)">${r.members?.member_code}</span></td>
              <td>
                <input type="checkbox" ${r.sponsored ? 'checked' : ''} style="accent-color:var(--gold)"
                  onchange="toggleSponsored('${r.id}', this.checked, '${tastingId}')" />
              </td>
              <td>R ${owed.toFixed(2)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:0.4rem">
                  <span>R</span>
                  <input type="number" step="0.01" value="${paid.toFixed(2)}" style="width:70px;background:var(--surface);border:1px solid var(--border);color:var(--white);padding:0.2rem 0.4rem;font-size:0.75rem"
                    onchange="updatePaid('${r.id}', this.value, '${tastingId}')" />
                </div>
              </td>
              <td style="color:${outstanding > 0 ? '#c0605a' : '#6bbf80'}">R ${outstanding.toFixed(2)}</td>
              <td>
                ${outstanding <= 0
                  ? '<span class="badge-small green">Settled</span>'
                  : `<button class="btn-admin" onclick="markFullyPaid('${r.id}', ${owed}, '${tastingId}')">Mark Paid</button>`}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function summaryTile(label, value, color = '') {
  const colors = { gold: 'var(--gold)', red: '#c0605a', green: '#6bbf80', '': 'var(--white)' };
  return `
    <div style="background:var(--surface);border:1px solid var(--border);padding:1rem">
      <div style="font-size:0.55rem;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:0.4rem">${label}</div>
      <div style="font-size:1.1rem;color:${colors[color] || colors['']}">${value}</div>
    </div>`;
}

async function calculateAmounts(tastingId) {
  // Re-runs loadFinance which recalculates everything live from DB
  await loadFinance();
  showToast('Amounts recalculated');
}

async function toggleSponsored(rsvpId, sponsored, tastingId) {
  await db.from('rsvps').update({ sponsored }).eq('id', rsvpId);
  loadFinance();
}

async function updatePaid(rsvpId, amount, tastingId) {
  await db.from('rsvps').update({ amount_paid: parseFloat(amount) || 0 }).eq('id', rsvpId);
  loadFinance();
}

async function markFullyPaid(rsvpId, amount, tastingId) {
  await db.from('rsvps').update({ amount_paid: amount, payment_confirmed: true }).eq('id', rsvpId);
  loadFinance();
}

async function markDriverPaid(driverId) {
  await db.from('tasting_drivers').update({ reimbursement_paid: true }).eq('id', driverId);
  const tastingId = document.getElementById('finance-tasting-filter').value;
  loadFinance();
}

async function removeDriver(driverId) {
  await db.from('tasting_drivers').delete().eq('id', driverId);
  const tastingId = document.getElementById('finance-tasting-filter').value;
  loadFinance();
}

function openAddDriver(tastingId) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Add Driver</div>
    <div class="form-group"><label>Member Code</label><input id="drv-code" placeholder="PRIMUM-XXX-0" /></div>
    <div class="form-group"><label>Reimbursement (R)</label><input id="drv-amount" type="number" step="0.01" placeholder="0.00" /></div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveDriver('${tastingId}')">Add</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveDriver(tastingId) {
  const code = document.getElementById('drv-code').value.trim().toUpperCase();
  const amount = parseFloat(document.getElementById('drv-amount').value) || 0;

  const { data: member } = await db.from('members').select('id').eq('member_code', code).single();
  if (!member) { showToast('Member code not found'); return; }

  await db.from('tasting_drivers').upsert({
    tasting_id: tastingId,
    member_id: member.id,
    reimbursement: amount
  }, { onConflict: 'tasting_id,member_id' });

  closeModal();
  loadFinance();
}

function openEditFees(tastingId, currentFee, currentLevy) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Edit Tasting Fees</div>
    <div class="form-group"><label>Tasting Fee (R) per member</label><input id="ef-fee" type="number" step="0.01" value="${currentFee}" /></div>
    <div class="form-group"><label>Levy (R) per member</label><input id="ef-levy" type="number" step="0.01" value="${currentLevy}" /></div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveEditFees('${tastingId}')">Save</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveEditFees(tastingId) {
  await db.from('tastings').update({
    tasting_fee: parseFloat(document.getElementById('ef-fee').value) || 0,
    levy: parseFloat(document.getElementById('ef-levy').value) || 0,
  }).eq('id', tastingId);
  closeModal();
  loadFinance();
}

// =============================================
// EMAIL — via Resend.com
// =============================================

const BASE_URL = 'https://HWKV.github.io/wine';



document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('hwkv_resend_key');

  document.getElementById('email-recipients')?.addEventListener('change', function() {
    document.getElementById('single-code-group').style.display =
      this.value === 'single' ? 'block' : 'none';
  });
});

async function getEmailRecipients() {
  const type = document.getElementById('email-recipients').value;
  let query = db.from('members').select('first_name, surname, member_code, email, language, member_type').eq('active', true);

  if (type === 'founding') query = query.eq('member_type', 'Founding Member');
  if (type === 'single') {
    const code = document.getElementById('email-single-code').value.trim().toUpperCase();
    query = query.eq('member_code', code);
  }

  const { data } = await query;
  return (data || []).filter(m => m.email);
}




// =============================================
// VEHICLES
// =============================================

async function loadVehicles() {
  const container = document.getElementById('vehicles-container');
  const { data } = await db.from('cars')
    .select('*, members(first_name, surname, member_code, room)')
    .order('created_at');

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">No vehicles registered yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>Member</th><th>Code</th><th>Room</th><th>Vehicle</th><th>Reg</th><th>Seats</th><th>Available</th></tr>
      </thead>
      <tbody>
        ${data.map(c => `
          <tr>
            <td>${c.members?.first_name} ${c.members?.surname || ''}</td>
            <td style="font-size:0.65rem;color:var(--gold)">${c.members?.member_code}</td>
            <td style="color:var(--muted)">${c.members?.room || '—'}</td>
            <td>${c.make_model}</td>
            <td style="color:var(--muted)">${c.registration || '—'}</td>
            <td style="text-align:center">${c.seats}</td>
            <td>${c.available ? '<span class="badge-small green">Yes</span>' : '<span class="badge-small">No</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// =============================================
// EMAIL — mailto approach
// =============================================

async function generateMailto() {
  const members = await getEmailRecipients();
  if (members.length === 0) { showToast('No recipients with emails found'); return; }

  const subject = encodeURIComponent(document.getElementById('email-subject').value);
  const includeLink = document.getElementById('email-include-link').checked;
  const BASE_URL = 'https://HWKV.github.io/wine';

  let body = document.getElementById('email-body').value;

  if (includeLink && members.length === 1) {
    body += `\n\nYour member portal: ${BASE_URL}/?key=${members[0].member_code}`;
  } else if (includeLink) {
    body += `\n\nAccess your member portal: ${BASE_URL}`;
  }

  const bcc = members.map(m => m.email).join(',');
  const mailto = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${subject}&body=${encodeURIComponent(body)}`;

  // Try outlook first, fallback to mailto
  const outlookUrl = `ms-outlook://compose?bcc=${encodeURIComponent(bcc)}&subject=${subject}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto; // standard mailto works with Outlook too

  // Show the email list too
  document.getElementById('email-output').innerHTML = `
    <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem">${members.length} Recipients</div>
    <div style="font-size:0.72rem;color:var(--muted);line-height:2">${members.map(m => `${m.first_name} ${m.surname || ''} &lt;${m.email}&gt;`).join('<br>')}</div>
  `;
}

async function copyAllEmails() {
  const members = await getEmailRecipients();
  if (members.length === 0) { showToast('No recipients with emails found'); return; }
  const emails = members.map(m => m.email).join('; ');
  navigator.clipboard.writeText(emails);
  showToast(`Copied ${members.length} email addresses`);

  document.getElementById('email-output').innerHTML = `
    <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem">Copied to clipboard</div>
    <div style="background:var(--surface);border:1px solid var(--border);padding:0.75rem;font-size:0.72rem;color:var(--muted);word-break:break-all">${emails}</div>
  `;
}

function openEditMessage(id, title, body, pinned, language) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Edit Message</div>
    <input type="hidden" id="edit-msg-id" value="${id}" />
    <div class="form-group"><label>Title</label><input id="edit-msg-title" value="${title.replace(/"/g, '&quot;')}" /></div>
    <div class="form-group"><label>Body</label><textarea id="edit-msg-body" style="min-height:150px">${body}</textarea></div>
    <div class="form-group"><label>Language</label>
      <select id="edit-msg-lang">
        <option value="both" ${language==='both'?'selected':''}>Both</option>
        <option value="Eng" ${language==='Eng'?'selected':''}>English</option>
        <option value="Afr" ${language==='Afr'?'selected':''}>Afrikaans</option>
      </select>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem">
      <input type="checkbox" id="edit-msg-pinned" ${pinned?'checked':''} style="accent-color:var(--gold)" />
      <label style="font-size:0.7rem;color:var(--muted);cursor:pointer">Pinned</label>
    </div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveEditMessage()">Save</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveEditMessage() {
  const id = document.getElementById('edit-msg-id').value;
  await db.from('messages').update({
    title: document.getElementById('edit-msg-title').value,
    body: document.getElementById('edit-msg-body').value,
    language: document.getElementById('edit-msg-lang').value,
    pinned: document.getElementById('edit-msg-pinned').checked,
  }).eq('id', id);
  closeModal();
  loadAdminMessages();
}

// =============================================
// DELETE TASTING
// =============================================

async function deleteTasting(id) {
  if (!confirm('Delete this tasting? This will also delete all RSVPs for it.')) return;
  await db.from('rsvps').delete().eq('tasting_id', id);
  await db.from('tasting_drivers').delete().eq('tasting_id', id);
  await db.from('tastings').delete().eq('id', id);
  loadAdminTastings();
  showToast('Tasting deleted');
}

// =============================================
// NOMINATIONS ADMIN
// =============================================

async function loadAdminNominations() {
  const container = document.getElementById('nominations-admin-container');
  container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">Loading...</p>';

  // Show current deadline
  const { data: deadlineMsg } = await db.from('messages')
    .select('body').eq('title', 'NOM_DEADLINE').single().catch(() => ({ data: null }));

  const deadline = deadlineMsg ? new Date(deadlineMsg.body) : null;

  let deadlineHtml = '';
  if (deadline) {
    deadlineHtml = `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:1.5rem">
      Current deadline: <strong style="color:var(--white)">${deadline.toLocaleString('en-ZA')}</strong>
    </div>`;
  }

  const { data: noms } = await db.from('nominations')
    .select('*, members(first_name, surname, member_code)')
    .order('created_at', { ascending: false });

  if (!noms || noms.length === 0) {
    container.innerHTML = deadlineHtml + '<p style="color:var(--muted);font-size:0.8rem">No nominations yet.</p>';
    return;
  }

  const pending = noms.filter(n => n.status === 'pending');
  const decided = noms.filter(n => n.status !== 'pending');

  container.innerHTML = deadlineHtml + `
    ${pending.length > 0 ? `
      <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:0.75rem">Pending (${pending.length})</div>
      ${pending.map(n => nominationCard(n)).join('')}
    ` : ''}
    ${decided.length > 0 ? `
      <div style="font-size:0.6rem;letter-spacing:0.2em;color:var(--muted);text-transform:uppercase;margin:1.5rem 0 0.75rem">Decided</div>
      ${decided.map(n => nominationCard(n)).join('')}
    ` : ''}
  `;
}

function nominationCard(n) {
  const nominator = n.members ? `${n.members.first_name} ${n.members.surname || ''} (${n.members.member_code})` : 'Unknown';
  return `
    <div style="background:var(--surface);border:1px solid ${n.status === 'approved' ? '#3a6b4a' : n.status === 'declined' ? 'var(--error)' : 'var(--border)'};padding:1.25rem 1.5rem;margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div style="flex:1">
          <div style="font-family:var(--font-serif);font-size:1rem;margin-bottom:0.25rem">${n.first_name} ${n.surname}</div>
          ${n.room ? `<div style="font-size:0.7rem;color:var(--muted)">Room: ${n.room}</div>` : ''}
          <div style="font-size:0.7rem;color:var(--muted);margin-top:0.2rem">Nominated by: ${nominator}</div>
          <div style="font-size:0.7rem;color:var(--muted);margin-top:0.2rem">${new Date(n.created_at).toLocaleDateString('en-ZA')}</div>
          ${n.member_code_assigned ? `<div style="font-size:0.72rem;color:var(--gold);margin-top:0.25rem">Code: ${n.member_code_assigned}</div>` : ''}
          <div style="font-size:0.78rem;color:#a09890;margin-top:0.75rem;line-height:1.6;white-space:pre-line;padding:0.75rem;background:var(--dark);border-left:2px solid var(--gold)">${n.motivation}</div>
          ${n.admin_notes ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:0.5rem;font-style:italic">Notes: ${n.admin_notes}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;min-width:120px">
          ${n.status === 'pending' ? `
            <button class="btn-admin primary" onclick="openApproveNomination('${n.id}')">Approve</button>
            <button class="btn-admin danger" onclick="declineNomination('${n.id}')">Decline</button>
          ` : `<span class="badge-small ${n.status === 'approved' ? 'green' : 'red'}">${n.status}</span>`}
        </div>
      </div>
    </div>
  `;
}

function openApproveNomination(id) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Approve Nomination</div>
    <input type="hidden" id="approve-nom-id" value="${id}" />
    <div class="form-group"><label>Assign Member Code</label><input id="approve-nom-code" placeholder="e.g. SECUND-XXX-1" /></div>
    <div class="form-group"><label>Admin Notes (optional)</label><textarea id="approve-nom-notes"></textarea></div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="approveNomination()">Approve & Assign Code</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function approveNomination() {
  const id = document.getElementById('approve-nom-id').value;
  const code = document.getElementById('approve-nom-code').value.trim().toUpperCase();
  const notes = document.getElementById('approve-nom-notes').value;

  if (!code) { showToast('Please enter a member code'); return; }

  // Get nomination details
  const { data: nom } = await db.from('nominations').select('*, members(id)').eq('id', id).single();

  await db.from('nominations').update({
    status: 'approved',
    member_code_assigned: code, 
    member_type_assigned: document.getElementById('approve-type').value,
    admin_notes: notes || null
  }).eq('id', id);

  // Create member record
  await db.from('members').insert({
    first_name: nom.first_name,
    surname: nom.surname,
    room: nom.room,
    member_code: code,
    member_type: 'General',
    nominated_by: nom.members?.member_code || null,
    membership_accepted: false,
    membership_paid: false,
    language: 'Eng',
    active: true
  });

  closeModal();
  loadAdminNominations();
  showToast(`Approved — member ${code} created`);
}

async function declineNomination(id) {
  const notes = prompt('Reason for declining (optional):');
  await db.from('nominations').update({
    status: 'declined',
    admin_notes: notes || null
  }).eq('id', id);
  loadAdminNominations();
  showToast('Nomination declined');
}

function openSetDeadline() {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Set Nomination Deadline</div>
    <div class="form-group"><label>Deadline</label><input id="nom-deadline-input" type="datetime-local" /></div>
    <div style="font-size:0.65rem;color:var(--muted);margin-bottom:1rem">This will show as a countdown on the member portal.</div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin danger" onclick="clearDeadline()">Clear Deadline</button>
      <button class="btn-admin primary" onclick="saveDeadline()">Save</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveDeadline() {
  const val = document.getElementById('nom-deadline-input').value;
  if (!val) return;
  const iso = new Date(val).toISOString();

  // Store as special message
  await db.from('messages').delete().eq('title', 'NOM_DEADLINE');
  await db.from('messages').insert({ title: 'NOM_DEADLINE', body: iso, language: 'both', pinned: false });

  closeModal();
  showToast('Deadline set');
  loadAdminNominations();
}

async function clearDeadline() {
  await db.from('messages').delete().eq('title', 'NOM_DEADLINE');
  closeModal();
  showToast('Deadline cleared');
  loadAdminNominations();
}

async function deleteTasting(id) {
  if (!confirm('Delete this tasting? This will also delete all RSVPs for it.')) return;
  await db.from('tastings').delete().eq('id', id);
  loadAdminTastings();
}

// =============================================
// NOMINATIONS ADMIN
// =============================================

async function loadAdminNominations() {
  const container = document.getElementById('nominations-admin-container');

  const { data: settings } = await db.from('settings').select('key, value');
  const deadline = settings?.find(s => s.key === 'nomination_deadline')?.value;
  const isOpen = settings?.find(s => s.key === 'nominations_open')?.value !== 'false';

  const { data: noms } = await db
    .from('nominations')
    .select('*, members(first_name, surname, member_code)')
    .order('created_at', { ascending: false });

  const pending = noms?.filter(n => n.status === 'pending').length || 0;
  const approved = noms?.filter(n => n.status === 'approved').length || 0;
  const denied = noms?.filter(n => n.status === 'denied').length || 0;

  container.innerHTML = `
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      ${summaryTile('Status', isOpen ? 'Open' : 'Closed', isOpen ? 'green' : '')}
      ${summaryTile('Deadline', deadline ? new Date(deadline).toLocaleString('en-ZA', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : 'None set')}
      ${summaryTile('Pending', pending, pending > 0 ? 'gold' : '')}
      ${summaryTile('Approved', approved, approved > 0 ? 'green' : '')}
      ${summaryTile('Denied', denied)}
    </div>

    ${!noms || noms.length === 0
      ? '<p style="color:var(--muted);font-size:0.8rem">No nominations yet.</p>'
      : `<table class="admin-table">
          <thead><tr><th>Nominee</th><th>Room</th><th>Nominated By</th><th>Motivation</th><th>Status</th><th>Code</th><th>Actions</th></tr></thead>
          <tbody>
            ${noms.map(n => `
              <tr>
                <td><strong>${n.first_name} ${n.surname}</strong></td>
                <td style="color:var(--muted)">${n.room || '—'}</td>
                <td style="font-size:0.65rem;color:var(--gold)">${n.members?.first_name} ${n.members?.surname || ''}<br>${n.members?.member_code}</td>
                <td style="max-width:200px;font-size:0.72rem;color:var(--muted)">${n.motivation.substring(0, 80)}${n.motivation.length > 80 ? '...' : ''}</td>
                <td><span class="badge-small ${n.status === 'approved' ? 'green' : n.status === 'denied' ? 'red' : 'gold'}">${n.status}</span></td>
                <td style="font-size:0.65rem;color:var(--gold)">${n.member_code_assigned || '—'}</td>
                <td>
                  <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
                    <button class="btn-admin" onclick="viewMotivation('${n.id}', \`${n.first_name} ${n.surname}\`, \`${n.motivation.replace(/`/g, "'")}\`)">View</button>
                    ${n.status === 'pending' ? `
                      <button class="btn-admin primary" onclick="approveNomination('${n.id}')">Approve</button>
                      <button class="btn-admin danger" onclick="denyNomination('${n.id}')">Deny</button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
    }
  `;
}

function viewMotivation(id, name, motivation) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">${name}</div>
    <div style="font-size:0.85rem;color:#a09890;line-height:1.8;white-space:pre-line">${motivation}</div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Close</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function approveNomination(id) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Approve Nomination</div>
    <div class="form-group"><label>Assign Member Code</label><input id="approve-code" placeholder="e.g. SECUND-XXX-1" /></div>
    <div class="form-group"><label>Membership Type</label>
      <select id="approve-type" style="background:var(--surface);color:var(--white);border:1px solid var(--border);padding:0.5rem;width:100%">
        <option value="General">General</option>
        <option value="Founding Member">Founding Member</option>
        <option value="Driver">Driver</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="form-group"><label>Admin Notes (optional)</label><textarea id="approve-notes"></textarea></div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="confirmApprove('${id}')">Confirm Approval</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function confirmApprove(id) {
  const code = document.getElementById('approve-code').value.trim().toUpperCase();
  const notes = document.getElementById('approve-notes').value;
  if (!code) { showToast('Please enter a member code'); return; }

  await db.from('nominations').update({
    status: 'approved',
    member_code_assigned: code,
    admin_notes: notes || null
  }).eq('id', id);

  closeModal();
  loadAdminNominations();
  showToast('Nomination approved');
}

function denyNomination(id) {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Deny Nomination</div>
    <div class="form-group"><label>Reason (optional, not shown to member)</label><textarea id="deny-notes"></textarea></div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin danger" onclick="confirmDeny('${id}')">Confirm Denial</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function confirmDeny(id) {
  await db.from('nominations').update({
    status: 'denied',
    admin_notes: document.getElementById('deny-notes').value || null
  }).eq('id', id);
  closeModal();
  loadAdminNominations();
  showToast('Nomination denied');
}

function openNominationSettings() {
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-title">Nomination Settings</div>
    <div class="form-group"><label>Deadline</label><input id="nom-deadline" type="datetime-local" /></div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:0.5rem">
      <input type="checkbox" id="nom-open" checked style="accent-color:var(--gold)" />
      <label style="font-size:0.7rem;color:var(--muted);cursor:pointer">Nominations open</label>
    </div>
    <div class="form-actions">
      <button class="btn-admin" onclick="closeModal()">Cancel</button>
      <button class="btn-admin primary" onclick="saveNominationSettings()">Save</button>
    </div>
  `;

  // Load current settings
  db.from('settings').select('key, value').then(({ data }) => {
    const deadline = data?.find(s => s.key === 'nomination_deadline')?.value;
    const isOpen = data?.find(s => s.key === 'nominations_open')?.value !== 'false';
    if (deadline) {
      const d = new Date(deadline);
      const pad = n => String(n).padStart(2, '0');
      document.getElementById('nom-deadline').value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    document.getElementById('nom-open').checked = isOpen;
  });

  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveNominationSettings() {
  const deadline = document.getElementById('nom-deadline').value;
  const isOpen = document.getElementById('nom-open').checked;

  await db.from('settings').upsert({ key: 'nomination_deadline', value: deadline || null });
  await db.from('settings').upsert({ key: 'nominations_open', value: isOpen ? 'true' : 'false' });

  closeModal();
  loadAdminNominations();
  showToast('Settings saved');
}
