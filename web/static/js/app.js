const PAL=[
  {id:'H1',n:'白',h:'#FFFFFF'},{id:'H2',n:'奶白',h:'#FFF5E8'},{id:'A2',n:'米色',h:'#F5DEB3'},
  {id:'A3',n:'浅黄',h:'#FFE87A'},{id:'A4',n:'黄',h:'#FFD700'},{id:'A5',n:'深黄',h:'#FFC200'},
  {id:'A6',n:'橙黄',h:'#FFAA00'},{id:'A7',n:'橙',h:'#E8500A'},{id:'A8',n:'深橙',h:'#CC4400'},
  {id:'A9',n:'红橙',h:'#FF4500'},{id:'A10',n:'砖红',h:'#CC3300'},{id:'A11',n:'红',h:'#EE1111'},
  {id:'A12',n:'深红',h:'#BB0000'},{id:'A13',n:'玫红',h:'#DD0044'},{id:'A14',n:'肤色',h:'#FFCBA4'},
  {id:'A15',n:'桃红',h:'#FF8888'},{id:'A16',n:'粉红',h:'#FFB6C1'},{id:'B1',n:'淡紫',h:'#E6CCFF'},
  {id:'B2',n:'紫',h:'#9B59B6'},{id:'B3',n:'深紫',h:'#6C2FAA'},{id:'B4',n:'靛蓝',h:'#4B0082'},
  {id:'B5',n:'宝蓝',h:'#0047AB'},{id:'B6',n:'蓝',h:'#1E90FF'},{id:'B7',n:'天蓝',h:'#87CEEB'},
  {id:'B8',n:'浅蓝',h:'#B0D4FF'},{id:'C1',n:'青',h:'#00CED1'},{id:'C2',n:'翠绿',h:'#00B892'},
  {id:'C3',n:'草绿',h:'#4CAF50'},{id:'C4',n:'深绿',h:'#1B6B2F'},{id:'C5',n:'橄榄',h:'#556B2F'},
  {id:'C6',n:'黄绿',h:'#9ACD32'},{id:'C7',n:'浅绿',h:'#BBEE99'},{id:'G1',n:'浅灰',h:'#D3D3D3'},
  {id:'G2',n:'灰',h:'#A0A0A0'},{id:'G3',n:'中灰',h:'#808080'},{id:'G4',n:'深灰',h:'#555555'},
  {id:'H3',n:'炭灰',h:'#3A3A3A'},{id:'H4',n:'深炭',h:'#222222'},{id:'H7',n:'黑',h:'#111111'},
  {id:'G9',n:'驼棕',h:'#C8A46E'},{id:'G8',n:'棕',h:'#8B4513'},{id:'G7',n:'深棕',h:'#5D2E0C'},
  {id:'H5',n:'金',h:'#DAA520'},{id:'H6',n:'银',h:'#C0C0C0'},
  {id:'D1',n:'浅橙',h:'#FFDAB9'},{id:'D2',n:'珊瑚',h:'#FF7F50'},{id:'D3',n:'紫灰',h:'#9E8FA0'},
];

const S={
  grid:null,W:32,H:32,cs:14,
  showGrid:true,showCode:true,guideOn:true,guideInt:8,guideW:2,guideCol:'#E8500A',
  tool:'paint',selColor:PAL[6],colorCnt:48,
  isDown:false,mergeFrom:null,lastImg:null,
  currentDesignId:null,
  currentTitle:'',
  suggestedTitle:'',
  isDirty:false,
  user:null,
  squareMode:true, // true = force square canvas
};

const bc=document.getElementById('bc');
const ctx=bc.getContext('2d');

function pad2(n){
  return String(n).padStart(2,'0');
}

