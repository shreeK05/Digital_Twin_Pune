import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';
import '../widgets/shared_widgets.dart';

// ─────────────────────────────────────────────
//  SOS / Emergency Page
// ─────────────────────────────────────────────
class SosPage extends StatelessWidget {
  const SosPage({super.key});

  Future<void> _call(String number, BuildContext context) async {
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      // Fallback: copy to clipboard
      await Clipboard.setData(ClipboardData(text: number));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Number copied: $number'),
          backgroundColor: kBrand,
          duration: const Duration(seconds: 2),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final municipal = kEmergencyContacts.where((c) => c['type'] == 'Municipal').toList();
    final emergency = kEmergencyContacts.where((c) => c['type'] == 'Emergency').toList();
    final services  = kEmergencyContacts.where((c) => !['Municipal', 'Emergency'].contains(c['type'])).toList();

    return Column(children: [
      PusAppBar(title: 'SOS & Emergency', subtitle: 'PMC · PCMC · Emergency Services — Pune'),

      Expanded(child: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          // SOS banner
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [kCritical.withOpacity(0.2), kCritical.withOpacity(0.05)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: kCritical.withOpacity(0.4), width: 1),
            ),
            child: Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: kCritical.withOpacity(0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: kCritical.withOpacity(0.5), width: 2),
                ),
                child: const Center(child: Text('🆘', style: TextStyle(fontSize: 26))),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('In Immediate Danger?',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, color: kCritical)),
                const SizedBox(height: 4),
                Text('Call 112 — National Emergency Number\nWorks on all networks, even without balance.',
                  style: GoogleFonts.inter(fontSize: 11, color: kTextSec, height: 1.5)),
              ])),
            ]),
          ),

          // Quick dial 112
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: ElevatedButton(
              onPressed: () => _call('112', context),
              style: ElevatedButton.styleFrom(
                backgroundColor: kCritical,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Text('📞  ', style: TextStyle(fontSize: 20)),
                Text('CALL 112 — EMERGENCY',
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
              ]),
            ),
          ),

          SectionHeader(title: 'MUNICIPAL HELPLINES'),
          ...municipal.map((c) => _ContactCard(contact: c, onCall: () => _call(c['number']!, context))),

          SectionHeader(title: 'EMERGENCY NUMBERS'),
          ...emergency.map((c) => _ContactCard(contact: c, onCall: () => _call(c['number']!, context))),

          SectionHeader(title: 'EMERGENCY SERVICES'),
          ...services.map((c) => _ContactCard(contact: c, onCall: () => _call(c['number']!, context))),

          // Flood safety tips
          GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Text('🛡️', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 10),
              Text('Flood Safety Tips', style: GoogleFonts.inter(
                fontSize: 14, fontWeight: FontWeight.w800, color: kTextPri)),
            ]),
            const SizedBox(height: 14),
            ...[
              '🚫 Never walk in fast-moving flood water — 15 cm can knock you down',
              '🚗 Avoid driving through flooded roads — water depth is deceiving',
              '⬆️ Move to higher ground immediately if water rises rapidly',
              '📱 Save emergency numbers before disaster strikes',
              '🏠 Turn off gas and electricity if instructed to evacuate',
              '💧 Do not use tap water if supply appears contaminated',
              '🆘 Signal for help with a whistle or bright cloth from your roof',
            ].map((tip) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: Text(tip,
                  style: GoogleFonts.inter(fontSize: 12, color: kTextSec, height: 1.5))),
              ]),
            )),
          ])),

          // Evacuation note
          GlassCard(
            borderColor: kBrand.withOpacity(0.3),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('🗺️', style: TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Text('Evacuation Routes', style: GoogleFonts.inter(
                  fontSize: 14, fontWeight: FontWeight.w800, color: kTextPri)),
              ]),
              const SizedBox(height: 12),
              Text('Check the Risk Map tab → Shelters section for nearest safe shelters in your ward.',
                style: GoogleFonts.inter(fontSize: 12, color: kTextSec, height: 1.6)),
              const SizedBox(height: 12),
              Text('For real-time evacuation route guidance, call your local PMC/PCMC ward office or dial 020-25506800.',
                style: GoogleFonts.inter(fontSize: 12, color: kTextSec, height: 1.6)),
            ]),
          ),
        ],
      )),
    ]);
  }
}

class _ContactCard extends StatelessWidget {
  final Map<String, dynamic> contact;
  final VoidCallback onCall;
  const _ContactCard({required this.contact, required this.onCall});

  Color _typeColor() {
    switch (contact['type']) {
      case 'Municipal':  return kBrand;
      case 'Emergency':  return kCritical;
      case 'Police':     return const Color(0xFF4A90E2);
      case 'Fire':       return kHigh;
      case 'Medical':    return kLow;
      case 'Rescue':     return kCyan;
      default:           return kTextSec;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _typeColor();
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder, width: 1),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            shape: BoxShape.circle,
            border: Border.all(color: color.withOpacity(0.3)),
          ),
          child: Center(child: Text(contact['icon'] ?? '📞', style: const TextStyle(fontSize: 20))),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(contact['name'] ?? '',
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kTextPri)),
          const SizedBox(height: 3),
          Text(contact['number'] ?? '',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: color,
              fontFeatures: [const FontFeature.tabularFigures()])),
        ])),
        GestureDetector(
          onTap: onCall,
          child: Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.4)),
            ),
            child: const Icon(Icons.phone_rounded, size: 20, color: Colors.white),
          ),
        ),
      ]),
    );
  }
}
