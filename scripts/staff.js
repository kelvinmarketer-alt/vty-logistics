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
               <button class="btn btn-ghost" onclick="window.resetStaffPassword('${id}','${s.email||''}','${s.name}')">🔑 Reset MK</button>
               <button class="btn btn-ghost" onclick="window.toggleStaffStatus('${id}','${s.status}')" style="color:${s.status==='active'?'var(--warn)':'var(--ok)'}">${s.status==='active'?'⏸ Khóa TK':'▶ Mở khóa TK'}</button>
               <button class="btn btn-primary" onclick="window.submitEditStaff('${id}')">💾 Lưu thay đổi</button>`,
      width:'680px'
    });
  };

  /* === Reset mật khẩu === */
  window.resetStaffPassword = async function(staffId, email, name) {
    if (!email) {
      window.toast('NV chưa có email — sửa thêm email rồi reset', 'warn');
      return;
    }
    const choice = confirm(
      `Reset mật khẩu cho ${name}?\n\n` +
      `OK = Gửi email reset (NV tự đổi pass qua link email)\n` +
      `Hủy = Cấp pass mới thủ công (admin chọn pass)`
    );
    if (choice) {
      /* Send reset email */
      if (window.AUTH?.resetPassword) {
        window.toast('⏳ Đang gửi email reset...', 'info');
        const result = await window.AUTH.resetPassword(email);
        if (result.success) {
          window.toast('✓ Đã gửi email reset password đến ' + email, 'success');
        } else {
          window.toast('❌ ' + result.error, 'danger');
        }
      } else {
        window.toast('Cần Supabase Auth — fallback: cấp pass thủ công', 'warn');
      }
    } else {
      /* Cấp pass mới thủ công — admin nhập pass cho NV */
      const newPass = prompt('Nhập mật khẩu mới cho ' + name + ' (tối thiểu 6 ký tự):',
        'VTY' + Math.random().toString(36).slice(2, 8));
      if (!newPass || newPass.length < 6) {
        window.toast('Mật khẩu tối thiểu 6 ký tự', 'warn');
        return;
      }
      if (!window.SB) {
        window.toast('Cần Supabase để đổi mật khẩu', 'warn');
        return;
      }
      /* Note: anon key không có quyền admin updateUserById.
         Phương án: dùng adminAPI nếu có service_role, hoặc hướng dẫn user vào Supabase */
      window.openModal('🔑 Đổi mật khẩu cho ' + name, `
        <div style="padding:14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:13px;color:var(--warn);margin-bottom:14px">
          ⚠️ Để bảo mật, đổi mật khẩu user khác cần làm qua <b>Supabase Dashboard</b> (anon key không có quyền).
        </div>
        <div style="background:#FAFAFB;padding:14px;border-radius:8px;font-family:ui-monospace,monospace;font-size:13px;line-height:1.8">
          <b>Hướng dẫn 30 giây:</b><br><br>
          1. Vào <a href="https://supabase.com/dashboard/project/dbfffwtnxhytcoczhxhf/auth/users" target="_blank" style="color:var(--red)">Supabase Dashboard → Auth → Users</a><br>
          2. Tìm user: <b style="color:var(--navy)">${email}</b><br>
          3. Click ⋮ → <b>"Send password recovery"</b> (NV nhận email reset)<br>
          4. <b>Hoặc</b> click vào user → <b>"Reset password"</b> → nhập pass mới: <b style="color:var(--red);background:#FEF3C7;padding:2px 8px;border-radius:4px">${newPass}</b><br>
          5. Save → báo lại NV pass mới
        </div>
        <div style="margin-top:14px">
          <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${newPass}');window.toast('✓ Đã copy pass','success')">📋 Copy pass</button>
          <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${email}');window.toast('✓ Đã copy email','success')">📋 Copy email</button>
        </div>
      `, {
        footer: `<button class="btn btn-primary" onclick="closeModal()">Đã hiểu</button>`,
        width: '560px'
      });
    }
  };

  /* === Toggle khóa/mở tài khoản === */
  window.toggleStaffStatus = function(staffId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'off' : 'active';
    const verb = newStatus === 'active' ? 'MỞ KHÓA' : 'KHÓA';
    if (!confirm(`${verb} tài khoản này?\n\n${newStatus === 'off' ? 'NV sẽ KHÔNG đăng nhập được nữa cho đến khi mở khóa lại.' : 'NV có thể đăng nhập lại bình thường.'}`)) return;
    window.STORE.update('staff', staffId, { status: newStatus });
    window.closeModal();
    window.toast(`✓ Đã ${verb.toLowerCase()} tài khoản`, newStatus === 'active' ? 'success' : 'warn');
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
    /* Sinh password ngẫu nhiên 8 ký tự */
    const randomPass = 'VTY' + Math.random().toString(36).slice(2, 8);
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
        <div><label>Vào làm</label><input id="nJoin" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div><label>Lương cơ bản (₫)</label><input id="nSalary" type="number" placeholder="10000000"></div>
        <div><label>Địa chỉ</label><input id="nAddress" placeholder="Quận, TP"></div>
      </div>

      <div class="section-h" style="margin-top:18px;color:var(--red);border-bottom-color:var(--red)">
        🔐 Tài khoản đăng nhập app
      </div>
      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;font-size:12px;color:var(--warn);margin-bottom:12px">
        Tick <b>"Tạo tài khoản"</b> để NV này có thể login app. Bạn cấp email + mật khẩu — NV nhận thông tin và đổi mật khẩu sau khi login lần đầu.
      </div>
      <div class="form-row wide">
        <label class="check-item" style="font-weight:600">
          <input type="checkbox" id="nCreateAuth" checked onchange="document.getElementById('authFields').style.display=this.checked?'':'none'">
          <span>✅ Tạo tài khoản đăng nhập cho NV này</span>
        </label>
      </div>
      <div id="authFields">
        <div class="form-row">
          <div><label>Email đăng nhập *</label><input id="nEmail" type="email" placeholder="ten.nhanvien@vty.vn"></div>
          <div>
            <label>Mật khẩu cấp *</label>
            <div class="input-with-help">
              <input id="nPassword" type="text" value="${randomPass}" placeholder="Tối thiểu 6 ký tự">
              <button class="help-btn" type="button" onclick="document.getElementById('nPassword').value='VTY'+Math.random().toString(36).slice(2,8)" title="Sinh lại pass">🎲</button>
            </div>
          </div>
        </div>
      </div>

      <div class="section-h" style="margin-top:18px">Phân quyền truy cập module</div>
      <div class="check-grid cols-3" id="nPerms">${permCheckHTML([])}</div>
    `;
  };
  window.footNv = function() {
    return `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
            <button class="btn btn-primary" onclick="window.submitAddStaff()">💾 Lưu NV + Tạo tài khoản</button>`;
  };
  window.submitAddStaff = async function() {
    const name = window.formVal('#nName');
    const phone = window.formVal('#nPhone');
    if (!name) { window.toast('Nhập tên NV', 'warn'); return; }
    if (!phone) { window.toast('Nhập SĐT', 'warn'); return; }

    const createAuth = document.getElementById('nCreateAuth').checked;
    const email = window.formVal('#nEmail');
    const password = window.formVal('#nPassword');

    if (createAuth) {
      if (!email) { window.toast('Nhập email đăng nhập', 'warn'); return; }
      if (!password || password.length < 6) { window.toast('Mật khẩu tối thiểu 6 ký tự', 'warn'); return; }
    }

    const perms = Array.from(document.querySelectorAll('#nPerms input:checked')).map(x => x.value);
    const code = window.formVal('#nCode');
    const newNV = {
      id: code,
      code: code,
      name, phone,
      role: window.formVal('#nRole') || 'Nhân viên',
      dept: window.formVal('#nDept'),
      email: createAuth ? email : '',
      avatar: window.initials(name),
      permissions: perms,
      salary: parseInt(window.formVal('#nSalary'), 10) || 0,
      kpi: null, status: 'active',
      joinDate: new Date(window.formVal('#nJoin')).toLocaleDateString('vi-VN'),
      address: window.formVal('#nAddress') || '',
    };

    /* Step 1: Tạo Supabase Auth user (nếu chọn) */
    let authUserId = null;
    if (createAuth && window.AUTH?.signUp) {
      const btn = document.querySelector('.modal-foot .btn-primary');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang tạo tài khoản...'; }
      const result = await window.AUTH.signUp(email, password, code);
      if (!result.success) {
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 Lưu NV + Tạo tài khoản'; }
        const errMsg = result.error.includes('already registered')
          ? `❌ Email "${email}" đã tồn tại. Đổi email khác hoặc bỏ tick "Tạo tài khoản".`
          : '❌ ' + result.error;
        window.toast(errMsg, 'danger');
        return;
      }
      authUserId = result.user?.id;
    }

    /* Step 2: Thêm staff record */
    window.STORE.add('staff', newNV);

    /* Step 3: Link user_id nếu có Supabase */
    if (authUserId && window.SB) {
      try {
        await window.SB.from('staff').update({ user_id: authUserId }).eq('code', code);
      } catch (e) { console.warn('[Staff] link user_id', e); }
    }

    window.closeModal();

    /* Hiển thị popup thông tin để admin gửi cho NV */
    if (createAuth) {
      setTimeout(() => {
        window.openModal('🎉 Đã tạo tài khoản cho ' + name, `
          <div style="text-align:center;padding:10px 0 20px">
            <div style="font-size:48px;margin-bottom:8px">✅</div>
            <div style="font-size:16px;color:var(--ok);font-weight:700">NV đã sẵn sàng login app</div>
          </div>
          <div style="background:#FAFAFB;border:1px solid var(--line);border-radius:10px;padding:16px">
            <div style="font-size:11.5px;color:var(--muted);text-transform:uppercase;font-weight:700;margin-bottom:8px">📤 Gửi thông tin này cho NV:</div>
            <div style="font-family:ui-monospace,monospace;font-size:13.5px;line-height:1.8">
              🌐 URL app:   <b style="color:var(--navy)">vty-logistics.onrender.com</b><br>
              📧 Email:     <b style="color:var(--navy)">${email}</b><br>
              🔑 Mật khẩu:  <b style="color:var(--red);background:#FEF3C7;padding:1px 8px;border-radius:4px">${password}</b><br>
              👤 Vai trò:   <b style="color:var(--navy)">${newNV.role}</b><br>
              🔓 Quyền:     <b>${perms.length} module</b>
            </div>
          </div>
          <div style="margin-top:14px;padding:10px 12px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:12px;color:var(--warn)">
            💡 Khuyến nghị: NV đổi mật khẩu ở lần login đầu tiên (Settings → Bảo mật).
          </div>
        `, {
          footer: `<button class="btn btn-ghost" onclick="window.copyAuthInfo('${email}','${password}','${name}')">📋 Copy thông tin</button>
                   <button class="btn btn-navy" onclick="window.sendAuthZalo('${phone}','${email}','${password}')">💬 Gửi Zalo</button>
                   <button class="btn btn-primary" onclick="closeModal()">Đã hiểu</button>`,
          width:'520px'
        });
      }, 300);
    } else {
      window.toast('✓ Đã thêm NV ' + name + ' (không có tài khoản login)', 'success');
    }
  };

  /* Helpers cho popup tạo tài khoản */
  window.copyAuthInfo = function(email, pass, name) {
    const text = `VTY Logistics — Thông tin đăng nhập của ${name}\n\n🌐 URL: https://vty-logistics.onrender.com\n📧 Email: ${email}\n🔑 Mật khẩu: ${pass}\n\nVui lòng đổi mật khẩu sau khi login lần đầu.`;
    navigator.clipboard.writeText(text).then(() => window.toast('✓ Đã copy vào clipboard', 'success'));
  };
  window.sendAuthZalo = function(phone, email, pass) {
    const cleanPhone = phone.replace(/\s/g, '');
    window.open('https://zalo.me/' + cleanPhone, '_blank');
    window.toast('Đã mở Zalo NV — copy thông tin từ nút bên trái để gửi', 'info');
  };

  window.STORE.subscribe('staff', render);
  window.renderAppShell('staff', 'Nhân viên');
  ['qSearch','fStatus'].forEach(id => document.getElementById(id)?.addEventListener('input', render));
  render();
})();