function generateTimestampTitle(date=new Date()){
  return `拼豆作品-${date.getFullYear()}${pad2(date.getMonth()+1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function ensureSuggestedTitle(force=false){
  if(force || !S.suggestedTitle){
    S.suggestedTitle = generateTimestampTitle();
  }
  if(force || !S.currentTitle){
    S.currentTitle = S.suggestedTitle;
  }
  return S.currentTitle;
}

function markDirty(v=true){
  S.isDirty = v;
}

function hasWorkInProgress(){
  return Boolean(S.grid || S.lastImg);
}

function confirmDiscardChanges(message='当前有未保存的编辑内容，确定继续吗？'){
  if(!hasWorkInProgress()) return true;
  if(!S.isDirty && S.currentDesignId) return true;
  return window.confirm(message);
}

function setDesignState(design){
  S.currentDesignId = design.id || null;
  S.currentTitle = design.title || generateTimestampTitle();
  S.suggestedTitle = S.currentTitle;
  S.W = design.width;
  S.H = design.height;
  S.colorCnt = design.color_count;
  S.grid = design.grid_data;
  document.getElementById('placeholder').style.display = 'none';
  bc.style.display = 'block';
  computeCS();
  renderAll();
  updateStats();
  enableBtns(true);
  updateSizeUI();
  updateColorCountUI();
  updateUserUI();
  markDirty(false);
}

function resetEditorState(){
  S.currentDesignId = null;
  S.grid = null;
  S.lastImg = null;
  ensureSuggestedTitle(true);
  bc.style.display = 'none';
  document.getElementById('placeholder').style.display = 'flex';
  enableBtns(false);
  resetStats();
  updateUserUI();
  markDirty(false);
}

function updateColorCountUI(){
  document.querySelectorAll('.col-chip').forEach(chip=>{
    chip.classList.toggle('on', parseInt(chip.dataset.v,10)===S.colorCnt);
  });
}

function resetStats(){
  document.getElementById('statTitle').textContent='拼豆使用量统计（0 颗）';
  document.getElementById('statHint').style.display='block';
  document.getElementById('statHint').textContent='选择图片后可查看颜色统计';
  document.getElementById('statCards').style.display='none';
  document.getElementById('statCards').innerHTML='';
}

function setSize(v){
  S.W=v;
  S.H=v;
  document.getElementById('szRange').value=v;
  document.getElementById('szNum').textContent=v;
  document.getElementById('szLabel').textContent=`${v}*${v}`;
  document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',parseInt(c.dataset.v,10)===v));
}

function resizeGrid(nextSize){
  if(!S.grid) return;
  const nextGrid=Array.from({length:nextSize},(_,y)=>Array.from({length:nextSize},(_,x)=>S.grid[y]?.[x]||null));
  S.grid=nextGrid;
}

function updateBeanHeightValue(){
  const bh=document.getElementById('bh').value;
  document.getElementById('bhV').textContent=bh;
}

// ============ Auth Functions ============
let oidcEnabled = false;

async function checkOIDCStatus() {
  try {
    const res = await fetch('/api/auth/oidc/status');
    const data = await res.json();
    oidcEnabled = data.enabled;
    updateOIDCUI();
  } catch(e) {
    oidcEnabled = false;
  }
}

function updateOIDCUI() {
  const oidcSection = document.getElementById('oidcSection');
  if (oidcSection) {
    oidcSection.classList.toggle('hidden', !oidcEnabled);
  }
}

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      S.user = await res.json();
      updateUserUI();
      loadDesigns();
    } else {
      S.user = null;
      updateUserUI();
    }
  } catch(e) {
    S.user = null;
    updateUserUI();
  }
}

function updateUserUI() {
  const userInfo = document.getElementById('userInfo');
  const userAvatar = document.getElementById('userAvatar');
  const userDisplayName = document.getElementById('userDisplayName');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const myDesigns = document.getElementById('myDesigns');
  const saveBtn = document.getElementById('btnSave');
  const shareBtn = document.getElementById('btnShare');

  if (S.user) {
    userInfo.style.display = 'flex';
    // Show nickname if available, otherwise show username (truncate if too long)
    const displayName = S.user.nickname || S.user.username;
    userDisplayName.textContent = displayName.length > 12 ? displayName.slice(0, 12) + '...' : displayName;
    userDisplayName.title = displayName;
    // Avatar shows first character
    userAvatar.textContent = (displayName.charAt(0) || 'U').toUpperCase();
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    myDesigns.style.display = 'block';
    saveBtn.style.display = S.grid ? 'block' : 'none';
    shareBtn.style.display = S.currentDesignId ? 'block' : 'none';
  } else {
    userInfo.style.display = 'none';
    loginBtn.style.display = 'block';
    registerBtn.style.display = 'block';
    myDesigns.style.display = 'none';
    saveBtn.style.display = 'none';
    shareBtn.style.display = 'none';
  }
}

function showAuthModal(type) {
  const modal = document.getElementById('authModal');
  const title = modal.querySelector('h3');
  const submitBtn = modal.querySelector('.submit-btn');
  const switchLink = modal.querySelector('.switch-link');

  modal.dataset.type = type;
  modal.classList.remove('hidden');

  if (type === 'login') {
    title.textContent = '登录';
    submitBtn.textContent = '登录';
    switchLink.innerHTML = '没有账号？<a onclick="showAuthModal(\'register\')">注册</a>';
  } else {
    title.textContent = '注册';
    submitBtn.textContent = '注册';
    switchLink.innerHTML = '已有账号？<a onclick="showAuthModal(\'login\')">登录</a>';
  }
}

function hideAuthModal() {
  document.getElementById('authModal').classList.add('hidden');
  document.getElementById('authError').textContent = '';
}

async function submitAuth() {
  const modal = document.getElementById('authModal');
  const type = modal.dataset.type;
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');

  if (!username || !password) {
    errorEl.textContent = '请填写用户名和密码';
    return;
  }

  try {
    const res = await fetch(`/api/auth/${type}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || '操作失败';
      return;
    }
    S.user = data;
    hideAuthModal();
    updateUserUI();
    loadDesigns();
  } catch(e) {
    errorEl.textContent = '网络错误';
  }
}

