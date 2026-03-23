// =============================================
// HWKV — Admin Dashboard
// =============================================

// Simple passphrase auth (client-side, good enough for private use)
// Set your passphrase here:
const ADMIN_PASSPHRASE = 'HWKV-EKLIKEWYN';

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
}

// ---- MEMBERS ----

async function loadMembers() {
  const container = document.getElementById('members-table-container');
  const { data } = await supabase.from('members').select('*').order('number');

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
  const { data } = await supabase.from('members').select('*').eq('id', id).single();
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
        <option value="Founding Member" ${m?.member_type === 'Founding Member' ? 'selected' : ''}>Founding Member</option>
        <option value="General" ${m?.member_type === 'General' ? 'selected' : ''}>General</option>
        <option value="Driver" ${m?.member_type === 'Driver' ? 'selected' : ''}>Driver</option>
      </select>
    </div>
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
    nominated_by: document.getElementById('fm-nominated').value || null,
    membership_accepted: document.getElementById('fm-accepted').checked,
    membership_paid: document.getElementById('fm-paid').checked,
    has_car: document.getElementById('fm-car').checked,
  };

  if (id) {
    await supabase.from('members').update(payload).eq('id', id);
  } else {
    await supabase.from('members').insert(payload);
  }

  closeModal();
  loadMembers();
}

// ---- TASTINGS ----

async function loadAdminTastings() {
  const container = document.getElementById('tastings-admin-container');
  const { data } = await supabase.from('tastings').select('*').order('tasting_date');

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
  await supabase.from('tastings').update({ status: next }).eq('id', id);
  loadAdminTastings();
}

function openAddTasting() {
  document.getElementById('modal-content').innerHTML = tastingForm(null);
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function openEditTasting(id) {
  const { data } = await supabase.from('tastings').select('*').eq('id', id).single();
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
  };

  if (id) {
    await supabase.from('tastings').update(payload).eq('id', id);
  } else {
    await supabase.from('tastings').insert(payload);
  }

  closeModal();
  loadAdminTastings();
}

// ---- MESSAGES ----

async function loadAdminMessages() {
  const container = document.getElementById('messages-admin-container');
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem">No messages yet.</p>';
    return;
  }

  container.innerHTML = data.map(m => `
    <div style="background:var(--surface);border:1px solid ${m.pinned ? 'var(--gold)' : 'var(--border)'};padding:1.25rem;margin-bottom:0.75rem">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--font-serif);margin-bottom:0.3rem">${m.title}</div>
          <div style="font-size:0.78rem;color:var(--muted);max-width:500px">${m.body.substring(0, 120)}${m.body.length > 120 ? '...' : ''}</div>
          <div style="font-size:0.6rem;color:var(--muted);margin-top:0.5rem">${new Date(m.created_at).toLocaleDateString('en-ZA')} · ${m.language}</div>
        </div>
        <div style="display:flex;gap:0.5rem">
          ${m.pinned ? '<span class="badge-small gold">Pinned</span>' : ''}
          <button class="btn-admin" onclick="togglePin('${m.id}', ${m.pinned})">${m.pinned ? 'Unpin' : 'Pin'}</button>
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
  await supabase.from('messages').insert(payload);
  closeModal();
  loadAdminMessages();
}

async function togglePin(id, current) {
  await supabase.from('messages').update({ pinned: !current }).eq('id', id);
  loadAdminMessages();
}

async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  await supabase.from('messages').delete().eq('id', id);
  loadAdminMessages();
}

// ---- RSVPs ----

async function loadTastingFilter() {
  const select = document.getElementById('tasting-filter');
  const { data } = await supabase.from('tastings').select('id, title, number, tasting_date').order('tasting_date');
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
  const { data: tasting } = await supabase.from('tastings').select('*').eq('id', tastingId).single();

  ballotBtn.style.display = tasting?.rsvp_method === 'ballot' ? 'inline-block' : 'none';
  ballotBtn.onclick = () => runBallot(tastingId, tasting.capacity);

  // Get RSVPs with member info
  const { data: rsvps } = await supabase
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
  await supabase.from('rsvps').update({ status }).eq('id', id);
}

async function runBallot(tastingId, capacity) {
  if (!confirm(`Run ballot? This will randomly select ${capacity} confirmed members from all pending entries.`)) return;

  const { data: pending } = await supabase
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
    await supabase.from('rsvps').update({ status: 'confirmed' }).eq('id', id);
  }
  // Update rest to waitlist
  for (const id of waitlist) {
    await supabase.from('rsvps').update({ status: 'waitlist' }).eq('id', id);
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
