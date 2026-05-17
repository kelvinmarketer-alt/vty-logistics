/* =========================================================
   VTY Logistics — Kế toán (Full CRUD)
   ========================================================= */
(function () {
  const INITIAL_ENTRIES = [
    { no:'PT-526045', date:'16/05/2026', type:'in', party:'KH004 · Shop Mẹ&Bé', desc:'COD đơn VTY-526045', account:'Tiền mặt', amount:1_250_000, staff:'Trần Lan' },
    { no:'PT-526044', date:'16/05/2026', type:'in', party:'KH017 · Tech 88', desc:'COD đơn VTY-526044', account:'Vietcombank', amount:8_400_000, staff:'Trần Lan' },
    { no:'PC-526010', date:'16/05/2026', type:'out', party:'Petrolimex Cầu Giấy', desc:'Đổ xăng xe 29C-99988', account:'Tiền mặt', amount:2_200_000, staff:'Phạm Hùng' },
    { no:'PT-526040', date:'15/05/2026', type:'in', party:'KH025 · Chị Hoa', desc:'COD đơn VTY-526040', account:'MB Bank', amount:380_000, staff:'Hoàng Mai' },
    { no:'PC-526009', date:'15/05/2026', type:'out', party:'Garage Long Biên', desc:'Bảo dưỡng xe 29C-33344', account:'Vietcombank', amount:8_400_000, staff:'Vương Luân' },
    { no:'PT-526033', date:'15/05/2026', type:'in', party:'KH001 · An Phát', desc:'TT công nợ T4', account:'Vietcombank', amount:48_500_000, staff:'Trần Lan' },
    { no:'PC-526008', date:'14/05/2026', type:'out', party:'NV Nguyễn Văn A', desc:'Lương tuần 1+2 T5', account:'Tiền mặt', amount:5_200_000, staff:'Vương Luân' },
    { no:'PT-526012', date:'14/05/2026', type:'in', party:'KH014 · Chị Mai', desc:'Cước HN→HP', account:'Tiền mặt', amount:350_000, staff:'Hoàng Mai' },
    { no:'PC-526006', date:'14/05/2026', type:'out', party:'Văn phòng phẩm Hồng Hà', desc:'Mua giấy in + hóa đơn', account:'Tiền mặt', amount:450_000, staff:'Hoàng Mai' },
    { no:'PT-525988', date:'13/05/2026', type:'in', party:'KH002 · HN Foods', desc:'TT đơn VTY-525972', account:'Vietcombank', amount:3_200_000, staff:'Vương Luân' },
    { no:'PC-526005', date:'13/05/2026', type:'out', party:'Bảo hiểm PVI', desc:'Phí BH xe 29C-99988', account:'Vietcombank', amount:14_800_000, staff:'Vương Luân' },
    { no:'PT-525981', date:'12/05/2026', type:'in', party:'KH012 · Chị Hằng', desc:'Cước 8 đơn nội thành', account:'MB Bank', amount:640_000, staff:'Hoàng Mai' },
  ];

  const INITIAL_ACCOUNTS = [
    { id:'A1', kind:'cash', name:'Quỹ tiền mặt văn phòng', detail:'Tủ sắt phòng Kế toán', balance:42_000_000, keeper:'Lê Thị Phương', active:true },
    { id:'A2', kind:'bank', name:'Vietcombank · 1021xxxxxx', detail:'CN Cầu Giấy', balance:128_400_000, keeper:'Vương Luân', active:true },
    { id:'A3', kind:'bank', name:'MB Bank · 0312xxxxxx', detail:'CN Hà Nội', balance:42_800_000, keeper:'Vương Luân', active:true },
    { id:'A4', kind:'bank', name:'Techcombank · 1903xxxxxx', detail:'TK dự phòng', balance:14_800_000, keeper:'Vương Luân', active:true },
    { id:'A5', kind:'ewallet', name:'MoMo · 0903 111 222', detail:'Thu COD KH nhỏ', balance:1_200_000, keeper:'Hoàng Mai', active:true },
    { id:'A6', kind:'ewallet', name:'ViettelPay · 0903 111 222', detail:'Dự phòng', balance:0, keeper:'Hoàng Mai', active:false },
  ];

  let entries = window.STORE.get('cashEntries', INITIAL_ENTRIES);
  let accounts = window.STORE.get('paymentAccounts', INITIAL_ACCOUNTS);

  function render() {
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

  window.STORE.subscribe('cashEntries', render);
  window.renderAppShell('accounting', 'Kế toán');
  ['qSearch','fType','fAccount','fFrom','fTo'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
  render();
})();
