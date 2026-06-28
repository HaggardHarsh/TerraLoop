'use strict';

// ═══════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════

const API_BASE = 'http://10.0.2.2:3000/api';

// Persistent user ID — in production this comes from Firebase Auth
let USER_ID = localStorage.getItem('tl_user_id');
if (!USER_ID) {
  USER_ID = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  localStorage.setItem('tl_user_id', USER_ID);
}

// ═══════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════

const AppState = {
  userProfile: {},
  currentView: 'scan',
  currentScanResult: null,
  scanState: 'idle'
};

// ═══════════════════════════════════════════════
//  API SERVICE LAYER
// ═══════════════════════════════════════════════

const API = {
  headers() {
    return { 'Content-Type': 'application/json', 'x-user-id': USER_ID };
  },

  async get(path) {
    const res = await fetch(`${API_BASE}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API ${path}: ${res.status}`);
    }
    return res.json();
  },

  async postFormData(path, formData) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'x-user-id': USER_ID }, // no Content-Type — browser sets multipart boundary
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API ${path}: ${res.status}`);
    }
    return res.json();
  },

  async patch(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
    return res.json();
  }
};

// ═══════════════════════════════════════════════
//  ONBOARDING
// ═══════════════════════════════════════════════

let binsCount = 2;
let compostState = true;

function initOnboarding() {
  // Support both old (.chip-group) and new (.chip-grid)
  const grids = document.querySelectorAll('.chip-group:not(.multi), .chip-grid:not(.multi)');
  grids.forEach(group => {
    group.querySelectorAll('.chip, .chip-card').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.chip, .chip-card').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  });

  const multiGrids = document.querySelectorAll('.chip-group.multi .chip, .chip-grid.multi .chip-card');
  multiGrids.forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('.chip-group') || chip.closest('.chip-grid');
      const noChip = group.querySelector('[data-val="none"]');
      if (chip.dataset.val === 'none') {
        group.querySelectorAll('.chip, .chip-card').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      } else {
        if (noChip) noChip.classList.remove('active');
        chip.classList.toggle('active');
      }
    });
  });

  // Steppers (handle both IDs if they exist)
  ['bins-dec', 'sw-bins-dec'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', () => {
      if (binsCount > 0) binsCount--;
      if (document.getElementById('bins-val')) document.getElementById('bins-val').textContent = binsCount;
      if (document.getElementById('sw-bins-val')) document.getElementById('sw-bins-val').textContent = binsCount;
    });
  });
  ['bins-inc', 'sw-bins-inc'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('click', () => {
      if (binsCount < 9) binsCount++;
      if (document.getElementById('bins-val')) document.getElementById('bins-val').textContent = binsCount;
      if (document.getElementById('sw-bins-val')) document.getElementById('sw-bins-val').textContent = binsCount;
    });
  });

  // Swipe logic
  let currentSlide = 0;
  const swipeContainer = document.getElementById('swipe-container');
  const swipePrev = document.getElementById('swipe-prev');
  const progressFill = document.getElementById('step-progress-fill');
  const stepText = document.getElementById('step-text');
  
  function updateSwipeSlide(index) {
    if(!swipeContainer) return;
    currentSlide = index;
    swipeContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    if (swipePrev) {
      if (currentSlide === 0) swipePrev.classList.add('hidden');
      else swipePrev.classList.remove('hidden');
    }
    
    if (progressFill) progressFill.style.width = ((currentSlide + 1) / 4) * 100 + '%';
    if (stepText) stepText.textContent = `Step ${currentSlide + 1} of 4`;
  }

  document.querySelectorAll('.swipe-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentSlide < 3) updateSwipeSlide(currentSlide + 1);
    });
  });

  if (swipePrev) {
    swipePrev.addEventListener('click', () => {
      if (currentSlide > 0) updateSwipeSlide(currentSlide - 1);
    });
  }

  // Location/Pincode Logic for Swipe
  const btnManual = document.getElementById('btn-manual-pincode');
  const manualDiv = document.getElementById('pincode-manual');
  const btnConfirm = document.getElementById('btn-confirm-pincode');
  const btnLocation = document.getElementById('btn-allow-location');
  
  if (btnLocation) {
    btnLocation.addEventListener('click', () => {
      btnLocation.textContent = '📍 Locating...';
      btnLocation.disabled = true;

      if (!navigator.geolocation) {
        fallbackLocation();
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          
          let zip = '94105';
          if (data && data.address) {
            zip = data.address.postcode || data.address.zipcode || '94105';
          }
          
          const pincodeInput = document.getElementById('sw-pincode-input');
          if (pincodeInput) pincodeInput.value = zip;
          
          btnLocation.textContent = '✅ Location Found';
          setTimeout(() => submitProfile(), 500);
        } catch (e) {
          console.warn('Geocoding failed:', e);
          fallbackLocation();
        }
      }, (error) => {
        console.warn('Geolocation error:', error);
        // If user denies permission, show manual input
        btnLocation.textContent = '📍 ALLOW LOCATION ACCESS';
        btnLocation.disabled = false;
        if (manualDiv) manualDiv.classList.remove('hidden');
        if (btnManual) btnManual.style.display = 'none';
        btnLocation.style.display = 'none';
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });

      function fallbackLocation() {
        const pincodeInput = document.getElementById('sw-pincode-input');
        if (pincodeInput) pincodeInput.value = '94105'; 
        submitProfile();
      }
    });
  }

  if (btnManual && manualDiv) {
    btnManual.addEventListener('click', () => {
      manualDiv.classList.remove('hidden');
      btnManual.style.display = 'none';
      document.getElementById('btn-allow-location').style.display = 'none';
    });
  }
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => { submitProfile(); });
  }

  // Old Next buttons
  document.getElementById('ob-next-0')?.addEventListener('click', () => goObStep(1));
  document.getElementById('ob-next-1')?.addEventListener('click', () => goObStep(2));
  document.getElementById('ob-next-2')?.addEventListener('click', () => goObStep(3));
  document.getElementById('ob-next-3')?.addEventListener('click', () => { submitProfile(); });
}

function goObStep(step) {
  document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`ob-step-${step}`);
  if(el) el.classList.add('active');
  document.querySelectorAll('.prog-step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    if (i === step) el.classList.add('active');
  });
  document.querySelectorAll('.prog-line').forEach((el, i) => {
    el.classList.toggle('done', i < step);
  });
}

window.toggleCompost = function(e) {
  if (e) {
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
  selectCompost(!compostState);
};

function selectCompost(val) {
  compostState = val;
  const oldYes = document.getElementById('compost-yes');
  const oldNo = document.getElementById('compost-no');
  const swYes = document.getElementById('sw-compost-yes');
  const swNo = document.getElementById('sw-compost-no');
  if (oldYes) oldYes.classList.toggle('active', val);
  if (oldNo) oldNo.classList.toggle('active', !val);
  if (swYes) swYes.classList.toggle('active', val);
  if (swNo) swNo.classList.toggle('active', !val);
}

async function submitProfile() {
  const housingChip = document.querySelector('#sw-housing-chips .chip-card.active') || document.querySelector('#housing-chips .chip.active');
  const gsChip = document.querySelector('#sw-greenspace-chips .chip-card.active') || document.querySelector('#greenspace-chips .chip.active');
  const demoChip = document.querySelector('#sw-demo-chips .chip-card.active') || document.querySelector('#demo-chips .chip.active');
  
  const pincodeInput = document.getElementById('sw-pincode-input') || document.getElementById('pincode-input');
  const pincode = (pincodeInput ? pincodeInput.value.trim() : '') || '110001';

  const pickupChips = document.querySelectorAll('#sw-pickup-chips .chip-card.active, #pickup-chips .chip.active');
  const toolsChips = document.querySelectorAll('#sw-tools-chips .chip-card.active, #tools-chips .chip.active');

  const profile = {
    userId: USER_ID,
    housing: housingChip?.dataset.val || 'apartment',
    greenSpace: gsChip?.dataset.val || 'none',
    bins: binsCount,
    compostAvailable: compostState,
    pickupDays: Array.from(pickupChips).map(c => c.dataset.val),
    tools: Array.from(toolsChips).map(c => c.dataset.val),
    demographic: demoChip?.dataset.val || 'adult',
    pincode
  };

  AppState.userProfile = profile;

  const btnConf = document.getElementById('btn-confirm-pincode');
  if (btnConf) { btnConf.textContent = 'Saving…'; btnConf.disabled = true; }
  
  const btnOld = document.getElementById('ob-next-3');
  if (btnOld) { btnOld.textContent = 'Saving…'; btnOld.disabled = true; }

  try {
    await API.post('/user/profile', profile);
  } catch (e) {
    console.warn('Profile save failed:', e.message);
  }

  buildProfileSummary(profile);
  
  const promptDiv = document.getElementById('location-prompt');
  const readyDiv = document.getElementById('profile-ready');
  if (promptDiv && readyDiv) {
    promptDiv.classList.add('hidden');
    readyDiv.classList.remove('hidden');
  } else {
    goObStep(4);
  }
  
  if (btnConf) { btnConf.textContent = 'Confirm Pincode →'; btnConf.disabled = false; }
  if (btnOld) { btnOld.textContent = 'Build My Profile →'; btnOld.disabled = false; }
}

function buildProfileSummary(profile) {
  const noPickup = profile.pickupDays.includes('none');
  const html = `
    <div class="ps-item"><span class="ps-key">Home</span><span class="ps-val">${capitalize(profile.housing)}</span></div>
    <div class="ps-item"><span class="ps-key">Area</span><span class="ps-val green">${profile.pincode}</span></div>
    <div class="ps-item"><span class="ps-key">Green Space</span><span class="ps-val">${capitalize(profile.greenSpace)}</span></div>
    <div class="ps-item"><span class="ps-key">Bins</span><span class="ps-val green">${profile.bins}</span></div>
    <div class="ps-item"><span class="ps-key">Composting</span><span class="ps-val ${compostState ? 'green' : ''}">${compostState ? '✅ Yes' : '❌ No'}</span></div>
    <div class="ps-item"><span class="ps-key">Pickup</span><span class="ps-val">${noPickup ? 'None available' : profile.pickupDays.join(', ')}</span></div>
  `;
  const summaryNew = document.getElementById('new-profile-summary');
  const summaryOld = document.getElementById('profile-summary-old') || document.getElementById('profile-summary');
  if(summaryNew) summaryNew.innerHTML = html;
  if(summaryOld) summaryOld.innerHTML = html;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

function launchApp() {
  document.getElementById('screen-onboarding').classList.remove('active');
  document.getElementById('main-app').classList.remove('hidden');
  initMainApp();
}

// ═══════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════

function initMainApp() {
  initNavigation();
  initScanView();
  initGarageView();
  initCommunityView();
  initImpactView();
}

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); switchView(item.dataset.view); });
  });
  document.querySelectorAll('.bnav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.bnav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.getElementById(`nav-${viewName}`)?.classList.add('active');
  document.querySelectorAll(`.bnav-item[data-view="${viewName}"]`).forEach(b => b.classList.add('active'));
  AppState.currentView = viewName;
}

// ═══════════════════════════════════════════════
//  SCAN VIEW
// ═══════════════════════════════════════════════

function initScanView() {
  document.getElementById('scan-file-input').addEventListener('change', async e => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      await runImageScan(file);
      e.target.value = '';
    }
  });

  document.getElementById('btn-scan-text').addEventListener('click', () => {
    const val = document.getElementById('scan-text-input').value.trim();
    if (val) runTextScan(val);
  });

  document.getElementById('scan-text-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-scan-text').click();
  });

  const refreshBtn = document.getElementById('btn-refresh-recs');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (AppState.currentScanResult && AppState.currentScanResult.item) {
        runTextScan(AppState.currentScanResult.item + ' - generate completely new creative upcycle ideas');
      }
    });
  }
}

async function runImageScan(file) {
  showScanState('scanning');
  resetPipeline();
  startPipelineAnimation();

  try {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('profile', JSON.stringify(AppState.userProfile || {}));
    const result = await API.postFormData('/scan', formData);
    AppState.currentScanResult = result;
    finishScan(result);
  } catch (err) {
    showScanError(err.message);
  }
}

async function runTextScan(description) {
  showScanState('scanning');
  resetPipeline();
  startPipelineAnimation();

  try {
    const result = await API.post('/scan', { 
      description,
      profile: AppState.userProfile || {}
    });
    AppState.currentScanResult = result;
    finishScan(result);
  } catch (err) {
    showScanError(err.message);
  }
}

function startPipelineAnimation() {
  // Animate pipeline steps over ~2.5s (visual feedback while API call runs)
  const steps = [
    { id: 'pipe-cv', detail: 'Object detection → material.classify()' },
    { id: 'pipe-ctx', detail: `user_profile.query(pin=${AppState.userProfile?.pincode || '…'})` },
    { id: 'pipe-rec', detail: 'recommender.score(tools, space)' }
  ];

  steps.forEach((step, i) => {
    setTimeout(() => setPipeState(step.id, 'processing', step.detail), i * 800);
  });
}

function finishScan(result) {
  // Mark all pipeline steps done
  ['pipe-cv', 'pipe-ctx', 'pipe-rec'].forEach(id =>
    setPipeState(id, 'done', `✓ Complete`)
  );

  // Map AI instructions to recommendations if missing
  if (result.instructions && !result.recommendations) {
    result.recommendations = result.instructions.map((inst, idx) => ({
      type: idx === 0 ? 'recycle' : 'upcycle',
      typeLabel: idx === 0 ? 'Recycle' : 'Upcycle',
      title: `Option ${idx + 1}`,
      desc: inst,
      tools: []
    }));
  }

  showScanResult(result);
  showRecommendations(result);
}

function showScanError(message) {
  showScanState('idle');
  resetPipeline();
  // Show inline error below the scan zone
  const existing = document.getElementById('scan-error');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'scan-error';
  el.style.cssText = 'color:#f43f5e;font-size:13px;padding:10px;text-align:center;';
  el.textContent = `⚠️ ${message}. Is the backend running? (node server.js)`;
  document.querySelector('.scan-panel').appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

function resetPipeline() {
  ['pipe-cv', 'pipe-ctx', 'pipe-rec'].forEach(id => setPipeState(id, 'idle', 'Awaiting input'));
  document.getElementById('rec-container').classList.add('hidden');
}

function setPipeState(id, state, detail) {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.pipe-dot').className = `pipe-dot ${state}`;
  const d = el.querySelector('.pipe-detail');
  d.textContent = detail;
  d.className = `pipe-detail ${state}`;
}

function showScanState(state) {
  document.getElementById('scan-idle').classList.add('hidden');
  document.getElementById('scan-active').classList.add('hidden');
  document.getElementById('scan-result').classList.add('hidden');
  if (state === 'scanning') document.getElementById('scan-active').classList.remove('hidden');
  else if (state === 'result') document.getElementById('scan-result').classList.remove('hidden');
  else document.getElementById('scan-idle').classList.remove('hidden');
}

function showScanResult(item) {
  showScanState('result');
  document.getElementById('result-icon').textContent = item.icon || '📦';
  document.getElementById('result-material').textContent = item.material || 'Unknown material';
  document.getElementById('result-grade').textContent = item.grade || '';
  document.getElementById('material-tags').innerHTML = (item.tags || []).map(t =>
    `<span class="mat-tag ${t.cls}">${t.text}</span>`
  ).join('');
}

function showRecommendations(item) {
  const container = document.getElementById('rec-container');
  const cards = document.getElementById('rec-cards');
  const fallback = document.getElementById('fallback-notice');
  const badge = document.getElementById('rec-badge');
  
  container.classList.remove('hidden');

  if (badge) {
    const count = item.recommendations?.filter(r => r.type !== 'recycle').length || 0;
    badge.textContent = `${count} reuse option${count === 1 ? '' : 's'}`;
  }

  if (!item.recommendations) {
    cards.innerHTML = '';
    fallback.classList.remove('hidden');
    renderFacilityResult(item.facilityLookup, item, fallback);
    addGarageItem(item);
    return;
  }

  fallback.classList.add('hidden');
  const userTools = AppState.userProfile?.tools || [];

  const upcycles = item.recommendations.filter(r => r.type !== 'recycle');
  const recycles = item.recommendations.filter(r => r.type === 'recycle');

  const renderCard = (rec, i) => {
    const toolMatch = (rec.tools || []).every(t => userTools.includes(t));
    return `
      <div class="rec-card" style="animation-delay:${i * 0.1}s; cursor: pointer;" onclick="openDetailsModal(${i})">
        <span class="rc-type-badge ${rec.type}">${rec.typeLabel}</span>
        <div class="rc-title">${rec.title}</div>
        <div class="rc-desc">${rec.desc}</div>
        <div class="rc-meta">
          <span class="rc-tag">⏱ ${rec.time || '15 mins'}</span>
          ${rec.tools?.length ? `<span class="rc-tag">🛠 ${rec.tools.join(', ')}</span>` : '<span class="rc-tag">🤙 No tools needed</span>'}
          <span class="rc-tag ${toolMatch ? 'green' : 'amber'}">${toolMatch ? '✅ You have the tools' : '⚠️ Missing tools'}</span>
        </div>
        <div class="effort-bar-wrap">
          <span class="effort-label">Effort</span>
          <div class="effort-bar"><div class="effort-fill" style="width:${rec.effort || 0}%"></div></div>
        </div>
      </div>`;
  };

  cards.innerHTML = upcycles.map((rec, i) => renderCard(rec, item.recommendations.indexOf(rec))).join('');
  
  if (recycles.length > 0) {
    cards.innerHTML += '<div style="margin: 20px 0 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"></div>';
    cards.innerHTML += recycles.map(rec => renderCard(rec, item.recommendations.indexOf(rec))).join('');
  }
}

function renderFacilityResult(facilityLookup, item, el) {
  if (!facilityLookup) {
    el.className = 'fallback-notice not-found';
    el.innerHTML = `<div class="fn-header"><span style="font-size:20px">⚠️</span><div class="fn-title">Checking nearby facilities…</div></div>`;
    return;
  }

  const { found, facilities } = facilityLookup;

  if (found && facilities?.length > 0) {
    el.className = 'fallback-notice found';
    el.innerHTML = `
      <div class="fn-header">
        <span style="font-size:20px">📍</span>
        <div class="fn-title">✅ ${facilities.length} facility found near you</div>
      </div>
      <p class="fn-sub">We checked your area (${AppState.userProfile?.pincode || '—'}) — these facilities accept this item:</p>
      <div class="fn-facility-list">
        ${facilities.map(f => `
          <div class="fn-facility">
            <span class="fn-f-icon">${f.icon}</span>
            <div class="fn-f-info">
              <div class="fn-f-name">${f.name}</div>
              <div class="fn-f-detail">${f.hours} · ${f.accepts}</div>
            </div>
            <span class="fn-f-dist">${f.distance}</span>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    el.className = 'fallback-notice not-found';
    el.innerHTML = `
      <div class="fn-header">
        <span style="font-size:20px">⚠️</span>
        <div class="fn-title">No facility found nearby</div>
      </div>
      <p class="fn-sub">We couldn't find a drop-off point within range of your area.</p>
      <div class="fn-storage-box">
        🔒 <strong>Safe Storage Instructions:</strong> Store away from flammable materials, in a cool dry place.
        We've logged this to your Digital Garage and will notify you when a facility becomes available.
      </div>
    `;
  }
}

async function addGarageItem(item) {
  try {
    await API.post('/garage', {
      icon: item.icon,
      name: item.material,
      material: item.material,
      grade: item.grade,
      tags: item.tags?.map(t => t.text) || [],
      instructions: 'Store safely. You will be notified when a facility is available.',
      fallbackType: item.fallbackType || 'ewaste'
    });
    // Refresh badge
    loadGarageBadge();
  } catch (e) {
    console.warn('Garage item save failed:', e.message);
  }
}

async function loadGarageBadge() {
  try {
    const { count } = await API.get('/garage');
    const badge = document.getElementById('garage-badge');
    if (badge) badge.textContent = count || '';
  } catch (e) { /* non-fatal */ }
}

// ═══════════════════════════════════════════════
//  GARAGE VIEW
// ═══════════════════════════════════════════════

async function initGarageView() {
  renderGarageSkeleton();
  try {
    const [garageData, notifData] = await Promise.all([
      API.get('/garage'),
      API.get('/notifications')
    ]);
    renderGarage(garageData.items || []);
    renderNotifications(notifData.notifications || []);
    const badge = document.getElementById('garage-badge');
    if (badge) badge.textContent = garageData.count || '';
  } catch (err) {
    renderGarageError();
  }
}

function renderGarageSkeleton() {
  document.getElementById('garage-grid').innerHTML = `
    <div class="garage-item" style="opacity:0.4"><div style="height:80px;background:rgba(255,255,255,0.05);border-radius:8px;"></div></div>
    <div class="garage-item" style="opacity:0.2"><div style="height:80px;background:rgba(255,255,255,0.05);border-radius:8px;"></div></div>
  `;
}

function renderGarageError() {
  document.getElementById('garage-grid').innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:20px">⚠️ Could not load garage. Is the backend running?</p>`;
}

function renderGarage(items) {
  if (!items.length) {
    document.getElementById('garage-grid').innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:20px">✅ Your garage is empty — no hazardous items pending.</p>`;
    document.getElementById('gs-pending').textContent = '0';
    return;
  }
  document.getElementById('gs-pending').textContent = items.length;
  document.getElementById('garage-grid').innerHTML = items.map(item => `
    <div class="garage-item">
      <div class="gi-header">
        <span class="gi-icon">${item.icon || '📦'}</span>
        <div class="gi-info">
          <div class="gi-name">${item.name}</div>
          <div class="gi-date">${item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : 'Recently added'}</div>
        </div>
        <span class="gi-status ${item.status || 'pending'}">${item.statusLabel || 'Awaiting Disposal'}</span>
      </div>
      <p class="gi-instructions">${item.instructions}</p>
      <div class="gi-tags">${(item.tags || []).map(t => `<span class="gi-tag">${t}</span>`).join('')}</div>
    </div>
  `).join('');
}

function renderNotifications(notifications) {
  if (!notifications.length) {
    document.getElementById('notif-list').innerHTML = `<p style="color:var(--text-muted);font-size:13px">No notifications yet.</p>`;
    return;
  }
  document.getElementById('notif-list').innerHTML = notifications.map(n => `
    <div class="notif-item">
      <div class="notif-dot ${n.dot || 'green'}"></div>
      <div class="notif-content">
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
//  COMMUNITY VIEW
// ═══════════════════════════════════════════════

async function initCommunityView() {
  renderStoriesSkeleton();
  renderExploreSkeleton();

  try {
    const [postsData, storiesData] = await Promise.all([
      API.get('/posts'),
      API.get('/posts/stories')
    ]);
    renderStories(storiesData.stories || []);
    renderExploreGrid(postsData.posts || []);
  } catch (err) {
    renderExploreError();
  }

  document.getElementById('explore-search').addEventListener('input', async e => {
    const q = e.target.value.trim();
    try {
      const data = await API.get(`/posts${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      renderExploreGrid(data.posts || []);
    } catch (e) { /* keep current */ }
  });
}

