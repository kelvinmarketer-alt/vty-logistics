/* =========================================================
   VTY Logistics — Nhân viên (Full CRUD)
   ========================================================= */
(function () {
  let staffs = window.STORE.get('staff', window.STAFFS || []);
  let curDept = 'all';

  function render() {
    staffs = window.STORE.get('staff', window.STAFFS || []);
    const q = document.getElementById('qSearch').value.trim().toLowerCase();
    const st = document.getElementById('fStatus').value;
    const rows = staffs.filter(s =>
      (curDept === 'all' || s.dept === curDept) &&
      (!q || [s.name, s.phone, s.code].some(x => (x||'').toLowerCase().includes(q))) &&
      (!st || s.status === st)
    );
    document.getElementById('rowCount').textContent = `${rows.length} / ${staffs.length} nhân viên`;
    document.getElementById('stTbody').innerHTML = rows.map(s => {
      const col = window.avatarColor(s.id);
      const kpiNum = s.kpi ? parseInt(s.kpi) : null;
      const kpiCls = kpiNum && kpiNum < 85 ? 'warn' : '';
      const perms = (s.permissions||[]).slice(0,2).map(p => `<span class="perm-pill">${p}</span>`).join('')
                  + ((s.permissions||[]).length > 2 ? `<span class="perm-pill">+${s.permissions.length-2}</span>` : '');
      return `<tr data-id="${s.id}">
        <td><b>${s.code}</b></td>
        <td>
          <div class="cust-cell">
            <div class="cust-ava" style="background:${col}">${s.avatar || window.initials(s.name)}</div>
            <div class="cust-info">
              <div class="n1">${s.name}</div>
              <div class="n2">${s.role}</div>
            </div>
          </div>
        </td>
        <td class="hide-sm"><span class="staff-pill">${s.dept}</span></td>
        <td class="hide-md" style="font-size:12px">${s.phone}</td>
        <td style="font-size:11.5px">${perms}</td>
        <td class="hide-sm">${kpiNum ? `<div style="display:flex;align-items:center;gap:4px"><div class="kpi-bar ${kpiCls}"><div style="width:${kpiNum}%"></div></div><b style="font-size:11px;color:var(--${kpiCls==='warn'?'warn':'ok'})">${s.kpi}</b></div>` : '—'}</td>
        <td class="num hide-md">${s.salary ? window.fmt(s.salary) : '—'}</td>
        <td><span class="status-pill ${s.status==='active'?'st-delivered':'st-cancelled'}">${s.status==='active'?'✓ Đi làm':'⏸ Nghỉ'}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            <button class="ra-zalo" data-act="zalo" data-id="${s.id}">Z</button>
            <button class="ra-call" data-act="call" data-id="${s.id}">📞</button>
            <button data-act="edit" data-id="${s.id}">✏️</button>
            <button data-act="toggle" data-id="${s.id}" title="Bật/tắt NV">${s.status==='active'?'⏸':'▶'}</button>
            ${s.role !== 'Chủ doanh nghiệp' ? `<button data-act="del" data-id="${s.id}" style="color:var(--danger)">🗑</button>` : ''}
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--muted)">Không có NV nào khớp.</td></tr>`;

    document.querySelectorAll('#stTbody tr[data-id]').forEach(tr => {
      tr.onclick = () => openStaff(tr.dataset.id);
    });
    document.querySelectorAll('#stTbody button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const s = staffs.find(x => x.id === btn.dataset.id);
        if (!s) return;
        const act = btn.dataset.act;
        if (act === 'zalo') { window.open('https://zalo.me/' + s.phone.replace(/\s/g,''),'_blank'); window.toast('Zalo ' + s.name, 'info'); }
        else if (act === 'call') { window.location.href = 'tel:' + s.phone.replace(/\s/g,''); }
        else if (act === 'edit') openStaff(s.id);
        else if (act === 'toggle') {
          const newStatus = s.status === 'active' ? 'off' : 'active';
          window.STORE.update('staff', s.id, { status: newStatus });
          window.toast(s.name + ': ' + (newStatus==='active'?'✓ Bật':'⏸ Tắt'), 'info');
        }
        else if (act === 'del') {
          window.confirmDelete('Xóa NV ' + s.name + '?', () => {
            window.STORE.remove('staff', s.id);
            window.toast('Đã xóa NV', 'danger');
          });
        }
      };
    });
  }

  function permCheckHTML(current) {
    const ALL_PERMS = ['Dashboard','Đơn hàng','Khách hàng','Xe & Tài xế','Kế toán','Công nợ','Hóa đơn','Nhân viên','Báo cáo'];
    return ALL_PERMS.map(p => `<label class="check-item"><input type="checkbox" value="${p}" ${current.includes(p)?'checked':''}> <span>${p}</span></label>`).join('');
  }

  window.openStaff = function(id) {
    const s = staffs.find(x => x.id === id);
    if (!s) return;
    const permsHTML = permCheckHTML(s.permissions || []);
    window.openModal('👤 ' + s.name + ' (' + s.code + ')', `
      <div class="form-row">
        <div><label>Họ tên *</label><input id="sName" value="${s.name}"></div>
        <div><label>Phòng ban</label>
          <select id="sDept">
            ${['Ban giám đốc','Sales','CSKH','Kế toán','Vận hành'].map(d=>`<option ${s.dept===d?'selected':''}>${d}</option>`).join('')}
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Vị trí</label><input id="sRole" value="${s.role}"></div>
        <div><label>Trạng thái</label>
          <select id="sStatus">
            <option value="active" ${s.status==='active'?'selected':''}>✓ Đi làm</option>
            <option value="off" ${s.status==='off'?'selected':''}>⏸ Nghỉ</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>SĐT</label><input id="sPhone" value="${s.phone}"></div>
        <div><label>Email</label><input id="sEmail" value="${s.email||''}" type="email"></div>
      </div>
      <div class="form-row">
        <div><label>Lương cơ bản (₫)</label><input id="sSalary" type="number" value="${s.salary||0}"></div>
        <div><label>KPI</label><input id="sKpi" value="${s.kpi||''}" placeholder="VD: 90%"></div>
      </div>
      <div class="form-row wide"><label>Địa chỉ</label><input id="sAddress" value="${s.address||''}"></div>

      <div class="section-h" style="margin-top:14px">Phân quyền truy cập module</div>
      <div class="check-grid cols-3" id="sPerms">${permsHTML}</div>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
               <button class="btn btn-ghost" onclick="window.toast('Reset mật khẩu','info')">🔑 Reset MK</button>
               <button class="btn btn-primary" onclick="window.submitEditStaff('${id}')">💾 Lưu thay đổi</button>`,
      width:'620px'
    });
  };

  window.submitEditStaff = function(id) {
    const perms = Array.from(document.querySelectorAll('#sPerms input:checked')).map(x => x.value);
    window.STORE.update('staff', id, {
      name: window.formVal('#sName'),
      dept: window.formVal('#sDept'),
      role: window.formVal('#sRole'),
      status: window.formVal('#sStatus'),
      phone: window.formVal('#sPhone'),
      email: window.formVal('#sEmail'),
      salary: parseInt(window.formVal('#sSalary'), 10) || 0,
      kpi: window.formVal('#sKpi'),
      address: window.formVal('#sAddress'),
      permissions: perms,
    });
    window.closeModal();
    window.toast('✓ Đã cập nhật NV', 'success');
  };

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      curDept = c.dataset.q;
      render();
    });
  });

  window.formNv = function() {
    const nextCode = window.STORE.nextId('staff', 'NV');
    return `
      <div class="form-row">
        <div><label>Mã NV</label><input id="nCode" value="${nextCode}" readonly style="background:#FAFAFB"></div>
        <div><label>Họ tên *</label><input id="nName" placeholder="Nguyễn Văn..."></div>
      </div>
      <div class="form-row">
        <div><label>Phòng ban</label>
          <select id="nDept">
            <option>Sales</option><option>CSKH</option>
            <option>Kế toán</option><option>Vận hành</option>
          </select></div>
        <div><label>Vị trí</label><input id="nRole" placeholder="VD: Nhân viên sales"></div>
      </div>
      <div class="form-row">
        <div><label>SĐT *</label><input id="nPhone" placeholder="0912 xxx xxx"></div>
        <div><label>Email</label><input id="nEmail" type="email"></div>
      </div>
      <div class="form-row">
        <div><label>Vào làm</label><input id="nJoin" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div><label>Lương cơ bản (₫)</label><input id="nSalary" type="number" placeholder="10000000"></div>
      </div>
      <div class="form-row wide"><label>Phân quyền truy cập module</label>
        <div class="check-grid cols-3" id="nPerms">${permCheckHTML([])}</div></div>
    `;
  };
  window.footNv = function() {
    return `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="window.submitAddStaff()">💾 Lưu NV</button>`;
  };
  window.submitAddStaff = function() {
    const name = window.formVal('#nName');
    const phone = window.formVal('#nPhone');
    if (!name) { window.toast('Nhập tên NV', 'warn'); return; }
    if (!phone) { window.toast('Nhập SĐT', 'warn'); return; }
    const perms = Array.from(document.querySelectorAll('#nPerms input:checked')).map(x => x.value);
    const newNV = {
      id: window.formVal('#nCode'),
      code: window.formVal('#nCode'),
      name, phone,
      role: window.formVal('#nRole') || 'Nhân viên',
      dept: window.formVal('#nDept'),
      email: window.formVal('#nEmail'),
      avatar: window.initials(name),
      permissions: perms,
      salary: parseInt(window.formVal('#nSalary'), 10) || 0,
      kpi: null, status: 'active',
      joinDate: new Date(window.formVal('#nJoin')).toLocaleDateString('vi-VN'),
      address: '',
    };
    window.STORE.add('staff', newNV);
    window.closeModal();
    window.toast('✓ Đã thêm ' + name, 'success');
  };

  window.STORE.subscribe('staff', render);
  window.renderAppShell('staff', 'Nhân viên');
  ['qSearch','fStatus'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
  render();
})();
