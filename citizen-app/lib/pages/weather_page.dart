import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../config.dart';
import '../widgets/shared_widgets.dart';

// ─────────────────────────────────────────────
//  Weather Page
// ─────────────────────────────────────────────
class WeatherPage extends StatefulWidget {
  const WeatherPage({super.key});

  @override
  State<WeatherPage> createState() => _WeatherPageState();
}

class _WeatherPageState extends State<WeatherPage> {
  Map<String, dynamic>? _weather;
  List<dynamic> _forecast = [];
  bool _loading = true;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchAll();
    _timer = Timer.periodic(const Duration(minutes: 2), (_) => _fetchAll());
  }

  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  Future<void> _fetchAll() async {
    try {
      final wRes = await http.get(Uri.parse('$kBackendBase/api/weather/live'))
          .timeout(const Duration(seconds: 8));
      final fRes = await http.get(Uri.parse('$kBackendBase/api/weather/forecast'))
          .timeout(const Duration(seconds: 8));
      if (wRes.statusCode == 200) {
        if (mounted) setState(() { _weather = jsonDecode(wRes.body); _loading = false; });
      }
      if (fRes.statusCode == 200) {
        final fData = jsonDecode(fRes.body);
        if (mounted) setState(() => _forecast = (fData['forecast_hours'] as List).take(24).toList());
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _weatherEmoji(String? condition) {
    if (condition == null) return '🌤️';
    final c = condition.toLowerCase();
    if (c.contains('thunder')) return '⛈️';
    if (c.contains('heavy rain') || c.contains('violent')) return '🌧️';
    if (c.contains('rain') || c.contains('shower') || c.contains('drizzle')) return '🌦️';
    if (c.contains('snow')) return '❄️';
    if (c.contains('fog')) return '🌫️';
    if (c.contains('cloud')) return '☁️';
    if (c.contains('clear')) return '☀️';
    return '🌤️';
  }

  Color _floodRiskColor(double rain) {
    if (rain > 30) return kCritical;
    if (rain > 20) return kHigh;
    if (rain > 10) return kMedium;
    return kLow;
  }

  @override
  Widget build(BuildContext context) {
    final w = _weather;
    final isReal = w?['is_real_data'] == true;
    final rain = (w?['rainfall_mm_hr'] ?? 0.0) as num;

    return Column(children: [
      PusAppBar(title: 'Live Weather', subtitle: 'Pune — Open-Meteo · WMO Real-Time Data'),
      Expanded(
        child: _loading
          ? const Center(child: CircularProgressIndicator(color: kBrand, strokeWidth: 2))
          : RefreshIndicator(
            color: kBrand,
            onRefresh: _fetchAll,
            child: ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                // Data source badge
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: (isReal ? kLow : kMedium).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: (isReal ? kLow : kMedium).withOpacity(0.3)),
                      ),
                      child: Row(children: [
                        if (isReal) const LiveDot() else const LiveDot(color: kMedium),
                        const SizedBox(width: 6),
                        Text(isReal ? 'LIVE DATA' : 'SIMULATED',
                          style: GoogleFonts.inter(
                            fontSize: 9, fontWeight: FontWeight.w800,
                            color: isReal ? kLow : kMedium, letterSpacing: 0.5)),
                      ]),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(w?['source'] ?? '',
                      style: GoogleFonts.inter(fontSize: 10, color: kTextMuted),
                      maxLines: 1, overflow: TextOverflow.ellipsis)),
                  ]),
                ),

                // Main weather hero card
                GlassCard(child: Column(children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('Pune, Maharashtra', style: GoogleFonts.inter(fontSize: 11, color: kTextMuted)),
                      const SizedBox(height: 4),
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${w?['temperature'] ?? '--'}°',
                          style: GoogleFonts.inter(
                            fontSize: 64, fontWeight: FontWeight.w900,
                            color: kTextPri, height: 1)),
                        Text('C', style: GoogleFonts.inter(
                          fontSize: 20, fontWeight: FontWeight.w600,
                          color: kTextSec, height: 2.8)),
                      ]),
                      Text('Feels like ${w?['apparent_temperature'] ?? '--'}°C',
                        style: GoogleFonts.inter(fontSize: 12, color: kTextMuted)),
                    ]),
                    const Spacer(),
                    Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text(_weatherEmoji(w?['condition']),
                        style: const TextStyle(fontSize: 52)),
                      const SizedBox(height: 4),
                      Text(w?['condition'] ?? '',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kTextPri)),
                      Text('${w?['humidity'] ?? '--'}% humidity',
                        style: GoogleFonts.inter(fontSize: 11, color: kTextMuted)),
                    ]),
                  ]),
                  const SizedBox(height: 16),
                  Divider(color: kBorder, height: 1),
                  const SizedBox(height: 16),
                  Row(children: [
                    StatTile(icon: '🌧️', label: 'Rainfall', value: '${w?['rainfall_mm_hr'] ?? 0} mm/hr',
                      valueColor: rain > 20 ? kHigh : kTextPri),
                    StatTile(icon: '💨', label: 'Wind', value: '${w?['wind_speed_kmh'] ?? '--'} km/h'),
                    StatTile(icon: '👁️', label: 'Visibility', value: '${w?['visibility_km'] ?? '--'} km'),
                    StatTile(icon: '🌡️', label: 'Pressure', value: '${w?['pressure_hpa'] ?? '--'} hPa'),
                  ]),
                ])),

                // Flood Impact Assessment
                GlassCard(
                  borderColor: rain > 20 ? kHigh.withOpacity(0.4) : kBorder,
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Text('🌊', style: const TextStyle(fontSize: 16)),
                      const SizedBox(width: 8),
                      Text('Flood Impact Assessment',
                        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kTextPri)),
                      const Spacer(),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          color: _floodRiskColor(rain.toDouble()).withOpacity(0.15),
                          child: Text(
                            rain > 30 ? 'CRITICAL' : rain > 20 ? 'HIGH RISK' : rain > 10 ? 'MODERATE' : 'LOW RISK',
                            style: GoogleFonts.inter(
                              fontSize: 9, fontWeight: FontWeight.w800,
                              color: _floodRiskColor(rain.toDouble()))),
                        ),
                      ),
                    ]),
                    const SizedBox(height: 14),
                    _FloodRow('Drainage System Stress', rain > 30 ? 'STRESSED' : 'NORMAL', rain > 30),
                    _FloodRow('Road Flooding Risk', rain > 20 ? 'ELEVATED' : 'LOW', rain > 20),
                    _FloodRow('Traffic Impact', rain > 10 ? 'MODERATE' : 'MINIMAL', rain > 10),
                    _FloodRow('Flood Alerts Likely', rain > 15 ? 'YES' : 'NO', rain > 15),
                  ]),
                ),

                // 24h forecast
                GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('24-Hour Rainfall Forecast',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kTextPri)),
                  const SizedBox(height: 4),
                  Text('Source: Open-Meteo WMO Real Forecast',
                    style: GoogleFonts.inter(fontSize: 9, color: kTextMuted)),
                  const SizedBox(height: 16),
                  if (_forecast.isEmpty)
                    Center(child: Text('Forecast unavailable',
                      style: GoogleFonts.inter(fontSize: 12, color: kTextMuted)))
                  else
                    _ForecastChart(forecast: _forecast),
                ])),

                // Current alert status
                GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Advisory', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kTextPri)),
                  const SizedBox(height: 12),
                  _AdvisoryItem(icon: '🚗', text: rain > 20
                    ? 'Avoid low-lying roads — flooding possible'
                    : 'Road conditions normal'),
                  _AdvisoryItem(icon: '🏠', text: rain > 30
                    ? 'Stay indoors. Move valuables upstairs if in flood zone.'
                    : 'No indoor advisories at current rainfall levels.'),
                  _AdvisoryItem(icon: '📱', text: 'Keep emergency contacts saved. See SOS tab.'),
                ])),
              ],
            ),
          ),
      ),
    ]);
  }
}

