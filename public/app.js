/* FocusForge — personal daily productivity app
 * Vanilla JS (no build step). State lives in localStorage; the page re-renders
 * from a single in-memory store on every change. Sections are marked below.
 */
(function () {
  'use strict';

  /* ======================= 1. CONSTANTS & SEED DATA ======================= */

  var STORAGE_KEY = 'focusforge:v1';
  var SCHEMA_VERSION = 1;
  var STREAK_THRESHOLD = 80; // % completion for a day to count as "productive"

  var WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function uid(prefix) {
    var rand = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    return prefix + '_' + rand;
  }

  var DEFAULT_CATEGORIES = [
    { id: 'cat_routine', name: 'Routine', color: '#9aa4b2', target: 0, builtIn: true },
    { id: 'cat_exercise', name: 'Exercise', color: '#2dd4bf', target: 90, builtIn: true },
    { id: 'cat_ai', name: 'AI Engineering', color: '#4f8cff', target: 210, builtIn: true },
    { id: 'cat_break', name: 'Break', color: '#5b6472', target: 0, builtIn: true },
    { id: 'cat_dsa', name: 'DSA', color: '#ff9148', target: 120, builtIn: true },
    { id: 'cat_dev', name: 'Development', color: '#3ddc84', target: 120, builtIn: true },
    { id: 'cat_job', name: 'Job Applications', color: '#b388ff', target: 45, builtIn: true },
    { id: 'cat_interview', name: 'Interview Prep', color: '#d6a8ff', target: 60, builtIn: true },
    { id: 'cat_family', name: 'Family Time', color: '#ff6fa5', target: 60, builtIn: true },
    { id: 'cat_personal', name: 'Personal', color: '#8f9bff', target: 0, builtIn: true },
    { id: 'cat_revision', name: 'Revision', color: '#ffd166', target: 0, builtIn: true },
    { id: 'cat_planning', name: 'Planning', color: '#42c6d7', target: 0, builtIn: true },
    { id: 'cat_rest', name: 'Rest', color: '#a78bfa', target: 0, builtIn: true }
  ];

  var ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

  function mkTask(templateId, order, start, end, title, categoryId, description) {
    return {
      id: uid('task'), templateId: templateId, order: order, start: start, end: end,
      title: title, categoryId: categoryId, description: description || '',
      enabled: true, recurDays: ALL_DAYS.slice()
    };
  }

  function buildDefaultTasks() {
    var t = [];
    var n = 'tpl_normal', w = 'tpl_weekend', iv = 'tpl_interview';
    // Normal Day
    t.push(mkTask(n, 0, '06:00', '06:15', 'Wake up and freshen up', 'cat_routine'));
    t.push(mkTask(n, 1, '06:15', '07:45', 'Exercise / Workout', 'cat_exercise'));
    t.push(mkTask(n, 2, '07:45', '08:15', 'Bath and Breakfast', 'cat_routine'));
    t.push(mkTask(n, 3, '08:15', '10:15', 'AI Engineering — Learning', 'cat_ai'));
    t.push(mkTask(n, 4, '10:15', '10:30', 'Short Break', 'cat_break'));
    t.push(mkTask(n, 5, '10:30', '12:30', 'DSA Practice', 'cat_dsa'));
    t.push(mkTask(n, 6, '12:30', '13:30', 'Lunch and Rest', 'cat_break'));
    t.push(mkTask(n, 7, '13:30', '15:00', 'AI Engineering — Practical Work', 'cat_ai'));
    t.push(mkTask(n, 8, '15:00', '15:15', 'Short Break', 'cat_break'));
    t.push(mkTask(n, 9, '15:15', '17:15', 'Frontend and Backend Development', 'cat_dev'));
    t.push(mkTask(n, 10, '17:15', '17:30', 'Snack Break', 'cat_break'));
    t.push(mkTask(n, 11, '17:30', '18:15', 'Job Applications', 'cat_job'));
    t.push(mkTask(n, 12, '18:15', '19:15', 'Family Time', 'cat_family'));
    t.push(mkTask(n, 13, '19:15', '20:00', 'Dinner', 'cat_personal'));
    t.push(mkTask(n, 14, '20:00', '20:30', 'Revision and Error Review', 'cat_revision'));
    t.push(mkTask(n, 15, '20:30', '21:30', 'Free Time', 'cat_personal'));
    t.push(mkTask(n, 16, '21:30', '22:00', "Plan Tomorrow's Tasks", 'cat_planning'));
    t.push(mkTask(n, 17, '22:00', '23:00', 'Wind Down and Sleep Preparation', 'cat_rest'));
    // Weekend
    t.push(mkTask(w, 0, '07:00', '07:15', 'Wake up and freshen up', 'cat_routine'));
    t.push(mkTask(w, 1, '07:15', '08:15', 'Exercise / Workout', 'cat_exercise'));
    t.push(mkTask(w, 2, '08:15', '08:45', 'Breakfast', 'cat_routine'));
    t.push(mkTask(w, 3, '09:00', '11:00', 'AI Engineering — Self Study', 'cat_ai'));
    t.push(mkTask(w, 4, '11:00', '12:30', 'DSA — Light Practice', 'cat_dsa'));
    t.push(mkTask(w, 5, '12:30', '13:30', 'Lunch', 'cat_break'));
    t.push(mkTask(w, 6, '13:30', '17:00', 'Family Time', 'cat_family'));
    t.push(mkTask(w, 7, '17:00', '18:00', 'Personal Project / Development', 'cat_dev'));
    t.push(mkTask(w, 8, '18:00', '19:00', 'Dinner', 'cat_personal'));
    t.push(mkTask(w, 9, '19:00', '20:00', 'Free Time', 'cat_personal'));
    t.push(mkTask(w, 10, '20:00', '20:30', 'Plan Next Week', 'cat_planning'));
    t.push(mkTask(w, 11, '20:30', '22:00', 'Wind Down and Sleep Preparation', 'cat_rest'));
    // Interview Day (copy of Normal, Job Applications -> Interview Prep)
    t.push(mkTask(iv, 0, '06:00', '06:15', 'Wake up and freshen up', 'cat_routine'));
    t.push(mkTask(iv, 1, '06:15', '07:45', 'Exercise / Workout', 'cat_exercise'));
    t.push(mkTask(iv, 2, '07:45', '08:15', 'Bath and Breakfast', 'cat_routine'));
    t.push(mkTask(iv, 3, '08:15', '10:15', 'AI Engineering — Learning', 'cat_ai'));
    t.push(mkTask(iv, 4, '10:15', '10:30', 'Short Break', 'cat_break'));
    t.push(mkTask(iv, 5, '10:30', '12:30', 'DSA — Interview Problems', 'cat_dsa'));
    t.push(mkTask(iv, 6, '12:30', '13:30', 'Lunch and Rest', 'cat_break'));
    t.push(mkTask(iv, 7, '13:30', '15:00', 'Mock Interview Practice', 'cat_interview', 'Behavioral + technical mock round'));
    t.push(mkTask(iv, 8, '15:00', '15:15', 'Short Break', 'cat_break'));
    t.push(mkTask(iv, 9, '15:15', '17:15', 'System Design / Project Review', 'cat_dev'));
    t.push(mkTask(iv, 10, '17:15', '17:30', 'Snack Break', 'cat_break'));
    t.push(mkTask(iv, 11, '17:30', '18:15', 'Interview Prep — Company Research', 'cat_interview'));
    t.push(mkTask(iv, 12, '18:15', '19:15', 'Family Time', 'cat_family'));
    t.push(mkTask(iv, 13, '19:15', '20:00', 'Dinner', 'cat_personal'));
    t.push(mkTask(iv, 14, '20:00', '20:30', 'Revision and Error Review', 'cat_revision'));
    t.push(mkTask(iv, 15, '20:30', '21:30', 'Free Time', 'cat_personal'));
    t.push(mkTask(iv, 16, '21:30', '22:00', "Plan Tomorrow's Tasks", 'cat_planning'));
    t.push(mkTask(iv, 17, '22:00', '23:00', 'Wind Down and Sleep Preparation', 'cat_rest'));
    return t;
  }

  function buildDefaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      categories: DEFAULT_CATEGORIES.map(function (c) { return Object.assign({}, c); }),
      templates: [
        { id: 'tpl_normal', name: 'Normal Day', builtIn: true },
        { id: 'tpl_weekend', name: 'Weekend', builtIn: true },
        { id: 'tpl_interview', name: 'Interview Day', builtIn: true }
      ],
      tasks: buildDefaultTasks(),
      scheduleAssignment: { 0: 'tpl_weekend', 1: 'tpl_normal', 2: 'tpl_normal', 3: 'tpl_normal', 4: 'tpl_normal', 5: 'tpl_normal', 6: 'tpl_weekend' },
      dateOverrides: {},
      checklists: {},
      checklistBackups: {},
      timerSessions: {},
      activeTimer: null,
      settings: { timeFormat: '24', theme: 'dark', weekStartsMonday: true },
      profile: { name: '', photoDataUrl: null },
      meta: { firstLaunch: todayLocal(), installedAt: new Date().toISOString() }
    };
  }

  /* ======================= 2. DATE & TIME UTILITIES ======================= */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dateToKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayLocal() { return dateToKey(new Date()); }
  function keyToDate(key) {
    var parts = key.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function addDays(key, n) { var d = keyToDate(key); d.setDate(d.getDate() + n); return dateToKey(d); }
  function weekdayOf(key) { return keyToDate(key).getDay(); }
  function isToday(key) { return key === todayLocal(); }
  function isFuture(key) { return key > todayLocal(); }
  function isPast(key) { return key < todayLocal(); }
  function formatDateLong(key) {
    var d = keyToDate(key);
    return WEEKDAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function formatDateShort(key) {
    var d = keyToDate(key);
    return MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getDate();
  }
  function timeToMinutes(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function minutesToTime(min) { min = ((min % 1440) + 1440) % 1440; return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60); }
  function formatTime(t, fmt) {
    var p = t.split(':'); var h = Number(p[0]), m = Number(p[1]);
    if (fmt === '12') {
      var period = h < 12 ? 'AM' : 'PM';
      var hh = h % 12; if (hh === 0) hh = 12;
      return hh + ':' + pad2(m) + ' ' + period;
    }
    return pad2(h) + ':' + pad2(m);
  }
  function durationMinutes(start, end) {
    var d = timeToMinutes(end) - timeToMinutes(start);
    return d <= 0 ? d + 1440 : d;
  }
  function formatDuration(mins) {
    mins = Math.round(mins);
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }
  function formatHoursShort(mins) {
    return (mins / 60).toFixed(1).replace(/\.0$/, '') + 'h';
  }
  function formatClock(totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
    return pad2(m) + ':' + pad2(s);
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ======================= 3. STORAGE LAYER ======================= */

  var state = null;
  var persistTimer = null;

  function safeLoad() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (e) {
      console.warn('FocusForge: could not read saved data, starting fresh.', e);
      return null;
    }
  }

  function validateAndMerge(loaded) {
    var base = buildDefaultState();
    if (!loaded) return base;
    try {
      var out = base;
      if (Array.isArray(loaded.categories) && loaded.categories.length) out.categories = loaded.categories;
      if (Array.isArray(loaded.templates) && loaded.templates.length) out.templates = loaded.templates;
      if (Array.isArray(loaded.tasks)) out.tasks = loaded.tasks;
      if (loaded.scheduleAssignment && typeof loaded.scheduleAssignment === 'object') out.scheduleAssignment = loaded.scheduleAssignment;
      if (loaded.dateOverrides && typeof loaded.dateOverrides === 'object') out.dateOverrides = loaded.dateOverrides;
      if (loaded.checklists && typeof loaded.checklists === 'object') out.checklists = loaded.checklists;
      if (loaded.checklistBackups && typeof loaded.checklistBackups === 'object') out.checklistBackups = loaded.checklistBackups;
      if (loaded.timerSessions && typeof loaded.timerSessions === 'object') out.timerSessions = loaded.timerSessions;
      if (loaded.activeTimer !== undefined) out.activeTimer = loaded.activeTimer;
      if (loaded.settings && typeof loaded.settings === 'object') out.settings = Object.assign({}, base.settings, loaded.settings);
      if (loaded.profile && typeof loaded.profile === 'object') out.profile = Object.assign({}, base.profile, loaded.profile);
      if (loaded.meta && typeof loaded.meta === 'object') out.meta = Object.assign({}, base.meta, loaded.meta);
      return out;
    } catch (e) {
      console.warn('FocusForge: saved data was malformed, using defaults.', e);
      return base;
    }
  }

  function persistNow() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('FocusForge: could not save data.', e);
      showToast('Could not save — your browser storage may be full or blocked.', 'error');
    }
  }

  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 150);
  }

  function flushPersist() {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    persistNow();
  }

  /* ======================= 4. STORE / SUBSCRIPTIONS ======================= */

  function initState() {
    state = validateAndMerge(safeLoad());
  }

  var rerenderQueued = false;
  function markDirty(skipPersist) {
    if (!skipPersist) persist();
    if (rerenderQueued) return;
    rerenderQueued = true;
    requestAnimationFrame(function () { rerenderQueued = false; render(); });
  }

  /* ======================= 5. CHECKLIST GENERATION ======================= */

  function getTemplateIdForDate(dateKey) {
    var override = state.dateOverrides[dateKey];
    if (override && state.templates.some(function (t) { return t.id === override; })) return override;
    var wd = weekdayOf(dateKey);
    var assigned = state.scheduleAssignment[wd] || state.scheduleAssignment[String(wd)];
    if (assigned && state.templates.some(function (t) { return t.id === assigned; })) return assigned;
    return state.templates[0] ? state.templates[0].id : null;
  }

  function generateChecklistForDate(dateKey) {
    var templateId = getTemplateIdForDate(dateKey);
    var wd = weekdayOf(dateKey);
    var tasks = state.tasks
      .filter(function (t) { return t.templateId === templateId && t.enabled !== false; })
      .filter(function (t) { return !t.recurDays || t.recurDays.length === 0 || t.recurDays.indexOf(wd) !== -1; })
      .slice()
      .sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start) || a.order - b.order; });
    var instances = tasks.map(function (t) {
      return {
        id: uid('inst'), taskId: t.id, title: t.title, description: t.description || '',
        start: t.start, end: t.end, categoryId: t.categoryId,
        completed: false, completedAt: null, custom: false
      };
    });
    return { date: dateKey, templateId: templateId, generatedAt: new Date().toISOString(), tasks: instances, note: '', priorityTaskId: null };
  }

  function ensureChecklist(dateKey) {
    if (!state.checklists[dateKey]) {
      state.checklists[dateKey] = generateChecklistForDate(dateKey);
      persist();
    }
    return state.checklists[dateKey];
  }

  function backupChecklist(dateKey) {
    if (state.checklists[dateKey]) {
      state.checklistBackups[dateKey] = JSON.parse(JSON.stringify(state.checklists[dateKey]));
    }
  }

  function restoreChecklistBackup(dateKey) {
    if (state.checklistBackups[dateKey]) {
      state.checklists[dateKey] = state.checklistBackups[dateKey];
      delete state.checklistBackups[dateKey];
      markDirty();
      showToast('Restored previous checklist for ' + formatDateShort(dateKey) + '.', 'success');
    }
  }

  function regenerateChecklist(dateKey) {
    backupChecklist(dateKey);
    state.checklists[dateKey] = generateChecklistForDate(dateKey);
    markDirty();
    showToast('Checklist reset. ', 'info', { actionLabel: 'Undo', action: function () { restoreChecklistBackup(dateKey); } });
  }

  function addUnscheduledTask(dateKey, data) {
    var checklist = ensureChecklist(dateKey);
    checklist.tasks.push({
      id: uid('inst'), taskId: null, title: data.title, description: data.description || '',
      start: data.start || null, end: data.end || null, categoryId: data.categoryId,
      completed: false, completedAt: null, custom: true
    });
    markDirty();
  }

  function toggleTaskComplete(dateKey, instanceId) {
    var checklist = ensureChecklist(dateKey);
    var inst = checklist.tasks.filter(function (x) { return x.id === instanceId; })[0];
    if (!inst) return;
    inst.completed = !inst.completed;
    inst.completedAt = inst.completed ? new Date().toISOString() : null;
    markDirty();
    if (inst.completed) {
      var all = checklist.tasks;
      var done = all.filter(function (x) { return x.completed; }).length;
      if (done === all.length && all.length > 0) {
        showToast('All tasks complete for ' + (isToday(dateKey) ? 'today' : formatDateShort(dateKey)) + '. Nice work.', 'success');
      }
    }
  }

  function deleteTaskInstance(dateKey, instanceId) {
    var checklist = ensureChecklist(dateKey);
    checklist.tasks = checklist.tasks.filter(function (x) { return x.id !== instanceId; });
    if (checklist.priorityTaskId === instanceId) checklist.priorityTaskId = null;
    markDirty();
  }

  function togglePriorityTask(dateKey, instanceId) {
    var checklist = ensureChecklist(dateKey);
    checklist.priorityTaskId = (checklist.priorityTaskId === instanceId) ? null : instanceId;
    markDirty();
  }

  function setDailyNote(dateKey, text) {
    var checklist = ensureChecklist(dateKey);
    checklist.note = text;
    persist();
  }

  function priorityTaskFor(dateKey) {
    var checklist = state.checklists[dateKey];
    if (!checklist || !checklist.priorityTaskId) return null;
    var t = checklist.tasks.filter(function (x) { return x.id === checklist.priorityTaskId; })[0];
    return (t && !t.completed) ? t : null;
  }

  function setProfileName(name) {
    state.profile.name = (name || '').slice(0, 60);
    persist();
  }

  function setProfilePhotoFromFile(file, onDone) {
    if (!file || !/^image\//.test(file.type)) { showToast('Please choose an image file.', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        try {
          var size = 160;
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var side = Math.min(img.width, img.height);
          var sx = (img.width - side) / 2, sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          state.profile.photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          markDirty();
          if (onDone) onDone();
        } catch (e) {
          showToast('Could not process that image.', 'error');
        }
      };
      img.onerror = function () { showToast('Could not read that image.', 'error'); };
      img.src = String(reader.result || '');
    };
    reader.onerror = function () { showToast('Could not read that file.', 'error'); };
    reader.readAsDataURL(file);
  }

  function clearProfilePhoto() {
    state.profile.photoDataUrl = null;
    markDirty();
  }

  function avatarHtml(size) {
    size = size || 34;
    if (state.profile.photoDataUrl) {
      return '<img src="' + state.profile.photoDataUrl + '" alt="" class="avatar-img" style="width:' + size + 'px;height:' + size + 'px" />';
    }
    var initials = (state.profile.name || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] ? w[0].toUpperCase() : ''; }).join('') || '';
    if (initials) {
      return '<span class="avatar-initials" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.4) + 'px">' + esc(initials) + '</span>';
    }
    return null;
  }

  /* ======================= 6. TIMER LOGIC ======================= */

  function getSessionsFor(dateKey, instanceId) {
    var list = state.timerSessions[dateKey] || [];
    return instanceId ? list.filter(function (s) { return s.instanceId === instanceId; }) : list;
  }

  function trackedSecondsFor(dateKey, instanceId) {
    var sessions = getSessionsFor(dateKey, instanceId);
    var total = 0;
    sessions.forEach(function (s) { total += s.seconds || 0; });
    if (state.activeTimer && state.activeTimer.date === dateKey && state.activeTimer.instanceId === instanceId) {
      total += (Date.now() - state.activeTimer.startedAt) / 1000;
    }
    return total;
  }

  function startTimer(dateKey, instanceId) {
    stopTimer(); // only one running timer at a time, avoids double counting
    state.activeTimer = { date: dateKey, instanceId: instanceId, startedAt: Date.now() };
    markDirty();
    startTicker();
  }

  function stopTimer() {
    if (!state.activeTimer) return;
    var at = state.activeTimer;
    var elapsed = (Date.now() - at.startedAt) / 1000;
    if (elapsed > 0.5) {
      if (!state.timerSessions[at.date]) state.timerSessions[at.date] = [];
      state.timerSessions[at.date].push({ id: uid('tsn'), instanceId: at.instanceId, seconds: Math.round(elapsed), endedAt: new Date().toISOString(), manual: false });
    }
    state.activeTimer = null;
    markDirty();
  }

  function setManualDuration(dateKey, instanceId, minutes) {
    if (!state.timerSessions[dateKey]) state.timerSessions[dateKey] = [];
    state.timerSessions[dateKey] = state.timerSessions[dateKey].filter(function (s) { return s.instanceId !== instanceId; });
    if (minutes > 0) {
      state.timerSessions[dateKey].push({ id: uid('tsn'), instanceId: instanceId, seconds: Math.round(minutes * 60), endedAt: new Date().toISOString(), manual: true });
    }
    markDirty();
  }

  var tickerHandle = null;
  function startTicker() {
    if (tickerHandle) return;
    tickerHandle = setInterval(function () {
      if (!state.activeTimer) { clearInterval(tickerHandle); tickerHandle = null; return; }
      tickTimerDisplays();
    }, 1000);
  }
  function tickTimerDisplays() {
    if (!state.activeTimer) return;
    var els = document.querySelectorAll('[data-timer-display]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-timer-display') === state.activeTimer.instanceId) {
        el.textContent = formatClock(trackedSecondsFor(state.activeTimer.date, state.activeTimer.instanceId));
      }
    }
  }

  /* ======================= 7. DERIVED STATS ======================= */

  function categoryById(id) { return state.categories.filter(function (c) { return c.id === id; })[0]; }
  function templateById(id) { return state.templates.filter(function (t) { return t.id === id; })[0]; }

  function checklistStats(checklist) {
    if (!checklist) return { total: 0, done: 0, pct: 0, remaining: 0 };
    var total = checklist.tasks.length;
    var done = checklist.tasks.filter(function (t) { return t.completed; }).length;
    return { total: total, done: done, remaining: total - done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  }

  function categoryBreakdownForDate(dateKey) {
    var checklist = state.checklists[dateKey];
    var map = {};
    state.categories.forEach(function (c) { map[c.id] = { category: c, scheduledMin: 0, trackedSec: 0, total: 0, done: 0 }; });
    if (checklist) {
      checklist.tasks.forEach(function (t) {
        if (!map[t.categoryId]) return;
        var row = map[t.categoryId];
        row.total++;
        if (t.completed) row.done++;
        if (t.start && t.end) row.scheduledMin += durationMinutes(t.start, t.end);
        row.trackedSec += trackedSecondsFor(dateKey, t.id);
      });
    }
    return map;
  }

  function nextUpcomingTask(dateKey, checklist) {
    if (!isToday(dateKey) || !checklist) return null;
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var candidates = checklist.tasks.filter(function (t) { return t.start && !t.completed && timeToMinutes(t.start) >= nowMin; });
    candidates.sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
    if (candidates.length) return candidates[0];
    var anyIncomplete = checklist.tasks.filter(function (t) { return !t.completed; });
    anyIncomplete.sort(function (a, b) { return timeToMinutes(a.start || '00:00') - timeToMinutes(b.start || '00:00'); });
    return anyIncomplete[0] || null;
  }

  function isProductiveDay(dateKey) {
    var checklist = state.checklists[dateKey];
    if (!checklist || checklist.tasks.length === 0) return false;
    return checklistStats(checklist).pct >= STREAK_THRESHOLD;
  }

  function computeStreak() {
    var streak = 0;
    var cursor = addDays(todayLocal(), -1);
    while (state.checklists[cursor] && isProductiveDay(cursor)) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    if (state.checklists[todayLocal()] && isProductiveDay(todayLocal())) streak++;
    return streak;
  }

  /* ======================= 8. UI STATE ======================= */

  var ui = {
    route: 'dashboard',
    viewDate: todayLocal(),
    historyDate: todayLocal(),
    calendarMonth: (function () { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); })(),
    search: '',
    categoryFilter: 'all',
    hideCompleted: false,
    editingTemplateId: 'tpl_normal',
    modal: null,
    toasts: [],
    sidebarOpen: false
  };

  var toastSeq = 0;
  function showToast(message, kind, opts) {
    var id = ++toastSeq;
    var toast = { id: id, message: message, kind: kind || 'info', actionLabel: opts && opts.actionLabel, action: opts && opts.action };
    ui.toasts.push(toast);
    renderToasts();
    setTimeout(function () { dismissToast(id); }, 4200);
  }
  function dismissToast(id) {
    ui.toasts = ui.toasts.filter(function (t) { return t.id !== id; });
    renderToasts();
  }
  function renderToasts() {
    var root = document.getElementById('toast-root');
    if (!root) return;
    root.innerHTML = ui.toasts.map(function (t) {
      return '<div class="toast toast-' + t.kind + '" role="status">' +
        '<span>' + esc(t.message) + '</span>' +
        (t.actionLabel ? '<button type="button" class="toast-action" data-act="toast-action" data-toast="' + t.id + '">' + esc(t.actionLabel) + '</button>' : '') +
        '<button type="button" class="toast-close" data-act="toast-close" data-toast="' + t.id + '" aria-label="Dismiss">&times;</button>' +
        '</div>';
    }).join('');
  }

  var toastActions = {};
  function registerToastAction(id, fn) { toastActions[id] = fn; }

  /* ======================= 9. ICONS (hand-rolled, lucide-style) ======================= */

  function icon(name, cls) {
    var p = '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    var paths = {
      dashboard: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
      today: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
      timetable: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
      history: '<path d="M3 3v5h5"/><path d="M3.05 13a9 9 0 1 0 2.13-8.36L3 8"/><path d="M12 7v5l3 2"/>',
      analytics: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      x: '<path d="M18 6 6 18M6 6l18 18"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
      copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
      play: '<path d="m6 3 14 9-14 9V3z"/>',
      pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
      stop: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
      flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      chevronRight: '<path d="m9 18 6-6-6-6"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
      grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
      arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
      warn: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
      moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
      target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'
    };
    return p + (paths[name] || '') + '</svg>';
  }

  /* ======================= 10. NAV / ROUTING ======================= */

  var ROUTES = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'today', label: "Today's Tasks", icon: 'today' },
    { id: 'timetable', label: 'Timetable', icon: 'timetable' },
    { id: 'history', label: 'Calendar & History', icon: 'history' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  function navigate(route) {
    ui.route = route;
    ui.sidebarOpen = false;
    location.hash = route;
    render();
    var main = document.getElementById('main-scroll');
    if (main) main.scrollTop = 0;
  }

  function onHashChange() {
    var h = location.hash.replace('#', '');
    var valid = ROUTES.some(function (r) { return r.id === h; });
    ui.route = valid ? h : 'dashboard';
    render();
  }

  /* ======================= 11. APP SHELL ======================= */

  function renderShell() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="shell">' +
      '<aside class="sidebar' + (ui.sidebarOpen ? ' open' : '') + '">' +
      '<div id="brand-block">' + brandHtml() + '</div>' +
      '<nav class="nav">' + ROUTES.map(navItem).join('') + '</nav>' +
      '<div class="sidebar-foot">' +
      '<div class="streak-pill">' + icon('flame', 'icon-flame') + '<span>' + computeStreak() + ' day streak</span></div>' +
      '</div>' +
      '</aside>' +
      '<div class="sidebar-scrim" data-act="close-sidebar"></div>' +
      '<div class="main">' +
      '<header class="topbar">' +
      '<button type="button" class="icon-btn mobile-only" data-act="open-sidebar" aria-label="Open menu">' + icon('menu') + '</button>' +
      '<div class="topbar-title">' + (ROUTES.filter(function (r) { return r.id === ui.route; })[0] || {}).label + '</div>' +
      '<button type="button" class="icon-btn" data-act="toggle-theme" aria-label="Toggle theme">' + icon(state.settings.theme === 'dark' ? 'moon' : 'sun') + '</button>' +
      '</header>' +
      '<main class="content" id="main-scroll"><div id="view"></div></main>' +
      '<nav class="mobile-tabbar mobile-only">' + ROUTES.map(mobileTabItem).join('') + '</nav>' +
      '</div>' +
      '</div>' +
      '<div id="toast-root" class="toast-root"></div>' +
      '<div id="modal-root"></div>';
  }

  function brandHtml() {
    var base = '<div class="brand"><span class="brand-mark">' + icon('bolt') + '</span><span class="brand-name">FocusForge</span></div>';
    var hasProfile = state.profile.name || state.profile.photoDataUrl;
    var profileRow = hasProfile
      ? '<button type="button" class="profile-row" data-act="nav" data-route="settings">' +
        (avatarHtml(30) || '') +
        '<span class="profile-name">' + esc(state.profile.name || 'Your profile') + '</span>' +
        '</button>'
      : '<button type="button" class="profile-row profile-row-empty" data-act="nav" data-route="settings">' + icon('plus', 'icon-sm') + '<span>Add your profile</span></button>';
    return base + profileRow;
  }

  function refreshBrandBlock() {
    var el = document.getElementById('brand-block');
    if (el) el.innerHTML = brandHtml();
  }

  function navItem(r) {
    return '<button type="button" class="nav-item' + (ui.route === r.id ? ' active' : '') + '" data-act="nav" data-route="' + r.id + '">' +
      icon(r.icon) + '<span>' + r.label + '</span></button>';
  }
  function mobileTabItem(r) {
    return '<button type="button" class="tab-item' + (ui.route === r.id ? ' active' : '') + '" data-act="nav" data-route="' + r.id + '">' +
      icon(r.icon) + '<span>' + r.label.split(' ')[0] + '</span></button>';
  }

  function renderRouteInto(target) {
    var html;
    switch (ui.route) {
      case 'dashboard': html = renderDashboard(); break;
      case 'today': html = renderToday(); break;
      case 'timetable': html = renderTimetable(); break;
      case 'history': html = renderHistory(); break;
      case 'analytics': html = renderAnalytics(); break;
      case 'settings': html = renderSettings(); break;
      default: html = renderDashboard();
    }
    target.innerHTML = html;
  }

  function render() {
    if (!document.querySelector('.shell')) {
      renderShell();
    } else {
      // update nav active states + streak without full teardown
      var navEls = document.querySelectorAll('[data-act="nav"]');
      navEls.forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-route') === ui.route);
      });
      var title = document.querySelector('.topbar-title');
      if (title) title.textContent = (ROUTES.filter(function (r) { return r.id === ui.route; })[0] || {}).label;
      var sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('open', ui.sidebarOpen);
      var streakPill = document.querySelector('.streak-pill span');
      if (streakPill) streakPill.textContent = computeStreak() + ' day streak';
      var themeBtn = document.querySelector('[data-act="toggle-theme"]');
      if (themeBtn) themeBtn.innerHTML = icon(state.settings.theme === 'dark' ? 'moon' : 'sun');
      refreshBrandBlock();
    }
    var view = document.getElementById('view');
    if (view) renderRouteInto(view);
    renderToasts();
    applyTheme();
  }

  function applyTheme() {
    var root = document.documentElement;
    if (state.settings.theme === 'light') root.setAttribute('data-theme', 'light');
    else if (state.settings.theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }

  /* ======================= 12. DASHBOARD VIEW ======================= */

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return 'Still up?';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Winding down';
  }

  function progressRing(pct, size, strokeW, label, sub) {
    size = size || 120; strokeW = strokeW || 10;
    var r = (size - strokeW) / 2;
    var c = 2 * Math.PI * r;
    var offset = c * (1 - pct / 100);
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--border)" stroke-width="' + strokeW + '"/>' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="var(--accent-ai)" stroke-width="' + strokeW + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')" class="ring-progress"/>' +
      '<text x="50%" y="48%" text-anchor="middle" class="ring-pct">' + pct + '%</text>' +
      '<text x="50%" y="64%" text-anchor="middle" class="ring-label">' + esc(label || '') + '</text>' +
      '</svg>' + (sub ? '<div class="ring-sub">' + esc(sub) + '</div>' : '');
  }

  function renderDashboard() {
    var dateKey = todayLocal();
    var checklist = ensureChecklist(dateKey);
    var stats = checklistStats(checklist);
    var priority = priorityTaskFor(dateKey);
    var upcoming = priority || nextUpcomingTask(dateKey, checklist);
    var breakdown = categoryBreakdownForDate(dateKey);
    var streak = computeStreak();
    var fmt = state.settings.timeFormat;

    var primaryCats = ['cat_ai', 'cat_dsa', 'cat_dev'];
    var catCards = primaryCats.concat(['cat_job', 'cat_exercise', 'cat_family']).map(function (cid) {
      var row = breakdown[cid];
      if (!row) return '';
      var trackedMin = row.trackedSec / 60;
      var target = row.category.target;
      var pct = target > 0 ? Math.min(100, Math.round((trackedMin / target) * 100)) : null;
      return '<div class="cat-card">' +
        '<div class="cat-card-top"><span class="dot" style="background:' + row.category.color + '"></span><span class="cat-name">' + esc(row.category.name) + '</span></div>' +
        '<div class="cat-card-num">' + formatHoursShort(trackedMin) + (target > 0 ? ' <span class="muted">/ ' + formatHoursShort(target) + '</span>' : '') + '</div>' +
        (target > 0 ? '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:' + row.category.color + '"></div></div>' : '<div class="muted small">Scheduled: ' + formatDuration(row.scheduledMin) + '</div>') +
        '</div>';
    }).join('');

    return '' +
      '<section class="hero-row">' +
      '<div>' +
      '<div class="eyebrow">' + formatDateLong(dateKey) + '</div>' +
      '<h1 class="greeting">' + greeting() + (state.profile.name ? ', ' + esc(state.profile.name.split(' ')[0]) : '') + '. Time to build.</h1>' +
      '<p class="muted">' + stats.done + ' of ' + stats.total + ' tasks done' +
      (upcoming ? ' · ' + (priority ? 'Today\'s priority: ' : 'Next: ') + esc(upcoming.title) + (upcoming.start ? ' at ' + formatTime(upcoming.start, fmt) : '') : ' · Nothing left scheduled') + '</p>' +
      '<div class="hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="nav" data-route="today">' + icon('today') + ' Open today\'s tasks</button>' +
      '<button type="button" class="btn" data-act="open-add-task-modal" data-date="' + dateKey + '">' + icon('plus') + ' Add task</button>' +
      '<button type="button" class="btn" data-act="nav" data-route="timetable">' + icon('timetable') + ' Edit timetable</button>' +
      '<button type="button" class="btn" data-act="nav" data-route="history">' + icon('history') + ' View history</button>' +
      '</div>' +
      '</div>' +
      '<div class="hero-ring">' + progressRing(stats.pct, 136, 12, 'complete', stats.remaining + ' left') + '</div>' +
      '</section>' +

      '<section class="stat-row">' +
      statTile('today', stats.done + '/' + stats.total, 'Tasks completed') +
      statTile('clock', upcoming ? (upcoming.start ? formatTime(upcoming.start, fmt) : 'Unscheduled') : '—', upcoming ? esc(upcoming.title) : 'Upcoming task') +
      statTile('flame', String(streak), 'Day streak (≥' + STREAK_THRESHOLD + '% days)') +
      statTile('target', formatHoursShort(sumScheduled(breakdown, primaryCats)), 'Scheduled core study') +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Category time today</h2><span class="muted small">Tracked vs. daily target</span></div>' +
      '<div class="cat-grid">' + catCards + '</div>' +
      '</section>';
  }

  function sumScheduled(breakdown, ids) {
    var total = 0;
    ids.forEach(function (id) { if (breakdown[id]) total += breakdown[id].scheduledMin; });
    return total;
  }

  function statTile(iconName, value, label) {
    return '<div class="stat-tile">' + icon(iconName, 'stat-icon') + '<div><div class="stat-value">' + value + '</div><div class="stat-label">' + esc(label) + '</div></div></div>';
  }

  /* ======================= 13. TODAY'S TASKS VIEW ======================= */

  function renderToday() {
    var dateKey = ui.viewDate;
    var checklist = ensureChecklist(dateKey);
    var stats = checklistStats(checklist);
    var fmt = state.settings.timeFormat;
    var editable = true; // historical editing is deliberately allowed everywhere

    var tasks = checklist.tasks.slice().sort(function (a, b) {
      return timeToMinutes(a.start || '00:00') - timeToMinutes(b.start || '00:00');
    });
    if (ui.categoryFilter !== 'all') tasks = tasks.filter(function (t) { return t.categoryId === ui.categoryFilter; });
    if (ui.search.trim()) {
      var q = ui.search.trim().toLowerCase();
      tasks = tasks.filter(function (t) { return t.title.toLowerCase().indexOf(q) !== -1 || (t.description || '').toLowerCase().indexOf(q) !== -1; });
    }
    if (ui.hideCompleted) tasks = tasks.filter(function (t) { return !t.completed; });

    var catOptions = '<option value="all">All categories</option>' + state.categories.map(function (c) {
      return '<option value="' + c.id + '"' + (ui.categoryFilter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

    var listHtml = tasks.length ? tasks.map(function (t) { return taskRow(dateKey, t, fmt); }).join('') :
      '<div class="empty-state">' + icon('today') + '<p>No tasks match. Try clearing filters or add an unscheduled task.</p></div>';

    return '' +
      '<section class="day-nav">' +
      '<button type="button" class="icon-btn" data-act="day-prev" aria-label="Previous day">' + icon('chevronLeft') + '</button>' +
      '<div class="day-nav-label">' +
      '<strong>' + (isToday(dateKey) ? 'Today' : formatDateLong(dateKey)) + '</strong>' +
      (isToday(dateKey) ? '<span class="muted small">' + formatDateLong(dateKey) + '</span>' : '') +
      '</div>' +
      '<button type="button" class="icon-btn" data-act="day-next" aria-label="Next day">' + icon('chevronRight') + '</button>' +
      (!isToday(dateKey) ? '<button type="button" class="btn btn-small" data-act="day-today">Today</button>' : '') +
      '</section>' +

      '<section class="progress-strip">' +
      '<div class="bar bar-lg"><div class="bar-fill" style="width:' + stats.pct + '%"></div></div>' +
      '<span class="muted small">' + stats.done + ' / ' + stats.total + ' complete (' + stats.pct + '%)</span>' +
      '</section>' +

      '<section class="toolbar">' +
      '<div class="search-box">' + icon('search') + '<input id="search-input" type="search" placeholder="Search tasks" value="' + esc(ui.search) + '" data-act="search" aria-label="Search tasks"/></div>' +
      '<select class="select" data-act="filter-category" aria-label="Filter by category">' + catOptions + '</select>' +
      '<label class="toggle-label"><input type="checkbox" data-act="toggle-hide-completed"' + (ui.hideCompleted ? ' checked' : '') + '/> Hide completed</label>' +
      '<button type="button" class="btn btn-small" data-act="open-add-task-modal" data-date="' + dateKey + '">' + icon('plus') + ' Add task</button>' +
      (isToday(dateKey) ? '<button type="button" class="btn btn-small btn-ghost" data-act="reset-today">Reset checklist</button>' : '') +
      '<span class="muted small shortcut-hint">Shortcuts: &larr;/&rarr; day · / search · T today</span>' +
      '</section>' +

      '<section class="task-list">' + listHtml + '</section>' +

      dailyNoteBox(dateKey, checklist);
  }

  function taskRow(dateKey, t, fmt) {
    var cat = categoryById(t.categoryId) || { name: 'Other', color: '#888' };
    var tracked = trackedSecondsFor(dateKey, t.id);
    var isActive = state.activeTimer && state.activeTimer.date === dateKey && state.activeTimer.instanceId === t.id;
    var scheduled = t.start && t.end ? formatTime(t.start, fmt) + ' – ' + formatTime(t.end, fmt) : 'Unscheduled';
    var checklist = state.checklists[dateKey];
    var isPriority = checklist && checklist.priorityTaskId === t.id;
    var isNow = false;
    if (isToday(dateKey) && t.start && t.end) {
      var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      isNow = timeToMinutes(t.start) <= nowMin && nowMin < timeToMinutes(t.end);
    }
    return '<div class="task-row' + (t.completed ? ' completed' : '') + (isPriority ? ' priority' : '') + (isNow ? ' is-now' : '') + '" data-instance="' + t.id + '">' +
      '<button type="button" class="checkbox' + (t.completed ? ' checked' : '') + '" data-act="toggle-task" data-date="' + dateKey + '" data-id="' + t.id + '" aria-pressed="' + t.completed + '" aria-label="' + (t.completed ? 'Mark incomplete' : 'Mark complete') + '">' +
      '<span class="checkbox-box">' + icon('check', 'checkbox-mark') + '</span>' +
      '</button>' +
      '<div class="task-main">' +
      '<div class="task-title-row"><span class="dot" style="background:' + cat.color + '"></span><span class="task-title">' + esc(t.title) + '</span>' +
      (isNow ? '<span class="pill pill-now">now</span>' : '') +
      (isPriority ? '<span class="pill pill-priority">priority</span>' : '') +
      (t.custom ? '<span class="pill pill-muted">custom</span>' : '') + '</div>' +
      '<div class="task-meta muted small">' + esc(scheduled) + ' · ' + esc(cat.name) + (t.description ? ' · ' + esc(t.description) : '') + '</div>' +
      '</div>' +
      '<div class="task-timer">' +
      '<span class="timer-display" data-timer-display="' + t.id + '">' + formatClock(tracked) + '</span>' +
      (isActive ?
        '<button type="button" class="icon-btn" data-act="timer-stop" aria-label="Stop timer">' + icon('stop') + '</button>' :
        '<button type="button" class="icon-btn" data-act="timer-start" data-date="' + dateKey + '" data-id="' + t.id + '" aria-label="Start timer">' + icon('play') + '</button>') +
      '</div>' +
      '<div class="task-actions">' +
      '<button type="button" class="icon-btn' + (isPriority ? ' icon-btn-priority-active' : '') + '" data-act="toggle-priority" data-date="' + dateKey + '" data-id="' + t.id + '" aria-pressed="' + isPriority + '" aria-label="' + (isPriority ? 'Unset as priority' : 'Set as today\'s priority') + '">' + icon('flame') + '</button>' +
      '<button type="button" class="icon-btn" data-act="open-manual-time-modal" data-date="' + dateKey + '" data-id="' + t.id + '" aria-label="Edit tracked time">' + icon('clock') + '</button>' +
      (t.custom ? '<button type="button" class="icon-btn" data-act="delete-instance" data-date="' + dateKey + '" data-id="' + t.id + '" aria-label="Delete task">' + icon('trash') + '</button>' : '') +
      '</div>' +
      '</div>';
  }

  function dailyNoteBox(dateKey, checklist) {
    var note = (checklist && checklist.note) || '';
    return '<div class="panel note-panel">' +
      '<div class="panel-head"><h2>Daily note</h2><span class="muted small">What went well, what to adjust tomorrow</span></div>' +
      '<textarea class="input" rows="3" data-act="daily-note" data-date="' + dateKey + '" placeholder="Optional reflection for ' + (isToday(dateKey) ? 'today' : formatDateShort(dateKey)) + '…">' + esc(note) + '</textarea>' +
      '</div>';
  }

  /* ======================= 14. TIMETABLE EDITOR VIEW ======================= */

  function renderTimetable() {
    var tpl = ui.editingTemplateId;
    var tasks = state.tasks.filter(function (t) { return t.templateId === tpl; }).slice().sort(function (a, b) { return a.order - b.order; });
    var overlaps = findOverlaps(tasks);

    var tplTabs = state.templates.map(function (t) {
      return '<button type="button" class="chip' + (t.id === tpl ? ' active' : '') + '" data-act="select-template" data-id="' + t.id + '">' + esc(t.name) + '</button>';
    }).join('') + '<button type="button" class="chip chip-add" data-act="open-new-template-modal">' + icon('plus') + ' New template</button>';

    var assignRows = [0, 1, 2, 3, 4, 5, 6].map(function (wd) {
      var sel = state.scheduleAssignment[wd] || state.scheduleAssignment[String(wd)];
      return '<label class="weekday-assign"><span>' + WEEKDAY_SHORT[wd] + '</span>' +
        '<select class="select select-small" data-act="assign-weekday" data-weekday="' + wd + '">' +
        state.templates.map(function (t) { return '<option value="' + t.id + '"' + (t.id === sel ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') +
        '</select></label>';
    }).join('');

    var rows = tasks.map(function (t, idx) { return timetableRow(t, idx, tasks.length, overlaps); }).join('');

    return '' +
      '<section class="panel">' +
      '<div class="panel-head"><h2>Schedule templates</h2><span class="muted small">Edit the default weekly plan. Changes apply to dates not generated yet.</span></div>' +
      '<div class="chip-row">' + tplTabs + '</div>' +
      '<div class="weekday-assign-row">' +
      '<span class="muted small">Weekday → template:</span>' + assignRows +
      (!templateById(tpl).builtIn ? '<button type="button" class="btn btn-small btn-ghost" data-act="delete-template" data-id="' + tpl + '">' + icon('trash') + ' Delete this template</button>' : '') +
      '</div>' +
      '</section>' +

      (overlaps.length ? '<div class="banner banner-warn">' + icon('warn') + ' ' + overlaps.length + ' overlapping task' + (overlaps.length > 1 ? 's' : '') + ' in this template — overlapping times are highlighted below.</div>' : '') +

      '<section class="panel">' +
      '<div class="panel-head"><h2>' + esc(templateById(tpl).name) + ' tasks</h2>' +
      '<button type="button" class="btn btn-small btn-primary" data-act="open-task-editor" data-template="' + tpl + '">' + icon('plus') + ' Add task</button>' +
      '</div>' +
      '<div class="timetable-list">' + (rows || '<div class="empty-state">' + icon('timetable') + '<p>No tasks in this template yet.</p></div>') + '</div>' +
      '<div class="muted small panel-foot">12h / 24h display is set in Settings. Drag rows (grip handle) or use the up/down buttons to reorder.</div>' +
      '</section>';
  }

  function findOverlaps(tasks) {
    var bad = {};
    var sorted = tasks.filter(function (t) { return t.enabled !== false; }).slice().sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
    for (var i = 0; i < sorted.length - 1; i++) {
      var a = sorted[i], b = sorted[i + 1];
      if (timeToMinutes(b.start) < timeToMinutes(a.end)) { bad[a.id] = true; bad[b.id] = true; }
    }
    return Object.keys(bad);
  }

  function timetableRow(t, idx, total, overlaps) {
    var cat = categoryById(t.categoryId) || { name: 'Other', color: '#888' };
    var fmt = state.settings.timeFormat;
    var overlapped = overlaps.indexOf(t.id) !== -1;
    var recurLabel = (!t.recurDays || t.recurDays.length === 7) ? 'Every day' : t.recurDays.map(function (d) { return WEEKDAY_SHORT[d]; }).join(', ');
    return '<div class="tt-row' + (overlapped ? ' overlap' : '') + (t.enabled === false ? ' disabled' : '') + '" draggable="true" data-act="drag-row" data-id="' + t.id + '">' +
      '<span class="grip">' + icon('grip') + '</span>' +
      '<span class="dot" style="background:' + cat.color + '"></span>' +
      '<div class="tt-info">' +
      '<div class="tt-title">' + esc(t.title) + (t.enabled === false ? ' <span class="pill pill-muted">disabled</span>' : '') + '</div>' +
      '<div class="muted small">' + formatTime(t.start, fmt) + ' – ' + formatTime(t.end, fmt) + ' (' + formatDuration(durationMinutes(t.start, t.end)) + ') · ' + esc(cat.name) + ' · ' + recurLabel + '</div>' +
      '</div>' +
      '<div class="tt-actions">' +
      '<button type="button" class="icon-btn" data-act="move-task" data-dir="up" data-id="' + t.id + '"' + (idx === 0 ? ' disabled' : '') + ' aria-label="Move up">' + icon('arrowUp') + '</button>' +
      '<button type="button" class="icon-btn" data-act="move-task" data-dir="down" data-id="' + t.id + '"' + (idx === total - 1 ? ' disabled' : '') + ' aria-label="Move down">' + icon('arrowDown') + '</button>' +
      '<button type="button" class="icon-btn" data-act="toggle-task-enabled" data-id="' + t.id + '" aria-label="Enable or disable">' + icon(t.enabled === false ? 'play' : 'pause') + '</button>' +
      '<button type="button" class="icon-btn" data-act="duplicate-task" data-id="' + t.id + '" aria-label="Duplicate">' + icon('copy') + '</button>' +
      '<button type="button" class="icon-btn" data-act="open-task-editor" data-id="' + t.id + '" aria-label="Edit">' + icon('edit') + '</button>' +
      '<button type="button" class="icon-btn icon-btn-danger" data-act="open-delete-task-confirm" data-id="' + t.id + '" aria-label="Delete">' + icon('trash') + '</button>' +
      '</div>' +
      '</div>';
  }

  /* ======================= 15. CALENDAR & HISTORY VIEW ======================= */

  function renderHistory() {
    var dateKey = ui.historyDate;
    var checklist = state.checklists[dateKey];
    var stats = checklistStats(checklist);
    var fmt = state.settings.timeFormat;

    var monthParts = ui.calendarMonth.split('-');
    var year = Number(monthParts[0]), month = Number(monthParts[1]) - 1;
    var first = new Date(year, month, 1);
    var startWeekday = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    var cells = '';
    for (var i = 0; i < startWeekday; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var key = year + '-' + pad2(month + 1) + '-' + pad2(d);
      var cl = state.checklists[key];
      var pct = cl ? checklistStats(cl).pct : null;
      var cls = 'cal-cell';
      if (key === dateKey) cls += ' selected';
      if (isToday(key)) cls += ' is-today';
      if (pct !== null) cls += pct >= STREAK_THRESHOLD ? ' has-data good' : ' has-data';
      cells += '<button type="button" class="' + cls + '" data-act="select-history-date" data-date="' + key + '">' +
        '<span class="cal-daynum">' + d + '</span>' +
        (pct !== null ? '<span class="cal-dot" style="opacity:' + Math.max(0.25, pct / 100) + '"></span>' : '') +
        '</button>';
    }

    var weekdayHeader = WEEKDAY_SHORT.map(function (w) { return '<div class="cal-dow">' + w + '</div>'; }).join('');

    var detail;
    if (!checklist) {
      detail = '<div class="empty-state">' + icon('history') + '<p>No record for this date yet' + (isFuture(dateKey) ? ' — it hasn\'t happened.' : '.') + '</p></div>';
    } else {
      var tasks = checklist.tasks.slice().sort(function (a, b) { return timeToMinutes(a.start || '00:00') - timeToMinutes(b.start || '00:00'); });
      detail = '<div class="progress-strip"><div class="bar bar-lg"><div class="bar-fill" style="width:' + stats.pct + '%"></div></div><span class="muted small">' + stats.done + ' / ' + stats.total + ' complete</span></div>' +
        '<div class="task-list">' + tasks.map(function (t) { return taskRow(dateKey, t, fmt); }).join('') + '</div>' +
        dailyNoteBox(dateKey, checklist);
    }

    return '' +
      '<section class="history-grid">' +
      '<div class="panel">' +
      '<div class="cal-head">' +
      '<button type="button" class="icon-btn" data-act="cal-prev-month" aria-label="Previous month">' + icon('chevronLeft') + '</button>' +
      '<strong>' + MONTH_NAMES[month] + ' ' + year + '</strong>' +
      '<button type="button" class="icon-btn" data-act="cal-next-month" aria-label="Next month">' + icon('chevronRight') + '</button>' +
      '</div>' +
      '<div class="cal-grid">' + weekdayHeader + cells + '</div>' +
      '<div class="cal-legend muted small"><span class="legend-dot good"></span> ≥' + STREAK_THRESHOLD + '% complete &nbsp; <span class="legend-dot"></span> some progress</div>' +
      '</div>' +
      '<div class="panel">' +
      '<div class="panel-head">' +
      '<h2>' + (isToday(dateKey) ? 'Today' : formatDateLong(dateKey)) + '</h2>' +
      '<div class="day-nav-inline">' +
      '<button type="button" class="icon-btn" data-act="history-prev-day" aria-label="Previous day">' + icon('chevronLeft') + '</button>' +
      '<button type="button" class="btn btn-small" data-act="history-today">Today</button>' +
      '<button type="button" class="icon-btn" data-act="history-next-day" aria-label="Next day">' + icon('chevronRight') + '</button>' +
      '</div>' +
      '</div>' +
      detail +
      '</div>' +
      '</section>';
  }

  /* ======================= 16. ANALYTICS VIEW ======================= */

  function renderAnalytics() {
    var days = [];
    for (var i = 6; i >= 0; i--) days.push(addDays(todayLocal(), -i));
    var maxBar = 100;
    var bars = days.map(function (dk) {
      var cl = state.checklists[dk];
      var pct = cl ? checklistStats(cl).pct : 0;
      var has = !!cl;
      return '<div class="bar-col">' +
        '<div class="bar-vert-track"><div class="bar-vert-fill' + (has ? '' : ' empty') + '" style="height:' + (has ? pct : 100) + '%"></div></div>' +
        '<span class="muted small">' + WEEKDAY_SHORT[weekdayOf(dk)][0] + '</span>' +
        '<span class="muted small tabular">' + (has ? pct + '%' : '—') + '</span>' +
        '</div>';
    }).join('');

    // category totals over the last 7 days
    var catTotals = {};
    state.categories.forEach(function (c) { catTotals[c.id] = { category: c, trackedMin: 0, scheduledMin: 0 }; });
    days.forEach(function (dk) {
      var breakdown = categoryBreakdownForDate(dk);
      Object.keys(breakdown).forEach(function (cid) {
        catTotals[cid].trackedMin += breakdown[cid].trackedSec / 60;
        catTotals[cid].scheduledMin += breakdown[cid].scheduledMin;
      });
    });
    var catRows = ['cat_ai', 'cat_dsa', 'cat_dev', 'cat_job', 'cat_exercise', 'cat_family'].map(function (cid) {
      var row = catTotals[cid]; if (!row) return '';
      var targetWeek = row.category.target * 7;
      var pct = targetWeek > 0 ? Math.min(100, Math.round((row.trackedMin / targetWeek) * 100)) : null;
      return '<div class="cat-card">' +
        '<div class="cat-card-top"><span class="dot" style="background:' + row.category.color + '"></span><span class="cat-name">' + esc(row.category.name) + '</span></div>' +
        '<div class="cat-card-num">' + formatHoursShort(row.trackedMin) + (targetWeek > 0 ? ' <span class="muted">/ ' + formatHoursShort(targetWeek) + ' wk</span>' : '') + '</div>' +
        (pct !== null ? '<div class="bar"><div class="bar-fill" style="width:' + pct + '%;background:' + row.category.color + '"></div></div>' : '') +
        '</div>';
    }).join('');

    // recurring unfinished tasks over last 14 days
    var window14 = [];
    for (var j = 13; j >= 0; j--) window14.push(addDays(todayLocal(), -j));
    var missCounts = {};
    window14.forEach(function (dk) {
      var cl = state.checklists[dk];
      if (!cl) return;
      cl.tasks.forEach(function (t) {
        if (!t.completed) {
          missCounts[t.title] = (missCounts[t.title] || 0) + 1;
        }
      });
    });
    var missList = Object.keys(missCounts).map(function (k) { return { title: k, count: missCounts[k] }; })
      .filter(function (x) { return x.count >= 3; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);

    var streak = computeStreak();
    var daysWithData = Object.keys(state.checklists).length;
    var bestDay = bestWeekdayInsight();

    // Month-over-month comparison
    var curYm = ui.calendarMonth || monthKeyOf(todayLocal());
    curYm = monthKeyOf(todayLocal()); // Analytics always compares the current calendar month
    var prevYm = shiftYm(curYm, -1);
    var curM = monthStats(curYm), prevM = monthStats(prevYm);
    var curMonthLabel = MONTH_NAMES[Number(curYm.split('-')[1]) - 1];
    var prevMonthLabel = MONTH_NAMES[Number(prevYm.split('-')[1]) - 1];
    var delta = (curM.avg !== null && prevM.avg !== null) ? curM.avg - prevM.avg : null;
    var deltaHtml = delta === null ? '<span class="muted small">Not enough data to compare yet</span>' :
      '<span class="' + (delta >= 0 ? 'delta-up' : 'delta-down') + '">' + (delta >= 0 ? '+' : '') + delta + ' pts vs ' + prevMonthLabel + '</span>';

    var monthCompareHtml =
      '<section class="panel">' +
      '<div class="panel-head"><h2>This month vs. last month</h2>' + deltaHtml + '</div>' +
      '<div class="month-compare">' +
      monthCompareCol(prevMonthLabel, prevM) +
      monthCompareCol(curMonthLabel, curM) +
      '</div>' +
      '</section>';

    // Year-over-year
    var curYear = Number(todayLocal().slice(0, 4));
    var prevYear = curYear - 1;
    var curYearStats = yearStats(curYear);
    var prevYearStats = yearStats(prevYear);
    var hasPrevYearData = prevYearStats.trackedMonths > 0;
    var yearDelta = (curYearStats.yearAvg !== null && prevYearStats.yearAvg !== null) ? curYearStats.yearAvg - prevYearStats.yearAvg : null;

    var monthBars = curYearStats.months.map(function (m) {
      var has = m.stats.avg !== null;
      return '<div class="bar-col">' +
        '<div class="bar-vert-track"><div class="bar-vert-fill' + (has ? '' : ' empty') + '" style="height:' + (has ? m.stats.avg : 100) + '%"></div></div>' +
        '<span class="muted small">' + m.label + '</span>' +
        '</div>';
    }).join('');

    var yearCompareHtml =
      '<section class="panel">' +
      '<div class="panel-head"><h2>' + curYear + ' by month</h2>' +
      '<span class="muted small">' + (yearDelta !== null ? ((yearDelta >= 0 ? '+' : '') + yearDelta + ' pts vs ' + prevYear + ' average') : (hasPrevYearData ? 'Comparing to ' + prevYear + '…' : 'No ' + prevYear + ' data yet to compare')) + '</span>' +
      '</div>' +
      '<div class="bar-chart">' + monthBars + '</div>' +
      (curYearStats.yearAvg !== null ? '<div class="muted small panel-foot">' + curYear + ' average: ' + curYearStats.yearAvg + '% across ' + curYearStats.trackedMonths + ' month' + (curYearStats.trackedMonths > 1 ? 's' : '') + ' tracked' + (hasPrevYearData ? ' · ' + prevYear + ' average: ' + prevYearStats.yearAvg + '%' : '') + '</div>' : '')
      + '</section>';

    return '' +
      '<section class="panel">' +
      '<div class="panel-head"><h2>Last 7 days</h2><span class="muted small">Daily completion rate</span></div>' +
      '<div class="bar-chart">' + bars + '</div>' +
      '</section>' +

      '<section class="stat-row">' +
      statTile('flame', String(streak), 'Current streak (≥' + STREAK_THRESHOLD + '%)') +
      statTile('history', String(daysWithData), 'Days tracked total') +
      statTile('target', formatHoursShort(sumMin(catTotals, ['cat_ai', 'cat_dsa', 'cat_dev'])), 'Core study, last 7 days') +
      (bestDay ? statTile('bolt', WEEKDAY_NAMES[bestDay.weekday], 'Best day (' + bestDay.avg + '% avg, ' + bestDay.days + ' tracked)') : '') +
      '</section>' +

      monthCompareHtml +
      yearCompareHtml +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Category time — last 7 days</h2><span class="muted small">Tracked vs. weekly target</span></div>' +
      '<div class="cat-grid">' + catRows + '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Recurring unfinished tasks</h2><span class="muted small">Missed 3+ times in the last 14 days</span></div>' +
      (missList.length ? '<ul class="miss-list">' + missList.map(function (m) { return '<li><span>' + esc(m.title) + '</span><span class="pill">' + m.count + 'x missed</span></li>'; }).join('') + '</ul>' :
        '<div class="empty-state">' + icon('check') + '<p>No recurring misses — nice consistency.</p></div>') +
      '</section>';
  }

  function monthCompareCol(label, stats) {
    var pct = stats.avg === null ? 0 : stats.avg;
    return '<div class="month-col">' +
      '<div class="month-col-bar-track"><div class="month-col-bar-fill' + (stats.avg === null ? ' empty' : '') + '" style="height:' + (stats.avg === null ? 100 : pct) + '%"></div></div>' +
      '<div class="month-col-value">' + (stats.avg === null ? '—' : stats.avg + '%') + '</div>' +
      '<div class="muted small">' + esc(label) + '</div>' +
      '<div class="muted small">' + (stats.daysTracked ? stats.daysTracked + ' day' + (stats.daysTracked > 1 ? 's' : '') + ' tracked' : 'No data') + '</div>' +
      '</div>';
  }

  function sumMin(catTotals, ids) {
    var t = 0; ids.forEach(function (id) { if (catTotals[id]) t += catTotals[id].trackedMin; }); return t;
  }

  function bestWeekdayInsight() {
    var sums = [0, 0, 0, 0, 0, 0, 0];
    var counts = [0, 0, 0, 0, 0, 0, 0];
    Object.keys(state.checklists).forEach(function (k) {
      if (isFuture(k)) return;
      var cl = state.checklists[k];
      if (!cl.tasks.length) return;
      var wd = weekdayOf(k);
      sums[wd] += checklistStats(cl).pct;
      counts[wd]++;
    });
    var best = null;
    for (var i = 0; i < 7; i++) {
      if (counts[i] === 0) continue;
      var avg = Math.round(sums[i] / counts[i]);
      if (!best || avg > best.avg) best = { weekday: i, avg: avg, days: counts[i] };
    }
    return best;
  }

  function monthKeyOf(dateKey) { return dateKey.slice(0, 7); }

  function monthStats(ym) {
    var keys = Object.keys(state.checklists).filter(function (k) { return monthKeyOf(k) === ym && !isFuture(k); });
    if (!keys.length) return { avg: null, daysTracked: 0, productiveDays: 0 };
    var sum = 0, productive = 0;
    keys.forEach(function (k) {
      var pct = checklistStats(state.checklists[k]).pct;
      sum += pct;
      if (pct >= STREAK_THRESHOLD) productive++;
    });
    return { avg: Math.round(sum / keys.length), daysTracked: keys.length, productiveDays: productive };
  }

  function shiftYm(ym, delta) {
    var parts = ym.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }

  function yearStats(year) {
    var months = [];
    for (var m = 0; m < 12; m++) {
      var ym = year + '-' + pad2(m + 1);
      months.push({ ym: ym, label: MONTH_NAMES[m].slice(0, 3), stats: monthStats(ym) });
    }
    var tracked = months.filter(function (m) { return m.stats.avg !== null; });
    var yearAvg = tracked.length ? Math.round(tracked.reduce(function (s, m) { return s + m.stats.avg; }, 0) / tracked.length) : null;
    return { months: months, yearAvg: yearAvg, trackedMonths: tracked.length };
  }

  /* ======================= 17. SETTINGS VIEW ======================= */

  function renderSettings() {
    var catRows = state.categories.map(function (c) {
      return '<div class="settings-cat-row">' +
        '<span class="dot" style="background:' + c.color + '"></span>' +
        '<span class="settings-cat-name">' + esc(c.name) + '</span>' +
        '<input type="number" min="0" step="5" class="input input-small" data-act="set-category-target" data-id="' + c.id + '" value="' + c.target + '" aria-label="Daily target minutes for ' + esc(c.name) + '"/>' +
        '<span class="muted small">min/day</span>' +
        '</div>';
    }).join('');

    var avatar = avatarHtml(64);
    return '' +
      '<section class="panel">' +
      '<div class="panel-head"><h2>Profile</h2><span class="muted small">Shown in the sidebar and your dashboard greeting</span></div>' +
      '<div class="profile-editor">' +
      '<div class="profile-photo-wrap">' +
      (avatar || '<span class="avatar-initials" style="width:64px;height:64px;font-size:24px">' + icon('user') + '</span>') +
      '<div class="profile-photo-actions">' +
      '<label class="btn btn-small" for="profile-photo-input">' + icon('upload') + ' Upload photo</label>' +
      '<input type="file" id="profile-photo-input" accept="image/*" data-act="profile-photo-input" style="display:none"/>' +
      (state.profile.photoDataUrl ? '<button type="button" class="btn btn-small btn-ghost" data-act="remove-profile-photo">Remove</button>' : '') +
      '</div>' +
      '</div>' +
      '<label class="field profile-name-field"><span>Your name</span><input id="profile-name-input" class="input" data-act="profile-name" value="' + esc(state.profile.name) + '" placeholder="e.g. Abhishek" maxlength="60"/></label>' +
      '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Appearance</h2></div>' +
      '<div class="settings-row">' +
      '<label class="settings-label">Theme</label>' +
      '<div class="seg">' +
      segBtn('theme', 'dark', 'Dark', state.settings.theme) +
      segBtn('theme', 'light', 'Light', state.settings.theme) +
      segBtn('theme', 'system', 'System', state.settings.theme) +
      '</div>' +
      '</div>' +
      '<div class="settings-row">' +
      '<label class="settings-label">Time format</label>' +
      '<div class="seg">' +
      segBtn('timeformat', '24', '24-hour', state.settings.timeFormat) +
      segBtn('timeformat', '12', '12-hour', state.settings.timeFormat) +
      '</div>' +
      '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Category daily targets</h2><span class="muted small">Used for progress bars on Dashboard and Analytics</span></div>' +
      '<div class="settings-cat-list">' + catRows + '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Backup &amp; restore</h2><span class="muted small">Your data lives only in this browser. Back it up regularly.</span></div>' +
      '<div class="hero-actions">' +
      '<button type="button" class="btn btn-primary" data-act="export-data">' + icon('download') + ' Download backup (.json)</button>' +
      '<button type="button" class="btn" data-act="open-import-modal">' + icon('upload') + ' Import backup</button>' +
      '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>About this data</h2></div>' +
      '<p class="muted">FocusForge stores everything locally in your browser (localStorage) — there is no account and nothing is sent anywhere. Clearing your browser data for this site will erase it, so export a backup from time to time.</p>' +
      '<p class="muted small">First used on ' + esc(state.meta.firstLaunch) + '.</p>' +
      '</section>';
  }

  function segBtn(group, value, label, current) {
    return '<button type="button" class="seg-btn' + (current === value ? ' active' : '') + '" data-act="set-' + group + '" data-value="' + value + '">' + label + '</button>';
  }

  /* ======================= 18. MODALS ======================= */

  function openModal(html, opts) {
    ui.modal = { html: html, opts: opts || {} };
    renderModal();
  }
  function closeModal() {
    ui.modal = null;
    renderModal();
  }
  function renderModal() {
    var root = document.getElementById('modal-root');
    if (!root) return;
    if (!ui.modal) { root.innerHTML = ''; return; }
    root.innerHTML = '<div class="modal-backdrop" data-act="close-modal"><div class="modal" role="dialog" aria-modal="true" data-stop>' + ui.modal.html + '</div></div>';
    var modalEl = root.querySelector('.modal');
    if (modalEl) modalEl.addEventListener('click', function (e) { e.stopPropagation(); });
    var firstInput = root.querySelector('input, select, textarea, button.btn-primary');
    if (firstInput) firstInput.focus();
  }

  function taskEditorModal(taskId, templateId) {
    var editing = taskId ? state.tasks.filter(function (t) { return t.id === taskId; })[0] : null;
    var tpl = editing ? editing.templateId : templateId;
    var catOptions = state.categories.map(function (c) { return '<option value="' + c.id + '"' + (editing && editing.categoryId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    var dayBoxes = ALL_DAYS.map(function (d) {
      var checked = editing ? (!editing.recurDays || editing.recurDays.indexOf(d) !== -1) : true;
      return '<label class="day-chip"><input type="checkbox" value="' + d + '" ' + (checked ? 'checked' : '') + '/>' + WEEKDAY_SHORT[d] + '</label>';
    }).join('');

    var html = '<form id="task-form">' +
      '<h3>' + (editing ? 'Edit task' : 'Add task') + '</h3>' +
      '<input type="hidden" id="tf-id" value="' + (editing ? editing.id : '') + '"/>' +
      '<input type="hidden" id="tf-template" value="' + tpl + '"/>' +
      '<label class="field"><span>Title</span><input id="tf-title" class="input" required value="' + (editing ? esc(editing.title) : '') + '" placeholder="e.g. Algorithm practice"/></label>' +
      '<div class="field-row">' +
      '<label class="field"><span>Start time</span><input id="tf-start" type="time" class="input" required value="' + (editing ? editing.start : '09:00') + '"/></label>' +
      '<label class="field"><span>End time</span><input id="tf-end" type="time" class="input" required value="' + (editing ? editing.end : '10:00') + '"/></label>' +
      '</div>' +
      '<label class="field"><span>Category</span><select id="tf-category" class="input">' + catOptions + '</select></label>' +
      '<label class="field"><span>Description (optional)</span><textarea id="tf-desc" class="input" rows="2">' + (editing ? esc(editing.description) : '') + '</textarea></label>' +
      '<label class="field"><span>Repeats on</span><div class="day-chip-row">' + dayBoxes + '</div></label>' +
      '<div id="tf-warning" class="banner banner-warn" hidden>' + icon('warn') + ' <span id="tf-warning-text"></span></div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save changes</button>' +
      '</div>' +
      '</form>';
    openModal(html);
  }

  function validateTaskForm() {
    var start = document.getElementById('tf-start').value;
    var end = document.getElementById('tf-end').value;
    var warnEl = document.getElementById('tf-warning');
    var warnText = document.getElementById('tf-warning-text');
    if (!start || !end) return 'Start and end time are required.';
    if (timeToMinutes(end) <= timeToMinutes(start)) return 'End time must be after start time.';
    return null;
  }

  function submitTaskForm(e) {
    e.preventDefault();
    var err = validateTaskForm();
    var warnEl = document.getElementById('tf-warning');
    var warnText = document.getElementById('tf-warning-text');
    if (err) { warnText.textContent = err; warnEl.hidden = false; return; }
    var id = document.getElementById('tf-id').value;
    var templateId = document.getElementById('tf-template').value;
    var title = document.getElementById('tf-title').value.trim();
    var start = document.getElementById('tf-start').value;
    var end = document.getElementById('tf-end').value;
    var categoryId = document.getElementById('tf-category').value;
    var desc = document.getElementById('tf-desc').value.trim();
    var dayBoxes = Array.prototype.slice.call(document.querySelectorAll('#task-form .day-chip input:checked'));
    var recurDays = dayBoxes.map(function (b) { return Number(b.value); });
    if (!title) { warnText.textContent = 'Title is required.'; warnEl.hidden = false; return; }
    if (recurDays.length === 0) { warnText.textContent = 'Pick at least one day.'; warnEl.hidden = false; return; }

    var candidate = { id: id || uid('task'), templateId: templateId, start: start, end: end, categoryId: categoryId, title: title, description: desc, recurDays: recurDays, enabled: true };
    var siblings = state.tasks.filter(function (t) { return t.templateId === templateId && t.id !== candidate.id && t.enabled !== false; });
    var overlapsSibling = siblings.some(function (t) {
      if (!recurDays.some(function (d) { return !t.recurDays || t.recurDays.indexOf(d) !== -1; })) return false;
      return timeToMinutes(start) < timeToMinutes(t.end) && timeToMinutes(t.start) < timeToMinutes(end);
    });

    var proceed = function () {
      if (id) {
        var existing = state.tasks.filter(function (t) { return t.id === id; })[0];
        Object.assign(existing, { title: title, start: start, end: end, categoryId: categoryId, description: desc, recurDays: recurDays });
      } else {
        var maxOrder = Math.max(-1, Math.max.apply(null, state.tasks.filter(function (t) { return t.templateId === templateId; }).map(function (t) { return t.order; }).concat([-1])));
        candidate.order = maxOrder + 1;
        state.tasks.push(candidate);
      }
      markDirty();
      closeModal();
      showToast(id ? 'Task updated.' : 'Task added.', 'success');
      if ((!id && (isToday(ui.viewDate) || isFuture(ui.viewDate))) || (id)) {
        // nothing further: generated checklists for already-created dates stay untouched by design
      }
    };

    if (overlapsSibling && !warnEl.dataset.confirmed) {
      warnText.textContent = 'This overlaps another task in the same template. Save anyway?';
      warnEl.hidden = false;
      var saveBtn = document.querySelector('#task-form button[type="submit"]');
      saveBtn.textContent = 'Save anyway';
      warnEl.dataset.confirmed = '1';
      return;
    }
    proceed();
  }

  function addTaskModal(dateKey) {
    var catOptions = state.categories.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    var html = '<form id="quick-task-form">' +
      '<h3>Add unscheduled task</h3>' +
      '<p class="muted small">Adds a one-off task to ' + (isToday(dateKey) ? "today's" : formatDateShort(dateKey)) + ' checklist only — it won\'t change your default timetable.</p>' +
      '<label class="field"><span>Title</span><input id="qt-title" class="input" required placeholder="e.g. Reply to recruiter"/></label>' +
      '<div class="field-row">' +
      '<label class="field"><span>Start (optional)</span><input id="qt-start" type="time" class="input"/></label>' +
      '<label class="field"><span>End (optional)</span><input id="qt-end" type="time" class="input"/></label>' +
      '</div>' +
      '<label class="field"><span>Category</span><select id="qt-category" class="input">' + catOptions + '</select></label>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Add task</button>' +
      '</div>' +
      '</form>';
    openModal(html);
    var form = document.getElementById('quick-task-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = document.getElementById('qt-title').value.trim();
      if (!title) return;
      var start = document.getElementById('qt-start').value || null;
      var end = document.getElementById('qt-end').value || null;
      if (start && end && timeToMinutes(end) <= timeToMinutes(start)) { showToast('End time must be after start time.', 'error'); return; }
      var categoryId = document.getElementById('qt-category').value;
      addUnscheduledTask(dateKey, { title: title, start: start, end: end, categoryId: categoryId });
      closeModal();
      showToast('Task added.', 'success');
    });
  }

  function manualTimeModal(dateKey, instanceId) {
    var checklist = state.checklists[dateKey];
    var inst = checklist ? checklist.tasks.filter(function (t) { return t.id === instanceId; })[0] : null;
    if (!inst) return;
    var currentMin = Math.round(trackedSecondsFor(dateKey, instanceId) / 60);
    var html = '<form id="manual-time-form">' +
      '<h3>Edit tracked time</h3>' +
      '<p class="muted small">' + esc(inst.title) + '</p>' +
      '<label class="field"><span>Minutes tracked</span><input id="mt-minutes" type="number" min="0" step="1" class="input" value="' + currentMin + '"/></label>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Save</button>' +
      '</div>' +
      '</form>';
    openModal(html);
    document.getElementById('manual-time-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var minutes = Number(document.getElementById('mt-minutes').value) || 0;
      setManualDuration(dateKey, instanceId, minutes);
      closeModal();
      showToast('Tracked time updated.', 'success');
    });
  }

  function confirmModal(title, message, confirmLabel, onConfirm, danger) {
    var html = '<div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="muted">' + esc(message) + '</p>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="button" id="confirm-btn" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '">' + esc(confirmLabel) + '</button>' +
      '</div></div>';
    openModal(html);
    document.getElementById('confirm-btn').addEventListener('click', function () { onConfirm(); closeModal(); });
  }

  function newTemplateModal() {
    var html = '<form id="new-template-form">' +
      '<h3>New template</h3>' +
      '<p class="muted small">Create a blank schedule template (e.g. "Hackathon Day"), then add tasks to it.</p>' +
      '<label class="field"><span>Template name</span><input id="nt-name" class="input" required placeholder="e.g. Exam Day"/></label>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="submit" class="btn btn-primary">Create</button>' +
      '</div></form>';
    openModal(html);
    document.getElementById('new-template-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('nt-name').value.trim();
      if (!name) return;
      var id = uid('tpl');
      state.templates.push({ id: id, name: name, builtIn: false });
      ui.editingTemplateId = id;
      markDirty();
      closeModal();
      showToast('Template created.', 'success');
    });
  }

  function importModal() {
    var html = '<div>' +
      '<h3>Import backup</h3>' +
      '<p class="muted small">Paste the contents of a FocusForge backup file, or choose the file. This replaces your current data — export a fresh backup first if you want to keep it.</p>' +
      '<input type="file" id="import-file" accept="application/json" class="input" style="margin-bottom:10px"/>' +
      '<textarea id="import-text" class="input" rows="6" placeholder="Paste backup JSON here"></textarea>' +
      '<div id="import-warning" class="banner banner-warn" hidden>' + icon('warn') + ' <span id="import-warning-text"></span></div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn" data-act="close-modal">Cancel</button>' +
      '<button type="button" id="import-btn" class="btn btn-danger">Replace my data</button>' +
      '</div></div>';
    openModal(html);
    document.getElementById('import-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { document.getElementById('import-text').value = String(reader.result || ''); };
      reader.readAsText(file);
    });
    document.getElementById('import-btn').addEventListener('click', function () {
      var text = document.getElementById('import-text').value.trim();
      var warnEl = document.getElementById('import-warning');
      var warnText = document.getElementById('import-warning-text');
      var parsed;
      try { parsed = JSON.parse(text); } catch (e) {
        warnText.textContent = 'That is not valid JSON.'; warnEl.hidden = false; return;
      }
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.categories) || !Array.isArray(parsed.tasks)) {
        warnText.textContent = 'This file does not look like a FocusForge backup.'; warnEl.hidden = false; return;
      }
      state = validateAndMerge(parsed);
      flushPersist();
      closeModal();
      ui.route = 'dashboard'; location.hash = 'dashboard';
      showToast('Backup imported.', 'success');
      render();
    });
  }

  /* ======================= 19. EXPORT (downloads capability) ======================= */

  var downloadsCap = null;
  function getDownloadsCap() {
    if (!window.claude || !window.claude.use) return Promise.resolve(null);
    if (downloadsCap) return Promise.resolve(downloadsCap);
    return window.claude.use('downloads').then(function (cap) { downloadsCap = cap; return cap; }).catch(function () { return null; });
  }

  function exportData() {
    var payload = JSON.stringify(state, null, 2);
    getDownloadsCap().then(function (cap) {
      if (cap) {
        cap.save({ filename: 'focusforge-backup-' + todayLocal() + '.json', data: payload }).then(function () {
          showToast('Backup saved.', 'success');
        }).catch(function () {
          fallbackExport(payload);
        });
      } else {
        fallbackExport(payload);
      }
    });
  }

  function fallbackExport(payload) {
    var html = '<div><h3>Backup data</h3><p class="muted small">Downloads aren\'t available here — copy this and save it as a .json file yourself.</p>' +
      '<textarea id="export-text" class="input" rows="8" readonly>' + esc(payload) + '</textarea>' +
      '<div class="modal-actions"><button type="button" class="btn" data-act="close-modal">Close</button>' +
      '<button type="button" id="copy-export-btn" class="btn btn-primary">' + icon('copy') + ' Copy to clipboard</button></div></div>';
    openModal(html);
    document.getElementById('copy-export-btn').addEventListener('click', function () {
      var ta = document.getElementById('export-text');
      ta.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(function () { showToast('Copied to clipboard.', 'success'); }).catch(function () { showToast('Select the text and copy it manually.', 'info'); });
      } else {
        showToast('Select the text and copy it manually.', 'info');
      }
    });
  }

  /* ======================= 20. EVENT DELEGATION ======================= */

  function handleClick(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');
    switch (act) {
      case 'nav': navigate(el.getAttribute('data-route')); break;
      case 'open-sidebar': ui.sidebarOpen = true; render(); break;
      case 'close-sidebar': ui.sidebarOpen = false; render(); break;
      case 'toggle-theme':
        state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
        markDirty(); break;
      case 'close-modal': closeModal(); break;
      case 'toast-close': dismissToast(Number(el.getAttribute('data-toast'))); break;
      case 'toast-action': {
        var toast = ui.toasts.filter(function (t) { return t.id === Number(el.getAttribute('data-toast')); })[0];
        if (toast && toast.action) toast.action();
        dismissToast(Number(el.getAttribute('data-toast')));
        break;
      }
      case 'toggle-task': toggleTaskComplete(el.getAttribute('data-date'), el.getAttribute('data-id')); break;
      case 'toggle-priority': togglePriorityTask(el.getAttribute('data-date'), el.getAttribute('data-id')); break;
      case 'delete-instance': deleteTaskInstance(el.getAttribute('data-date'), el.getAttribute('data-id')); break;
      case 'timer-start': startTimer(el.getAttribute('data-date'), el.getAttribute('data-id')); render(); break;
      case 'timer-stop': stopTimer(); render(); break;
      case 'open-manual-time-modal': manualTimeModal(el.getAttribute('data-date'), el.getAttribute('data-id')); break;
      case 'open-add-task-modal': addTaskModal(el.getAttribute('data-date')); break;
      case 'day-prev': ui.viewDate = addDays(ui.viewDate, -1); render(); break;
      case 'day-next': ui.viewDate = addDays(ui.viewDate, 1); render(); break;
      case 'day-today': ui.viewDate = todayLocal(); render(); break;
      case 'reset-today':
        confirmModal('Reset today\'s checklist?', 'This regenerates today\'s tasks from your current timetable and clears today\'s completions. You can undo this right after.', 'Reset checklist', function () { regenerateChecklist(todayLocal()); });
        break;
      case 'select-template': ui.editingTemplateId = el.getAttribute('data-id'); render(); break;
      case 'open-new-template-modal': newTemplateModal(); break;
      case 'delete-template':
        confirmModal('Delete this template?', 'Tasks in this template will be removed. Any days already generated from it keep their history.', 'Delete template', function () {
          var id = el.getAttribute('data-id');
          state.templates = state.templates.filter(function (t) { return t.id !== id; });
          state.tasks = state.tasks.filter(function (t) { return t.templateId !== id; });
          Object.keys(state.scheduleAssignment).forEach(function (wd) { if (state.scheduleAssignment[wd] === id) state.scheduleAssignment[wd] = state.templates[0].id; });
          ui.editingTemplateId = state.templates[0].id;
          markDirty();
        }, true);
        break;
      case 'open-task-editor': taskEditorModal(el.getAttribute('data-id') || null, el.getAttribute('data-template')); break;
      case 'open-delete-task-confirm':
        confirmModal('Delete this task?', 'This removes it from the template. Already-generated checklists keep it in their history.', 'Delete task', function () {
          var id = el.getAttribute('data-id');
          state.tasks = state.tasks.filter(function (t) { return t.id !== id; });
          markDirty();
        }, true);
        break;
      case 'duplicate-task': {
        var orig = state.tasks.filter(function (t) { return t.id === el.getAttribute('data-id'); })[0];
        if (orig) {
          var copy = Object.assign({}, orig, { id: uid('task'), title: orig.title + ' (copy)', order: orig.order + 0.5 });
          state.tasks.push(copy);
          normalizeOrders(orig.templateId);
          markDirty();
          showToast('Task duplicated.', 'success');
        }
        break;
      }
      case 'toggle-task-enabled': {
        var tsk = state.tasks.filter(function (t) { return t.id === el.getAttribute('data-id'); })[0];
        if (tsk) { tsk.enabled = tsk.enabled === false ? true : false; markDirty(); }
        break;
      }
      case 'move-task': {
        moveTask(el.getAttribute('data-id'), el.getAttribute('data-dir'));
        break;
      }
      case 'export-data': exportData(); break;
      case 'open-import-modal': importModal(); break;
      case 'select-history-date': ui.historyDate = el.getAttribute('data-date'); render(); break;
      case 'history-prev-day': ui.historyDate = addDays(ui.historyDate, -1); render(); break;
      case 'history-next-day': ui.historyDate = addDays(ui.historyDate, 1); render(); break;
      case 'history-today': ui.historyDate = todayLocal(); render(); break;
      case 'cal-prev-month': ui.calendarMonth = shiftMonth(ui.calendarMonth, -1); render(); break;
      case 'cal-next-month': ui.calendarMonth = shiftMonth(ui.calendarMonth, 1); render(); break;
      case 'set-theme': state.settings.theme = el.getAttribute('data-value'); markDirty(); break;
      case 'set-timeformat': state.settings.timeFormat = el.getAttribute('data-value'); markDirty(); break;
      case 'remove-profile-photo': clearProfilePhoto(); break;
    }
  }

  function normalizeOrders(templateId) {
    var tasks = state.tasks.filter(function (t) { return t.templateId === templateId; }).sort(function (a, b) { return a.order - b.order; });
    tasks.forEach(function (t, i) { t.order = i; });
  }

  function moveTask(id, dir) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var siblings = state.tasks.filter(function (x) { return x.templateId === t.templateId; }).sort(function (a, b) { return a.order - b.order; });
    var idx = siblings.indexOf(t);
    var swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    var tmp = siblings[idx].order;
    siblings[idx].order = siblings[swapIdx].order;
    siblings[swapIdx].order = tmp;
    markDirty();
  }

  function shiftMonth(ym, delta) {
    var parts = ym.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1);
  }

  function handleSubmit(e) {
    if (e.target && e.target.id === 'task-form') submitTaskForm(e);
  }

  function handleInput(e) {
    var el = e.target;
    var act = el.getAttribute && el.getAttribute('data-act');
    if (!act) return;
    switch (act) {
      case 'search': ui.search = el.value; renderSoft(); break;
      case 'filter-category': ui.categoryFilter = el.value; render(); break;
      case 'toggle-hide-completed': ui.hideCompleted = el.checked; render(); break;
      case 'set-category-target': {
        var cat = categoryById(el.getAttribute('data-id'));
        if (cat) { cat.target = Math.max(0, Number(el.value) || 0); markDirty(true); }
        break;
      }
      case 'assign-weekday': {
        var wd = el.getAttribute('data-weekday');
        state.scheduleAssignment[wd] = el.value;
        markDirty();
        break;
      }
      case 'daily-note': {
        // No re-render: would blow away the textarea's cursor position mid-typing.
        setDailyNote(el.getAttribute('data-date'), el.value);
        break;
      }
      case 'profile-name': {
        // No full re-render here either; just refresh the sidebar's small profile preview.
        setProfileName(el.value);
        refreshBrandBlock();
        break;
      }
      case 'profile-photo-input': {
        var file = el.files && el.files[0];
        if (file) setProfilePhotoFromFile(file);
        break;
      }
    }
  }

  // Lightweight re-render that preserves focus in the search input
  function renderSoft() {
    var view = document.getElementById('view');
    var active = document.activeElement;
    var activeId = active ? active.id : null;
    var selStart = active && 'selectionStart' in active ? active.selectionStart : null;
    renderRouteInto(view);
    if (activeId) {
      var el = document.getElementById(activeId);
      if (el) {
        el.focus();
        if (selStart !== null && 'setSelectionRange' in el) {
          try { el.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ }
        }
      }
    }
    persist();
  }

  // Drag & drop reordering (with up/down buttons as the accessible alternative)
  var dragSourceId = null;
  function handleDragStart(e) {
    var row = e.target.closest ? e.target.closest('[data-act="drag-row"]') : null;
    if (!row) return;
    dragSourceId = row.getAttribute('data-id');
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e) {
    var row = e.target.closest ? e.target.closest('[data-act="drag-row"]') : null;
    if (!row) return;
    e.preventDefault();
  }
  function handleDrop(e) {
    var row = e.target.closest ? e.target.closest('[data-act="drag-row"]') : null;
    if (!row || !dragSourceId) return;
    e.preventDefault();
    var targetId = row.getAttribute('data-id');
    if (targetId === dragSourceId) return;
    var src = state.tasks.filter(function (t) { return t.id === dragSourceId; })[0];
    var tgt = state.tasks.filter(function (t) { return t.id === targetId; })[0];
    if (!src || !tgt || src.templateId !== tgt.templateId) return;
    var siblings = state.tasks.filter(function (t) { return t.templateId === src.templateId; }).sort(function (a, b) { return a.order - b.order; });
    siblings = siblings.filter(function (t) { return t.id !== src.id; });
    var targetIdx = siblings.indexOf(tgt);
    siblings.splice(targetIdx, 0, src);
    siblings.forEach(function (t, i) { t.order = i; });
    dragSourceId = null;
    markDirty();
  }

  /* ======================= 21. KEYBOARD ACCESSIBILITY ======================= */

  function handleKeydown(e) {
    if (e.key === 'Escape' && ui.modal) { closeModal(); return; }
    if (ui.modal) return; // don't fire page shortcuts while a modal/form has focus

    var tag = document.activeElement ? document.activeElement.tagName : '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === '/' && !typing && (ui.route === 'today')) {
      e.preventDefault();
      var searchEl = document.getElementById('search-input');
      if (searchEl) searchEl.focus();
      return;
    }
    if (typing) return;

    if (e.key === 'ArrowLeft' && ui.route === 'today') { ui.viewDate = addDays(ui.viewDate, -1); render(); }
    else if (e.key === 'ArrowRight' && ui.route === 'today') { ui.viewDate = addDays(ui.viewDate, 1); render(); }
    else if (e.key === 'ArrowLeft' && ui.route === 'history') { ui.historyDate = addDays(ui.historyDate, -1); render(); }
    else if (e.key === 'ArrowRight' && ui.route === 'history') { ui.historyDate = addDays(ui.historyDate, 1); render(); }
    else if ((e.key === 't' || e.key === 'T') && ui.route === 'today') { ui.viewDate = todayLocal(); render(); }
  }

  /* ======================= 22. BOOT ======================= */

  function boot() {
    initState();
    ensureChecklist(todayLocal());
    var h = location.hash.replace('#', '');
    if (ROUTES.some(function (r) { return r.id === h; })) ui.route = h;
    render();
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleInput);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('beforeunload', function () { if (state.activeTimer) stopTimer(); flushPersist(); });
    if (state.activeTimer) startTicker();

    var hot = window.claude && window.claude.hot;
    if (hot) {
      // no cross-session shared state here (localStorage only); nothing to snapshot/restore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