function renderStoriesSkeleton() {
  document.getElementById('stories-row').innerHTML = [0,1,2,3,4].map(() => `
    <div class="story-item"><div class="story-ring" style="background:rgba(255,255,255,0.08)"><div class="story-inner"></div></div><span class="story-name" style="background:rgba(255,255,255,0.06);border-radius:4px;width:48px;height:10px;display:block"></span></div>
  `).join('');
}

function renderExploreSkeleton() {
  document.getElementById('explore-grid').innerHTML = [0,1,2,3,4,5].map(() => `
    <div class="explore-item" style="background:rgba(255,255,255,0.04)"><div class="explore-item-inner"></div></div>
  `).join('');
}

function renderExploreError() {
  document.getElementById('explore-grid').innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:20px;grid-column:1/-1">⚠️ Could not load community posts. Is the backend running?</p>`;
}

// Gradient palettes for posts without images
const POST_BG = [
  'linear-gradient(135deg,#1a0a2e,#2d1b69)',
  'linear-gradient(135deg,#0a1628,#0c4a6e)',
  'linear-gradient(135deg,#022c22,#064e3b)',
  'linear-gradient(135deg,#1a0a00,#451a03)',
  'linear-gradient(135deg,#0a1628,#164e63)',
  'linear-gradient(135deg,#1a0a2e,#312e81)',
  'linear-gradient(135deg,#0c1a3a,#1e3a5f)',
];
const TYPE_EMOJI = { creative: '🎨', functional: '🔧', quick: '⚡' };

