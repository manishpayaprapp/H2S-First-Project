/* ============================================================
   oota Ai — Application Logic v2
   Full-featured: Water Tracker, Nutrient Bars, Weekly Chart,
   Meal Timeline, Search, Quick Add, Streak Counter
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  const S = {
    region: null,
    targets: null,
    db: null,
    currentMeal: [],
    gheeLevel: 2,
    waterGlasses: 0,
    streak: 5,
    dailyTotals: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    weeklyData: [],
    mealLog: [],
  };

  // ---- Selectors ----
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ---- Constants ----
  const CIRC = 2 * Math.PI * 44; // ~276.5
  const GHEE_CAL = 45;
  const GHEE_FAT = 5;

  // ============================================================
  // DATABASE
  // ============================================================
  async function loadDB() {
    try {
      const r = await fetch('./data/ifct.json');
      S.db = await r.json();
    } catch (e) {
      console.warn('IFCT fetch failed, using inline data');
      S.db = {
        foods: [], meal_profiles: [], smart_swaps: [],
        regional_targets: {
          North: { label: 'North India', emoji: '🏔️', description: 'Higher protein focus', daily_targets: { calories: 2000, protein: 65, fiber: 30, carb_ratio_complex: 0.65 } },
          South: { label: 'South India', emoji: '🌴', description: 'Lower GI focus', daily_targets: { calories: 1900, protein: 55, fiber: 28, carb_ratio_complex: 0.70 } },
          East: { label: 'East India', emoji: '🏞️', description: 'Balanced approach', daily_targets: { calories: 1950, protein: 60, fiber: 26, carb_ratio_complex: 0.60 } },
          West: { label: 'West India', emoji: '🏜️', description: 'Millet-rich tradition', daily_targets: { calories: 1950, protein: 58, fiber: 32, carb_ratio_complex: 0.72 } },
        }
      };
    }
  }

  // ============================================================
  // ONBOARDING
  // ============================================================
  function initOnboarding() {
    const saved = localStorage.getItem('oota_region');
    if (saved && S.db.regional_targets[saved]) {
      S.region = saved;
      S.targets = S.db.regional_targets[saved].daily_targets;
      applyRegion();
      return;
    }
    showModal();
  }

  function showModal() {
    const modal = $('#onboarding-modal');
    modal.classList.add('active');
    const grid = $('#region-grid');
    grid.innerHTML = '';
    Object.entries(S.db.regional_targets).forEach(([key, r]) => {
      const card = document.createElement('div');
      card.className = 'region-card';
      card.dataset.region = key;
      card.innerHTML = `<div class="region-emoji">${r.emoji}</div><div class="region-name">${r.label}</div><div class="region-desc">${r.description}</div>`;
      card.onclick = () => {
        $$('.region-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        S.region = key;
        $('#start-btn').disabled = false;
      };
      grid.appendChild(card);
    });
  }

  $('#start-btn').addEventListener('click', () => {
    if (!S.region) return;
    localStorage.setItem('oota_region', S.region);
    S.targets = S.db.regional_targets[S.region].daily_targets;
    $('#onboarding-modal').classList.remove('active');
    applyRegion();
    setTimeout(loadSampleData, 400);
  });

  $('#region-chip').addEventListener('click', showModal);

  function applyRegion() {
    const r = S.db.regional_targets[S.region];
    $('#chip-emoji').textContent = r.emoji;
    $('#chip-text').textContent = r.label;
    $('#rt-protein').textContent = S.targets.protein;
    $('#rt-fiber').textContent = S.targets.fiber;
    $('#rs-protein').textContent = r.description;
    $('#rs-fiber').textContent = `Target: ${S.targets.fiber}g daily`;
    $('#target-cal').textContent = `Target: ${S.targets.calories} kcal`;
    $('#target-protein').textContent = `Target: ${S.targets.protein}g`;
    $('#target-fiber').textContent = `Target: ${S.targets.fiber}g`;
    updateAll();
    buildTicker();
  }

  // ============================================================
  // GREETING
  // ============================================================
  function initGreeting() {
    const h = new Date().getHours();
    let greet = 'Good morning';
    if (h >= 12 && h < 17) greet = 'Good afternoon';
    else if (h >= 17) greet = 'Good evening';
    $('#greeting-hello').textContent = greet;
    // Random streak 3-12
    S.streak = Math.floor(Math.random() * 10) + 3;
    $('#greeting-streak').innerHTML = `🔥 ${S.streak}-day streak! Keep going`;
  }

  // ============================================================
  // HEADER SCROLL EFFECT
  // ============================================================
  function initScrollEffect() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          $('#header').classList.toggle('scrolled', window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================
  function initDropZone() {
    const dz = $('#drop-zone');
    ['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); dz.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); dz.classList.remove('drag-over'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); });
    $('#upload-btn').addEventListener('click', e => { e.stopPropagation(); $('#file-input').click(); });
    dz.addEventListener('click', e => { if (e.target === dz || e.target.closest('#dz-default')) $('#file-input').click(); });
    $('#file-input').addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });
    // Quick add button — simulate analysis without an image
    $('#quick-log-btn').addEventListener('click', e => {
      e.stopPropagation();
      simulateAI();
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) return alert('Please upload an image (JPG, PNG, etc.)');
    const reader = new FileReader();
    reader.onload = e => { showPreview(e.target.result, file.name); simulateAI(); };
    reader.readAsDataURL(file);
  }

  function showPreview(src, name) {
    $('#dz-default').style.display = 'none';
    $('#upload-preview').classList.add('active');
    $('#preview-img').src = src;
    $('#preview-tag').textContent = name;
    $('#analyzing-bar').style.display = 'flex';
    const dz = $('#drop-zone');
    dz.style.padding = '0';
    dz.style.border = 'none';
    dz.style.cursor = 'default';
  }

  function resetDropZone() {
    const dz = $('#drop-zone');
    dz.style.padding = ''; dz.style.border = ''; dz.style.cursor = '';
    $('#upload-preview').classList.remove('active');
    $('#dz-default').style.display = '';
    $('#file-input').value = '';
  }

  // Click preview to re-upload
  $('#upload-preview')?.addEventListener('click', resetDropZone);

  // ============================================================
  // SIMULATED AI
  // ============================================================
  function simulateAI() {
    const profiles = S.db.meal_profiles;
    if (!profiles || !profiles.length) return;
    const regional = profiles.filter(p => p.region === S.region || p.region === 'Pan-India');
    const pool = regional.length ? regional : profiles;
    const profile = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      const abEl = $('#analyzing-bar');
      if (abEl) abEl.style.display = 'none';
      const pt = $('#preview-tag');
      if (pt) pt.textContent = `✅ ${profile.name} Identified`;

      S.currentMeal = profile.items.map(item => {
        const food = S.db.foods.find(f => f.id === item.food_id);
        return food ? { ...food, qty: item.qty } : null;
      }).filter(Boolean);

      renderFoodCards();
      updateAll();
      addTimeline(profile.name);
    }, 2200);
  }

  // ============================================================
  // IDENTIFIED ITEMS
  // ============================================================
  function renderFoodCards() {
    const el = $('#id-items');
    const empty = $('#id-empty');
    if (empty) empty.style.display = 'none';
    el.innerHTML = '';
    S.currentMeal.forEach((item, i) => {
      const baseCal = item.per_serving.calories * item.qty;
      const gheeCal = GHEE_CAL * S.gheeLevel * item.qty;
      const card = document.createElement('div');
      card.className = 'food-card fade-up';
      card.style.animationDelay = `${i * 0.07}s`;
      card.innerHTML = `
        <div class="food-card-icon">${item.icon}</div>
        <div class="food-card-info">
          <div class="food-card-name">${item.name}${item.qty > 1 ? ` × ${item.qty}` : ''}</div>
          <div class="food-card-meta">${item.hindi} · ${item.typical_serving_size * item.qty}g</div>
        </div>
        <div class="food-card-cal">
          <div class="food-card-cal-val">${baseCal + gheeCal}</div>
          <div class="food-card-cal-unit">kcal</div>
        </div>`;
      el.appendChild(card);
    });
  }

  // ============================================================
  // GHEE SLIDER
  // ============================================================
  function initGheeSlider() {
    $('#ghee-range').addEventListener('input', e => {
      S.gheeLevel = +e.target.value;
      $('#ghee-badge').textContent = `Level ${S.gheeLevel}`;
      if (S.currentMeal.length) { renderFoodCards(); updateAll(); }
    });
  }

  // ============================================================
  // WATER TRACKER
  // ============================================================
  function initWaterTracker() {
    const container = $('#water-glasses');
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const glass = document.createElement('div');
      glass.className = 'water-glass';
      glass.dataset.index = i;
      glass.addEventListener('click', () => toggleWater(i));
      container.appendChild(glass);
    }
    updateWaterUI();
  }

  function toggleWater(idx) {
    if (idx + 1 === S.waterGlasses) {
      S.waterGlasses = idx;
    } else {
      S.waterGlasses = idx + 1;
    }
    updateWaterUI();
  }

  function updateWaterUI() {
    $$('.water-glass').forEach((g, i) => {
      g.classList.toggle('filled', i < S.waterGlasses);
    });
    $('#water-count').textContent = `${S.waterGlasses} / 8 glasses`;
    $('#sc-water').textContent = `${S.waterGlasses} / 8`;
    $('#bar-water').style.width = `${(S.waterGlasses / 8) * 100}%`;
  }

  // ============================================================
  // UPDATE ALL SUMMARIES
  // ============================================================
  function updateAll() {
    if (!S.targets) return;
    let cal = 0, protein = 0, fiber = 0, carbs = 0, fat = 0;
    S.currentMeal.forEach(item => {
      const s = item.per_serving, q = item.qty;
      cal += s.calories * q;
      protein += s.protein * q;
      fiber += s.fiber * q;
      carbs += s.carbs * q;
      fat += s.fat * q;
    });
    const gheeItems = S.currentMeal.length;
    cal += GHEE_CAL * S.gheeLevel * gheeItems;
    fat += GHEE_FAT * S.gheeLevel;

    S.dailyTotals = { calories: Math.round(cal), protein, fat, carbs, fiber };

    // Stat cards
    animateNum($('#sc-cal'), Math.round(cal));
    $('#sc-protein').textContent = `${protein.toFixed(1)}g`;
    $('#sc-fiber').textContent = `${fiber.toFixed(1)}g`;
    $('#bar-cal').style.width = `${Math.min((cal / S.targets.calories) * 100, 100)}%`;
    $('#bar-protein').style.width = `${Math.min((protein / S.targets.protein) * 100, 100)}%`;
    $('#bar-fiber').style.width = `${Math.min((fiber / S.targets.fiber) * 100, 100)}%`;

    // Rings
    updateRings();
    // Nutrient bars
    updateNutrientBars();
  }

  function animateNum(el, target) {
    const start = parseInt(el.textContent) || 0;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 700;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + diff * ease);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ============================================================
  // HEALTH RINGS
  // ============================================================
  function updateRings() {
    if (!S.targets) return;
    // Protein
    const pp = Math.min(S.dailyTotals.protein / S.targets.protein, 1);
    $('#rf-protein').style.strokeDashoffset = CIRC * (1 - pp);
    $('#rv-protein').textContent = S.dailyTotals.protein.toFixed(0);

    // Fiber
    const fp = Math.min(S.dailyTotals.fiber / S.targets.fiber, 1);
    $('#rf-fiber').style.strokeDashoffset = CIRC * (1 - fp);
    $('#rv-fiber').textContent = S.dailyTotals.fiber.toFixed(0);

    // Carb quality
    let complex = 0, total = 0;
    S.currentMeal.forEach(item => {
      total += item.per_serving.carbs * item.qty;
      if (item.carb_type === 'complex') complex += item.per_serving.carbs * item.qty;
    });
    const cq = total > 0 ? Math.round((complex / total) * 100) : 0;
    const cp = cq / 100;
    $('#rf-carbs').style.strokeDashoffset = CIRC * (1 - cp);
    $('#rv-carbs').textContent = cq;
    const tgt = Math.round(S.targets.carb_ratio_complex * 100);
    $('#rs-carbs').textContent = cq >= tgt ? `✅ Above ${tgt}% target` : `Target: ${tgt}% complex`;
  }

  // ============================================================
  // NUTRIENT BARS
  // ============================================================
  function updateNutrientBars() {
    const t = S.dailyTotals;
    const maxCarbs = 300, maxProtein = S.targets ? S.targets.protein : 65, maxFat = 80;
    $('#nb-carbs').textContent = `${t.carbs.toFixed(0)}g`;
    $('#nb-protein').textContent = `${t.protein.toFixed(1)}g`;
    $('#nb-fat').textContent = `${t.fat.toFixed(0)}g`;
    $('#nbf-carbs').style.width = `${Math.min((t.carbs / maxCarbs) * 100, 100)}%`;
    $('#nbf-protein').style.width = `${Math.min((t.protein / maxProtein) * 100, 100)}%`;
    $('#nbf-fat').style.width = `${Math.min((t.fat / maxFat) * 100, 100)}%`;
    // Vitamins — estimate based on meal variety
    const variety = S.currentMeal.length;
    const vitPct = Math.min(variety * 15, 90);
    $('#nbf-vit').style.width = `${vitPct}%`;
    $('#nb-vit').textContent = vitPct >= 70 ? 'Good' : vitPct >= 40 ? 'Fair' : 'Low';
    $('#nb-vit').className = `nutrient-amount ${vitPct >= 70 ? 'high' : vitPct >= 40 ? 'ok' : 'low'}`;
  }

  // ============================================================
  // WEEKLY CHART
  // ============================================================
  function buildWeeklyChart() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
    // Generate mock weekly data
    S.weeklyData = days.map((d, i) => ({
      day: d,
      cal: i <= todayIdx ? 1200 + Math.floor(Math.random() * 900) : 0,
      protein: i <= todayIdx ? 30 + Math.floor(Math.random() * 40) : 0,
      fiber: i <= todayIdx ? 10 + Math.floor(Math.random() * 25) : 0,
    }));

    renderChart('cal');

    // Tab switching
    $$('.chart-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderChart(tab.dataset.type);
      });
    });
  }

  function renderChart(type) {
    const container = $('#chart-bars');
    container.innerHTML = '';
    const todayIdx = (new Date().getDay() + 6) % 7;
    const maxVal = Math.max(...S.weeklyData.map(d => d[type]), 1);

    S.weeklyData.forEach((d, i) => {
      const day = document.createElement('div');
      day.className = 'chart-day';
      const barWrap = document.createElement('div');
      barWrap.className = 'chart-bar-wrap';
      const bar = document.createElement('div');
      bar.className = `chart-bar${i === todayIdx ? ' today' : ''}`;
      const pct = (d[type] / maxVal) * 100;
      bar.style.height = `${Math.max(pct, 3)}%`;

      const val = document.createElement('div');
      val.className = 'chart-bar-val';
      val.textContent = type === 'cal' ? d[type] : `${d[type]}g`;
      bar.appendChild(val);
      barWrap.appendChild(bar);

      const label = document.createElement('div');
      label.className = `chart-day-label${i === todayIdx ? ' today' : ''}`;
      label.textContent = d.day;

      day.appendChild(barWrap);
      day.appendChild(label);
      container.appendChild(day);
    });
  }

  // ============================================================
  // HEATMAP
  // ============================================================
  function buildHeatmap() {
    const times = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid = $('#hm-grid');
    const dayRow = $('#hm-days');
    grid.innerHTML = ''; dayRow.innerHTML = '<div></div>';
    days.forEach(d => { dayRow.innerHTML += `<div class="hm-day">${d}</div>`; });

    times.forEach(t => {
      const label = document.createElement('div');
      label.className = 'hm-label';
      label.textContent = t;
      grid.appendChild(label);
      days.forEach(d => {
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        const lvl = genLevel(d, t);
        cell.dataset.l = lvl;
        const tip = document.createElement('div');
        tip.className = 'hm-tip';
        const burned = lvl * 80 + Math.floor(Math.random() * 50);
        tip.textContent = `${d} ${t}: ${burned} cal burned`;
        cell.appendChild(tip);
        grid.appendChild(cell);
      });
    });
  }

  function genLevel(day, time) {
    const wd = !['Sat', 'Sun'].includes(day);
    const active = ['9AM', '12PM', '6PM'].includes(time);
    if (['6AM', '9PM'].includes(time)) return Math.random() < 0.65 ? 0 : 1;
    if (wd && active) return Math.floor(Math.random() * 3) + 3;
    return Math.floor(Math.random() * 4) + 1;
  }

  // ============================================================
  // SMART SWAP TICKER
  // ============================================================
  function buildTicker() {
    if (!S.db.smart_swaps) return;
    const track = $('#ticker-track');
    track.innerHTML = '';
    const swaps = [...S.db.smart_swaps, ...S.db.smart_swaps];
    swaps.forEach(s => {
      const item = document.createElement('div');
      item.className = 'ticker-item';
      item.innerHTML = `${s.reason}${s.save_cal > 0 ? `<span class="ticker-badge">-${s.save_cal} kcal</span>` : ''}`;
      track.appendChild(item);
    });
  }

  // ============================================================
  // MEAL TIMELINE
  // ============================================================
  function addTimeline(mealName) {
    const el = $('#tl-empty');
    if (el) el.style.display = 'none';
    const tl = $('#meal-timeline');
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    let cal = 0;
    S.currentMeal.forEach(item => cal += item.per_serving.calories * item.qty);
    cal += GHEE_CAL * S.gheeLevel * S.currentMeal.length;

    const item = document.createElement('div');
    item.className = 'timeline-item fade-in';
    item.innerHTML = `
      <div class="timeline-dot-col"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
      <div class="timeline-time">${now}</div>
      <div class="timeline-content">
        <div class="timeline-meal">${mealName}</div>
        <div class="timeline-cal">${Math.round(cal)} kcal</div>
      </div>`;
    tl.prepend(item);
  }

  // ============================================================
  // SEARCH (quick filter)
  // ============================================================
  function initSearch() {
    const input = $('#search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q || !S.db.foods) return;
      // Highlight matching items in sidebar
      $$('.food-card').forEach(card => {
        const name = card.querySelector('.food-card-name')?.textContent.toLowerCase() || '';
        card.style.opacity = name.includes(q) || !q ? '1' : '0.3';
      });
    });
  }

  // ============================================================
  // NAV
  // ============================================================
  function initNav() {
    $$('.nav-pill').forEach(p => p.addEventListener('click', e => {
      e.preventDefault();
      $$('.nav-pill').forEach(n => n.classList.remove('active'));
      p.classList.add('active');
    }));
    $$('.mobile-nav-item').forEach(p => p.addEventListener('click', e => {
      e.preventDefault();
      $$('.mobile-nav-item').forEach(n => n.classList.remove('active'));
      p.classList.add('active');
    }));
  }

  // ============================================================
  // SAMPLE DATA LOADER
  // ============================================================
  function loadSampleData() {
    const profiles = S.db.meal_profiles;
    if (!profiles || !profiles.length) return;
    const regional = profiles.filter(p => p.region === S.region);
    const profile = regional.length ? regional[0] : profiles[0];

    S.currentMeal = profile.items.map(item => {
      const food = S.db.foods.find(f => f.id === item.food_id);
      return food ? { ...food, qty: item.qty } : null;
    }).filter(Boolean);

    renderFoodCards();
    updateAll();

    // Sample timeline entries
    const tl = $('#tl-empty');
    if (tl) tl.style.display = 'none';
    const timeline = $('#meal-timeline');
    const samples = [
      { time: '7:30 AM', name: 'Morning Chai + Biscuits', cal: 135 },
      { time: '12:45 PM', name: profile.name, cal: 0 },
    ];
    samples.forEach(s => {
      let cal = s.cal;
      if (!cal) S.currentMeal.forEach(item => cal += item.per_serving.calories * item.qty);
      const div = document.createElement('div');
      div.className = 'timeline-item fade-in';
      div.innerHTML = `
        <div class="timeline-dot-col"><div class="timeline-dot"></div><div class="timeline-line"></div></div>
        <div class="timeline-time">${s.time}</div>
        <div class="timeline-content">
          <div class="timeline-meal">${s.name}</div>
          <div class="timeline-cal">${Math.round(cal)} kcal</div>
        </div>`;
      timeline.appendChild(div);
    });

    // Pre-fill water
    S.waterGlasses = 3;
    updateWaterUI();
  }

  // ============================================================
  // INIT
  // ============================================================
  async function init() {
    await loadDB();
    initGreeting();
    initScrollEffect();
    initOnboarding();
    initDropZone();
    initGheeSlider();
    initWaterTracker();
    initSearch();
    initNav();
    buildWeeklyChart();
    buildHeatmap();

    if (S.region) {
      setTimeout(loadSampleData, 500);
    } else {
      const obs = new MutationObserver(() => {
        if (!$('#onboarding-modal').classList.contains('active') && S.region) {
          setTimeout(loadSampleData, 300);
          obs.disconnect();
        }
      });
      obs.observe($('#onboarding-modal'), { attributes: true, attributeFilter: ['class'] });
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
