import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../config.dart';
import '../widgets/shared_widgets.dart';

// ─────────────────────────────────────────────
//  Risk Map Page — Ward Risk + Flood Zones
// ─────────────────────────────────────────────
class RiskMapPage extends StatefulWidget {
  const RiskMapPage({super.key});

  @override
  State<RiskMapPage> createState() => _RiskMapPageState();
}

class _RiskMapPageState extends State<RiskMapPage> with SingleTickerProviderStateMixin {
  List<dynamic> _wards = [];
  List<dynamic> _nodes = [];
  bool _loading = true;
  String _authorityFilter = 'ALL';
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _fetchData();
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _fetchData() async {
    try {
      final wRes = await http.get(Uri.parse('$kBackendBase/api/map/wards'))
          .timeout(const Duration(seconds: 8));
      final nRes = await http.get(Uri.parse('$kBackendBase/api/map/flood-nodes'))
          .timeout(const Duration(seconds: 8));
      if (wRes.statusCode == 200) {
        if (mounted) setState(() { _wards = jsonDecode(wRes.body)['wards'] ?? []; _loading = false; });
      }
      if (nRes.statusCode == 200) {
        if (mounted) setState(() => _nodes = jsonDecode(nRes.body)['nodes'] ?? []);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filteredWards {
    if (_authorityFilter == 'ALL') return _wards;
    return _wards.where((w) => w['authority'] == _authorityFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final critical = _wards.where((w) => w['risk'] == 'CRITICAL').length;
    final high     = _wards.where((w) => w['risk'] == 'HIGH').length;
    final medium   = _wards.where((w) => w['risk'] == 'MEDIUM').length;
    final low      = _wards.where((w) => w['risk'] == 'LOW').length;

    return Column(children: [
      PusAppBar(title: 'Risk Map', subtitle: '${_wards.length} wards monitored · PMC & PCMC Pune'),

      // Risk summary
      if (!_loading) Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        child: Row(children: [
          _RiskSummaryChip('CRITICAL', critical, kCritical),
          const SizedBox(width: 6),
          _RiskSummaryChip('HIGH', high, kHigh),
          const SizedBox(width: 6),
          _RiskSummaryChip('MEDIUM', medium, kMedium),
          const SizedBox(width: 6),
          _RiskSummaryChip('LOW', low, kLow),
        ]),
      ),

      // Tab bar
      Container(
        margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        decoration: BoxDecoration(
          color: kBgCard2,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: kBorder),
        ),
        child: TabBar(
          controller: _tabCtrl,
          labelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500),
          labelColor: kBrand,
          unselectedLabelColor: kTextSec,
          indicator: BoxDecoration(
            color: kBrand.withOpacity(0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: kBrand.withOpacity(0.3)),
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          tabs: const [
            Tab(text: 'All Wards'),
            Tab(text: 'Flood Zones'),
            Tab(text: 'Shelters'),
          ],
        ),
      ),
      const SizedBox(height: 8),

      // Authority filter (only on All Wards tab)
      if (!_loading) ListenableBuilder(
        listenable: _tabCtrl,
        builder: (ctx, _) {
          if (_tabCtrl.index != 0) return const SizedBox.shrink();
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
            child: Row(children: ['ALL', 'PMC', 'PCMC'].map((a) {
              final sel = _authorityFilter == a;
              final color = a == 'PMC' ? kBrand : a == 'PCMC' ? kCyan : kTextSec;
              return GestureDetector(
                onTap: () => setState(() => _authorityFilter = a),
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: sel ? color.withOpacity(0.12) : kBgCard,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: sel ? color.withOpacity(0.5) : kBorder),
                  ),
                  child: Text(a, style: GoogleFonts.inter(
                    fontSize: 11, fontWeight: FontWeight.w700, color: sel ? color : kTextSec)),
                ),
              );
            }).toList()),
          );
        },
      ),

      Expanded(
        child: _loading
          ? const Center(child: CircularProgressIndicator(color: kBrand, strokeWidth: 2))
          : TabBarView(
            controller: _tabCtrl,
            children: [
              // Ward list
              RefreshIndicator(
                color: kBrand,
                onRefresh: _fetchData,
                child: ListView.builder(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: _filteredWards.length,
                  itemBuilder: (ctx, i) => _WardCard(ward: _filteredWards[i]),
                ),
              ),

              // Flood zones
              RefreshIndicator(
                color: kBrand,
                onRefresh: _fetchData,
                child: _nodes.isEmpty
                  ? const EmptyState(emoji: '🌊', title: 'No Flood Data', subtitle: 'Flood zone data unavailable.')
                  : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(0, 4, 0, 24),
                    itemCount: _nodes.length,
                    itemBuilder: (ctx, i) => _FloodNodeCard(node: _nodes[i]),
                  ),
              ),

              // Safe shelters
              ListView.builder(
                padding: const EdgeInsets.fromLTRB(0, 4, 0, 24),
                itemCount: kSafeShelters.length,
                itemBuilder: (ctx, i) => _ShelterCard(shelter: kSafeShelters[i]),
              ),
            ],
          ),
      ),
    ]);
  }
}