async function logout() {
  await fetch('/api/auth/logout', {method: 'POST'});
  S.user = null;
  S.currentDesignId = null;
  hideUserMenu();
  updateUserUI();
}

// User Context Menu
function showUserMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('userMenu');
  menu.classList.remove('hidden');

  // Position menu near the user info
  const rect = e.currentTarget.getBoundingClientRect();
  menu.style.top = (rect.bottom + 8) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.style.left = 'auto';
}

function hideUserMenu() {
  document.getElementById('userMenu').classList.add('hidden');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu') && !e.target.closest('.user-info')) {
    hideUserMenu();
  }
});

// Settings Modal
function showSettingsModal() {
  hideUserMenu();
  const modal = document.getElementById('settingsModal');
  document.getElementById('settingsNickname').value = S.user?.nickname || '';
  document.getElementById('settingsUsername').value = S.user?.username || '';
  modal.classList.remove('hidden');
}

function hideSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

async function saveSettings() {
  const nickname = document.getElementById('settingsNickname').value.trim();

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nickname})
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || '保存失败', 'error');
      return;
    }

    S.user = await res.json();
    hideSettingsModal();
    updateUserUI();
    showToast('设置已保存');
  } catch(e) {
    showToast('网络错误', 'error');
  }
}

// OIDC Login
function oidcLogin() {
  window.location.href = '/api/auth/oidc/login';
}

// Change Password
function showChangePwdModal() {
  hideUserMenu();
  document.getElementById('changePwdModal').classList.remove('hidden');
  document.getElementById('oldPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('changePwdError').textContent = '';

  // Check if OIDC user (username starts with oidc_)
  if (S.user && S.user.username && S.user.username.startsWith('oidc_')) {
    document.getElementById('oldPwdHint').style.display = 'block';
    document.getElementById('oldPassword').placeholder = 'OIDC用户可跳过';
  } else {
    document.getElementById('oldPwdHint').style.display = 'none';
    document.getElementById('oldPassword').placeholder = '请输入旧密码';
  }
}

function hideChangePwdModal() {
  document.getElementById('changePwdModal').classList.add('hidden');
}

async function submitChangePwd() {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorEl = document.getElementById('changePwdError');

  if (!newPassword) {
    errorEl.textContent = '请输入新密码';
    return;
  }

  if (newPassword.length < 6 || newPassword.length > 50) {
    errorEl.textContent = '新密码长度需为6-50位';
    return;
  }

  if (newPassword !== confirmPassword) {
    errorEl.textContent = '两次输入的密码不一致';
    return;
  }

  try {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword
      })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || '修改失败';
      return;
    }

    hideChangePwdModal();
    showToast(data.message || '密码修改成功');
  } catch(e) {
    errorEl.textContent = '网络错误';
  }
}

// ============ Design Functions ============
async function loadDesigns() {
  if (!S.user) return;
  try {
    const res = await fetch('/api/designs');
    const designs = await res.json();
    renderDesignList(designs);
  } catch(e) {
    console.error('Failed to load designs:', e);
  }
}

function renderDesignList(designs) {
  const list = document.getElementById('designList');
  if (!designs.length) {
    list.innerHTML = '<div style="color:var(--tx3);font-size:12px;text-align:center;padding:10px">暂无保存的作品</div>';
    return;
  }
  list.innerHTML = designs.map(d => `
    <div class="design-item" data-id="${d.id}" onclick="loadDesign('${d.id}')">
      <div class="title">${escapeHtml(d.title)}${d.share_code ? '<span class="share-badge">已分享</span>' : ''}</div>
      <div class="meta">${d.width}×${d.height} · ${d.updated_at.slice(0,10)}</div>
    </div>
  `).join('');
}

async function loadDesign(id) {
  if (!confirmDiscardChanges('当前作品尚未保存，加载其他作品会丢失这些修改，确定继续吗？')) {
    return;
  }
  try {
    const res = await fetch(`/api/designs/${id}`);
    if (!res.ok) return;
    const d = await res.json();
    S.lastImg = null;
    setDesignState(d);
  } catch(e) {
    console.error('Failed to load design:', e);
  }
}

// ============ Toast Notification ============
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  toast.className = 'toast ' + type;
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ============ Save Modal ============
function showSaveModal() {
  if (!S.user || !S.grid) return;
  const modal = document.getElementById('saveModal');
  const input = document.getElementById('saveTitle');
  input.value = ensureSuggestedTitle();
  modal.classList.remove('hidden');
  input.select();
  setTimeout(() => input.focus(), 100);
}

function hideSaveModal() {
  document.getElementById('saveModal').classList.add('hidden');
}

