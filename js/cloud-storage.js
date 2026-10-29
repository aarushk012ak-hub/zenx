/**
 * ZenX Universal Cloud Storage & Persistence Layer
 * Provides seamless multi-tier sync:
 * 1. LocalStorage (instant offline cache)
 * 2. Local Python Server File Sync (/api/events, /api/team)
 * 3. Remote Cloud Sync (Supabase REST or custom cloud endpoint)
 * 4. JSON Snapshot Export/Import
 */

const STORAGE_KEYS = {
  EVENTS: 'zenx_events_data',
  TEAM: 'zenx_team_data',
  CLOUD_CONFIG: 'zenx_cloud_config',
  STUDIO_PIN: 'zenx_studio_pin',
  REGISTRATIONS: 'zenx_registrations'
};

const DEFAULT_PIN = 'zenx2026';

class CloudStorage {
  constructor() {
    this.cloudConfig = this.getCloudConfig();
    this.isServerAvailable = false;
    this.checkServerAvailability();
  }

  async checkServerAvailability() {
    try {
      const res = await fetch('/api/status', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        this.isServerAvailable = true;
        console.log('⚡ ZenX Local Persistence Server is ONLINE:', data);
      }
    } catch (e) {
      this.isServerAvailable = false;
      console.log('ℹ️ Running in standalone mode (Local Cache + Cloud Sync)');
    }
  }

  getStudioPin() {
    const savedPin = localStorage.getItem(STORAGE_KEYS.STUDIO_PIN);
    if (!savedPin) {
      localStorage.setItem(STORAGE_KEYS.STUDIO_PIN, DEFAULT_PIN);
      return DEFAULT_PIN;
    }
    return savedPin;
  }

  setStudioPin(newPin) {
    if (!newPin || newPin.trim().length < 3) {
      throw new Error('Lock code must be at least 3 characters');
    }
    localStorage.setItem(STORAGE_KEYS.STUDIO_PIN, newPin.trim());
    return true;
  }

  getCloudConfig() {
    const saved = localStorage.getItem(STORAGE_KEYS.CLOUD_CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      provider: 'local_server',
      supabaseUrl: '',
      supabaseAnonKey: '',
      restEndpoint: '',
      autoSave: true,
      lastSynced: null
    };
  }

  saveCloudConfig(config) {
    this.cloudConfig = { ...this.cloudConfig, ...config };
    localStorage.setItem(STORAGE_KEYS.CLOUD_CONFIG, JSON.stringify(this.cloudConfig));
    return this.cloudConfig;
  }

  async loadEvents() {
    // 1. Check local server
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const events = await res.json();
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
        return events;
      }
    } catch(e) {}

    // 2. Check localStorage
    const local = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (local) {
      try { return JSON.parse(local); } catch(e) {}
    }

    // 3. Fallback to static JSON file
    try {
      const res = await fetch('data/events.json');
      if (res.ok) {
        const staticEvents = await res.json();
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(staticEvents));
        return staticEvents;
      }
    } catch(e) {}

    return [];
  }

  async loadTeam() {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const team = await res.json();
        localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
        return team;
      }
    } catch(e) {}

    const local = localStorage.getItem(STORAGE_KEYS.TEAM);
    if (local) {
      try { return JSON.parse(local); } catch(e) {}
    }

    try {
      const res = await fetch('data/team.json');
      if (res.ok) {
        const staticTeam = await res.json();
        localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(staticTeam));
        return staticTeam;
      }
    } catch(e) {}

    return [];
  }

  async saveEvents(events) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    const syncResults = [];

    // Local server sync
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events)
      });
      if (res.ok) {
        syncResults.push('Saved to local data/events.json');
      }
    } catch (e) {}

    // Supabase or REST sync if configured
    if (this.cloudConfig.provider === 'supabase' && this.cloudConfig.supabaseUrl) {
      try {
        const res = await fetch(${this.cloudConfig.supabaseUrl.replace(/\/$/, '')}/rest/v1/events, {
          method: 'POST',
          headers: {
            'apikey': this.cloudConfig.supabaseAnonKey,
            'Authorization': 'Bearer ' + this.cloudConfig.supabaseAnonKey,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(events)
        });
        if (res.ok) syncResults.push('Synced with Supabase Cloud');
      } catch(e) {}
    } else if (this.cloudConfig.provider === 'rest_api' && this.cloudConfig.restEndpoint) {
      try {
        const res = await fetch(this.cloudConfig.restEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });
        if (res.ok) syncResults.push('Synced with Remote Cloud API');
      } catch(e) {}
    }

    this.cloudConfig.lastSynced = new Date().toISOString();
    this.saveCloudConfig(this.cloudConfig);

    return {
      success: true,
      timestamp: new Date().toLocaleTimeString(),
      targets: syncResults.length > 0 ? syncResults : ['Saved to browser storage']
    };
  }

  async saveTeam(team) {
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      });
    } catch (e) {}
    return { success: true, timestamp: new Date().toLocaleTimeString() };
  }

  async saveRegistration(regData) {
    const record = {
      id: 'reg_' + Date.now(),
      submittedAt: new Date().toISOString(),
      ...regData
    };
    const saved = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    const list = saved ? JSON.parse(saved) : [];
    list.push(record);
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(list));

    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch(e) {}
    return record;
  }

  async loadRegistrations() {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(data));
        return data;
      }
    } catch(e) {}
    const saved = localStorage.getItem(STORAGE_KEYS.REGISTRATIONS);
    return saved ? JSON.parse(saved) : [];
  }

  exportBackup(events, team) {
    const backup = {
      brand: 'ZenX Hyderabad',
      exportedAt: new Date().toISOString(),
      events: events,
      team: team,
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenx_data_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

window.zenxStorage = new CloudStorage();