class _FloodRow extends StatelessWidget {
  final String label;
  final String status;
  final bool isWarning;
  const _FloodRow(this.label, this.status, this.isWarning);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, color: kTextSec)),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: (isWarning ? kHigh : kLow).withOpacity(0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: (isWarning ? kHigh : kLow).withOpacity(0.3)),
          ),
          child: Text(status, style: GoogleFonts.inter(
            fontSize: 10, fontWeight: FontWeight.w700, color: isWarning ? kHigh : kLow)),
        ),
      ]),
    );
  }
}

class _AdvisoryItem extends StatelessWidget {
  final String icon;
  final String text;
  const _AdvisoryItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(icon, style: const TextStyle(fontSize: 16)),
        const SizedBox(width: 10),
        Expanded(child: Text(text,
          style: GoogleFonts.inter(fontSize: 12, color: kTextSec, height: 1.5))),
      ]),
    );
  }
}

class _ForecastChart extends StatelessWidget {
  final List<dynamic> forecast;
  const _ForecastChart({required this.forecast});

  @override
  Widget build(BuildContext context) {
    final maxRain = forecast
        .map((f) => (f['rainfall_mm'] as num).toDouble())
        .reduce((a, b) => a > b ? a : b);

    return SizedBox(
      height: 110,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: forecast.asMap().entries.map((e) {
          final rain = (e.value['rainfall_mm'] as num).toDouble();
          final isHour = e.key % 6 == 0;
          final barH = maxRain > 0 ? (rain / maxRain * 80).clamp(3.0, 80.0) : 3.0;
          final barColor = rain > 10 ? kHigh : rain > 5 ? kMedium : kBrand;

          return Expanded(
            child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
              if (isHour && rain > 0)
                Text('${rain.toStringAsFixed(1)}', style: GoogleFonts.inter(fontSize: 6, color: kTextMuted)),
              const SizedBox(height: 2),
              Container(
                height: barH,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: barColor.withOpacity(0.7),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                ),
              ),
              const SizedBox(height: 4),
              if (isHour)
                Text(
                  DateFormat('HH').format(DateTime.parse(e.value['time']).toLocal()),
                  style: GoogleFonts.inter(fontSize: 7, color: kTextMuted),
                )
              else
                const SizedBox(height: 9),
            ]),
          );
        }).toList(),
      ),
    );
  }
}