async function confirmSave() {
  const title = document.getElementById('saveTitle').value.trim() || ensureSuggestedTitle();
  hideSaveModal();

  const data = {
    title,
    width: S.W,
    height: S.H,
    color_count: S.colorCnt,
    grid_data: S.grid
  };

  try {
    let res;
    if (S.currentDesignId) {
      res = await fetch(`/api/designs/${S.currentDesignId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const d = await res.json();
        setDesignState(d);
      }
    } else {
      res = await fetch('/api/designs', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const d = await res.json();
        setDesignState(d);
      }
    }
    if (res.ok) {
      S.currentTitle = title;
      S.suggestedTitle = title;
      markDirty(false);
      showToast('保存成功！');
      loadDesigns();
      updateUserUI();
    } else {
      showToast('保存失败', 'error');
    }
  } catch(e) {
    showToast('网络错误', 'error');
  }
}

// ============ Works Panel (Full Screen) ============
function showWorksPanel() {
  document.getElementById('worksPanel').classList.remove('hidden');
  loadWorksList();
}

function hideWorksPanel() {
  document.getElementById('worksPanel').classList.add('hidden');
}

async function loadWorksList() {
  if (!S.user) return;
  const content = document.getElementById('worksContent');
  content.innerHTML = '<div class="works-empty">加载中...</div>';

  try {
    const res = await fetch('/api/designs');
    const designs = await res.json();

    if (!designs.length) {
      content.innerHTML = '<div class="works-empty">暂无保存的作品</div>';
      return;
    }

    content.innerHTML = designs.map(d => `
      <div class="work-card" data-id="${d.id}">
        <div class="preview" id="preview-${d.id}"></div>
        <div class="info">
          <div class="title">${escapeHtml(d.title)}${d.share_code ? '<span class="share-badge">已分享</span>' : ''}</div>
          <div class="meta">${d.width}×${d.height} · ${d.updated_at.slice(0,10)}</div>
          <div class="actions">
            <button class="gray-btn" onclick="loadDesignFromPanel('${d.id}')">编辑</button>
            <button class="gray-btn" onclick="shareDesignById('${d.id}')">分享</button>
            <button class="gray-btn" onclick="deleteDesign('${d.id}')">删除</button>
          </div>
        </div>
      </div>
    `).join('');

    // Render previews
    designs.forEach(d => renderWorkPreview(d));
  } catch(e) {
    content.innerHTML = '<div class="works-empty">加载失败</div>';
  }
}

function renderWorkPreview(design) {
  const container = document.getElementById(`preview-${design.id}`);
  if (!container || !design.grid_data) return;

  const previewSize = 100;
  const cellSize = Math.max(2, Math.floor(previewSize / Math.max(design.width, design.height)));

  const canvas = document.createElement('canvas');
  canvas.width = design.width * cellSize;
  canvas.height = design.height * cellSize;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < design.height; y++) {
    for (let x = 0; x < design.width; x++) {
      const c = design.grid_data[y]?.[x];
      ctx.fillStyle = c ? c.h : '#EEEEEE';
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  container.appendChild(canvas);
}

async function loadDesignFromPanel(id) {
  const before = S.currentDesignId;
  await loadDesign(id);
  if (before !== S.currentDesignId || id === S.currentDesignId) {
    hideWorksPanel();
  }
}

async function deleteDesign(id) {
  if (!confirm('确定要删除这个作品吗？')) return;

  try {
    const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('删除成功');
      loadDesigns();
      loadWorksList();
      if (S.currentDesignId === id) {
        newDesign();
      }
    } else {
      showToast('删除失败', 'error');
    }
  } catch(e) {
    showToast('网络错误', 'error');
  }
}

async function shareDesignById(id) {
  try {
    const res = await fetch(`/api/designs/${id}/share`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      const url = `${location.origin}/share/${data.share_code}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('分享链接已复制到剪贴板');
      }).catch(() => {
        prompt('分享链接：', url);
      });
      loadWorksList();
      loadDesigns();
    } else {
      showToast('分享失败', 'error');
    }
  } catch(e) {
    showToast('网络错误', 'error');
  }
}

async function newDesign() {
  if (!confirmDiscardChanges('当前有未保存的图片或编辑内容，新建会清空当前画布，确定继续吗？')) {
    return;
  }
  resetEditorState();
}