function renderStories(stories) {
  const addStory = `<div class="story-item add"><div class="story-ring"><div class="story-inner">+</div></div><span class="story-name">Your Story</span></div>`;
  document.getElementById('stories-row').innerHTML = addStory + stories.map(s => `
    <div class="story-item">
      <div class="story-ring"><div class="story-inner">${TYPE_EMOJI[s.type] || '🌱'}</div></div>
      <span class="story-name">${s.userId?.slice(0, 6) || 'User'}</span>
    </div>
  `).join('');
}

function renderExploreGrid(posts) {
  const grid = document.getElementById('explore-grid');
  const userTools = AppState.userProfile?.tools || [];

  if (!posts.length) {
    grid.innerHTML = `<p style="color:var(--text-muted);font-size:13px;padding:20px;grid-column:1/-1">No posts yet. Be the first to share a project!</p>`;
    return;
  }

  grid.innerHTML = posts.map((post, idx) => {
    const toolMatch = (post.tools || []).every(t => userTools.includes(t));
    const isWide = idx % 9 === 0 || idx % 9 === 7;
    const isTall = idx % 9 === 4;
    const bg = post.imageUrl
      ? `url(${post.imageUrl}) center/cover`
      : POST_BG[idx % POST_BG.length];
    const emoji = TYPE_EMOJI[post.type] || '🌱';

    return `
      <div class="explore-item ${isWide ? 'wide' : ''} ${isTall ? 'tall' : ''}"
           style="background:${bg}" onclick="openPost('${post.id}')">
        <div class="explore-item-inner">
          ${!post.imageUrl ? `<div class="explore-content">${emoji}</div>` : ''}
          <div class="explore-overlay">
            <div class="explore-overlay-content">
              <div class="eo-title">${post.title}</div>
              <div class="eo-meta">
                <span>❤️ ${post.likes || 0}</span>
                <span>🔖 ${post.saves || 0}</span>
                ${post.time ? `<span>⏱ ${post.time}</span>` : ''}
                ${toolMatch ? '<span style="color:#10b981">✅ can make</span>' : '<span style="color:#fbbf24">⚠️ tools</span>'}
              </div>
            </div>
          </div>
          ${post.isReel ? '<div class="reel-badge">▶ Reel</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openPost(id) {
  // Full post detail view — future implementation
  console.log('Open post:', id);
}

// ═══════════════════════════════════════════════
//  IMPACT VIEW
// ═══════════════════════════════════════════════

async function initImpactView() {
  renderImpactSkeleton();

  try {
    const [summary, activity, contributions, materials] = await Promise.all([
      API.get('/impact/summary'),
      API.get('/impact/activity'),
      API.get('/impact/contributions'),
      API.get('/impact/materials')
    ]);

    renderImpactSummary(summary);
    renderMaterialBars(materials.bars || []);
    renderContributions(contributions.contributions || []);
    renderActivityLog(activity.events || []);
  } catch (err) {
    document.getElementById('co2-val').textContent = '—';
    console.warn('Impact data load failed:', err.message);
  }
}

function renderImpactSkeleton() {
  document.getElementById('co2-val').textContent = '…';
}

function renderImpactSummary(summary) {
  animateNumber('co2-val', summary.co2Saved || 0, v => v.toFixed(1) + ' kg');
  const itemsEl = document.querySelector('.im-val:nth-of-type(2)');
  const projectsEl = document.getElementById('projects-val');
  if (projectsEl) projectsEl.textContent = summary.projectsMade || 0;
}

function animateNumber(elId, target, formatter) {
  let val = 0;
  const el = document.getElementById(elId);
  if (!el) return;
  const step = () => {
    val = Math.min(val + target / 40, target);
    el.textContent = formatter(val);
    if (val < target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderMaterialBars(bars) {
  if (!bars.length) {
    document.getElementById('mat-bars').innerHTML = `<p style="color:var(--text-muted);font-size:13px">No materials tracked yet.</p>`;
    return;
  }
  const colors = ['var(--emerald)', 'var(--cyan)', 'var(--purple)', 'var(--amber)', 'var(--rose)'];
  document.getElementById('mat-bars').innerHTML = bars.map((m, i) => `
    <div class="mat-bar-item">
      <div class="mat-bar-header">
        <span class="mat-bar-label">${m.label}</span>
        <span class="mat-bar-count">${m.count}</span>
      </div>
      <div class="mat-bar-track">
        <div class="mat-bar-fill" style="width:0%;background:${colors[i % colors.length]}" data-pct="${m.pct}"></div>
      </div>
    </div>
  `).join('');
  setTimeout(() => {
    document.querySelectorAll('.mat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 200);
}

function renderContributions(contributions) {
  if (!contributions.length) {
    document.getElementById('contrib-list').innerHTML = `<p style="color:var(--text-muted);font-size:13px">No projects posted yet. Share your first upcycle project!</p>`;
    return;
  }
  document.getElementById('contrib-list').innerHTML = contributions.map(c => `
    <div class="contrib-card">
      <div class="contrib-thumb" style="background:rgba(16,185,129,0.1)">🌱</div>
      <div class="contrib-info">
        <div class="contrib-title">${c.title}</div>
        <div class="contrib-impact">
          <span class="contrib-chip">🌍 ${c.co2}</span>
          <span class="contrib-chip">♻️ ${c.items}</span>
          <span class="contrib-chip">📦 ${c.material}</span>
        </div>
        <div class="contrib-date">${c.date}</div>
      </div>
    </div>
  `).join('');
}

function renderActivityLog(events) {
  if (!events.length) {
    document.getElementById('ledger-list').innerHTML = `<p style="color:var(--text-muted);font-size:13px">No activity yet.</p>`;
    return;
  }
  document.getElementById('ledger-list').innerHTML = events.map(e => `
    <div class="ledger-item">
      <span class="ledger-icon">${e.icon || '🔍'}</span>
      <div class="ledger-info">
        <div class="ledger-action">${e.action}</div>
        <div class="ledger-time">${e.time ? new Date(e.time).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Recently'}</div>
      </div>
      <span class="ledger-tag">${e.tag || ''}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════

function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * W; this.y = Math.random() * H;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = -Math.random() * 0.4 - 0.1;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5 ? '#10b981' : '#06b6d4';
    }
    update() {
      this.x += this.speedX; this.y += this.speedY; this.opacity -= 0.001;
      if (this.y < -10 || this.opacity <= 0) this.reset();
    }
    draw() {
      ctx.save(); ctx.globalAlpha = this.opacity; ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
  }

  const particles = Array.from({ length: 80 }, () => new Particle());
  const loop = () => { ctx.clearRect(0, 0, W, H); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(loop); };
  loop();
}

window.openDetailsModal = function(index) {
  const rec = AppState.currentScanResult?.recommendations?.[index];
  if (!rec) return;

  document.getElementById('details-modal-title').textContent = rec.title;
  document.getElementById('details-modal-desc').textContent = rec.desc;
  
  const stepsContainer = document.getElementById('details-modal-steps');
  if (rec.steps && rec.steps.length > 0) {
    stepsContainer.innerHTML = rec.steps.map((step, i) => `
      <div class="step-item">
        <div class="step-number">${i + 1}</div>
        <div class="step-text">${step}</div>
      </div>
    `).join('');
  } else {
    stepsContainer.innerHTML = '<p style="color:var(--text-muted);font-size:14px;text-align:center;">No detailed steps provided.</p>';
  }

  const modal = document.getElementById('details-modal');
  modal.classList.remove('hidden');
  // Trigger animation
  setTimeout(() => modal.classList.add('show'), 10);
};

window.closeDetailsModal = function() {
  const modal = document.getElementById('details-modal');
  modal.classList.remove('show');
  setTimeout(() => modal.classList.add('hidden'), 300); // Wait for transition
};

// ═══════════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
  initParticles();

  setTimeout(() => {
    const splash = document.getElementById('screen-splash');
    const onboarding = document.getElementById('screen-onboarding');
    
    if (splash) {
      splash.classList.remove('active');
    }
    if (onboarding) {
      onboarding.classList.add('active');
    }
  }, 2000);
});
