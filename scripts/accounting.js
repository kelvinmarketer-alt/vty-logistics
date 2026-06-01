/* =========================================================
   VTY Logistics — Kế toán (Full CRUD)
   ========================================================= */
(function () {
  /* Fallback khi DB trống — để rỗng cho vận hành thật. Dữ liệu thật ở Supabase. */
  const INITIAL_ENTRIES = [];
  const INITIAL_ACCOUNTS = [];

  let entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
  let accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);

  function renderKPIs() {
    const el = document.querySelector('.kpis');
    if (!el) return;
    entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
    accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);
    const now = new Date(), mm = now.getMonth(), yy = now.getFullYear();
    const inMonth = e => { const d = window.parseVNDate && window.parseVNDate(e.date); return d && d.getMonth() === mm && d.getFullYear() === yy; };
    const monthE = entries.filter(inMonth);
    const thu = monthE.filter(e => e.type === 'in').reduce((s, e) => s + (e.amount || 0), 0);
    const chi = monthE.filter(e => e.type === 'out').reduce((s, e) => s + (e.amount || 0), 0);
    const loi = thu - chi;
    const bien = thu ? Math.round(loi / thu * 1000) / 10 : 0;
    const cash = accounts.filter(a => a.kind === 'cash' && a.active !== false).reduce((s, a) => s + (a.balance || 0), 0);
    const bank = accounts.filter(a => a.kind === 'bank' && a.active !== false).reduce((s, a) => s + (a.balance || 0), 0);
    const M = mm + 1;
    el.innerHTML = `
      <div class="kpi k-1"><div class="kpi-label">Tổng thu T${M}</div><div class="kpi-value">${window.fmtShort(thu)}</div><div class="kpi-trend up">${monthE.filter(e=>e.type==='in').length} phiếu thu</div><div class="kpi-icon">📈</div></div>
      <div class="kpi k-3"><div class="kpi-label">Tổng chi T${M}</div><div class="kpi-value">${window.fmtShort(chi)}</div><div class="kpi-trend">${monthE.filter(e=>e.type==='out').length} phiếu chi</div><div class="kpi-icon">📉</div></div>
      <div class="kpi k-2"><div class="kpi-label">Lợi nhuận gộp T${M}</div><div class="kpi-value">${window.fmtShort(loi)}</div><div class="kpi-trend ${loi>=0?'up':'down'}">Biên ${bien}%</div><div class="kpi-icon">💰</div></div>
      <div class="kpi k-4"><div class="kpi-label">Quỹ tiền mặt</div><div class="kpi-value">${window.fmtShort(cash)}</div><div class="kpi-trend">Tại văn phòng</div><div class="kpi-icon">💵</div></div>
      <div class="kpi k-5"><div class="kpi-label">TK ngân hàng</div><div class="kpi-value">${window.fmtShort(bank)}</div><div class="kpi-trend">${accounts.filter(a=>a.kind==='bank'&&a.active!==false).length} tài khoản</div><div class="kpi-icon">🏦</div></div>`;
  }

  function render() {
    renderKPIs();
    entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
    const q = document.getElementById('qSearch').value.trim().toLowerCase();
    const t = document.getElementById('fType').value;
    const a = document.getElementById('fAccount').value;
    const rows = entries.filter(e =>
      (!q || [e.no, e.party, e.desc].some(x => x.toLowerCase().includes(q))) &&
      (!t || e.type === t) &&
      (!a || e.account === a)
    );
    document.getElementById('cashTbody').innerHTML = rows.map(e => `
      <tr style="cursor:pointer" data-no="${e.no}">
        <td><b>${e.no}</b></td>
        <td style="font-size:12px;color:var(--muted)">${e.date}</td>
        <td><span class="status-pill ${e.type==='in'?'st-delivered':'st-cancelled'}">${e.type==='in'?'+ Thu':'- Chi'}</span></td>
        <td>${e.party}</td>
        <td style="font-size:12px">${e.desc}</td>
        <td><span class="staff-pill">${e.account}</span></td>
        <td class="num type-${e.type}"><b>${e.type==='in'?'+':'-'}${window.fmt(e.amount)}</b></td>
        <td style="font-size:12px;color:var(--muted)">${e.staff}</td>
      </tr>
    `).join('') || `<tr><td colspan="8" style="padding:40px;text-align:center;color:var(--muted)">Không có phiếu nào.</td></tr>`;

    document.querySelectorAll('#cashTbody tr[data-no]').forEach(tr => {
      tr.onclick = () => window.toast('Mở chi tiết ' + tr.dataset.no + ' (demo)', 'info');
    });
  }

  /* === Form phiếu thu / chi === */
  function buildForm(type, no) {
    const activeAccounts = accounts.filter(a => a.active);
    const accOpts = activeAccounts.map(a => `<option>${a.name}</option>`).join('');
    return `
      <div class="form-row">
        <div><label>Ngày *</label><input id="pDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div><label>Số phiếu</label><input id="pNo" value="${no}" readonly style="background:#FAFAFB"></div>
      </div>
      <div class="form-row">
        <div><label>${type==='in'?'Người nộp':'Người nhận'} *</label><input id="pParty" placeholder="${type==='in'?'KH / NV nộp tiền':'Đối tác / NV nhận'}"></div>
        <div><label>Tài khoản *</label><select id="pAccount">${accOpts}</select></div>
      </div>
      <div class="form-row">
        <div><label>Số tiền (₫) *</label><input id="pAmount" type="number" placeholder="0"></div>
        <div><label>Đơn liên quan</label><input id="pRef" placeholder="VTY-XXXXXX (tùy chọn)"></div>
      </div>
      <div class="form-row wide"><label>Diễn giải</label><textarea id="pDesc" rows="2" placeholder="${type==='in'?'COD đơn / TT công nợ / Nạp quỹ...':'Đổ xăng / Bảo dưỡng / Lương / Văn phòng...'}"></textarea></div>
    `;
  }
  window.formThu = () => buildForm('in', 'PT-' + nextPNo('PT'));
  window.formChi = () => buildForm('out', 'PC-' + nextPNo('PC'));
  function nextPNo(prefix) {
    const filtered = entries.filter(e => e.no.startsWith(prefix));
    const max = filtered.reduce((m, e) => {
      const n = parseInt(e.no.split('-')[1], 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 526000);
    return max + 1;
  }
  window.footThu = () => `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
    <button class="btn btn-primary" onclick="window.submitPhieu('in')">💾 Lưu phiếu thu</button>`;
  window.footChi = () => `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
    <button class="btn btn-navy" onclick="window.submitPhieu('out')">💾 Lưu phiếu chi</button>`;

  window.submitPhieu = function(type) {
    const amount = parseInt(window.formVal('#pAmount'), 10) || 0;
    const party = window.formVal('#pParty');
    if (!amount) { window.toast('Nhập số tiền', 'warn'); return; }
    if (!party)  { window.toast('Nhập đối tượng', 'warn'); return; }

    const dateInput = window.formVal('#pDate');
    const date = dateInput ? new Date(dateInput).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    const newEntry = {
      no: window.formVal('#pNo'),
      date, type, party,
      desc: window.formVal('#pDesc') || (type==='in'?'Thu tiền':'Chi tiền'),
      account: window.formVal('#pAccount'),
      amount,
      staff: window.CURRENT_USER.name,
    };
    window.STORE.add('cashEntries', newEntry);

    /* Cập nhật số dư account */
    const acc = accounts.find(a => a.name === newEntry.account);
    if (acc) {
      const newBalance = acc.balance + (type === 'in' ? amount : -amount);
      window.STORE.update('paymentAccounts', acc.id, { balance: newBalance });
      accounts = window.STORE.get('paymentAccounts');
    }
    window.closeModal();
    window.toast(`✓ Đã ${type==='in'?'thu':'chi'} ${window.fmt(amount)} ₫`, 'success');
  };

  /* ============ Cài đặt tài khoản thanh toán ============ */
  window.openAccountSettings = function() {
    accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);
    const kindIcon = { cash:'💵', bank:'🏦', ewallet:'📱' };
    const kindLabel = { cash:'Tiền mặt', bank:'Ngân hàng', ewallet:'Ví điện tử' };
    const total = accounts.filter(a => a.active).reduce((s, a) => s + a.balance, 0);
    const activeCount = accounts.filter(a => a.active).length;
    const rows = accounts.map(a => `
      <div class="acc-card-row" data-id="${a.id}" style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:8px;margin-bottom:8px;${a.active?'':'opacity:0.55'}">
        <div style="width:40px;height:40px;border-radius:8px;background:var(--bg);display:grid;place-items:center;font-size:20px">${kindIcon[a.kind]}</div>
        <div style="flex:1;line-height:1.3">
          <div style="font-weight:700">${a.name}</div>
          <div style="font-size:11.5px;color:var(--muted)">${a.detail} · Người giữ: ${a.keeper}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:var(--navy);font-variant-numeric:tabular-nums">${window.fmt(a.balance)} ₫</div>
          <div style="font-size:11px;color:var(--muted)">${kindLabel[a.kind]}</div>
        </div>
        <label class="toggle"><input type="checkbox" ${a.active?'checked':''} data-toggle="${a.id}"><span class="slider"></span></label>
        <button class="btn btn-sm btn-ghost" data-edit="${a.id}">✏️</button>
        <button class="btn btn-sm btn-ghost" data-del="${a.id}" style="color:var(--danger)">🗑</button>
      </div>
    `).join('');

    window.openModal('⚙️ Cài đặt tài khoản thanh toán', `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        Quản lý tất cả TK thu tiền. TK bị tắt không hiển thị trong dropdown phiếu thu/chi.
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px;padding:10px 12px;background:#FAFAFB;border-radius:8px">
        <div style="flex:1"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;font-weight:600">Tổng tài sản</div>
          <div style="font-size:18px;font-weight:800;color:var(--navy)">${window.fmtVND(total)}</div></div>
        <div style="flex:1"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.4px;font-weight:600">TK đang dùng</div>
          <div style="font-size:18px;font-weight:800;color:var(--ok)">${activeCount} / ${accounts.length}</div></div>
      </div>
      ${rows}
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-navy" style="flex:1" onclick="window.openAddAccount('cash')">+ Tiền mặt</button>
        <button class="btn btn-navy" style="flex:1" onclick="window.openAddAccount('bank')">+ Ngân hàng</button>
        <button class="btn btn-navy" style="flex:1" onclick="window.openAddAccount('ewallet')">+ Ví điện tử</button>
      </div>
    `, {
      footer: `<button class="btn btn-primary" onclick="closeModal()">Đóng</button>`,
      width: '680px'
    });

    /* Bind toggles & edit/del */
    document.querySelectorAll('[data-toggle]').forEach(t => {
      t.onchange = () => {
        window.STORE.update('paymentAccounts', t.dataset.toggle, { active: t.checked });
        accounts = window.STORE.get('paymentAccounts');
        window.toast(t.checked ? 'Đã bật TK' : 'Đã tắt TK', 'info');
      };
    });
    document.querySelectorAll('[data-edit]').forEach(b => {
      b.onclick = () => {
        const a = accounts.find(x => x.id === b.dataset.edit);
        window.openAddAccount(a.kind, a);
      };
    });
    document.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => {
        const a = accounts.find(x => x.id === b.dataset.del);
        window.confirmDelete('Xóa TK ' + a.name + '?', () => {
          window.STORE.remove('paymentAccounts', b.dataset.del);
          window.toast('Đã xóa TK', 'danger');
          window.openAccountSettings();
        });
      };
    });
  };

  window.openAddAccount = function(kind, existing) {
    const kindLabel = { cash:'Tiền mặt', bank:'Ngân hàng', ewallet:'Ví điện tử' };
    const isEdit = !!existing;
    const a = existing || { kind, name:'', detail:'', balance:0, keeper:'', active:true };
    const nextId = 'A' + (accounts.length + 1);
    window.openModal((isEdit?'✏️ Sửa ':'+ Thêm ') + kindLabel[kind], `
      <div class="form-row wide"><label>Tên TK *</label>
        <input id="aName" value="${a.name}" placeholder="${kind==='cash'?'VD: Quỹ tiền mặt văn phòng':kind==='bank'?'VD: Vietcombank · 1021xxxxxx':'VD: MoMo · 0903xxx'}"></div>
      <div class="form-row wide"><label>Mô tả / Chi tiết</label>
        <input id="aDetail" value="${a.detail}" placeholder="${kind==='cash'?'Vị trí cất':kind==='bank'?'Chi nhánh':'Số điện thoại / tài khoản'}"></div>
      <div class="form-row">
        <div><label>Số dư hiện tại (₫)</label><input id="aBalance" type="number" value="${a.balance||0}"></div>
        <div><label>Người giữ / quản lý</label>
          <select id="aKeeper">
            <option ${a.keeper==='Vương Luân'?'selected':''}>Vương Luân</option>
            <option ${a.keeper==='Lê Thị Phương'?'selected':''}>Lê Thị Phương</option>
            <option ${a.keeper==='Trần Lan'?'selected':''}>Trần Lan</option>
            <option ${a.keeper==='Phạm Hùng'?'selected':''}>Phạm Hùng</option>
            <option ${a.keeper==='Hoàng Mai'?'selected':''}>Hoàng Mai</option>
          </select></div>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="window.openAccountSettings()">Hủy</button>
               <button class="btn btn-primary" onclick="window.submitAccount('${isEdit?a.id:nextId}','${kind}',${isEdit})">💾 Lưu</button>`
    });
  };

  window.submitAccount = function(id, kind, isEdit) {
    const data = {
      id, kind,
      name: window.formVal('#aName'),
      detail: window.formVal('#aDetail'),
      balance: parseInt(window.formVal('#aBalance'), 10) || 0,
      keeper: window.formVal('#aKeeper'),
      active: true,
    };
    if (!data.name) { window.toast('Nhập tên TK', 'warn'); return; }
    if (isEdit) window.STORE.update('paymentAccounts', id, data);
    else        window.STORE.add('paymentAccounts', data);
    accounts = window.STORE.get('paymentAccounts');
    window.toast('✓ Đã ' + (isEdit?'cập nhật':'thêm') + ' TK', 'success');
    window.openAccountSettings();
  };

  /* ============ Xuất Excel sổ quỹ ============ */
  function filteredEntries() {
    entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
    const q = (document.getElementById('qSearch')?.value || '').trim().toLowerCase();
    const t = document.getElementById('fType')?.value || '';
    const a = document.getElementById('fAccount')?.value || '';
    return entries.filter(e =>
      (!q || [e.no, e.party, e.desc].some(x => (x || '').toLowerCase().includes(q))) &&
      (!t || e.type === t) &&
      (!a || e.account === a)
    );
  }

  window.exportCashBook = function () {
    const rows = filteredEntries();
    if (!rows.length) { window.toast('Không có phiếu nào để xuất', 'warn'); return; }
    const header = ['Số phiếu','Ngày','Loại','Đối tượng','Diễn giải','Tài khoản','Số tiền','NV lập'];
    const data = rows.map(e => [
      e.no || '', e.date || '', e.type === 'in' ? 'Thu' : 'Chi',
      e.party || '', e.desc || '', e.account || '',
      (e.type === 'in' ? 1 : -1) * (e.amount || 0), e.staff || '',
    ]);
    const stamp = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    window.exportToXLSX(`so-quy-${stamp}.xlsx`, header, data, 'Sổ quỹ');
  };

  /* ============ Lịch sử quỹ tiền mặt (running balance) ============ */
  window.openCashHistory = function () {
    entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
    accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);
    const cashAcc = accounts.find(a => a.kind === 'cash');
    const cashName = cashAcc ? cashAcc.name : 'Tiền mặt';
    /* Chỉ lấy phiếu của TK tiền mặt; sắp xếp cũ → mới để tính số dư lũy kế */
    const cashEntries = entries
      .filter(e => e.account === 'Tiền mặt' || e.account === cashName)
      .slice()
      .sort((a, b) => (window.parseVNDate ? window.parseVNDate(a.date) - window.parseVNDate(b.date) : 0));
    const totalIn = cashEntries.filter(e => e.type === 'in').reduce((s, e) => s + e.amount, 0);
    const totalOut = cashEntries.filter(e => e.type === 'out').reduce((s, e) => s + e.amount, 0);
    const closing = cashAcc ? cashAcc.balance : (totalIn - totalOut);
    /* Số dư đầu kỳ = số dư cuối - (thu - chi) */
    let running = closing - (totalIn - totalOut);
    const opening = running;
    const body = cashEntries.map(e => {
      running += (e.type === 'in' ? e.amount : -e.amount);
      return `<tr>
        <td style="font-size:12px;color:var(--muted)">${e.date}</td>
        <td><b>${e.no}</b></td>
        <td style="font-size:12px">${e.desc}</td>
        <td class="num type-in">${e.type === 'in' ? '+' + window.fmt(e.amount) : ''}</td>
        <td class="num type-out">${e.type === 'out' ? '-' + window.fmt(e.amount) : ''}</td>
        <td class="num"><b>${window.fmt(running)}</b></td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--muted)">Chưa có phiếu tiền mặt.</td></tr>`;

    window.openModal('💵 Lịch sử quỹ tiền mặt', `
      <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:130px;padding:10px 12px;background:#FAFAFB;border-radius:8px">
          <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">Đầu kỳ</div>
          <div style="font-size:16px;font-weight:800;color:var(--navy)">${window.fmt(opening)} ₫</div></div>
        <div style="flex:1;min-width:130px;padding:10px 12px;background:#FAFAFB;border-radius:8px">
          <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">Tổng thu</div>
          <div style="font-size:16px;font-weight:800;color:var(--ok)">+${window.fmt(totalIn)} ₫</div></div>
        <div style="flex:1;min-width:130px;padding:10px 12px;background:#FAFAFB;border-radius:8px">
          <div style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">Tổng chi</div>
          <div style="font-size:16px;font-weight:800;color:var(--danger)">-${window.fmt(totalOut)} ₫</div></div>
        <div style="flex:1;min-width:130px;padding:10px 12px;background:var(--navy);border-radius:8px">
          <div style="font-size:11px;color:#fff;opacity:0.7;font-weight:600;text-transform:uppercase">Số dư cuối</div>
          <div style="font-size:16px;font-weight:800;color:#fff">${window.fmt(closing)} ₫</div></div>
      </div>
      <div class="table-wrap" style="max-height:420px;overflow:auto">
        <table>
          <thead><tr>
            <th>Ngày</th><th>Số phiếu</th><th>Diễn giải</th>
            <th class="num">Thu</th><th class="num">Chi</th><th class="num">Số dư</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="window.exportCashBook()">⬇ Xuất Excel</button>
               <button class="btn btn-primary" onclick="closeModal()">Đóng</button>`,
      width: '760px'
    });
  };

  /* ============ Đối soát ngân hàng ============ */
  window.openReconcile = function () {
    accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);
    const banks = accounts.filter(a => a.kind === 'bank' && a.active);
    const rows = banks.map(a => `
      <tr data-acc="${a.id}">
        <td><b>${a.name}</b><div style="font-size:11px;color:var(--muted)">${a.detail}</div></td>
        <td class="num"><b>${window.fmt(a.balance)}</b> ₫</td>
        <td><input type="number" class="rec-actual" data-acc="${a.id}" placeholder="Nhập số dư thực" style="width:150px;border:1px solid var(--line);border-radius:7px;padding:7px;font-size:13px;text-align:right"></td>
        <td class="num rec-diff" data-acc="${a.id}" style="font-weight:700;color:var(--muted)">—</td>
      </tr>`).join('') || `<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--muted)">Chưa có tài khoản ngân hàng.</td></tr>`;

    window.openModal('🔄 Đối soát ngân hàng', `
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
        Nhập số dư thực tế từ sao kê/app ngân hàng để so với số dư trên sổ. Chênh lệch ≠ 0 cần kiểm tra phiếu thu/chi.
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Tài khoản</th><th class="num">Số dư trên sổ</th><th>Số dư thực tế</th><th class="num">Chênh lệch</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Đóng</button>
               <button class="btn btn-primary" onclick="window.runReconcile()">✓ Đối soát</button>`,
      width: '680px'
    });

    document.querySelectorAll('.rec-actual').forEach(inp => {
      inp.addEventListener('input', () => {
        const a = accounts.find(x => x.id === inp.dataset.acc);
        const actual = parseFloat(inp.value);
        const cell = document.querySelector(`.rec-diff[data-acc="${inp.dataset.acc}"]`);
        if (isNaN(actual) || !a) { cell.textContent = '—'; cell.style.color = 'var(--muted)'; return; }
        const diff = actual - a.balance;
        cell.textContent = (diff > 0 ? '+' : '') + window.fmt(diff) + ' ₫';
        cell.style.color = diff === 0 ? 'var(--ok)' : 'var(--danger)';
      });
    });
  };

  window.runReconcile = function () {
    const inputs = document.querySelectorAll('.rec-actual');
    let checked = 0, matched = 0, diffs = 0;
    inputs.forEach(inp => {
      const a = accounts.find(x => x.id === inp.dataset.acc);
      const actual = parseFloat(inp.value);
      if (isNaN(actual) || !a) return;
      checked++;
      if (actual - a.balance === 0) matched++; else diffs++;
    });
    if (!checked) { window.toast('Chưa nhập số dư thực tế nào', 'warn'); return; }
    window.closeModal();
    window.toast(`Đối soát ${checked} TK · khớp ${matched} · lệch ${diffs}`, diffs ? 'warn' : 'success');
  };

  window.STORE.subscribe('cashEntries', render);
  window.STORE.subscribe('paymentAccounts', renderKPIs);
  window.renderAppShell('accounting', 'Kế toán');
  ['qSearch','fType','fAccount','fFrom','fTo'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
  render();
})();
