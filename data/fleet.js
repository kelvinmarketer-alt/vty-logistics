/* =========================================================
   VTY Logistics — Mock data: Xe & Tài xế
   - Bỏ fuel %, thay bằng fuelLogs[]
   - Driver-Vehicle: 1 tài xế có thể chạy nhiều xe → dùng vehicle.lastDriver
     và trips30d tổng hợp theo cả 2 chiều
   - GPS tracking ẩn (sau bật lại qua Settings → Tích hợp)
   ========================================================= */

/* Fuel log helper — mỗi xe có lịch sử đổ xăng */
const _fuelLog = (entries) => entries; // entries = [{date, amount, liters, odometer, by}]

window.VEHICLES = [
  { id:'V01', plate:'29C-55678', type:'Xe tải 1.5T', cap:1.5, capUnit:'tấn',
    lastDriver:'DR03', lastDriverName:'Lê Văn B',
    status:'running', currentOrder:'VTY-526043', currentRoute:'HN → HP',
    odometer:128400, lastService:'28/03/2026', nextRegister:'21/05/2026',
    insurance:'10/01/2027', cost30d:8_240_000, trips30d:48,
    fuelLogs: _fuelLog([
      { date:'17/05/2026 06:30', amount:1_200_000, liters:46, odometer:128400, by:'Lê Văn B' },
      { date:'14/05/2026 07:15', amount:1_150_000, liters:44, odometer:128150, by:'Lê Văn B' },
      { date:'11/05/2026 06:45', amount:1_080_000, liters:41, odometer:127820, by:'Nguyễn Văn A' },
      { date:'08/05/2026 18:20', amount:1_200_000, liters:46, odometer:127520, by:'Lê Văn B' },
      { date:'05/05/2026 07:00', amount:1_120_000, liters:43, odometer:127190, by:'Lê Văn B' },
    ]) },
  { id:'V02', plate:'29C-99988', type:'Xe tải 5T', cap:5, capUnit:'tấn',
    lastDriver:'DR04', lastDriverName:'Phạm Đức',
    status:'running', currentOrder:'VTY-526042', currentRoute:'Bắc Ninh → HCM',
    odometer:215600, lastService:'15/04/2026', nextRegister:'08/09/2026',
    insurance:'22/12/2026', cost30d:18_400_000, trips30d:22,
    fuelLogs: _fuelLog([
      { date:'17/05/2026 05:00', amount:4_800_000, liters:184, odometer:215600, by:'Phạm Đức' },
      { date:'13/05/2026 06:00', amount:4_600_000, liters:177, odometer:214800, by:'Phạm Đức' },
      { date:'09/05/2026 05:30', amount:4_500_000, liters:173, odometer:213600, by:'Lê Văn B' },
      { date:'04/05/2026 06:00', amount:4_700_000, liters:181, odometer:212400, by:'Phạm Đức' },
    ]) },
  { id:'V03', plate:'29C-33344', type:'Xe tải 3.5T', cap:3.5, capUnit:'tấn',
    lastDriver:'DR07', lastDriverName:'Đinh Quang',
    status:'maintenance', currentOrder:null, currentRoute:'Garage Long Biên',
    odometer:184200, lastService:'14/05/2026 (đang)', nextRegister:'30/06/2026',
    insurance:'08/03/2027', cost30d:4_800_000, trips30d:28,
    maintenanceNote:'Thay dầu + lốp sau, dự kiến 17/05 xong',
    fuelLogs: _fuelLog([
      { date:'12/05/2026 07:00', amount:2_800_000, liters:107, odometer:184200, by:'Đinh Quang' },
      { date:'07/05/2026 06:30', amount:2_700_000, liters:104, odometer:183600, by:'Đinh Quang' },
      { date:'02/05/2026 07:15', amount:2_650_000, liters:102, odometer:182900, by:'Phạm Đức' },
    ]) },
  { id:'V04', plate:'29C-11122', type:'Xe tải 2.5T', cap:2.5, capUnit:'tấn',
    lastDriver:'DR06', lastDriverName:'Bùi Văn C',
    status:'running', currentOrder:'VTY-526046', currentRoute:'Khâm Thiên → Times City (chuyển nhà)',
    odometer:95400, lastService:'01/04/2026', nextRegister:'14/07/2026',
    insurance:'18/02/2027', cost30d:6_200_000, trips30d:34,
    fuelLogs: _fuelLog([
      { date:'16/05/2026 07:00', amount:2_100_000, liters:81, odometer:95400, by:'Bùi Văn C' },
      { date:'12/05/2026 06:30', amount:2_000_000, liters:77, odometer:94850, by:'Bùi Văn C' },
      { date:'08/05/2026 07:15', amount:2_050_000, liters:79, odometer:94300, by:'Đinh Quang' },
      { date:'04/05/2026 06:45', amount:2_000_000, liters:77, odometer:93750, by:'Bùi Văn C' },
    ]) },
  { id:'V05', plate:'29C-66677', type:'Xe tải 1.5T', cap:1.5, capUnit:'tấn',
    lastDriver:null, lastDriverName:'(chưa phân công)',
    status:'idle', currentOrder:null, currentRoute:'Bãi đỗ',
    odometer:64200, lastService:'15/03/2026', nextRegister:'10/08/2026',
    insurance:'25/11/2026', cost30d:0, trips30d:0,
    fuelLogs: _fuelLog([
      { date:'10/04/2026 07:00', amount:900_000, liters:35, odometer:64200, by:'Nguyễn Văn A' },
    ]) },
  { id:'V06', plate:'29C-77788', type:'Xe tải 3.5T', cap:3.5, capUnit:'tấn',
    lastDriver:'DR04', lastDriverName:'Phạm Đức',
    status:'idle', currentOrder:null, currentRoute:'Bãi đỗ Cầu Giấy',
    odometer:42800, lastService:'05/04/2026', nextRegister:'15/01/2027',
    insurance:'30/06/2027', cost30d:2_400_000, trips30d:8,
    fuelLogs: _fuelLog([
      { date:'15/05/2026 07:00', amount:2_500_000, liters:96, odometer:42800, by:'Phạm Đức' },
      { date:'08/05/2026 06:45', amount:2_400_000, liters:92, odometer:42300, by:'Bùi Văn C' },
    ]) },
];

