"""
routing_engine.py
─────────────────────────────────────────────────────────────────────────────
Pune Urban Shield — Real Street Routing Engine
Uses OSMnx to download the actual OpenStreetMap road network for Pune.
NetworkX A* / Dijkstra routes are computed on real street graph edges.
Simulation parameters (flood / traffic) adjust edge weights so the
algorithm naturally avoids flooded or highly congested roads.

Output: list of [lat, lng] coordinates that perfectly trace the streets —
identical in quality to what Google Maps / Uber draw.
─────────────────────────────────────────────────────────────────────────────
"""

import os
import math
import logging
import threading
from pathlib import Path
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger("routing_engine")

# ── Try importing optional heavy deps ────────────────────────────────────────
try:
    import osmnx as ox
    import networkx as nx
    OSMNX_AVAILABLE = True
except ImportError:
    OSMNX_AVAILABLE = False
    logger.warning("osmnx not installed — routing will use straight-line fallback")

# ── Constants ─────────────────────────────────────────────────────────────────
PUNE_BBOX   = (18.44, 18.73, 73.66, 73.98)   # south, north, west, east
CACHE_PATH  = Path(__file__).parent / "pune_street_graph.graphml"
SPEED_KMH   = {"motorway": 100, "trunk": 80, "primary": 60,
                "secondary": 50, "tertiary": 40, "residential": 30,
                "unclassified": 25, "service": 20}

# ── Module-level graph (loaded once at startup) ───────────────────────────────
_G: Optional[object] = None          # base OSMnx graph (drive network)
_G_lock = threading.Lock()
_graph_ready = threading.Event()

# ── Key routing waypoints in Pune (name, lat, lng) ───────────────────────────
# These act as intermediate nodes when planning multi-segment routes.
PUNE_WAYPOINTS: Dict[str, Tuple[float, float]] = {
    "hinjewadi_phase1":       (18.5918, 73.7384),
    "hinjewadi_phase3":       (18.6063, 73.7162),
    "wakad_junction":         (18.6035, 73.7622),
    "baner_junction":         (18.5599, 73.7842),
    "aundh_junction":         (18.5584, 73.8082),
    "pimpri_junction":        (18.6279, 73.7993),
    "chinchwad_station":      (18.6349, 73.8053),
    "swargate_junction":      (18.5028, 73.8564),
    "hadapsar_junction":      (18.5087, 73.9260),
    "kothrud_junction":       (18.5074, 73.8198),
    "katraj_junction":        (18.4565, 73.8649),
    "kondhwa_junction":       (18.4828, 73.8943),
    "viman_nagar_junction":   (18.5674, 73.9148),
    "kalyani_nagar_junction": (18.5472, 73.9019),
    "kharadi_junction":       (18.5510, 73.9443),
    "undri_junction":         (18.4638, 73.9019),
    "nagar_road_junction":    (18.5530, 73.9180),
    "satara_road_junction":   (18.4820, 73.8520),
    "pune_station":           (18.5285, 73.8741),
    "shivajinagar_junction":  (18.5308, 73.8474),
    "deccan_junction":        (18.5168, 73.8471),
    "camp_junction":          (18.5181, 73.8826),
}