async function shareDesign() {
  if (!S.currentDesignId) return;
  try {
    const res = await fetch(`/api/designs/${S.currentDesignId}/share`, {method: 'POST'});
    const data = await res.json();
    if (res.ok) {
      const url = `${location.origin}/share/${data.share_code}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('分享链接已复制到剪贴板');
      }).catch(() => {
        prompt('分享链接：', url);
      });
      loadDesigns();
    }
  } catch(e) {
    showToast('分享失败', 'error');
  }
}

// ============ Canvas Functions ============
function h2r(hex){
  if(!hex||hex.length<7)return{r:128,g:128,b:128};
  return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};
}
function cdist(r1,g1,b1,r2,g2,b2){return(r1-r2)**2+(g1-g2)**2+(b1-b2)**2}
function nearest(r,g,b,pal){
  let best=pal[0],bd=Infinity;
  for(const c of pal){const cr=h2r(c.h);const d=cdist(r,g,b,cr.r,cr.g,cr.b);if(d<bd){bd=d;best=c}}
  return best;
}
function buildPal(cnt){return PAL.slice(0,Math.min(cnt,PAL.length))}

function processImg(img){
  const off=document.getElementById('offC');
  off.width=S.W;off.height=S.H;
  const oc=off.getContext('2d');
  oc.drawImage(img,0,0,S.W,S.H);
  const id=oc.getImageData(0,0,S.W,S.H);
  const pal=buildPal(S.colorCnt);
  S.grid=Array.from({length:S.H},(_,y)=>Array.from({length:S.W},(_,x)=>{
    const i=(y*S.W+x)*4;
    if(id.data[i+3]<60)return null;
    return nearest(id.data[i],id.data[i+1],id.data[i+2],pal);
  }));
  computeCS();renderAll();updateStats();
  enableBtns(true);
  markDirty(true);
}

function computeCS(){
  const area=document.getElementById('canvas-area');
  const mw=Math.max(area.clientWidth-40,160);
  const mh=Math.max(area.clientHeight-40,160);
  S.cs=Math.max(5,Math.min(Math.floor(mw/S.W),Math.floor(mh/S.H),24));
}

function renderAll(){
  if(!S.grid)return;
  bc.width=S.W*S.cs;bc.height=S.H*S.cs;
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){
    const c=S.grid[y][x];
    ctx.fillStyle=c?c.h:'#EEEEEE';
    ctx.fillRect(x*S.cs,y*S.cs,S.cs,S.cs);
  }
  if(S.showCode&&S.cs>=14){
    for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){
      const c=S.grid[y][x];if(!c)continue;
      const cr=h2r(c.h);const br=(cr.r*299+cr.g*587+cr.b*114)/1000;
      ctx.fillStyle=br>140?'rgba(0,0,0,0.35)':'rgba(255,255,255,0.55)';
      ctx.font=`bold ${Math.max(6,S.cs*0.38)}px sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(c.id,(x+0.5)*S.cs,(y+0.5)*S.cs);
    }
  }
  if(S.showGrid&&S.cs>=5){
    ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.lineWidth=0.5;
    for(let x=0;x<=S.W;x++){ctx.beginPath();ctx.moveTo(x*S.cs,0);ctx.lineTo(x*S.cs,S.H*S.cs);ctx.stroke()}
    for(let y=0;y<=S.H;y++){ctx.beginPath();ctx.moveTo(0,y*S.cs);ctx.lineTo(S.W*S.cs,y*S.cs);ctx.stroke()}
  }
  if(S.guideOn){
    ctx.strokeStyle=S.guideCol;ctx.lineWidth=S.guideW;
    for(let x=S.guideInt;x<S.W;x+=S.guideInt){ctx.beginPath();ctx.moveTo(x*S.cs,0);ctx.lineTo(x*S.cs,S.H*S.cs);ctx.stroke()}
    for(let y=S.guideInt;y<S.H;y+=S.guideInt){ctx.beginPath();ctx.moveTo(0,y*S.cs);ctx.lineTo(S.W*S.cs,y*S.cs);ctx.stroke()}
  }
}

function updateStats(){
  if(!S.grid)return;
  const cnt={};let tot=0;
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){
    const c=S.grid[y][x];if(!c)continue;
    if(!cnt[c.id])cnt[c.id]={c,n:0};cnt[c.id].n++;tot++;
  }
  document.getElementById('statTitle').textContent=`拼豆使用量统计（${tot} 颗）`;
  const sorted=Object.values(cnt).sort((a,b)=>b.n-a.n);
  const el=document.getElementById('statCards');
  const hint=document.getElementById('statHint');
  if(!sorted.length){el.style.display='none';hint.style.display='block';return}
  hint.style.display='none';el.style.display='flex';
  el.innerHTML=sorted.slice(0,20).map(({c,n})=>`
    <div class="stat-card" data-id="${c.id}" onclick="selColor('${c.id}')">
      <div class="csw" style="background:${c.h}"></div>
      <div class="cid">${c.id}</div>
      <div class="cnt">${n} 颗</div>
    </div>`).join('');
}

function selColor(id){
  const c=PAL.find(p=>p.id===id);if(!c)return;
  S.selColor=c;
  document.getElementById('selbox').style.background=c.h;
  document.querySelectorAll('.stat-card').forEach(el=>el.classList.toggle('sel',el.dataset.id===id));
}
selColor('A7');

function getCell(e){
  const r=bc.getBoundingClientRect();
  const sx=bc.width/r.width,sy=bc.height/r.height;
  const cx=(e.clientX||(e.touches?.[0]?.clientX)||0)-r.left;
  const cy=(e.clientY||(e.touches?.[0]?.clientY)||0)-r.top;
  return{x:Math.floor(cx*sx/S.cs),y:Math.floor(cy*sy/S.cs)};
}
function paintAt(x,y){
  if(x<0||x>=S.W||y<0||y>=S.H)return;
  if(S.tool==='erase')S.grid[y][x]=null;
  else if(S.tool==='paint'&&S.selColor)S.grid[y][x]=S.selColor;
  markDirty(true);
}
function mergeColor(fromId,toColor){
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++)
    if(S.grid[y][x]?.id===fromId)S.grid[y][x]=toColor;
  markDirty(true);
  renderAll();updateStats();
}

