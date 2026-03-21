import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config.dart';

// ─────────────────────────────────────────────
//  Shared App Bar
// ─────────────────────────────────────────────
class PusAppBar extends StatelessWidget {
  final String title;
  final String? subtitle;
  final List<Widget>? actions;
  final Widget? leading;

  const PusAppBar({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 52, 20, 16),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0A1525), Color(0xFF050B18)],
        ),
        border: Border(bottom: BorderSide(color: kBorder, width: 1)),
      ),
      child: Row(
        children: [
          if (leading != null) ...[leading!, const SizedBox(width: 12)],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Text('🛡️ ', style: TextStyle(fontSize: 16)),
                Text(title, style: GoogleFonts.inter(
                  fontSize: 18, fontWeight: FontWeight.w900, color: kTextPri)),
              ]),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(subtitle!, style: GoogleFonts.inter(fontSize: 11, color: kTextMuted)),
              ]
            ]),
          ),
          ...?actions,
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Risk Badge
// ─────────────────────────────────────────────
class RiskBadge extends StatelessWidget {
  final String risk;
  final bool large;
  const RiskBadge({super.key, required this.risk, this.large = false});

  @override
  Widget build(BuildContext context) {
    final color = riskColor(risk);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: large ? 14 : 10,
        vertical: large ? 6 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: color.withOpacity(0.4), width: 1),
      ),
      child: Text(risk, style: GoogleFonts.inter(
        fontSize: large ? 12 : 10,
        fontWeight: FontWeight.w800,
        color: color,
        letterSpacing: 0.5,
      )),
    );
  }
}

// ─────────────────────────────────────────────
//  Glass Card
// ─────────────────────────────────────────────
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final Color? borderColor;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kBgCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor ?? kBorder, width: 1),
      ),
      child: child,
    );
  }
}

// ─────────────────────────────────────────────
//  Section Header
// ─────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final String? trailing;
  final VoidCallback? onTrailingTap;

  const SectionHeader({super.key, required this.title, this.trailing, this.onTrailingTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: [
          Text(title, style: GoogleFonts.inter(
            fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec, letterSpacing: 0.5)),
          const Spacer(),
          if (trailing != null)
            GestureDetector(
              onTap: onTrailingTap,
              child: Text(trailing!, style: GoogleFonts.inter(
                fontSize: 11, color: kBrand, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Live Indicator Dot
// ─────────────────────────────────────────────
class LiveDot extends StatefulWidget {
  final Color color;
  const LiveDot({super.key, this.color = kLow});

  @override
  State<LiveDot> createState() => _LiveDotState();
}

class _LiveDotState extends State<LiveDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
      ..repeat(reverse: true);
    _anim = Tween(begin: 0.3, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: 8, height: 8,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: widget.color,
          boxShadow: [BoxShadow(color: widget.color.withOpacity(0.6), blurRadius: 6, spreadRadius: 1)],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Empty State Widget
// ─────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final String emoji;
  final String title;
  final String subtitle;
  final VoidCallback? onRefresh;

  const EmptyState({super.key, required this.emoji, required this.title, required this.subtitle, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(emoji, style: const TextStyle(fontSize: 52)),
        const SizedBox(height: 16),
        Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: kTextPri)),
        const SizedBox(height: 8),
        Text(subtitle, textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 12, color: kTextMuted, height: 1.6)),
        if (onRefresh != null) ...[
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Refresh'),
            style: OutlinedButton.styleFrom(
              foregroundColor: kBrand,
              side: const BorderSide(color: kBrand),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ]),
    );
  }
}

// ─────────────────────────────────────────────
//  Stat Tile
// ─────────────────────────────────────────────
class StatTile extends StatelessWidget {
  final String icon;
  final String label;
  final String value;
  final Color? valueColor;

  const StatTile({super.key, required this.icon, required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Column(children: [
      Text(icon, style: const TextStyle(fontSize: 20)),
      const SizedBox(height: 6),
      Text(value, style: GoogleFonts.inter(
        fontSize: 13, fontWeight: FontWeight.w800, color: valueColor ?? kTextPri)),
      const SizedBox(height: 2),
      Text(label, style: GoogleFonts.inter(fontSize: 9, color: kTextMuted)),
    ]));
  }
}
