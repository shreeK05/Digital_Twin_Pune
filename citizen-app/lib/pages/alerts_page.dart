import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../config.dart';
import '../widgets/shared_widgets.dart';

// ─────────────────────────────────────────────
//  Alerts Feed Page
// ─────────────────────────────────────────────
class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> with SingleTickerProviderStateMixin {
  List<dynamic> _alerts = [];
  bool _loading = true;
  String _filter = 'ALL';
  Timer? _refreshTimer;
  late AnimationController _refreshAnim;

  @override
  void initState() {
    super.initState();
    _refreshAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _fetchAlerts();
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) => _fetchAlerts());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _refreshAnim.dispose();
    super.dispose();
  }

  Future<void> _fetchAlerts() async {
    _refreshAnim.forward(from: 0);
    try {
      final res = await http
          .get(Uri.parse('$kBackendBase/api/alerts/active'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) setState(() { _alerts = data['alerts'] ?? []; _loading = false; });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> get _filteredAlerts {
    if (_filter == 'ALL') return _alerts;
    return _alerts.where((a) => a['severity'] == _filter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final critical = _alerts.where((a) => a['severity'] == 'CRITICAL' && a['acknowledged'] != true).length;

    return Column(children: [
      PusAppBar(
        title: 'Alerts Center',
        subtitle: 'Real-time incident feed — PMC & PCMC',
        actions: [
          RotationTransition(
            turns: _refreshAnim,
            child: GestureDetector(
              onTap: _fetchAlerts,
              child: const Icon(Icons.refresh, color: kTextSec, size: 22),
            ),
          ),
        ],
      ),

      // Critical banner
      if (!_loading && critical > 0)
        Container(
          margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: kCritical.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kCritical.withOpacity(0.4), width: 1),
          ),
          child: Row(children: [
            const LiveDot(color: kCritical),
            const SizedBox(width: 10),
            Expanded(child: Text(
              '$critical unacknowledged critical alert${critical > 1 ? 's' : ''} active',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kCritical),
            )),
            const Icon(Icons.chevron_right, color: kCritical, size: 18),
          ]),
        ),

      // Filter chips
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((f) {
            final selected = _filter == f;
            final color = f == 'ALL' ? kBrand : riskColor(f);
            final count = f == 'ALL' ? _alerts.length : _alerts.where((a) => a['severity'] == f).length;
            return GestureDetector(
              onTap: () => setState(() => _filter = f),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: selected ? color.withOpacity(0.18) : kBgCard,
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: selected ? color.withOpacity(0.6) : kBorder, width: 1),
                ),
                child: Row(children: [
                  Text(f, style: GoogleFonts.inter(
                    fontSize: 11, fontWeight: FontWeight.w700, color: selected ? color : kTextSec)),
                  if (count > 0) ...[
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: color.withOpacity(selected ? 0.2 : 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('$count', style: GoogleFonts.inter(
                        fontSize: 9, fontWeight: FontWeight.w800, color: color)),
                    ),
                  ],
                ]),
              ),
            );
          }).toList()),
        ),
      ),

      // Alert list
      Expanded(
        child: _loading
          ? const Center(child: CircularProgressIndicator(color: kBrand, strokeWidth: 2))
          : _filteredAlerts.isEmpty
            ? EmptyState(
                emoji: '✅',
                title: _filter == 'ALL' ? 'No Active Alerts' : 'No $_filter Alerts',
                subtitle: _filter == 'ALL'
                  ? 'Your area is safe right now.\nPull down to refresh.'
                  : 'No alerts at this severity level.',
                onRefresh: _fetchAlerts,
              )
            : RefreshIndicator(
                color: kBrand,
                onRefresh: _fetchAlerts,
                child: ListView.builder(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: _filteredAlerts.length,
                  itemBuilder: (ctx, i) => _AlertCard(
                    alert: _filteredAlerts[i],
                    index: i,
                  ),
                ),
              ),
      ),
    ]);
  }
}

class _AlertCard extends StatelessWidget {
  final Map<String, dynamic> alert;
  final int index;
  const _AlertCard({required this.alert, required this.index});

  @override
  Widget build(BuildContext context) {
    final severity = alert['severity'] ?? 'LOW';
    final color = riskColor(severity);
    final acked = alert['acknowledged'] == true;
    final ts = alert['timestamp'] != null
      ? DateFormat('dd MMM, HH:mm').format(DateTime.parse(alert['timestamp']).toLocal())
      : '';
    final isAuto = alert['auto_generated'] == true;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 200 + index * 60),
      builder: (ctx, val, child) => Opacity(
        opacity: val,
        child: Transform.translate(offset: Offset(0, 20 * (1 - val)), child: child),
      ),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: kBgCard,
          borderRadius: BorderRadius.circular(16),
          border: Border(left: BorderSide(color: color, width: 3)),
          boxShadow: [BoxShadow(color: color.withOpacity(0.06), blurRadius: 12)],
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              RiskBadge(risk: severity),
              const SizedBox(width: 8),
              if (isAuto)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: kBrand.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: kBrand.withOpacity(0.3)),
                  ),
                  child: Text('AUTO', style: GoogleFonts.inter(
                    fontSize: 8, fontWeight: FontWeight.w700, color: kBrand)),
                ),
              const Spacer(),
              if (acked)
                Row(children: [
                  Icon(Icons.check_circle, size: 14, color: kLow),
                  const SizedBox(width: 4),
                  Text('Acknowledged', style: GoogleFonts.inter(fontSize: 9, color: kLow)),
                ]),
            ]),
            const SizedBox(height: 10),
            Text(alert['title'] ?? 'Alert',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: kTextPri)),
            const SizedBox(height: 6),
            Text(alert['message'] ?? '',
              style: GoogleFonts.inter(fontSize: 12, color: kTextSec, height: 1.6)),
            const SizedBox(height: 12),
            // Progress indicator for critical alerts
            if (severity == 'CRITICAL' && !acked) ...[
              Container(
                height: 2,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [kCritical, kCritical.withOpacity(0.1)]),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
              const SizedBox(height: 10),
            ],
            Row(children: [
              Icon(Icons.location_on_outlined, size: 13, color: kTextMuted),
              const SizedBox(width: 4),
              Expanded(child: Text(alert['area'] ?? '',
                style: GoogleFonts.inter(fontSize: 11, color: kTextMuted),
                maxLines: 1, overflow: TextOverflow.ellipsis)),
              const SizedBox(width: 8),
              Icon(Icons.access_time, size: 12, color: kTextMuted),
              const SizedBox(width: 3),
              Text(ts, style: GoogleFonts.inter(fontSize: 10, color: kTextMuted)),
            ]),
          ]),
        ),
      ),
    );
  }
}
