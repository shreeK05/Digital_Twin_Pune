import { create } from 'zustand';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://pune-urban-shield-backend.onrender.com';

export const useStore = create((set, get) => ({
  // ── Active Page
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  // ── Authority Filter
  activeAuthority: 'ALL', // ALL | PMC | PCMC
  setActiveAuthority: (auth) => set({ activeAuthority: auth }),

  // ── Live Data
  weather: null,
  liveData: null,
  kpis: null,
  wards: [],
  floodNodes: [],
  roads: [],
  alerts: [],

  // ── Simulation State
  simRainfall: 0,
  simTraffic: 0,
  closedRoads: [],
  simRunning: false,
  floodResult: null,
  trafficResult: null,

  // ── Real-street routing state
  routes: [],
  routingReady: false,
  routesLoading: false,

  // ── WebSocket
  wsConnected: false,

  // ── Setters
  setSimRainfall: (v) => set({ simRainfall: v }),
  setSimTraffic: (v) => set({ simTraffic: v }),
  toggleClosedRoad: (id) => {
    const { closedRoads } = get();
    set({
      closedRoads: closedRoads.includes(id)
        ? closedRoads.filter((r) => r !== id)
        : [...closedRoads, id],
    });
  },

  // ── Fetch Actions
  fetchWeather: async () => {
    try {
      const r = await axios.get(`${API}/api/weather/live`);
      set({ weather: r.data });
    } catch {}
  },

  fetchKpis: async () => {
    try {
      const r = await axios.get(`${API}/api/analytics/dashboard`);
      set({ kpis: r.data });
    } catch {}
  },

  fetchWards: async () => {
    try {
      const r = await axios.get(`${API}/api/map/wards`);
      set({ wards: r.data.wards });
    } catch {}
  },

  fetchFloodNodes: async () => {
    try {
      const r = await axios.get(`${API}/api/map/flood-nodes`);
      set({ floodNodes: r.data.nodes });
    } catch {}
  },

  fetchRoads: async () => {
    try {
      const r = await axios.get(`${API}/api/map/roads`);
      set({ roads: r.data.roads });
    } catch {}
  },

  fetchAlerts: async () => {
    try {
      const r = await axios.get(`${API}/api/alerts/active`);
      set({ alerts: r.data.alerts });
    } catch {}
  },

  // ── Simulation Runners
  // suppressAlerts=true → backend skips alert generation (used for debounce auto-runs)
  runFloodSim: async (suppressAlerts = false) => {
    const { simRainfall, simTraffic, closedRoads } = get();
    set({ simRunning: true });
    try {
      const qs = suppressAlerts ? '?suppress_alerts=true' : '';
      const r = await axios.post(`${API}/api/simulate/flood${qs}`, {
        rainfall_percent: simRainfall,
        traffic_surge_percent: simTraffic,
        closed_road_ids: closedRoads,
      });
      set({ floodResult: r.data });
      if (!suppressAlerts) await get().fetchAlerts();
      await get().fetchRoutes(r.data, get().trafficResult);
    } catch {}
    set({ simRunning: false });
  },

  runTrafficSim: async (suppressAlerts = false) => {
    const { simRainfall, simTraffic, closedRoads } = get();
    set({ simRunning: true });
    try {
      const qs = suppressAlerts ? '?suppress_alerts=true' : '';
      const r = await axios.post(`${API}/api/simulate/traffic${qs}`, {
        rainfall_percent: simRainfall,
        traffic_surge_percent: simTraffic,
        closed_road_ids: closedRoads,
      });
      set({ trafficResult: r.data });
      await get().fetchRoutes(get().floodResult, r.data);
    } catch {}
    set({ simRunning: false });
  },

  runCombinedSim: async (suppressAlerts = false) => {
    const { simRainfall, simTraffic, closedRoads } = get();
    set({ simRunning: true, floodResult: null, trafficResult: null });
    try {
      const qs = suppressAlerts ? '?suppress_alerts=true' : '';
      const r = await axios.post(`${API}/api/simulate/combined${qs}`, {
        rainfall_percent: simRainfall,
        traffic_surge_percent: simTraffic,
        closed_road_ids: closedRoads,
      });
      set({ floodResult: r.data.flood, trafficResult: r.data.traffic });
      if (!suppressAlerts) await get().fetchAlerts();
      await get().fetchKpis();
      await get().fetchRoutes(r.data.flood, r.data.traffic);
    } catch {}
    set({ simRunning: false });
  },

  resetSim: () => set({ floodResult: null, trafficResult: null, simRainfall: 0, simTraffic: 0, closedRoads: [], routes: [] }),

  // ── Street Routing (Corridor-based, always ready)
  fetchRoutes: async (floodResult, trafficResult) => {
    set({ routesLoading: true, routingReady: true });
    try {
      // Build flooded nodes from simulation results (field is 'results' not 'affected_nodes')
      const floodedNodes = (floodResult?.results || []).map(n => ({
        lat: n.lat, lng: n.lng, risk_level: n.risk_level,
      }));
      const r = await axios.post(`${API}/api/routing/all-routes`, {
        flooded_nodes:   floodedNodes,
        traffic_results: trafficResult?.results || [],
      });
      if (r.data?.routes) set({ routes: r.data.routes, routingReady: true });
    } catch {}
    set({ routesLoading: false });
  },

  // ── Alert Broadcast
  broadcastAlert: async (payload) => {
    try {
      await axios.post(`${API}/api/alerts/broadcast`, payload);
      await get().fetchAlerts();
      return true;
    } catch { return false; }
  },

  acknowledgeAlert: async (id) => {
    try {
      await axios.put(`${API}/api/alerts/${id}/acknowledge`);
      await get().fetchAlerts();
    } catch {}
  },

  // ── Init
  initApp: async () => {
    const { fetchWeather, fetchKpis, fetchWards, fetchFloodNodes, fetchRoads, fetchAlerts } = get();
    await Promise.all([fetchWeather(), fetchKpis(), fetchWards(), fetchFloodNodes(), fetchRoads(), fetchAlerts()]);

    // WebSocket live feed
    try {
      const wsUrl = API.replace('https://', 'wss://').replace('http://', 'ws://');
      const ws = new WebSocket(`${wsUrl}/ws/live-feed`);
      ws.onopen = () => set({ wsConnected: true });
      ws.onclose = () => set({ wsConnected: false });
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'LIVE_UPDATE') {
          set({ liveData: msg, weather: msg.weather });
        }
        if (msg.type === 'NEW_ALERT') {
          get().fetchAlerts();
        }
      };
    } catch {}

    // Refresh KPIs every 30s
    setInterval(() => {
      get().fetchKpis();
      get().fetchAlerts();
    }, 30000);

    // Load routes immediately on startup (no simulation needed)
    get().fetchRoutes(null, null);
  },
}));
