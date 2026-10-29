/**
 * ZenX Hyderabad Sports Platform - Main Application Logic
 */

class ZenXApp {
  constructor() {
    this.events = [];
    this.team = [];
    this.activeFilter = 'All';
    this.searchQuery = '';
    this.selectedEventForRegistration = null;
  }

  async init() {
    console.log('⚡ Initializing ZenX Hyderabad Sports Platform...');
    await this.loadInitialData();
    this.renderStats();
    this.renderLiveMatch();
    this.renderEvents();
    this.renderTeam();
    this.bindEvents();
    this.initLucideIcons();
  }

  async loadInitialData() {
    this.events = await window.zenxStorage.loadEvents();
    this.team = await window.zenxStorage.loadTeam();
  }

  initLucideIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const borderClass = type === 'success' ? 'border-lime-400 text-lime-300' :
                        type === 'error' ? 'border-red-500 text-red-300' :
                        'border-blue-400 text-blue-300';
    const bgClass = 'bg-[#0d1210]/95 backdrop-blur-md shadow-2xl';
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${borderClass} ${bgClass} text-sm font-medium transform transition-all duration-300 translate-x-full opacity-0 shadow-[0_0_20px_rgba(0,0,0,0.8)]`;
    toast.innerHTML = `
      <i data-lucide="${icon}" class="w-5 h-5 flex-shrink-0"></i>
      <span class="text-slate-100">${message}</span>
    `;

    container.appendChild(toast);
    this.initLucideIcons();

    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // Dynamic Statistics
  renderStats() {
    const activeCount = this.events.filter(e => e.status !== 'completed').length;
    const totalPrize = this.events.reduce((sum, e) => {
      const val = parseInt((e.prizePool || '0').replace(/[^0-9]/g, '')) || 0;
      return sum + val;
    }, 0);

    const activeElem = document.getElementById('stat-active-tournaments');
    if (activeElem) activeElem.textContent = `${activeCount}+`;

    const prizeElem = document.getElementById('stat-total-prize');
    if (prizeElem) prizeElem.textContent = `₹${(totalPrize / 1000).toFixed(0)}K+`;
  }

  // Live Tournament Match & Score Ticker
  renderLiveMatch() {
    const ticker = document.getElementById('live-match-ticker');
    if (!ticker) return;

    const saved = localStorage.getItem('zenx_live_match');
    const data = saved ? JSON.parse(saved) : null;

    if (!data || data.enabled === false) {
      ticker.classList.add('hidden');
      return;
    }

    ticker.classList.remove('hidden');
    const titleEl = document.getElementById('live-match-title');
    const scoreEl = document.getElementById('live-match-score');
    const linkEl = document.getElementById('live-match-link');

    if (titleEl) titleEl.textContent = data.title || '🏏 ZenX Live Tournament Match: In Progress';
    if (scoreEl) scoreEl.textContent = data.score || 'Live In Progress';
    if (linkEl) {
      if (data.link && data.link.trim()) {
        linkEl.href = data.link.trim();
        linkEl.style.display = 'inline-flex';
      } else {
        linkEl.style.display = 'none';
      }
    }
  }

  // Render Tournaments Grid
  renderEvents() {
    const grid = document.getElementById('tournaments-grid');
    const emptyState = document.getElementById('tournaments-empty');
    if (!grid) return;

    const isStudio = window.zenxStudio && window.zenxStudio.isActive;

    let filtered = this.events.filter(ev => {
      const matchFilter = this.activeFilter === 'All' || 
                          ev.sport.toLowerCase() === this.activeFilter.toLowerCase();
      const matchSearch = !this.searchQuery || 
                          ev.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          ev.venue.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          ev.area.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          ev.sport.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map(ev => {
      const slotsTotal = ev.totalSlots || 16;
      const slotsFilled = ev.filledSlots || 0;
      const slotsLeft = Math.max(0, slotsTotal - slotsFilled);
      const percentFilled = Math.min(100, Math.round((slotsFilled / slotsTotal) * 100));

      let statusBadge = '';
      if (ev.status === 'sold_out' || slotsLeft === 0) {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-500/40">Sold Out</span>`;
      } else if (ev.status === 'filling_fast' || percentFilled >= 70) {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-400 border border-amber-500/40 animate-pulse">Filling Fast ⚡</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-lime-950/80 text-lime-400 border border-lime-500/40">Registration Open</span>`;
      }

      // Always-visible Studio Action Bar on card when Studio Mode is active
      const studioTopBar = isStudio ? `
        <div class="bg-lime-400 text-black px-4 py-2 flex items-center justify-between z-20 font-mono text-xs font-black shadow-md border-b border-black">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-black animate-pulse"></span> ⚡ TOURNAMENT EDIT</span>
          <div class="flex items-center gap-1.5">
            <button onclick="window.zenxStudio.openEventEditor('${ev.id}')" class="px-2.5 py-1 rounded bg-black hover:bg-slate-800 text-lime-300 text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
              ✏️ Edit Event
            </button>
            <button onclick="window.zenxStudio.duplicateEvent('${ev.id}')" class="px-2 py-1 rounded bg-black hover:bg-slate-800 text-white text-[11px] font-bold transition">
              📄 Copy
            </button>
            <button onclick="window.zenxStudio.deleteEvent('${ev.id}')" class="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition">
              🗑️
            </button>
          </div>
        </div>
      ` : '';

      return `
        <div class="studio-editable-item group relative bg-[#0e1412] rounded-2xl ${isStudio ? 'border-2 border-lime-400 ring-2 ring-lime-400/20 shadow-[0_0_25px_rgba(163,230,53,0.25)]' : 'border border-slate-800 hover:border-lime-500/50'} transition-all duration-300 flex flex-col overflow-hidden shadow-xl">
          ${studioTopBar}

          <!-- Tournament Banner Image -->
          <div class="relative h-52 w-full overflow-hidden bg-slate-900">
            <img 
              src="${ev.bannerImage || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'}" 
              alt="${ev.title}"
              class="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80'"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#0e1412] via-[#0e1412]/40 to-transparent"></div>

            <!-- Sport & Status Tag -->
            <div class="absolute top-3 left-3 flex flex-wrap gap-2 items-center">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/80 text-white border border-slate-700 backdrop-blur-md">
                ${ev.sport}
              </span>
              ${statusBadge}
            </div>

            <!-- Cash Prize Pool Tag -->
            <div class="absolute bottom-3 right-3">
              <div class="px-3 py-1.5 rounded-xl bg-lime-400 text-black font-extrabold text-sm shadow-[0_0_15px_rgba(163,230,53,0.6)] flex items-center gap-1.5">
                <i data-lucide="trophy" class="w-4 h-4"></i>
                <span>Pool: ${ev.prizePool || '₹25,000'}</span>
              </div>
            </div>
          </div>

          <!-- Card Content -->
          <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div class="text-xs font-semibold text-lime-400 tracking-wider uppercase mb-1">
                ${ev.category || 'Championship Tournament'}
              </div>
              <h3 class="text-xl font-bold text-white group-hover:text-lime-300 transition line-clamp-1">
                ${ev.title}
              </h3>
              <p class="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                ${ev.description || 'Join Hyderabad top teams for high-stakes competition, certified officiating, and championship honors.'}
              </p>
            </div>

            <!-- Key Match Details -->
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
              <div class="flex items-center gap-1.5">
                <i data-lucide="calendar" class="w-3.5 h-3.5 text-lime-400"></i>
                <span class="font-medium">${ev.date || 'TBA'}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5 text-lime-400"></i>
                <span class="truncate">${ev.time || 'Evening'}</span>
              </div>
              <div class="flex items-center gap-1.5 col-span-2">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-lime-400 flex-shrink-0"></i>
                <span class="truncate">${ev.venue}, ${ev.area}</span>
              </div>
            </div>

            <!-- Slots Meter -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-slate-400">Slots Booked</span>
                <span class="${slotsLeft <= 3 ? 'text-amber-400 font-bold' : 'text-slate-300'}">
                  ${slotsFilled} / ${slotsTotal} Teams (${slotsLeft} Left)
                </span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-lime-500 to-lime-300 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(163,230,53,0.5)]" 
                  style="width: ${percentFilled}%">
                </div>
              </div>
            </div>

            <!-- Pricing & Action Bar -->
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <span class="text-[10px] text-slate-400 uppercase tracking-wider block">Entry Fee</span>
                <span class="text-base font-bold text-white">${ev.entryFee ? (ev.entryFee.startsWith('₹') ? ev.entryFee : '₹' + ev.entryFee) : '₹1,999'}</span>
              </div>

              <button 
                onclick="window.zenxApp.openRegistrationModal('${ev.id}')"
                ${ev.status === 'sold_out' ? 'disabled' : ''}
                class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  ev.status === 'sold_out' 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-lime-400 hover:bg-lime-300 text-black neon-glow-btn shadow-[0_0_15px_rgba(163,230,53,0.4)]'
                }">
                <span>${ev.status === 'sold_out' ? 'Sold Out' : 'Register Team'}</span>
                <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.initLucideIcons();
  }

  // Render Team & Organizers ("Ppl Info")
  renderTeam() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    grid.innerHTML = this.team.map(member => {
      return `
        <div class="group bg-[#0e1412] rounded-2xl border border-slate-800 hover:border-lime-500/40 p-6 flex flex-col items-center text-center transition duration-300 hover:shadow-[0_0_25px_rgba(163,230,53,0.12)]">
          <div class="relative w-24 h-24 mb-4">
            <div class="absolute inset-0 rounded-full bg-lime-400/20 blur-md group-hover:bg-lime-400/40 transition"></div>
            <img 
              src="${member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}" 
              alt="${member.name}" 
              class="relative w-full h-full object-cover rounded-full border-2 border-lime-400 shadow-md"
              loading="lazy"
            />
          </div>

          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lime-950/60 text-lime-400 border border-lime-500/30 mb-2">
            ${member.badge || 'Team ZenX'}
          </span>

          <h4 class="text-lg font-bold text-white">${member.name}</h4>
          <p class="text-xs font-semibold text-slate-400 mb-2">${member.role}</p>
          <p class="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">${member.bio}</p>

          <div class="mt-auto pt-3 w-full border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span class="font-medium text-slate-300">${member.sport || 'Multi-Sport'}</span>
            <a 
              href="https://instagram.com/${member.instagram || 'zenx.hyd'}" 
              target="_blank" 
              class="hover:text-lime-400 transition flex items-center gap-1">
              <i data-lucide="instagram" class="w-3.5 h-3.5"></i>
              <span>@${member.instagram || 'zenx.hyd'}</span>
            </a>
          </div>
        </div>
      `;
    }).join('');

    this.initLucideIcons();
  }

  // Registration Modal Handling
  openRegistrationModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    this.selectedEventForRegistration = event;

    const modal = document.getElementById('registration-modal');
    if (!modal) return;

    document.getElementById('reg-event-title').textContent = event.title;
    document.getElementById('reg-event-meta').textContent = `${event.sport} • ${event.date} • ${event.venue}, ${event.area}`;
    document.getElementById('reg-event-fee').textContent = event.entryFee ? (event.entryFee.startsWith('₹') ? event.entryFee : '₹' + event.entryFee) : '₹1,999';

    modal.classList.add('active');
  }

  closeRegistrationModal() {
    const modal = document.getElementById('registration-modal');
    if (modal) modal.classList.remove('active');
  }

  async handleRegistrationSubmit(e) {
    e.preventDefault();
    if (!this.selectedEventForRegistration) return;

    const teamName = document.getElementById('reg-team-name').value.trim();
    const captainName = document.getElementById('reg-captain-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const playersCount = document.getElementById('reg-players-count').value;
    const notes = document.getElementById('reg-notes').value.trim();

    if (!teamName || !captainName || !phone) {
      this.showToast('Please fill in Team Name, Captain Name, and Phone.', 'error');
      return;
    }

    const regPayload = {
      eventId: this.selectedEventForRegistration.id,
      eventTitle: this.selectedEventForRegistration.title,
      sport: this.selectedEventForRegistration.sport,
      teamName,
      captainName,
      phone,
      playersCount,
      notes
    };

    // Save registration
    await window.zenxStorage.saveRegistration(regPayload);

    // Update slots
    const event = this.selectedEventForRegistration;
    event.filledSlots = Math.min(event.totalSlots, (event.filledSlots || 0) + 1);
    await window.zenxStorage.saveEvents(this.events);

    this.closeRegistrationModal();
    this.renderEvents();
    this.renderStats();

    // Prepare WhatsApp Confirmation Link for ZenX
    const waText = encodeURIComponent(
      `Hello ZenX Team! 🏆\nI just registered my team for *${event.title}*:\n` +
      `• Team: *${teamName}*\n` +
      `• Captain: *${captainName}*\n` +
      `• Contact: *${phone}*\n` +
      `• Squad: ${playersCount} players\n` +
      `Please confirm our slot & share payment details!`
    );
    // Get organizer WhatsApp phone number from frontend content or default
    const savedContent = localStorage.getItem('zenx_frontend_content');
    const frontendData = savedContent ? JSON.parse(savedContent) : {};
    let organizerPhone = (frontendData.phone || '919876543210').replace(/[^0-9]/g, '');
    if (organizerPhone.length === 10) {
      organizerPhone = '91' + organizerPhone;
    }
    const waUrl = `https://wa.me/${organizerPhone}?text=${waText}`;

    this.showToast('🎉 Registration recorded! Redirecting to ZenX WhatsApp confirmation...', 'success');
    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 1200);
  }

  // Bind Listeners
  bindEvents() {
    // Sport Filters
    const filterButtons = document.querySelectorAll('.sport-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => {
          b.classList.remove('bg-lime-400', 'text-black', 'font-bold', 'shadow-[0_0_15px_rgba(163,230,53,0.4)]');
          b.classList.add('bg-slate-900', 'text-slate-300', 'hover:bg-slate-800');
        });
        btn.classList.remove('bg-slate-900', 'text-slate-300', 'hover:bg-slate-800');
        btn.classList.add('bg-lime-400', 'text-black', 'font-bold', 'shadow-[0_0_15px_rgba(163,230,53,0.4)]');

        this.activeFilter = btn.getAttribute('data-sport') || 'All';
        this.renderEvents();
      });
    });

    // Live Search
    const searchInput = document.getElementById('tournament-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderEvents();
      });
    }

    // Registration Form
    const regForm = document.getElementById('registration-form');
    if (regForm) {
      regForm.addEventListener('submit', (e) => this.handleRegistrationSubmit(e));
    }

    const regCancelBtn = document.getElementById('reg-cancel-btn');
    if (regCancelBtn) {
      regCancelBtn.addEventListener('click', () => this.closeRegistrationModal());
    }

    // Contact Form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.showToast('Message sent! The ZenX team will reach out within 2 hours.', 'success');
        contactForm.reset();
      });
    }
  }
}

window.zenxApp = new ZenXApp();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.zenxApp.init();
  });
} else {
  window.zenxApp.init();
}