bc.addEventListener('mousedown',e=>{if(!S.grid)return;S.isDown=true;const{x,y}=getCell(e);
  if(S.tool==='merge'){S.mergeFrom=S.grid[y]?.[x]?.id||null;}
  else{paintAt(x,y);renderAll();}});
bc.addEventListener('mousemove',e=>{if(!S.isDown||!S.grid)return;const{x,y}=getCell(e);
  if(S.tool==='merge'&&S.mergeFrom){const c=S.grid[y]?.[x];if(c&&c.id!==S.mergeFrom){mergeColor(S.mergeFrom,c);S.mergeFrom=c.id;}}
  else{paintAt(x,y);renderAll();}});
bc.addEventListener('mouseup',()=>{S.isDown=false;updateStats();});
bc.addEventListener('mouseleave',()=>{S.isDown=false;});
bc.addEventListener('touchstart',e=>{e.preventDefault();if(!S.grid)return;S.isDown=true;const{x,y}=getCell(e);paintAt(x,y);renderAll();},{passive:false});
bc.addEventListener('touchmove',e=>{e.preventDefault();if(!S.isDown)return;const{x,y}=getCell(e);paintAt(x,y);renderAll();},{passive:false});
bc.addEventListener('touchend',()=>{S.isDown=false;updateStats();});

function setTool(t){S.tool=t;['tPaint','tMerge','tErase'].forEach(id=>document.getElementById(id).classList.remove('on'));
  document.getElementById({paint:'tPaint',merge:'tMerge',erase:'tErase'}[t]).classList.add('on');
  bc.style.cursor=t==='erase'?'cell':t==='merge'?'grab':'crosshair';}
document.getElementById('tPaint').addEventListener('click',()=>setTool('paint'));
document.getElementById('tMerge').addEventListener('click',()=>setTool('merge'));
document.getElementById('tErase').addEventListener('click',()=>setTool('erase'));

function updateSizeUI(){
  document.getElementById('szRange').value=S.W;
  document.getElementById('szNum').textContent=S.W;
  const label = S.squareMode ? `${S.W}*${S.W}` : `${S.W}*${S.H}`;
  document.getElementById('szLabel').textContent=label;
  document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('on',parseInt(c.dataset.v)===S.W));
}

document.getElementById('szRange').addEventListener('input',e=>{
  const v=parseInt(e.target.value,10);
  if(S.grid && !S.lastImg) resizeGrid(v);
  setSize(v);
  if(S.lastImg)processImg(S.lastImg);
  else if(S.grid){markDirty(true);computeCS();renderAll();updateStats();}
});
document.getElementById('sizeChips').addEventListener('click',e=>{
  const chip=e.target.closest('.chip');if(!chip)return;
  const v=parseInt(chip.dataset.v,10);
  if(S.grid && !S.lastImg) resizeGrid(v);
  setSize(v);
  if(S.lastImg)processImg(S.lastImg);
  else if(S.grid){markDirty(true);computeCS();renderAll();updateStats();}
});
document.getElementById('colChips').addEventListener('click',e=>{
  const chip=e.target.closest('.col-chip');if(!chip)return;
  S.colorCnt=parseInt(chip.dataset.v,10);
  updateColorCountUI();
  if(S.lastImg)processImg(S.lastImg);
  else if(S.grid){markDirty(true);updateStats();}
});

document.getElementById('tgGrid').addEventListener('click',()=>{S.showGrid=!S.showGrid;document.getElementById('tgGrid').textContent=S.showGrid?'显示':'隐藏';document.getElementById('tgGrid').classList.toggle('on',S.showGrid);renderAll();});
document.getElementById('tgCode').addEventListener('click',()=>{S.showCode=!S.showCode;document.getElementById('tgCode').textContent=S.showCode?'显示':'隐藏';document.getElementById('tgCode').classList.toggle('on',S.showCode);renderAll();});
document.getElementById('tgStat').addEventListener('click',()=>{const btn=document.getElementById('tgStat');const cards=document.getElementById('statCards');const isOn=btn.classList.toggle('on');btn.textContent=isOn?'显示':'隐藏';cards.style.display=isOn?'flex':'none';});
document.getElementById('tgOrig').addEventListener('click',()=>{const btn=document.getElementById('tgOrig');S.showOrig=btn.classList.toggle('on');btn.textContent=S.showOrig?'显示':'隐藏';});
document.getElementById('tgGuide').addEventListener('click',()=>{S.guideOn=!S.guideOn;document.getElementById('tgGuide').textContent=S.guideOn?'已开启':'已关闭';document.getElementById('tgGuide').classList.toggle('on',S.guideOn);renderAll();});
document.getElementById('tgFlip').addEventListener('click',()=>{if(S.grid){for(let y=0;y<S.H;y++)S.grid[y].reverse();markDirty(true);renderAll();updateStats();}});
document.getElementById('tgSq').addEventListener('click',()=>{
  S.squareMode = !S.squareMode;
  const btn = document.getElementById('tgSq');
  btn.textContent = S.squareMode ? '关闭' : '开启';
  btn.classList.toggle('on', !S.squareMode);
  updateSizeUI();
});