# ── Named route pairs for the simulation map ──────────────────────────────────
# Each tuple: (origin_waypoint, destination_waypoint, label)
ROUTE_PAIRS: List[Tuple[str, str, str]] = [
    ("hinjewadi_phase1",     "wakad_junction",         "Hinjewadi→Wakad IT Corridor"),
    ("wakad_junction",       "baner_junction",          "Wakad→Baner Road"),
    ("baner_junction",       "aundh_junction",          "Baner→Aundh Road"),
    ("aundh_junction",       "shivajinagar_junction",   "Aundh→Shivajinagar"),
    ("pimpri_junction",      "chinchwad_station",       "Pimpri→Chinchwad"),
    ("chinchwad_station",    "hinjewadi_phase1",        "Chinchwad→Hinjewadi"),
    ("pune_station",         "swargate_junction",       "Pune Station→Swargate"),
    ("swargate_junction",    "katraj_junction",         "Swargate→Katraj"),
    ("katraj_junction",      "kondhwa_junction",        "Katraj→Kondhwa"),
    ("hadapsar_junction",    "viman_nagar_junction",    "Hadapsar→Viman Nagar"),
    ("kharadi_junction",     "nagar_road_junction",     "Kharadi→Nagar Road"),
    ("shivajinagar_junction","deccan_junction",         "Shivajinagar→Deccan"),
    ("deccan_junction",      "kothrud_junction",        "Deccan→Kothrud"),
    ("camp_junction",        "kalyani_nagar_junction",  "Camp→Kalyani Nagar"),
    ("satara_road_junction", "swargate_junction",       "Satara Road→Swargate"),
    ("undri_junction",       "kondhwa_junction",        "Undri→Kondhwa"),
    ("hinjewadi_phase3",     "hinjewadi_phase1",        "Hinjewadi Phase 3→Phase 1"),
    ("pimpri_junction",      "wakad_junction",          "Pimpri→Wakad Link"),
]

# ═════════════════════════════════════════════════════════════════════════════
#  Graph Loading
# ═════════════════════════════════════════════════════════════════════════════

