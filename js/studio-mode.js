/**
 * ZenX Studio Mode Controller
 * Features:
 * - Keyboard shortcut activation: Ctrl + Shift + Z
 * - Custom Studio Lock with user-definable PIN/password
 * - In-place and modal event editing
 * - Add/delete/edit upcoming tournaments
 * - Add/edit team members
 * - One-click Save to Cloud & Local Storage
 */

class StudioModeController {
  constructor() {
    this.isActive = false;
    this.currentEditingEventId = null;
    this.currentEditingMemberId = null;
    this.init();
  }

  init() {
    this.bindKeyboardShortcut();
    this.bindUiEvents();
    if (sessionStorage.getItem('zenx_studio_active') === 'true') {
      setTimeout(() => this.unlockStudio(false), 200);
    }
  }

  // Bind Ctrl + Shift + Z keyboard shortcut
  bindKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      // Ctrl + Shift + Z or Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        this.triggerStudioModeToggle();
      }
    });
  }

  triggerStudioModeToggle() {
    if (this.isActive) {
      this.lockStudio();
    } else {
      this.openLockModal();
    }
  }

  // Lock Modal management
  openLockModal() {
    const modal = document.getElementById('studio-lock-modal');
    const pinInput = document.getElementById('studio-pin-input');
    const errorMsg = document.getElementById('studio-lock-error');
    if (!modal) return;

    // Trigger display:flex first via CSS class, then opacity transition
    modal.classList.add('active');

    if (errorMsg) {
      errorMsg.innerHTML = '';
      errorMsg.classList.add('hidden');
    }
    if (pinInput) {
      pinInput.value = '';
      setTimeout(() => pinInput.focus(), 150);
    }
  }

  closeLockModal() {
    const modal = document.getElementById('studio-lock-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  setNewPassAndUnlock(newPin) {
    if (newPin && newPin.trim().length >= 2) {
      window.zenxStorage.setStudioPin(newPin.trim());
      this.closeLockModal();
      this.unlockStudio();
      if (window.zenxApp && window.zenxApp.showToast) {
        window.zenxApp.showToast(`✅ Custom passkey saved! Studio Mode unlocked.`, 'success');
      }
    }
  }

  resetPassAndUnlock() {
    window.zenxStorage.setStudioPin('zenx2026');
    this.closeLockModal();
    this.unlockStudio();
    if (window.zenxApp && window.zenxApp.showToast) {
      window.zenxApp.showToast('⚡ Passkey reset to default (zenx2026) & Studio Unlocked!', 'info');
    }
  }

  togglePinVisibility() {
    const input = document.getElementById('studio-pin-input');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  verifyPinAndUnlock() {
    const pinInput = document.getElementById('studio-pin-input');
    const errorMsg = document.getElementById('studio-lock-error');
    const entered = (pinInput ? pinInput.value : '').trim();
    const correctPin = window.zenxStorage.getStudioPin();

    if (!entered) {
      if (errorMsg) {
        errorMsg.innerHTML = '<span class="text-amber-400">Please enter a passkey.</span>';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    // 1. Matches stored PIN, default PIN, or 'zenx' / 'admin'
    if (entered === correctPin || entered === 'zenx2026' || entered.toLowerCase() === 'zenx' || entered.toLowerCase() === 'admin' || entered.toLowerCase() === 'zenx2026') {
      this.closeLockModal();
      this.unlockStudio();
      if (window.zenxApp && window.zenxApp.showToast) {
        window.zenxApp.showToast('⚡ Studio Mode Unlocked! Welcome, Admin.', 'success');
      }
      return;
    }

    // 2. If stored PIN is still the default (zenx2026) and user entered their own custom code,
    // automatically save it as their permanent custom PIN and unlock immediately!
    if (correctPin === 'zenx2026' && entered.length >= 2) {
      window.zenxStorage.setStudioPin(entered);
      this.closeLockModal();
      this.unlockStudio();
      if (window.zenxApp && window.zenxApp.showToast) {
        window.zenxApp.showToast(`🔒 Passkey set to "${entered}" & Studio Unlocked!`, 'success');
      }
      return;
    }

    // 3. If a different custom PIN was already set, offer 1-click update/unlock or reset
    if (errorMsg) {
      const safeEntered = entered.replace(/"/g, '&quot;');
      errorMsg.innerHTML = `
        <div class="p-3 rounded-xl bg-slate-900 border border-amber-500/50 text-slate-200 text-xs space-y-2 mt-2">
          <div class="text-amber-400 font-bold">⚠️ Passkey incorrect.</div>
          <p class="text-[11px] text-slate-400">Set "${safeEntered}" as your permanent lock code?</p>
          <div class="flex gap-2">
            <button type="button" onclick="window.zenxStudio.setNewPassAndUnlock('${safeEntered}')" class="flex-1 py-2 px-3 rounded-lg bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs transition shadow-sm">
              Keep "${safeEntered}" & Unlock
            </button>
            <button type="button" onclick="window.zenxStudio.resetPassAndUnlock()" class="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition border border-slate-700">
              Reset to Default
            </button>
          </div>
        </div>
      `;
      errorMsg.classList.remove('hidden');
    }
    if (pinInput) {
      pinInput.classList.add('border-red-500');
      setTimeout(() => pinInput.classList.remove('border-red-500'), 1000);
    }
  }

  unlockStudio(showToast = true) {
    this.isActive = true;
    try { sessionStorage.setItem('zenx_studio_active', 'true'); } catch(e) {}
    document.body.classList.add('studio-mode-active');

    // Show top admin banner
    const topBanner = document.getElementById('studio-top-banner');
    if (topBanner) {
      topBanner.classList.remove('hidden');
    }

    // Show floating bar at bottom
    const floatingBar = document.getElementById('studio-floating-bar');
    if (floatingBar) {
      floatingBar.classList.remove('translate-y-32', 'opacity-0', 'pointer-events-none');
    }

    // Update registrations badge
    try {
      const savedRegs = localStorage.getItem('zenx_registrations');
      const list = savedRegs ? JSON.parse(savedRegs) : [];
      const badge = document.getElementById('studio-reg-count-badge');
      if (badge) badge.textContent = list.length;
    } catch(e) {}

    // Re-render tournaments and team with active studio controls
    if (window.zenxApp) {
      if (typeof window.zenxApp.renderEvents === 'function') window.zenxApp.renderEvents();
      if (typeof window.zenxApp.renderTeam === 'function') window.zenxApp.renderTeam();
      if (showToast && typeof window.zenxApp.showToast === 'function') {
        window.zenxApp.showToast('⚡ STUDIO EDITING MODE ACTIVE! Admin controls enabled.', 'success');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  lockStudio() {
    this.isActive = false;
    try { sessionStorage.removeItem('zenx_studio_active'); } catch(e) {}
    document.body.classList.remove('studio-mode-active');

    // Hide top admin banner
    const topBanner = document.getElementById('studio-top-banner');
    if (topBanner) {
      topBanner.classList.add('hidden');
    }

    // Hide floating bar
    const floatingBar = document.getElementById('studio-floating-bar');
    if (floatingBar) {
      floatingBar.classList.add('translate-y-32', 'opacity-0', 'pointer-events-none');
    }

    if (window.zenxApp) {
      if (typeof window.zenxApp.renderEvents === 'function') window.zenxApp.renderEvents();
      if (typeof window.zenxApp.renderTeam === 'function') window.zenxApp.renderTeam();
      if (typeof window.zenxApp.showToast === 'function') {
        window.zenxApp.showToast('🔒 Studio Mode Locked.', 'info');
      }
    }
  }

  // Change PIN
  changeStudioPin(newPin) {
    try {
      window.zenxStorage.setStudioPin(newPin);
      window.zenxApp.showToast('✅ Studio Lock code updated successfully!', 'success');
      return true;
    } catch(err) {
      window.zenxApp.showToast(err.message, 'error');
      return false;
    }
  }

  // Event editing & creation
  openEventEditor(eventId = null) {
    this.currentEditingEventId = eventId;
    const modal = document.getElementById('event-editor-modal');
    const form = document.getElementById('event-editor-form');
    const modalTitle = document.getElementById('event-editor-title');

    if (!modal || !form) return;

    if (eventId) {
      modalTitle.textContent = 'Edit Tournament';
      const event = window.zenxApp.events.find(e => e.id === eventId);
      if (event) {
        document.getElementById('event-id-input').value = event.id;
        document.getElementById('event-title-input').value = event.title || '';
        document.getElementById('event-sport-input').value = event.sport || 'Football';
        document.getElementById('event-category-input').value = event.category || '';
        document.getElementById('event-date-input').value = event.date || '';
        document.getElementById('event-time-input').value = event.time || '';
        document.getElementById('event-venue-input').value = event.venue || '';
        document.getElementById('event-area-input').value = event.area || '';
        document.getElementById('event-fee-input').value = event.entryFee || '';
        document.getElementById('event-prize-input').value = event.prizePool || '';
        document.getElementById('event-first-prize-input').value = event.firstPrize || '';
        document.getElementById('event-runner-prize-input').value = event.runnerUp || '';
        document.getElementById('event-slots-total-input').value = event.totalSlots || 16;
        document.getElementById('event-slots-filled-input').value = event.filledSlots || 0;
        document.getElementById('event-status-input').value = event.status || 'open';
        document.getElementById('event-banner-input').value = event.bannerImage || '';
        document.getElementById('event-format-input').value = event.format || '';
        document.getElementById('event-desc-input').value = event.description || '';
        document.getElementById('event-perks-input').value = (event.perks || []).join(', ');
      }
    } else {
      modalTitle.textContent = 'Create New Tournament';
      form.reset();
      document.getElementById('event-id-input').value = 'zenx-event-' + Date.now();
      document.getElementById('event-status-input').value = 'open';
      document.getElementById('event-slots-total-input').value = 16;
      document.getElementById('event-slots-filled-input').value = 0;
      document.getElementById('event-banner-input').value = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';
    }

    modal.classList.add('active');
  }

  saveEventFromForm() {
    const id = document.getElementById('event-id-input').value;
    const title = document.getElementById('event-title-input').value.trim();
    const sport = document.getElementById('event-sport-input').value;
    const category = document.getElementById('event-category-input').value.trim();
    const date = document.getElementById('event-date-input').value;
    const time = document.getElementById('event-time-input').value.trim();
    const venue = document.getElementById('event-venue-input').value.trim();
    const area = document.getElementById('event-area-input').value.trim();
    const entryFee = document.getElementById('event-fee-input').value.trim();
    const prizePool = document.getElementById('event-prize-input').value.trim();
    const firstPrize = document.getElementById('event-first-prize-input').value.trim();
    const runnerUp = document.getElementById('event-runner-prize-input').value.trim();
    const totalSlots = parseInt(document.getElementById('event-slots-total-input').value) || 16;
    const filledSlots = parseInt(document.getElementById('event-slots-filled-input').value) || 0;
    const status = document.getElementById('event-status-input').value;
    const bannerImage = document.getElementById('event-banner-input').value.trim();
    const format = document.getElementById('event-format-input').value.trim();
    const description = document.getElementById('event-desc-input').value.trim();
    const perksRaw = document.getElementById('event-perks-input').value;
    const perks = perksRaw.split(',').map(p => p.trim()).filter(Boolean);

    if (!title || !date || !venue) {
      window.zenxApp.showToast('Please fill in Tournament Title, Date, and Venue.', 'error');
      return;
    }

    const eventObj = {
      id, title, sport, category, date, time, venue, area, entryFee,
      prizePool, firstPrize, runnerUp, totalSlots, filledSlots,
      status, bannerImage, format, description, perks
    };

    const existingIdx = window.zenxApp.events.findIndex(e => e.id === id);
    if (existingIdx >= 0) {
      window.zenxApp.events[existingIdx] = eventObj;
      window.zenxApp.showToast('✅ Tournament updated in Studio!', 'success');
    } else {
      window.zenxApp.events.unshift(eventObj);
      window.zenxApp.showToast('🏆 New tournament created in Studio!', 'success');
    }

    document.getElementById('event-editor-modal').classList.remove('active');
    window.zenxApp.renderEvents();

    // Auto-save changes
    this.saveAllToCloud(false);
  }

  deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this tournament from ZenX?')) {
      window.zenxApp.events = window.zenxApp.events.filter(e => e.id !== eventId);
      window.zenxApp.renderEvents();
      this.saveAllToCloud(false);
      window.zenxApp.showToast('Tournament deleted.', 'info');
    }
  }

  duplicateEvent(eventId) {
    const original = window.zenxApp.events.find(e => e.id === eventId);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'zenx-event-' + Date.now();
    copy.title = copy.title + ' (Copy)';
    copy.filledSlots = 0;
    window.zenxApp.events.unshift(copy);
    window.zenxApp.renderEvents();
    this.saveAllToCloud(false);
    window.zenxApp.showToast('Tournament duplicated!', 'success');
  }

  // Save to Cloud & Local Storage
  async saveAllToCloud(showBigNotification = true) {
    const saveBtn = document.getElementById('studio-save-cloud-btn');
    if (saveBtn) {
      saveBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⚙️</span> Saving to Cloud...';
      saveBtn.disabled = true;
    }

    try {
      const result = await window.zenxStorage.saveEvents(window.zenxApp.events);
      await window.zenxStorage.saveTeam(window.zenxApp.team);

      if (saveBtn) {
        saveBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-1.5 inline text-lime-300"></i> Saved to Cloud!';
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
          saveBtn.innerHTML = '<i data-lucide="cloud-upload" class="w-4 h-4 mr-1.5 inline"></i> Save to Cloud';
          saveBtn.disabled = false;
          if (window.lucide) lucide.createIcons();
        }, 2000);
      }

      if (showBigNotification) {
        window.zenxApp.showToast('☁️ Saved to Cloud & Disk at ' + result.timestamp, 'success');
      }
    } catch (err) {
      if (saveBtn) {
        saveBtn.innerHTML = '<i data-lucide="cloud-upload" class="w-4 h-4 mr-1.5 inline"></i> Save to Cloud';
        saveBtn.disabled = false;
        if (window.lucide) lucide.createIcons();
      }
      window.zenxApp.showToast('Error saving: ' + err.message, 'error');
    }
  }

  bindUiEvents() {
    // Navigation studio button
    const navStudioBtn = document.getElementById('nav-studio-btn');
    if (navStudioBtn) {
      navStudioBtn.addEventListener('click', () => this.triggerStudioModeToggle());
    }

    // Hero quick studio button
    const heroStudioBtn = document.getElementById('hero-studio-btn');
    if (heroStudioBtn) {
      heroStudioBtn.addEventListener('click', () => this.triggerStudioModeToggle());
    }

    // Lock modal form submit (handles both enter key and button click cleanly)
    const lockForm = document.getElementById('studio-lock-form');
    if (lockForm) {
      lockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.verifyPinAndUnlock();
      });
    }

    // Lock Modal Cancel (Top button and Bottom button)
    const cancelLockBtn = document.getElementById('studio-lock-cancel-btn');
    if (cancelLockBtn) {
      cancelLockBtn.addEventListener('click', () => this.closeLockModal());
    }

    const cancelLockBottomBtn = document.getElementById('studio-lock-bottom-cancel-btn');
    if (cancelLockBottomBtn) {
      cancelLockBottomBtn.addEventListener('click', () => this.closeLockModal());
    }

    // Close on backdrop click (click outside modal box)
    const lockModal = document.getElementById('studio-lock-modal');
    if (lockModal) {
      lockModal.addEventListener('click', (e) => {
        if (e.target === lockModal) {
          this.closeLockModal();
        }
      });
    }

    // Close all modals on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLockModal();
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
      }
    });

    // Studio floating bar actions
    const addEventBtn = document.getElementById('studio-add-event-btn');
    if (addEventBtn) {
      addEventBtn.addEventListener('click', () => this.openEventEditor());
    }

    const saveCloudBtn = document.getElementById('studio-save-cloud-btn');
    if (saveCloudBtn) {
      saveCloudBtn.addEventListener('click', () => this.saveAllToCloud(true));
    }

    const lockExitBtn = document.getElementById('studio-lock-exit-btn');
    if (lockExitBtn) {
      lockExitBtn.addEventListener('click', () => this.lockStudio());
    }

    const cloudSettingsBtn = document.getElementById('studio-settings-btn');
    if (cloudSettingsBtn) {
      cloudSettingsBtn.addEventListener('click', () => this.openSettingsModal());
    }

    const exportBtn = document.getElementById('studio-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.zenxStorage.exportBackup(window.zenxApp.events, window.zenxApp.team);
        window.zenxApp.showToast('📥 Backup exported as JSON file.', 'info');
      });
    }

    const importInput = document.getElementById('studio-import-file-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => this.handleImportFile(e));
    }

    // Event editor form submit
    const eventForm = document.getElementById('event-editor-form');
    if (eventForm) {
      eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEventFromForm();
      });
    }

    const eventCancelBtn = document.getElementById('event-editor-cancel-btn');
    if (eventCancelBtn) {
      eventCancelBtn.addEventListener('click', () => {
        document.getElementById('event-editor-modal').classList.remove('active');
      });
    }
  }

  openSettingsModal() {
    const modal = document.getElementById('studio-settings-modal');
    if (!modal) return;
    const currentPinField = document.getElementById('settings-current-pin-display');
    if (currentPinField) {
      currentPinField.textContent = window.zenxStorage.getStudioPin();
    }
    const pinChangeInput = document.getElementById('settings-new-pin');
    if (pinChangeInput) pinChangeInput.value = '';
    modal.classList.add('active');
  }

  saveSettings() {
    const pinChangeInput = document.getElementById('settings-new-pin');
    if (pinChangeInput && pinChangeInput.value.trim().length > 0) {
      const pinVal = pinChangeInput.value.trim();
      if (pinVal.length < 3) {
        window.zenxApp.showToast('Lock Code must be at least 3 characters!', 'error');
        return;
      }
      this.changeStudioPin(pinVal);
    }

    const supabaseUrl = document.getElementById('settings-supabase-url')?.value.trim() || '';
    const supabaseKey = document.getElementById('settings-supabase-key')?.value.trim() || '';
    const restUrl = document.getElementById('settings-rest-url')?.value.trim() || '';

    window.zenxStorage.saveCloudConfig({
      supabaseUrl,
      supabaseAnonKey: supabaseKey,
      restEndpoint: restUrl,
      provider: supabaseUrl ? 'supabase' : (restUrl ? 'rest_api' : 'local_server')
    });

    document.getElementById('studio-settings-modal').classList.remove('active');
    window.zenxApp.showToast('⚙️ Settings & Lock code updated!', 'success');
  }

  handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.events && Array.isArray(data.events)) {
          window.zenxApp.events = data.events;
        }
        if (data.team && Array.isArray(data.team)) {
          window.zenxApp.team = data.team;
        }
        window.zenxApp.renderEvents();
        window.zenxApp.renderTeam();
        this.saveAllToCloud(false);
        window.zenxApp.showToast('✅ Data successfully restored from backup!', 'success');
      } catch(err) {
        window.zenxApp.showToast('Invalid backup file JSON', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ==========================================
  // FRONTEND WEBSITE CONTENT EDITOR
  // ==========================================
  openFrontendEditor() {
    const modal = document.getElementById('frontend-editor-modal');
    if (!modal) return;

    // Load saved or current DOM values
    const saved = localStorage.getItem('zenx_frontend_content');
    const data = saved ? JSON.parse(saved) : {};

    const marqueeEl = document.querySelector('.animate-marquee span:first-child');
    document.getElementById('fe-marquee-input').value = data.marquee || (marqueeEl ? marqueeEl.textContent.trim() : '');
    
    document.getElementById('fe-eyebrow-input').value = data.eyebrow || 'MORE THAN TOURNAMENTS.';
    document.getElementById('fe-tagline-input').value = data.tagline || 'COMPETE. CONNECT. CONQUER.';
    document.getElementById('fe-hero-desc-input').value = data.heroDesc || 'High-stakes sports leagues, electronic scoring, corporate battles, and floodlit tournaments across Hyderabad.';

    document.getElementById('fe-stat-events-input').value = data.statEvents || document.getElementById('stat-active-tournaments')?.textContent.trim() || '5+';
    document.getElementById('fe-stat-athletes-input').value = data.statAthletes || '355+';
    document.getElementById('fe-stat-prize-input').value = data.statPrize || document.getElementById('stat-total-prize')?.textContent.trim() || '₹1.5L+';
    document.getElementById('fe-stat-venues-input').value = data.statVenues || '12+';

    document.getElementById('fe-phone-input').value = data.phone || '+91 98765 43210';
    document.getElementById('fe-instagram-input').value = data.instagram || '@zenx.hyd';

    modal.classList.add('active');
  }

  saveFrontendContent() {
    const content = {
      marquee: document.getElementById('fe-marquee-input')?.value.trim(),
      eyebrow: document.getElementById('fe-eyebrow-input')?.value.trim(),
      tagline: document.getElementById('fe-tagline-input')?.value.trim(),
      heroDesc: document.getElementById('fe-hero-desc-input')?.value.trim(),
      statEvents: document.getElementById('fe-stat-events-input')?.value.trim(),
      statAthletes: document.getElementById('fe-stat-athletes-input')?.value.trim(),
      statPrize: document.getElementById('fe-stat-prize-input')?.value.trim(),
      statVenues: document.getElementById('fe-stat-venues-input')?.value.trim(),
      phone: document.getElementById('fe-phone-input')?.value.trim(),
      instagram: document.getElementById('fe-instagram-input')?.value.trim(),
    };

    localStorage.setItem('zenx_frontend_content', JSON.stringify(content));
    this.applyFrontendContent(content);

    document.getElementById('frontend-editor-modal').classList.remove('active');
    window.zenxApp.showToast('✨ Website frontend content updated successfully!', 'success');
  }

  applyFrontendContent(data) {
    if (!data) return;
    if (data.marquee) {
      document.querySelectorAll('.animate-marquee span').forEach((span, i) => {
        if (i % 2 === 0) span.textContent = data.marquee;
      });
    }
    if (data.statEvents) {
      const el = document.getElementById('stat-active-tournaments');
      if (el) el.textContent = data.statEvents;
    }
    if (data.statPrize) {
      const el = document.getElementById('stat-total-prize');
      if (el) el.textContent = data.statPrize;
    }
  }

  loadFrontendContent() {
    try {
      const saved = localStorage.getItem('zenx_frontend_content');
      if (saved) {
        this.applyFrontendContent(JSON.parse(saved));
      }
    } catch(e) {}
  }

  // ==========================================
  // TOURNAMENT REGISTRATIONS MANAGER
  // ==========================================
  async openRegistrationsModal() {
    const modal = document.getElementById('registrations-modal');
    const container = document.getElementById('registrations-list-container');
    if (!modal || !container) return;

    modal.classList.add('active');
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-sm">Loading registrations...</div>';

    const list = await window.zenxStorage.loadRegistrations();

    // Update count badge
    const badge = document.getElementById('studio-reg-count-badge');
    if (badge) badge.textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div class="text-3xl">📋</div>
          <div class="text-white font-bold text-sm">No Team Registrations Yet</div>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">When teams register via the website frontend, their captain details, squad count, and phone numbers will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-black/60 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th class="p-3">Team & Captain</th>
              <th class="p-3">Tournament / Sport</th>
              <th class="p-3">Squad</th>
              <th class="p-3">Contact</th>
              <th class="p-3">Date</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${list.map(reg => {
              const dateStr = reg.submittedAt ? new Date(reg.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
              const cleanPhone = (reg.phone || '').replace(/[^0-9]/g, '');
              const waMsg = encodeURIComponent(`Hi ${reg.captainName || 'Captain'}, thank you for registering team "${reg.teamName}" for ${reg.eventTitle || 'ZenX tournament'}! We are confirming your slot.`);
              const waUrl = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${waMsg}` : '#';

              return `
                <tr class="hover:bg-slate-800/40 transition">
                  <td class="p-3 font-medium text-white">
                    <div class="font-bold text-lime-300">${reg.teamName || 'Unnamed Team'}</div>
                    <div class="text-[11px] text-slate-400">Capt: ${reg.captainName || 'N/A'}</div>
                  </td>
                  <td class="p-3">
                    <div class="text-slate-200">${reg.eventTitle || 'Tournament'}</div>
                    <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">${reg.sport || 'Sport'}</span>
                  </td>
                  <td class="p-3 text-slate-300 font-mono">${reg.playersCount || 7} players</td>
                  <td class="p-3">
                    <div class="font-mono text-slate-200">${reg.phone || 'N/A'}</div>
                    ${cleanPhone ? `
                      <a href="${waUrl}" target="_blank" class="inline-flex items-center gap-1 text-[10px] text-green-400 hover:underline mt-0.5">
                        <span>WhatsApp Chat</span>
                      </a>
                    ` : ''}
                  </td>
                  <td class="p-3 text-slate-400 text-[11px] whitespace-nowrap">${dateStr}</td>
                  <td class="p-3 text-right">
                    <button onclick="window.zenxStudio.deleteRegistration('${reg.id}')" class="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 text-[11px] transition">
                      Remove
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async deleteRegistration(id) {
    if (!confirm('Remove this registration record?')) return;
    const list = await window.zenxStorage.loadRegistrations();
    const updated = list.filter(r => r.id !== id);
    localStorage.setItem('zenx_registrations', JSON.stringify(updated));
    this.openRegistrationsModal();
    window.zenxApp.showToast('Registration removed.', 'info');
  }

  async exportRegistrationsCSV() {
    const list = await window.zenxStorage.loadRegistrations();
    if (list.length === 0) {
      window.zenxApp.showToast('No registrations to export!', 'error');
      return;
    }

    let csv = 'ID,SubmittedAt,TeamName,CaptainName,Phone,PlayersCount,EventTitle,Sport,Notes\n';
    list.forEach(r => {
      const row = [
        r.id || '',
        r.submittedAt || '',
        `"${(r.teamName || '').replace(/"/g, '""')}"`,
        `"${(r.captainName || '').replace(/"/g, '""')}"`,
        `"${(r.phone || '').replace(/"/g, '""')}"`,
        r.playersCount || '',
        `"${(r.eventTitle || '').replace(/"/g, '""')}"`,
        `"${(r.sport || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenx_registrations_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.zenxApp.showToast('📥 Registrations exported as CSV spreadsheet!', 'success');
  }

  // ==========================================
  // LIVE MATCH SCOREBOARD CONTROLLER
  // ==========================================
  openLiveMatchModal() {
    const modal = document.getElementById('live-match-modal');
    if (!modal) return;

    const saved = localStorage.getItem('zenx_live_match');
    const data = saved ? JSON.parse(saved) : {};

    const enabledToggle = document.getElementById('live-match-enabled');
    const titleInput = document.getElementById('live-match-input-title');
    const scoreInput = document.getElementById('live-match-input-score');
    const linkInput = document.getElementById('live-match-input-link');

    if (enabledToggle) enabledToggle.checked = data.enabled !== false;
    if (titleInput) titleInput.value = data.title || '🏏 ZenX Box Cricket: Hyderabad Strikers vs Deccan Warriors';
    if (scoreInput) scoreInput.value = data.score || '54/2 (4.3 ov) • Target 88';
    if (linkInput) linkInput.value = data.link || 'https://cricheroes.in';

    modal.classList.add('active');
  }

  saveLiveMatch() {
    const enabled = document.getElementById('live-match-enabled')?.checked ?? true;
    const title = document.getElementById('live-match-input-title')?.value.trim();
    const score = document.getElementById('live-match-input-score')?.value.trim();
    const link = document.getElementById('live-match-input-link')?.value.trim();

    if (enabled && (!title || !score)) {
      window.zenxApp.showToast('Please provide both match title and score.', 'error');
      return;
    }

    const payload = {
      enabled,
      title,
      score,
      link,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('zenx_live_match', JSON.stringify(payload));

    if (window.zenxApp && window.zenxApp.renderLiveMatch) {
      window.zenxApp.renderLiveMatch();
    }

    document.getElementById('live-match-modal')?.classList.remove('active');
    window.zenxApp.showToast(enabled ? '🔴 Live score broadcasted successfully!' : 'Live ticker hidden.', 'success');
  }
}

window.zenxStudio = new StudioModeController();
window.zenxStudio.loadFrontendContent();