document.getElementById('guideInt').addEventListener('input',e=>{S.guideInt=parseInt(e.target.value);document.getElementById('guideIntV').textContent=e.target.value;document.getElementById('guideHint').textContent=`每 ${e.target.value} 格显示一条辅助线`;renderAll();});
document.getElementById('guideW').addEventListener('input',e=>{S.guideW=parseInt(e.target.value);document.getElementById('guideWV').textContent=e.target.value+'px';renderAll();});
document.getElementById('guideColor').addEventListener('input',e=>{S.guideCol=e.target.value;renderAll();});

document.getElementById('fileIn').addEventListener('change',e=>{
  const f=e.target.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=ev=>{const img=new Image();img.onload=()=>{S.currentDesignId=null;ensureSuggestedTitle(true);S.lastImg=img;document.getElementById('placeholder').style.display='none';bc.style.display='block';processImg(img);updateUserUI();};img.src=ev.target.result;};
  reader.readAsDataURL(f);
  e.target.value='';
});
document.getElementById('btnRegen').addEventListener('click',()=>{if(S.lastImg)processImg(S.lastImg);});
document.getElementById('btnClear').addEventListener('click',()=>{if(S.grid){S.grid=Array.from({length:S.H},()=>Array(S.W).fill(null));markDirty(true);renderAll();updateStats();}});

function doExport(){
  if(!S.grid)return;
  const es=20;const ec=document.createElement('canvas');ec.width=S.W*es;ec.height=S.H*es;
  const ec2=ec.getContext('2d');
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){
    const c=S.grid[y][x];ec2.fillStyle=c?c.h:'#EEEEEE';ec2.fillRect(x*es,y*es,es,es);
    if(c){const cr=h2r(c.h);const br=(cr.r*299+cr.g*587+cr.b*114)/1000;
      ec2.fillStyle=br>140?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.5)';
      ec2.font='bold 7px sans-serif';ec2.textAlign='center';ec2.textBaseline='middle';
      ec2.fillText(c.id,(x+0.5)*es,(y+0.5)*es);}
  }
  ec2.strokeStyle='rgba(0,0,0,0.15)';ec2.lineWidth=0.5;
  for(let x=0;x<=S.W;x++){ec2.beginPath();ec2.moveTo(x*es,0);ec2.lineTo(x*es,S.H*es);ec2.stroke()}
  for(let y=0;y<=S.H;y++){ec2.beginPath();ec2.moveTo(0,y*es);ec2.lineTo(S.W*es,y*es);ec2.stroke()}
  ec2.strokeStyle=S.guideCol;ec2.lineWidth=S.guideW+1;
  for(let x=S.guideInt;x<S.W;x+=S.guideInt){ec2.beginPath();ec2.moveTo(x*es,0);ec2.lineTo(x*es,S.H*es);ec2.stroke()}
  for(let y=S.guideInt;y<S.H;y+=S.guideInt){ec2.beginPath();ec2.moveTo(0,y*es);ec2.lineTo(S.W*es,y*es);ec2.stroke()}
  const a=document.createElement('a');a.download='pindou_pattern.png';a.href=ec.toDataURL('image/png');a.click();
}
document.getElementById('btnExport').addEventListener('click',doExport);
document.getElementById('btnExport2').addEventListener('click',doExport);

function enableBtns(v){
  ['btnExport','btnExport2','btnRegen','btnClear'].forEach(id=>{document.getElementById(id).disabled=!v;});
}

let threeRef=null;
function open3D(){document.getElementById('modalBg').classList.add('open');updateBeanHeightValue();if(S.grid)init3D();}
function close3D(){document.getElementById('modalBg').classList.remove('open');}
document.getElementById('btn3D').addEventListener('click',open3D);
document.getElementById('btn3D2').addEventListener('click',open3D);
document.getElementById('closeModal').addEventListener('click',close3D);