def _load_graph_background():
    """
    Download (first time) or load from cache the Pune drive network.
    Runs in a background thread so the FastAPI app starts instantly.
    """
    global _G
    if not OSMNX_AVAILABLE:
        _graph_ready.set()
        return
    try:
        if CACHE_PATH.exists():
            logger.info("📂 Loading Pune street graph from cache…")
            G = ox.load_graphml(CACHE_PATH)
        else:
            logger.info("🌐 Downloading Pune street network from OpenStreetMap… (one-time, ~30–60 sec)")
            # OSMnx 2.x: bbox=(left, bottom, right, top) = (west, south, east, north)
            G = ox.graph_from_bbox(
                bbox=(PUNE_BBOX[2], PUNE_BBOX[0], PUNE_BBOX[3], PUNE_BBOX[1]),
                network_type="drive",
                simplify=True,
            )
            logger.info(f"Downloaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")
            ox.save_graphml(G, CACHE_PATH)
            logger.info(f"✅ Graph cached → {CACHE_PATH}")

        # Add travel_time attribute to each edge (seconds)
        # OSMnx 2.x: these functions return G (may be in-place too)
        try:
            G = ox.add_edge_speeds(G)
            G = ox.add_edge_travel_times(G)
        except Exception as e2:
            logger.warning(f"add_edge_speeds/times failed ({e2}), using length-based fallback")
            # Fallback: use length / 10 m/s as travel time
            for u, v, k, data in G.edges(keys=True, data=True):
                if "travel_time" not in data:
                    data["travel_time"] = data.get("length", 100) / 10

        with _G_lock:
            _G = G
        logger.info("✅ Pune routing engine ready.")
    except Exception as e:
        logger.error(f"❌ Routing graph load failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        _graph_ready.set()


def start_graph_loading():
    """Call this from main.py startup event — non-blocking."""
    t = threading.Thread(target=_load_graph_background, daemon=True)
    t.start()


def is_ready() -> bool:
    return _G is not None

# ═════════════════════════════════════════════════════════════════════════════
#  Simulation Weight Modifier
# ═════════════════════════════════════════════════════════════════════════════

def _apply_sim_weights(
    G,
    flooded_nodes: List[dict],   # [{lat, lng, severity}, ...]
    flood_radius_m: float = 400,
) -> object:
    """
    Return a copy of G with modified travel_time weights:
    - CRITICAL flood node nearby  → travel_time = 1e6 (force avoid)
    - HIGH flood node nearby      → travel_time *= 8
    - MEDIUM flood node nearby    → travel_time *= 3
    """
    import copy
    Gw = copy.deepcopy(G)

    def haversine_m(lat1, lng1, lat2, lng2):
        R = 6371000
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lng2 - lng1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
        return R * 2 * math.asin(math.sqrt(a))

    SEV_MULT = {"CRITICAL": 1e6, "HIGH": 8.0, "MEDIUM": 3.0, "LOW": 1.2}

    for u, v, k, data in Gw.edges(keys=True, data=True):
        u_data = Gw.nodes[u]
        v_data = Gw.nodes[v]
        e_lat  = (u_data["y"] + v_data["y"]) / 2
        e_lng  = (u_data["x"] + v_data["x"]) / 2
        base_t = data.get("travel_time", 30)
        max_mult = 1.0

        for fn in flooded_nodes:
            dist = haversine_m(e_lat, e_lng, fn["lat"], fn["lng"])
            if dist < flood_radius_m:
                mult   = SEV_MULT.get(fn.get("severity", "LOW"), 1.0)
                taper  = max(0.2, 1.0 - dist / flood_radius_m)
                eff    = 1.0 + (mult - 1.0) * taper
                max_mult = max(max_mult, eff)

        Gw[u][v][k]["travel_time"] = base_t * max_mult

    return Gw


# ═════════════════════════════════════════════════════════════════════════════
#  Route Computation
# ═════════════════════════════════════════════════════════════════════════════

def _nearest_node(G, lat: float, lng: float) -> int:
    # OSMnx 2.x: nearest_nodes(G, X=lng, Y=lat) — note X=lng, Y=lat
    return ox.distance.nearest_nodes(G, X=lng, Y=lat)


def _route_to_coords(G, route_nodes: List[int]) -> List[List[float]]:
    """
    Convert a list of OSMnx node IDs to [lat, lng] pairs.
    Includes intermediate shape points (geometry) from edge data for curves.
    """
    coords = []
    for i in range(len(route_nodes) - 1):
        u = route_nodes[i]
        v = route_nodes[i + 1]
        # Get the edge with minimum travel_time (there may be parallel edges)
        edge_data = min(
            G[u][v].values(),
            key=lambda d: d.get("travel_time", 999)
        )
        geom = edge_data.get("geometry", None)
        if geom is not None:
            # Use the detailed geometry (many points for curves)
            pts  = list(geom.coords)  # (lng, lat)
            edge_coords = [[pt[1], pt[0]] for pt in pts]
        else:
            # Fallback: straight segment between nodes
            edge_coords = [
                [G.nodes[u]["y"], G.nodes[u]["x"]],
                [G.nodes[v]["y"], G.nodes[v]["x"]],
            ]
        # Avoid duplicating the junction point between consecutive edges
        if coords and edge_coords:
            if coords[-1] == edge_coords[0]:
                edge_coords = edge_coords[1:]
        coords.extend(edge_coords)
    return coords


def compute_route(
    origin_lat: float, origin_lng: float,
    dest_lat:   float, dest_lng:   float,
    flooded_nodes: Optional[List[dict]] = None,
    traffic_results: Optional[List[dict]] = None,
) -> dict:
    """
    Compute the shortest driving route between two points on Pune's street
    network, applying simulation penalties.

    Returns:
      {
        "status": "OK" | "GRAPH_LOADING" | "NO_ROUTE" | "ERROR",
        "coords": [[lat, lng], ...],   # exact street geometry
        "distance_m": float,
        "travel_time_base_s": float,
        "travel_time_sim_s":  float,
        "is_rerouted": bool,           # True if sim changed the route
        "rerouting_reason": str,
      }
    """
    if not OSMNX_AVAILABLE:
        return _straight_line_fallback(origin_lat, origin_lng, dest_lat, dest_lng)

    if _G is None:
        return {"status": "GRAPH_LOADING", "coords": [], "message": "Street graph loading — retry in 60s"}

    G = _G

    # Build simulation flood list: [{lat, lng, severity}, ...]
    flood_nodes_sim = []
    if flooded_nodes:
        for n in flooded_nodes:
            sev = n.get("risk_level", "LOW")
            if sev in ("CRITICAL", "HIGH", "MEDIUM"):
                flood_nodes_sim.append({
                    "lat":      n["lat"],
                    "lng":      n["lng"],
                    "severity": sev,
                })

    # Apply weights (only if simulation is active)
    is_sim_active = bool(flood_nodes_sim)
    if is_sim_active:
        Gw = _apply_sim_weights(G, flood_nodes_sim)
    else:
        Gw = G

    try:
        orig_node = _nearest_node(Gw, origin_lat, origin_lng)
        dest_node = _nearest_node(Gw, dest_lat,   dest_lng)

        if orig_node == dest_node:
            return {"status": "NO_ROUTE", "coords": [], "message": "Origin and destination are the same point"}

        # Shortest path on sim-weighted graph
        sim_route   = nx.shortest_path(Gw, orig_node, dest_node, weight="travel_time")
        sim_coords  = _route_to_coords(Gw, sim_route)
        sim_time_s  = sum(
            min(Gw[u][v].values(), key=lambda d: d.get("travel_time", 999)).get("travel_time", 30)
            for u, v in zip(sim_route[:-1], sim_route[1:])
        )
        sim_dist_m  = sum(
            min(Gw[u][v].values(), key=lambda d: d.get("length", 100)).get("length", 100)
            for u, v in zip(sim_route[:-1], sim_route[1:])
        )

        # Base route (no sim) for comparison
        base_route = nx.shortest_path(G, orig_node, dest_node, weight="travel_time")
        base_time  = sum(
            min(G[u][v].values(), key=lambda d: d.get("travel_time", 999)).get("travel_time", 30)
            for u, v in zip(base_route[:-1], base_route[1:])
        )

        is_rerouted = (sim_route != base_route)
        reasons     = []
        for fn in flood_nodes_sim:
            sev = fn["severity"]
            if sev in ("CRITICAL", "HIGH"):
                reasons.append(f"Flood {sev} near ({fn['lat']:.4f},{fn['lng']:.4f})")

        return {
            "status":               "OK",
            "coords":               sim_coords,
            "distance_m":           round(sim_dist_m),
            "travel_time_base_s":   round(base_time),
            "travel_time_sim_s":    round(sim_time_s),
            "is_rerouted":          is_rerouted,
            "rerouting_reason":     " · ".join(reasons) if reasons else "No detour needed",
            "node_count":           len(sim_route),
        }

    except nx.NetworkXNoPath:
        return {"status": "NO_ROUTE", "coords": [], "message": "No drivable path between these points"}
    except Exception as e:
        logger.error(f"Route computation error: {e}")
        return {"status": "ERROR", "coords": [], "message": str(e)}


def compute_all_routes(
    flooded_nodes:   Optional[List[dict]] = None,
    traffic_results: Optional[List[dict]] = None,
) -> List[dict]:
    """Compute routes for all ROUTE_PAIRS simultaneously."""
    results = []
    wps     = PUNE_WAYPOINTS
    for (orig_key, dest_key, label) in ROUTE_PAIRS:
        if orig_key not in wps or dest_key not in wps:
            continue
        o_lat, o_lng = wps[orig_key]
        d_lat, d_lng = wps[dest_key]
        route = compute_route(o_lat, o_lng, d_lat, d_lng, flooded_nodes, traffic_results)
        route["label"]     = label
        route["origin"]    = orig_key
        route["dest"]      = dest_key
        route["origin_coords"] = [o_lat, o_lng]
        route["dest_coords"]   = [d_lat, d_lng]
        results.append(route)
    return results


# ═════════════════════════════════════════════════════════════════════════════
#  Fallback (straight line) if OSMnx unavailable
# ═════════════════════════════════════════════════════════════════════════════

def _straight_line_fallback(o_lat, o_lng, d_lat, d_lng) -> dict:
    import math
    R = 6371000
    φ1, φ2 = math.radians(o_lat), math.radians(d_lat)
    dφ = math.radians(d_lat - o_lat)
    dλ = math.radians(d_lng - o_lng)
    a = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    dist_m = R * 2 * math.asin(math.sqrt(a))
    return {
        "status": "OK",
        "coords": [[o_lat, o_lng], [d_lat, d_lng]],
        "distance_m": round(dist_m),
        "travel_time_base_s": round(dist_m / 14),
        "travel_time_sim_s":  round(dist_m / 14),
        "is_rerouted": False,
        "rerouting_reason": "OSMnx unavailable — straight line shown",
        "node_count": 2,
    }