window.DRIVERS = [
  { id:'DR03', code:'TX001', name:'Lê Văn B', phone:'0912 666 777', license:'C · 11/2027',
    canDrive:['V01','V02','V05','V06'],         /* lái được nhiều xe */
    primaryVehicle:'V01', primaryPlate:'29C-55678',
    status:'running', joinDate:'08/03/2023',
    trips30d:48, revenue30d:96_400_000, rating:4.7,
    address:'Đông Anh, Hà Nội',
    recentTrips:[
      { date:'17/05', orderCode:'VTY-526043', vehicle:'29C-55678', route:'HN → HP' },
      { date:'16/05', orderCode:'VTY-526012', vehicle:'29C-55678', route:'HN → Vinh' },
      { date:'12/05', orderCode:'VTY-525981', vehicle:'29C-55678', route:'HP → HN' },
    ]},
  { id:'DR04', code:'TX002', name:'Phạm Đức', phone:'0936 888 999', license:'FC · 03/2030',
    canDrive:['V02','V06','V03'],
    primaryVehicle:'V02', primaryPlate:'29C-99988',
    status:'running', joinDate:'12/09/2022',
    trips30d:24, revenue30d:184_200_000, rating:4.9,
    address:'Long Biên, Hà Nội',
    recentTrips:[
      { date:'17/05', orderCode:'VTY-526042', vehicle:'29C-99988', route:'BN → HCM' },
      { date:'17/05', orderCode:'VTY-526047', vehicle:'29C-99988', route:'HD → HCM' },
      { date:'13/05', orderCode:'VTY-525994', vehicle:'29C-99988', route:'HD → HCM' },
      { date:'15/05', orderCode:'(thuê xe)', vehicle:'29C-77788', route:'Test xe mới' },
    ]},
  { id:'DR06', code:'TX003', name:'Bùi Văn C', phone:'0944 333 444', license:'C · 02/2029',
    canDrive:['V04','V01','V06'],
    primaryVehicle:'V04', primaryPlate:'29C-11122',
    status:'running', joinDate:'18/11/2024',
    trips30d:34, revenue30d:48_600_000, rating:4.5,
    address:'Cầu Giấy, Hà Nội',
    recentTrips:[
      { date:'17/05', orderCode:'VTY-526046', vehicle:'29C-11122', route:'Chuyển nhà Đống Đa' },
      { date:'14/05', orderCode:'(chuyển nhà)', vehicle:'29C-11122', route:'Hà Đông → Mỹ Đình' },
    ]},
  { id:'DR07', code:'TX004', name:'Đinh Quang', phone:'0967 555 666', license:'FC · 12/2028',
    canDrive:['V03','V04'],
    primaryVehicle:'V03', primaryPlate:'29C-33344',
    status:'off', joinDate:'04/07/2023',
    trips30d:28, revenue30d:72_400_000, rating:4.7,
    address:'Hoàng Mai, Hà Nội',
    recentTrips:[
      { date:'17/05', orderCode:'VTY-526049', vehicle:'29C-33344', route:'Thuê cẩu HP' },
    ]},
  { id:'DR01', code:'TX005', name:'Nguyễn Văn A', phone:'0901 222 333', license:'B2 · 01/2028',
    canDrive:['V05','V01'],
    primaryVehicle:'V05', primaryPlate:'29C-66677',
    status:'off', joinDate:'15/06/2024',
    trips30d:12, revenue30d:8_400_000, rating:4.8,
    address:'Cầu Giấy, Hà Nội',
    recentTrips:[
      { date:'11/05', orderCode:'(thuê)', vehicle:'29C-55678', route:'HN → Vĩnh Phúc' },
    ]},
];