// ─── Ward Card ───────────────────────────────
class _WardCard extends StatelessWidget {
  final Map<String, dynamic> ward;
  const _WardCard({required this.ward});

  @override
  Widget build(BuildContext context) {
    final risk = ward['risk'] ?? 'LOW';
    final color = riskColor(risk);
    final isPMC = ward['authority'] == 'PMC';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: color, width: 3)),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(ward['name'] ?? '',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: kTextPri)),
          const SizedBox(height: 5),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: (isPMC ? kBrand : kCyan).withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: (isPMC ? kBrand : kCyan).withOpacity(0.3)),
              ),
              child: Text(ward['authority'] ?? '',
                style: GoogleFonts.inter(
                  fontSize: 9, fontWeight: FontWeight.w800,
                  color: isPMC ? kBrand : kCyan)),
            ),
            const SizedBox(width: 8),
            Text('👥 ${NumberFormat.compact().format(ward['population'])}',
              style: GoogleFonts.inter(fontSize: 10, color: kTextMuted)),
          ]),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          RiskBadge(risk: risk),
          const SizedBox(height: 5),
          Text(riskEmoji(risk), style: const TextStyle(fontSize: 18)),
        ]),
      ]),
    );
  }
}

// ─── Flood Node Card ─────────────────────────
class _FloodNodeCard extends StatelessWidget {
  final Map<String, dynamic> node;
  const _FloodNodeCard({required this.node});

  @override
  Widget build(BuildContext context) {
    final risk = (node['base_risk'] as num).toDouble();
    final color = risk > 0.8 ? kCritical : risk > 0.65 ? kHigh : risk > 0.5 ? kMedium : kLow;
    final riskPct = (risk * 100).round();

    return GlassCard(
      borderColor: color.withOpacity(0.3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(node['name'] ?? '',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: kTextPri)),
            const SizedBox(height: 3),
            Text('Elevation: ${node['elevation_m']} m · Drain: ${node['drainage_capacity_mm']} mm/hr',
              style: GoogleFonts.inter(fontSize: 10, color: kTextMuted)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('$riskPct%', style: GoogleFonts.inter(
              fontSize: 24, fontWeight: FontWeight.w900, color: color)),
            Text('RISK', style: GoogleFonts.inter(fontSize: 9, color: color, fontWeight: FontWeight.w700)),
          ]),
        ]),
        const SizedBox(height: 12),
        // Risk progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: risk,
            backgroundColor: color.withOpacity(0.1),
            valueColor: AlwaysStoppedAnimation(color),
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 8),
        Row(children: [
          _NodeStat('Lat', '${node['lat']}'),
          _NodeStat('Lng', '${node['lng']}'),
          _NodeStat('ID', node['id'] ?? ''),
        ]),
      ]),
    );
  }
}

class _NodeStat extends StatelessWidget {
  final String label;
  final String value;
  const _NodeStat(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Column(children: [
      Text(value, style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: kTextSec)),
      Text(label, style: GoogleFonts.inter(fontSize: 8, color: kTextMuted)),
    ]));
  }
}

// ─── Shelter Card ────────────────────────────
class _ShelterCard extends StatelessWidget {
  final Map<String, dynamic> shelter;
  const _ShelterCard({required this.shelter});

  @override
  Widget build(BuildContext context) {
    final isAvail = shelter['status'] == 'Available';
    return GlassCard(
      borderColor: isAvail ? kLow.withOpacity(0.3) : kHigh.withOpacity(0.3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(shelter['name'] ?? '',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: kTextPri)),
            const SizedBox(height: 3),
            Text(shelter['area'] ?? '',
              style: GoogleFonts.inter(fontSize: 11, color: kTextMuted)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (isAvail ? kLow : kHigh).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: (isAvail ? kLow : kHigh).withOpacity(0.4)),
              ),
              child: Text(shelter['status'] ?? '',
                style: GoogleFonts.inter(
                  fontSize: 10, fontWeight: FontWeight.w700,
                  color: isAvail ? kLow : kHigh)),
            ),
            const SizedBox(height: 6),
            Text('👥 ${shelter['capacity']}', style: GoogleFonts.inter(fontSize: 11, color: kTextSec)),
          ]),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Text('🏷️', style: const TextStyle(fontSize: 12)),
          const SizedBox(width: 6),
          Text(shelter['type'] ?? '',
            style: GoogleFonts.inter(fontSize: 11, color: kTextSec)),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 6, runSpacing: 6,
          children: (shelter['facilities'] as List<dynamic>).map((f) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: kBgCard2,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: kBorderBright),
            ),
            child: Text(f.toString(), style: GoogleFonts.inter(fontSize: 9, color: kTextSec)),
          )).toList(),
        ),
      ]),
    );
  }
}

class _RiskSummaryChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _RiskSummaryChip(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.25), width: 1),
      ),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('$count', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900, color: color)),
        Text(label, style: GoogleFonts.inter(fontSize: 7, color: color, fontWeight: FontWeight.w700, letterSpacing: 0.2)),
      ]),
    ));
  }
}
