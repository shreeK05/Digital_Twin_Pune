import 'package:flutter/material.dart';

// ─────────────────────────────────────────────
//  Backend Configuration
// ─────────────────────────────────────────────
const String kBackendBase = 'https://pune-urban-shield-backend.onrender.com'; // Production (Render.com)
// For local dev with emulator: 'http://10.0.2.2:8000'
// For local dev with real device: 'http://YOUR_PC_IP:8000'

// ─────────────────────────────────────────────
//  Color Palette — Pune Urban Shield Design System
// ─────────────────────────────────────────────
const Color kBgDark    = Color(0xFF050B18);
const Color kBgCard    = Color(0xFF0D1B2E);
const Color kBgCard2   = Color(0xFF0A1525);
const Color kBgCard3   = Color(0xFF111E33);
const Color kBrand     = Color(0xFF1A6BFF);
const Color kBrandGlow = Color(0xFF4D8FFF);
const Color kCyan      = Color(0xFF00D4FF);
const Color kCritical  = Color(0xFFFF2D55);
const Color kHigh      = Color(0xFFFF6B00);
const Color kMedium    = Color(0xFFF5C518);
const Color kLow       = Color(0xFF00E676);
const Color kTextPri   = Color(0xFFE8F0FE);
const Color kTextSec   = Color(0xFF8BA3C7);
const Color kTextMuted = Color(0xFF4A6088);
const Color kBorder    = Color(0xFF1A2A40);
const Color kBorderBright = Color(0xFF243550);

// ─────────────────────────────────────────────
//  Emergency Contacts
// ─────────────────────────────────────────────
const List<Map<String, dynamic>> kEmergencyContacts = [
  {'name': 'PMC Control Room',     'number': '020-25506800', 'icon': '🏛️', 'type': 'Municipal'},
  {'name': 'PCMC Helpline',        'number': '020-27425100', 'icon': '🏢', 'type': 'Municipal'},
  {'name': 'PMC Disaster Cell',    'number': '1800-233-0011','icon': '⚠️', 'type': 'Emergency'},
  {'name': 'Pune Police',          'number': '100',          'icon': '🚔', 'type': 'Police'},
  {'name': 'Fire Brigade',         'number': '101',          'icon': '🚒', 'type': 'Fire'},
  {'name': 'Ambulance (PCMC)',     'number': '102',          'icon': '🚑', 'type': 'Medical'},
  {'name': 'NDRF Pune Unit',       'number': '9422601234',   'icon': '🛡️', 'type': 'Rescue'},
  {'name': 'National Disaster Mgmt','number': '1078',        'icon': '🆘', 'type': 'Emergency'},
];

// ─────────────────────────────────────────────
//  Safe Shelters — Real Pune Locations
// ─────────────────────────────────────────────
const List<Map<String, dynamic>> kSafeShelters = [
  {
    'name': 'Bal Gandharva Ranga Mandir',
    'area': 'Shivajinagar, PMC',
    'capacity': 500,
    'type': 'Community Hall',
    'lat': 18.5308, 'lng': 73.8474,
    'facilities': ['Water', 'Toilets', 'Medical Aid', 'Food'],
    'status': 'Available',
  },
  {
    'name': 'Pimpri Municipal School Ground',
    'area': 'Pimpri, PCMC',
    'capacity': 800,
    'type': 'Open Ground',
    'lat': 18.6275, 'lng': 73.7967,
    'facilities': ['Water', 'Toilets', 'Tents'],
    'status': 'Available',
  },
  {
    'name': 'Hutatma Ground',
    'area': 'Kasba Peth, PMC',
    'capacity': 1200,
    'type': 'Open Ground',
    'lat': 18.5178, 'lng': 73.8569,
    'facilities': ['Water', 'Toilets', 'Food', 'Medical Aid', 'Power Backup'],
    'status': 'Available',
  },
  {
    'name': 'PCMC General Hospital',
    'area': 'Yamunanagar, Nigdi',
    'capacity': 200,
    'type': 'Hospital Campus',
    'lat': 18.6624, 'lng': 73.7754,
    'facilities': ['Medical Aid', 'Water', 'Food', 'Emergency Care'],
    'status': 'Available',
  },
  {
    'name': 'MIT College Ground',
    'area': 'Kothrud, PMC',
    'capacity': 600,
    'type': 'College Ground',
    'lat': 18.5074, 'lng': 73.8077,
    'facilities': ['Water', 'Toilets', 'Medical Aid'],
    'status': 'Available',
  },
  {
    'name': 'CIDCO Exhibition Ground',
    'area': 'Bhosari, PCMC',
    'capacity': 2000,
    'type': 'Exhibition Hall',
    'lat': 18.6400, 'lng': 73.8600,
    'facilities': ['Water', 'Toilets', 'Food', 'Medical Aid', 'Power Backup', 'WiFi'],
    'status': 'Available',
  },
];

// ─────────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────────
Color riskColor(String risk) {
  switch (risk.toUpperCase()) {
    case 'CRITICAL': return kCritical;
    case 'HIGH':     return kHigh;
    case 'MEDIUM':   return kMedium;
    case 'LOW':      return kLow;
    default:         return kTextSec;
  }
}

String riskEmoji(String risk) {
  switch (risk.toUpperCase()) {
    case 'CRITICAL': return '🔴';
    case 'HIGH':     return '🟠';
    case 'MEDIUM':   return '🟡';
    case 'LOW':      return '🟢';
    default:         return '⚪';
  }
}
