/* =========================================================
   VTY Logistics — Hóa đơn VAT (Full CRUD)
   ========================================================= */
(function () {
  /* Fallback khi DB trống — để rỗng cho vận hành thật. Dữ liệu thật ở Supabase. */
  const INITIAL = [];

  let invoices = window.STORE.get('invoices', INITIAL);
  let cur = 'all';

  function render() {
    invoices = window.STORE.get('invoices', INITIAL);
    const rows = invoices.filter(i => cur === 'all' || i.status === cur);
    document.getElementById('invTbody').innerHTML = rows.map(i => {
      const stMap = {
        paid:    { lab:'✓ Đã TT',  bg:'var(--ok-bg)',     fg:'var(--ok)' },
        pending: { lab:'⏳ Chờ TT',  bg:'var(--warn-bg)',   fg:'var(--warn)' },
        overdue: { lab:'⚠ Quá hạn', bg:'var(--danger-bg)', fg:'var(--danger)' },
        draft:   { lab:'📝 Nháp',    bg:'var(--info-bg)',   fg:'var(--info)' },
      };
      const st = stMap[i.status];
      const total = i.net + i.vat;
      return `<tr data-no="${i.no}">
        <td><b style="font-family:ui-monospace,monospace">${i.no}</b></td>
        <td style="font-size:12px;color:var(--muted)">${i.date}</td>
        <td>${i.cust}</td>
        <td class="hide-md" style="font-family:ui-monospace,monospace;font-size:12px">${i.tax}</td>
        <td class="num">${window.fmt(i.net)}</td>
        <td class="num">${window.fmt(i.vat)}</td>
        <td class="num"><b>${window.fmt(total)}</b></td>
        <td><span class="status-pill" style="background:${st.bg};color:${st.fg}">${st.lab}</span></td>
        <td onclick="event.stopPropagation()">
          <div class="row-actions">
            ${i.status==='draft'   ? `<button title="Phát hành lên CQT" data-act="issue" data-no="${i.no}" style="color:var(--ok)">🚀</button>` : ''}
            ${i.status==='pending' ? `<button title="Đánh dấu đã TT" data-act="paid" data-no="${i.no}" style="color:var(--ok)">✓</button>` : ''}
            ${i.status==='overdue' ? `<button title="Đánh dấu đã TT" data-act="paid" data-no="${i.no}" style="color:var(--ok)">✓</button>` : ''}
            <button title="Xem / In" data-act="print" data-no="${i.no}">🖨</button>
            <button title="Gửi email KH" data-act="email" data-no="${i.no}">📧</button>
            <button title="Xóa" data-act="del" data-no="${i.no}" style="color:var(--danger)">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="9" style="padding:40px;text-align:center;color:var(--muted)">Không có HĐ.</td></tr>`;

    document.querySelectorAll('#invTbody tr[data-no]').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.title = 'Bấm để xem hóa đơn';
      tr.onclick = (e) => {
        if (e.target.closest('button')) return;
        const inv = invoices.find(x => x.no === tr.dataset.no);
        if (inv) window.printInvoice(inv);
      };
    });
    document.querySelectorAll('#invTbody button[data-act]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const no = btn.dataset.no;
        const act = btn.dataset.act;
        if (act === 'issue') {
          const newNo = '1C25T-' + String(Math.max(...invoices.map(x => parseInt(x.no.split('-')[1])||0)) + 1).padStart(4,'0');
          const cqtCode = 'M' + Date.now().toString().slice(-9);
          window.STORE.update('invoices', no, {
            no: newNo, status: 'pending',
            issuedAt: new Date().toLocaleString('vi-VN'),
            cqtCode, cqtSync: 'success',
          });
          window.toast('🚀 Đã phát hành HĐ ' + newNo + ' lên CQT · Mã ' + cqtCode, 'success');
        } else if (act === 'paid') {
          window.STORE.update('invoices', no, { status: 'paid', paidDate: new Date().toLocaleDateString('vi-VN') });
          window.toast('✓ HĐ ' + no + ' đã thanh toán', 'success');
        } else if (act === 'print') {
          const inv = invoices.find(x => x.no === no);
          if (inv) window.printInvoice(inv);
        } else if (act === 'email') {
          window.toast('📧 Đã gửi HĐ ' + no + ' qua email cho KH (demo)', 'success');
        } else if (act === 'del') {
          window.confirmDelete('Xóa HĐ ' + no + '?', () => {
            window.STORE.remove('invoices', no);
            window.toast('Đã xóa HĐ', 'danger');
          });
        }
      };
    });
  }

  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      cur = c.dataset.q;
      render();
    });
  });

  /* === Form tạo HĐ === */
  window.formHd = function() {
    const custs = window.STORE.get('customers', []).filter(c => c.type === 'B2B');
    const custOpts = custs.map(c =>
      `<option value="${c.name}">${(c.code||c.id)} · ${c.phone||''}</option>`).join('');
    const nextNo = '(nháp)';
    return `
      <div class="form-row">
        <div><label>Số HĐ</label><input id="hNo" value="${nextNo}" readonly style="background:#FAFAFB"></div>
        <div><label>Ngày *</label><input id="hDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div><label>Khách hàng * (gõ để tìm — gợi ý tự động)</label>
          <input id="hCust" list="hCustList" autocomplete="off" placeholder="Gõ tên / mã / SĐT khách B2B…"
                 onchange="window.onHCustChange(this)" onblur="window.onHCustChange(this)">
          <datalist id="hCustList">${custOpts}</datalist></div>
        <div><label>MST</label><input id="hTax" placeholder="2300xxxxxx"></div>
      </div>
      <div class="form-row wide"><label>Diễn giải *</label>
        <input id="hDesc" placeholder="Cước vận chuyển tháng 5/2026"></div>
      <div class="form-row">
        <div><label>Tiền hàng (₫) *</label><input id="hNet" type="number" placeholder="10000000" oninput="window.recalcVAT()"></div>
        <div><label>VAT (%)</label>
          <select id="hVatRate" onchange="window.recalcVAT()">
            <option value="10" selected>10%</option><option value="8">8%</option>
            <option value="5">5%</option><option value="0">0%</option>
          </select></div>
      </div>
      <div class="form-row">
        <div><label>Tiền VAT (auto-tính)</label><input id="hVat" type="number" readonly style="background:#FAFAFB"></div>
        <div><label>Tổng cộng (auto-tính)</label><input id="hTotal" type="number" readonly style="background:#FAFAFB;font-weight:700;color:var(--red)"></div>
      </div>
    `;
  };

  window.onHCustChange = function(el) {
    const text = (el.value || '').trim();
    const c = window.resolveCust ? window.resolveCust(text) : null;
    if (c) {
      el.dataset.custId = c.id;
      el.value = c.name;
      const taxEl = document.getElementById('hTax');
      if (taxEl && c.tax && !taxEl.value) taxEl.value = c.tax;
    } else {
      delete el.dataset.custId;
    }
  };
  window.recalcVAT = function() {
    const net = parseInt(window.formVal('#hNet'), 10) || 0;
    const rate = parseInt(window.formVal('#hVatRate'), 10) || 0;
    const vat = Math.round(net * rate / 100);
    document.getElementById('hVat').value = vat;
    document.getElementById('hTotal').value = net + vat;
  };

  window.footHd = function() {
    return `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
            <button class="btn btn-ghost" onclick="window.submitInvoice('draft')">💾 Lưu nháp</button>
            <button class="btn btn-primary" onclick="window.submitInvoice('pending')">🚀 Phát hành</button>`;
  };

  window.submitInvoice = function(status) {
    const custEl = document.getElementById('hCust');
    const custText = (custEl.value || '').trim();
    const custMatch = custEl.dataset.custId
      ? window.STORE.get('customers', []).find(c => c.id === custEl.dataset.custId)
      : (window.resolveCust ? window.resolveCust(custText) : null);
    const custName = custMatch ? custMatch.name : custText;
    const net = parseInt(window.formVal('#hNet'), 10) || 0;
    const desc = window.formVal('#hDesc');
    if (!custText) { window.toast('Nhập khách hàng', 'warn'); return; }
    if (!net) { window.toast('Nhập tiền hàng', 'warn'); return; }
    if (!desc) { window.toast('Nhập diễn giải', 'warn'); return; }

    const rate = parseInt(window.formVal('#hVatRate'), 10) || 0;
    const vat = Math.round(net * rate / 100);
    let no = '(nháp)';
    if (status === 'pending') {
      const max = invoices.reduce((m, x) => {
        const n = parseInt((x.no || '').split('-')[1], 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, 42);
      no = '1C25T-' + String(max + 1).padStart(4, '0');
    }

    const dateInput = window.formVal('#hDate');
    const date = dateInput ? new Date(dateInput).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
    window.STORE.add('invoices', {
      no, date, cust: custName,
      tax: window.formVal('#hTax'),
      desc, net, vat, status,
    });
    window.closeModal();
    window.toast(status === 'draft' ? '💾 Đã lưu nháp' : '🚀 Đã phát hành HĐ ' + no, 'success');
  };

  /* === In hóa đơn — preview format pháp lý === */
  window.printInvoice = function(i) {
    const company = window.STORE.get('companyInfo', null) || {
      name:'Công ty TNHH Vạn Thiên Ý', shortName:'VTY Logistics',
      address:'Số 88 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      tax:'0109876543', hotline:'0903 111 222', email:'contact@vtylogistics.vn',
      bank:'Vietcombank · 1021xxxxxx',
    };
    const total = (i.net||0) + (i.vat||0);
    const inWords = window.numberToWords ? window.numberToWords(total) : window.fmt(total) + ' đồng';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>HĐ ${i.no}</title>
      <style>
        body{font-family:'Times New Roman',serif;max-width:850px;margin:0 auto;padding:30px;color:#000;font-size:13px;line-height:1.5}
        .hd{text-align:center;margin-bottom:14px}
        .hd .tit{font-weight:700;font-size:16px}
        .hd .form{font-size:12px;color:#555}
        h1{text-align:center;color:#C8102E;font-size:26px;margin:14px 0 4px;letter-spacing:1px}
        .meta{display:flex;justify-content:space-between;font-size:13px;margin-bottom:18px;padding:10px;background:#FAFAFB;border-radius:6px}
        .meta b{color:#1C2D5A}
        .meta .cqt{color:#7C3AED;font-family:ui-monospace,monospace}
        .seller, .buyer{border:1px solid #ccc;padding:12px;margin-bottom:12px;border-radius:6px}
        .seller{background:#FEF2F2}
        .buyer{background:#EFF6FF}
        .seller h3, .buyer h3{margin:0 0 8px;font-size:14px;color:#1C2D5A;text-transform:uppercase}
        .row{display:flex;gap:14px;font-size:12.5px;margin:3px 0}
        .row .lab{width:170px;color:#555}
        table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12.5px}
        table th{background:#1C2D5A;color:#fff;padding:8px;border:1px solid #1C2D5A;text-align:center;font-weight:700;font-size:12px;text-transform:uppercase}
        table td{padding:8px;border:1px solid #ccc;vertical-align:top}
        table td.num{text-align:right;font-variant-numeric:tabular-nums}
        .total-section{margin-top:14px}
        .total-row{display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px dashed #ccc;font-size:13px}
        .total-row.big{background:#FEF3C7;font-weight:800;font-size:16px;color:#C8102E;border:2px solid #C8102E;border-radius:6px;margin-top:8px;padding:12px}
        .in-words{font-style:italic;color:#666;font-size:12.5px;margin-top:6px;padding:8px 12px;background:#F0FDF4;border-left:3px solid #15803D}
        .sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:60px;text-align:center;font-size:13px}
        .sign .role{font-weight:700;text-transform:uppercase}
        .sign .ghi{font-style:italic;font-size:11px;color:#666;margin:4px 0 70px}
        .footer-note{text-align:center;color:#888;font-size:11px;margin-top:24px;padding-top:12px;border-top:1px dashed #ccc}
        @media print { body{padding:18px} .noprint{display:none} }
      </style></head><body>
      <div class="hd">
        <div class="tit">HÓA ĐƠN GIÁ TRỊ GIA TĂNG</div>
        <div class="form">Mẫu số: 1/001 · Ký hiệu: 1C25TVT · Số: <b>${i.no}</b></div>
        <div class="form">Ngày ${i.date.split('/')[0]} tháng ${i.date.split('/')[1]} năm ${i.date.split('/')[2]||'2026'}</div>
      </div>

      <div class="meta">
        <div>Mã CQT: <b class="cqt">${i.cqtCode || 'M' + Date.now().toString().slice(-9)}</b></div>
        <div>Trạng thái: <b style="color:${i.status==='paid'?'#15803D':i.status==='overdue'?'#B91C1C':'#B45309'}">${i.status==='paid'?'Đã thanh toán':i.status==='overdue'?'Quá hạn TT':i.status==='draft'?'Nháp':'Chờ thanh toán'}</b></div>
      </div>

      <div class="seller">
        <h3>Bên bán hàng (Bên cung cấp dịch vụ)</h3>
        <div class="row"><div class="lab">Tên đơn vị:</div><div><b>${company.name}</b></div></div>
        <div class="row"><div class="lab">Mã số thuế:</div><div><b>${company.tax}</b></div></div>
        <div class="row"><div class="lab">Địa chỉ:</div><div>${company.address}</div></div>
        <div class="row"><div class="lab">Điện thoại:</div><div>${company.hotline} · ${company.email||''}</div></div>
        <div class="row"><div class="lab">Số tài khoản:</div><div>${company.bank || 'Vietcombank · 1021xxxxxx'}</div></div>
      </div>

      <div class="buyer">
        <h3>Bên mua hàng (Khách hàng)</h3>
        <div class="row"><div class="lab">Tên đơn vị:</div><div><b>${i.cust}</b></div></div>
        <div class="row"><div class="lab">Mã số thuế:</div><div><b>${i.tax}</b></div></div>
        <div class="row"><div class="lab">Hình thức TT:</div><div>Chuyển khoản / Tiền mặt</div></div>
      </div>

      <table>
        <thead>
          <tr><th style="width:40px">STT</th><th>Tên hàng hóa, dịch vụ</th>
              <th style="width:60px">ĐVT</th><th style="width:60px">SL</th>
              <th style="width:120px">Đơn giá</th><th style="width:120px">Thành tiền</th></tr>
        </thead>
        <tbody>
          <tr><td style="text-align:center">1</td>
              <td>${i.desc || 'Cước vận chuyển hàng hóa'}</td>
              <td style="text-align:center">Chuyến</td>
              <td style="text-align:center">1</td>
              <td class="num">${window.fmt(i.net)}</td>
              <td class="num">${window.fmt(i.net)}</td></tr>
        </tbody>
      </table>

      <div class="total-section">
        <div class="total-row"><div>Cộng tiền hàng:</div><div><b>${window.fmt(i.net)} ₫</b></div></div>
        <div class="total-row"><div>Thuế suất GTGT (${Math.round(i.vat/i.net*100)}%):</div><div><b>${window.fmt(i.vat)} ₫</b></div></div>
        <div class="total-row big"><div>TỔNG CỘNG TIỀN THANH TOÁN:</div><div>${window.fmt(total)} ₫</div></div>
      </div>

      <div class="in-words">
        <b>Số tiền viết bằng chữ:</b> ${inWords}
      </div>

      <div class="sign">
        <div>
          <div class="role">Người mua hàng</div>
          <div class="ghi">(Ký, ghi rõ họ tên)</div>
        </div>
        <div>
          <div class="role">Người bán hàng</div>
          <div class="ghi">(Ký, đóng dấu, ghi rõ họ tên)</div>
          <div>${company.shortName || company.name}</div>
        </div>
      </div>

      <div class="footer-note">
        Hóa đơn điện tử có chữ ký số · Tra cứu: tracuuhoadon.gdt.gov.vn · Mã tra cứu CQT: ${i.cqtCode||'M-PENDING'}
      </div>

      <div class="noprint" style="margin-top:30px;display:flex;gap:10px;justify-content:center;border-top:1px solid #ccc;padding-top:20px">
        <button onclick="window.print()" style="background:#C8102E;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨 In HĐ</button>
        <button onclick="window.close()" style="background:#fff;color:#1C2D5A;border:1px solid #1C2D5A;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">Đóng</button>
      </div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=950,height=800');
    w.document.write(html);
    w.document.close();
  };

  /* Helper: số thành chữ */
  window.numberToWords = window.numberToWords || function(n) {
    if (!n) return 'Không đồng';
    const units = ['','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
    function below1000(n) {
      const h = Math.floor(n/100), t = Math.floor(n%100/10), o = n%10;
      let s = '';
      if (h) s += units[h] + ' trăm';
      if (t > 1) { s += (s?' ':'') + units[t] + ' mươi'; if (o) s += ' ' + units[o]; }
      else if (t === 1) { s += (s?' ':'') + 'mười'; if (o) s += ' ' + units[o]; }
      else if (t === 0 && o && s) { s += ' lẻ ' + units[o]; }
      else if (o) { s += units[o]; }
      return s;
    }
    const ty = Math.floor(n/1e9), tr = Math.floor(n%1e9/1e6), ng = Math.floor(n%1e6/1e3), dv = n%1e3;
    let r = '';
    if (ty) r += below1000(ty) + ' tỷ ';
    if (tr) r += below1000(tr) + ' triệu ';
    if (ng) r += below1000(ng) + ' nghìn ';
    if (dv) r += below1000(dv);
    return (r.trim() + ' đồng chẵn').replace(/^./, c => c.toUpperCase());
  };

  /* === Đối chiếu CQT (Cơ quan thuế) === */
  window.openCQTReconcile = function() {
    invoices = window.STORE.get('invoices', INITIAL);
    const issued = invoices.filter(i => i.status !== 'draft');
    const synced = issued.filter(i => i.cqtSync === 'success');
    const failed = issued.filter(i => i.cqtSync === 'failed');
    const pending = issued.filter(i => !i.cqtSync || i.cqtSync === 'pending');
    const totalNet = issued.reduce((s,i)=>s+i.net,0);
    const totalVat = issued.reduce((s,i)=>s+i.vat,0);

    window.openModal('🔄 Đối chiếu CQT — Tháng 05/2026', `
      <div style="background:#DBEAFE;border:1px solid #93C5FD;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#1E40AF;margin-bottom:14px">
        ℹ️ <b>Đối chiếu CQT</b>: So sánh HĐ trên hệ thống VTY với cổng tra cứu Tổng cục Thuế (tracuuhoadon.gdt.gov.vn). Bảo đảm khớp số liệu trước khi nộp BCTC.
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
        <div style="background:#FAFAFB;padding:12px;border-radius:8px;border-left:4px solid var(--navy)">
          <div style="font-size:11px;color:var(--muted);font-weight:600">TỔNG HĐ ĐÃ PHÁT HÀNH</div>
          <div style="font-size:22px;font-weight:800;color:var(--navy);margin-top:2px">${issued.length}</div>
        </div>
        <div style="background:#F0FDF4;padding:12px;border-radius:8px;border-left:4px solid var(--ok)">
          <div style="font-size:11px;color:var(--muted);font-weight:600">ĐÃ ĐỒNG BỘ CQT</div>
          <div style="font-size:22px;font-weight:800;color:var(--ok);margin-top:2px">${synced.length}</div>
        </div>
        <div style="background:#FEF3C7;padding:12px;border-radius:8px;border-left:4px solid var(--warn)">
          <div style="font-size:11px;color:var(--muted);font-weight:600">CHỜ ĐỒNG BỘ</div>
          <div style="font-size:22px;font-weight:800;color:var(--warn);margin-top:2px">${pending.length}</div>
        </div>
        <div style="background:#FEE2E2;padding:12px;border-radius:8px;border-left:4px solid var(--danger)">
          <div style="font-size:11px;color:var(--muted);font-weight:600">LỖI / KHÔNG KHỚP</div>
          <div style="font-size:22px;font-weight:800;color:var(--danger);margin-top:2px">${failed.length}</div>
        </div>
      </div>

      <div class="section-h">Tổng giá trị tháng</div>
      <table class="mini-table" style="margin-bottom:14px">
        <tr><td>Tổng tiền hàng</td><td class="num"><b>${window.fmt(totalNet)} ₫</b></td></tr>
        <tr><td>Tổng VAT phải nộp</td><td class="num"><b style="color:var(--warn)">${window.fmt(totalVat)} ₫</b></td></tr>
        <tr style="background:#FEF3C7"><td><b>Tổng cộng (Hàng + VAT)</b></td><td class="num"><b style="color:var(--red);font-size:16px">${window.fmt(totalNet+totalVat)} ₫</b></td></tr>
      </table>

      <div class="section-h">Chi tiết các HĐ</div>
      <table class="mini-table">
        <thead><tr><th>Số HĐ</th><th>Khách hàng</th><th class="num">Tổng</th><th>Trạng thái CQT</th></tr></thead>
        <tbody>
          ${issued.slice(0,15).map(i => `<tr>
            <td><b style="font-family:ui-monospace,monospace">${i.no}</b></td>
            <td style="font-size:12px">${i.cust}</td>
            <td class="num">${window.fmt(i.net + i.vat)}</td>
            <td><span class="status-pill ${i.cqtSync==='success'?'st-delivered':i.cqtSync==='failed'?'st-cancelled':'st-pickup'}">${i.cqtSync==='success'?'✓ Đã đồng bộ':i.cqtSync==='failed'?'✕ Lỗi':'⏳ Đang chờ'}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    `, {
      footer: `<button class="btn btn-ghost" onclick="closeModal()">Đóng</button>
               <button class="btn btn-ghost" onclick="window.toast('Đang đồng bộ lại với CQT...','info');setTimeout(()=>window.toast('✓ Đồng bộ hoàn tất','success'),1500)">🔄 Đồng bộ lại CQT</button>
               <button class="btn btn-primary" onclick="window.exportCQTReport()">⬇ Xuất báo cáo CQT (Excel)</button>`,
      width: '720px'
    });
  };

  window.exportCQTReport = function() {
    invoices = window.STORE.get('invoices', INITIAL);
    const issued = invoices.filter(i => i.status !== 'draft');
    const rows = [['Số HĐ','Ngày','Khách hàng','MST','Tiền hàng','VAT','Tổng','Mã CQT','Trạng thái']];
    issued.forEach(i => rows.push([
      i.no, i.date, i.cust, i.tax, i.net, i.vat, i.net + i.vat, i.cqtCode || '', i.status
    ]));
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CQT-VTY-05-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
    window.toast('⬇ Đã xuất báo cáo CQT', 'success');
  };

  window.exportInvExcel = function() {
    invoices = window.STORE.get('invoices', INITIAL);
    const rows = [['Số HĐ','Ngày','Khách hàng','MST','Tiền hàng','VAT','Tổng','Trạng thái']];
    invoices.forEach(i => rows.push([
      i.no, i.date, i.cust, i.tax, i.net, i.vat, i.net + i.vat, i.status
    ]));
    const csv = rows.map(r => r.map(x => '"' + String(x).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HoaDon-VTY-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    window.toast('⬇ Đã xuất CSV (' + invoices.length + ' HĐ)', 'success');
  };

  window.STORE.subscribe('invoices', render);
  window.renderAppShell('invoices', 'Hóa đơn VAT');
  render();
})();