function init3D(){
  const tc=document.getElementById('tc3d');
  const W=tc.offsetWidth||320,H=260;
  tc.width=W;tc.height=H;
  const c2=tc.getContext('2d');
  let angle={x:0.4,y:0.5};
  let isDrag=false,lastM={x:0,y:0};
  let zoom=1;

  function project(px,py,pz){
    const cosX=Math.cos(angle.x),sinX=Math.sin(angle.x);
    const cosY=Math.cos(angle.y),sinY=Math.sin(angle.y);
    const x1=px*cosY-pz*sinY;const z1=px*sinY+pz*cosY;
    const y2=py*cosX-z1*sinX;const z2=py*sinX+z1*cosX;
    const fov=360;const sc=fov/(fov+z2+220);
    return{sx:W/2+x1*sc,sy:H/2-y2*sc,sc};
  }

  function render(){
    const bh=parseInt(document.getElementById('bh').value,10)||3;
    updateBeanHeightValue();
    c2.clearRect(0,0,W,H);
    const bgGrad=c2.createLinearGradient(0,0,W,H);
    bgGrad.addColorStop(0,'#fffaf6');
    bgGrad.addColorStop(1,'#f2f2f2');
    c2.fillStyle=bgGrad;c2.fillRect(0,0,W,H);
    const GW=S.W,GH=S.H;
    for(let y=GH-1;y>=0;y--)for(let x=0;x<GW;x++){
      const cell=S.grid[y][x];if(!cell)continue;
      const cx=(x-GW/2)*7*zoom,cy=-(y-GH/2)*7*zoom;
      const bot=project(cx+3.25,cy-3.25,0);
      const depth=bh*3.2;
      const top=project(cx+3.25,cy-3.25,depth);
      const r=Math.max(1.8,4.1*bot.sc*zoom);
      const cr=h2r(cell.h);
      const edge=`rgb(${Math.max(cr.r-40,0)},${Math.max(cr.g-40,0)},${Math.max(cr.b-40,0)})`;
      const side=`rgb(${Math.max(cr.r-10,0)},${Math.max(cr.g-10,0)},${Math.max(cr.b-10,0)})`;
      const topColor=`rgb(${Math.min(cr.r+40,255)},${Math.min(cr.g+40,255)},${Math.min(cr.b+40,255)})`;

      if(bh>0){
        c2.strokeStyle='rgba(0,0,0,0.08)';
        c2.fillStyle=side;
        c2.beginPath();
        c2.moveTo(bot.sx-r,bot.sy);
        c2.lineTo(top.sx-r*0.8,top.sy);
        c2.lineTo(top.sx+r*0.8,top.sy);
        c2.lineTo(bot.sx+r,bot.sy);
        c2.closePath();
        c2.fill();
      }

      c2.fillStyle=edge;
      c2.beginPath();c2.arc(bot.sx,bot.sy,r,0,Math.PI*2);c2.fill();

      c2.fillStyle=topColor;
      c2.beginPath();c2.arc(top.sx,top.sy,Math.max(1.5,3.2*top.sc*zoom),0,Math.PI*2);c2.fill();

      c2.fillStyle='rgba(255,255,255,0.28)';
      c2.beginPath();c2.arc(top.sx-r*0.18,top.sy-r*0.2,Math.max(0.8,r*0.32),0,Math.PI*2);c2.fill();
    }
  }

  threeRef={render};

  tc.onmousedown=e=>{isDrag=true;lastM={x:e.clientX,y:e.clientY}};
  tc.onmousemove=e=>{if(!isDrag)return;angle.y+=(e.clientX-lastM.x)*0.01;angle.x+=(e.clientY-lastM.y)*0.01;lastM={x:e.clientX,y:e.clientY};render()};
  tc.onmouseup=()=>isDrag=false;
  tc.onmouseleave=()=>isDrag=false;
  tc.onwheel=e=>{e.preventDefault();zoom=Math.min(1.8,Math.max(0.6,zoom-(e.deltaY*0.0015)));render()};
  render();
}

document.getElementById('bh').addEventListener('input',()=>{updateBeanHeightValue();if(threeRef)threeRef.render()});

function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

// ============ Keyboard Shortcuts ============
document.addEventListener('keydown', e => {
  // Escape to close modals
  if (e.key === 'Escape') {
    hideSaveModal();
    hideWorksPanel();
    hideAuthModal();
    hideChangePwdModal();
    hideSettingsModal();
    hideUserMenu();
  }
  // Enter to confirm save in save modal
  if (e.key === 'Enter' && !document.getElementById('saveModal').classList.contains('hidden')) {
    confirmSave();
  }
});

// ============ Version Info ============
async function loadVersion() {
  try {
    const res = await fetch('/api/version');
    const info = await res.json();
    const el = document.getElementById('version-footer');
    if (el && info.version) {
      el.textContent = `v${info.version}`;
      el.title = `Build: ${info.build_time}\nCommit: ${info.git_commit}\nGo: ${info.go_version}`;
    }
  } catch(e) {}
}

// ============ Init ============
checkOIDCStatus();
checkAuth();
loadVersion();

// Check for shared design
const path = location.pathname;
if (path.startsWith('/share/')) {
  const code = path.slice(7);
  fetch(`/api/share/${code}`)
    .then(r => r.json())
    .then(d => {
      if (d.error) return;
      S.W = d.width;
      S.H = d.height;
      S.colorCnt = d.color_count;
      S.grid = d.grid_data;
      document.getElementById('placeholder').style.display = 'none';
      bc.style.display = 'block';
      computeCS();
      renderAll();
      updateStats();
      enableBtns(true);
      updateSizeUI();
    });
}
