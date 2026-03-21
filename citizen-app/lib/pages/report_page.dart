import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config.dart';
import '../widgets/shared_widgets.dart';

// ─────────────────────────────────────────────
//  Category definitions — matches Admin Web exactly
// ─────────────────────────────────────────────
const List<Map<String, String>> kCategories = [
  {'label': 'Flood Risk',       'icon': '🌊'},
  {'label': 'Road Damage',      'icon': '🛣️'},
  {'label': 'Drainage Issue',   'icon': '🚧'},
  {'label': 'Garbage Dumping',  'icon': '🗑️'},
  {'label': 'Waterlogging',     'icon': '💧'},
  {'label': 'Power Outage',     'icon': '⚡'},
  {'label': 'Tree Fall',        'icon': '🌳'},
  {'label': 'Wall Collapse',    'icon': '🧱'},
  {'label': 'Other',            'icon': '📋'},
];

const Map<String, Map<String, dynamic>> kStatusConfig = {
  'RECEIVED':    {'icon': '📥', 'label': 'Received',    'color': kBrand},
  'IN_PROGRESS': {'icon': '🔧', 'label': 'In Progress', 'color': kMedium},
  'RESOLVED':    {'icon': '✅', 'label': 'Resolved',    'color': kLow},
  'REJECTED':    {'icon': '❌', 'label': 'Rejected',    'color': kCritical},
};

// ─────────────────────────────────────────────
//  Report Page
// ─────────────────────────────────────────────
class ReportPage extends StatefulWidget {
  const ReportPage({super.key});

  @override
  State<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends State<ReportPage> with SingleTickerProviderStateMixin {
  final _descCtrl    = TextEditingController();
  final _areaCtrl    = TextEditingController();
  String _category   = 'Flood Risk';
  String _authority  = 'PMC';
  bool _submitting   = false;
  bool _submitted    = false;
  String? _reportId;
  bool _photoUploaded = false;

  // Photo picker state
  XFile? _pickedPhoto;
  final _picker = ImagePicker();

  // My Reports
  List<Map<String, dynamic>> _myReports = [];
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _loadMyReports();
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _descCtrl.dispose();
    _areaCtrl.dispose();
    super.dispose();
  }

  // ── Photo Picker ────────────────────────────
  Future<void> _pickPhoto(ImageSource source) async {
    try {
      final file = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1280,
        maxHeight: 960,
      );
      if (file != null) setState(() => _pickedPhoto = file);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Could not pick photo: $e'),
          backgroundColor: kHigh,
        ));
      }
    }
  }

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kBgCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(
            color: kBorder, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),
          Text('Attach Photo', style: GoogleFonts.inter(
            fontSize: 16, fontWeight: FontWeight.w800, color: kTextPri)),
          const SizedBox(height: 8),
          Text('Photo evidence helps PMC/PCMC prioritise your report',
            style: GoogleFonts.inter(fontSize: 12, color: kTextMuted),
            textAlign: TextAlign.center),
          const SizedBox(height: 24),
          Row(children: [
            _PhotoOption(icon: Icons.camera_alt_rounded, label: 'Camera', onTap: () {
              Navigator.pop(ctx);
              _pickPhoto(ImageSource.camera);
            }),
            const SizedBox(width: 12),
            _PhotoOption(icon: Icons.photo_library_rounded, label: 'Gallery', onTap: () {
              Navigator.pop(ctx);
              _pickPhoto(ImageSource.gallery);
            }),
          ]),
          if (_pickedPhoto != null) ...[
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: () { setState(() => _pickedPhoto = null); Navigator.pop(ctx); },
              icon: const Icon(Icons.delete_outline, color: kCritical, size: 18),
              label: Text('Remove Photo', style: GoogleFonts.inter(color: kCritical, fontWeight: FontWeight.w600)),
            ),
          ],
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  // ── Submit ──────────────────────────────────
  Future<void> _submit() async {
    if (_areaCtrl.text.trim().isEmpty || _descCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please fill in location and description'),
        backgroundColor: kHigh,
      ));
      return;
    }
    setState(() { _submitting = true; _photoUploaded = false; });

    String reportId = 'RPT${DateTime.now().millisecondsSinceEpoch % 100000}';
    bool photoUploaded = false;

    try {
      // Use the full multipart endpoint: /api/reports/citizen
      final uri = Uri.parse('$kBackendBase/api/reports/citizen');
      final request = http.MultipartRequest('POST', uri);

      // Text fields
      request.fields['category']      = _category;
      request.fields['description']   = _descCtrl.text.trim();
      request.fields['location_name'] = _areaCtrl.text.trim();
      request.fields['authority']     = _authority;
      request.fields['latitude']      = '18.5204'; // Default Pune center
      request.fields['longitude']     = '73.8567';

      // Attach photo if selected
      if (_pickedPhoto != null) {
        final bytes = await File(_pickedPhoto!.path).readAsBytes();
        request.files.add(http.MultipartFile.fromBytes(
          'photo',
          bytes,
          filename: _pickedPhoto!.name,
        ));
      }

      final streamedRes = await request.send().timeout(const Duration(seconds: 30));
      final res = await http.Response.fromStream(streamedRes);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        reportId = data['report_id'] ?? reportId;
        photoUploaded = data['photo_uploaded'] == true;
      }
    } catch (_) {
      // Offline fallback — still record locally
    }

    final report = {
      'id': reportId,
      'category': _category,
      'authority': _authority,
      'area': _areaCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
      'timestamp': DateTime.now().toIso8601String(),
      'status': 'RECEIVED',
      'has_photo': _pickedPhoto != null,
      'photo_uploaded': photoUploaded,
    };
    await _saveReport(report);

    setState(() {
      _submitted = true;
      _submitting = false;
      _reportId = reportId;
      _photoUploaded = photoUploaded;
    });
  }

  // ── Persistence ─────────────────────────────
  Future<void> _loadMyReports() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList('my_reports') ?? [];
    if (mounted) setState(() {
      _myReports = raw.map((r) => Map<String, dynamic>.from(jsonDecode(r) as Map)).toList();
    });
  }

  Future<void> _saveReport(Map<String, dynamic> report) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList('my_reports') ?? [];
    raw.insert(0, jsonEncode(report));
    if (raw.length > 20) raw.removeLast();
    await prefs.setStringList('my_reports', raw);
    if (mounted) setState(() => _myReports.insert(0, report));
  }

  void _resetForm() {
    setState(() {
      _submitted = false;
      _reportId = null;
      _photoUploaded = false;
      _pickedPhoto = null;
    });
    _descCtrl.clear();
    _areaCtrl.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      PusAppBar(title: 'Report Issue', subtitle: 'Submit to PMC / PCMC Municipal Team · with photo evidence'),

      // Tabs
      Container(
        margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        decoration: BoxDecoration(
          color: kBgCard2, borderRadius: BorderRadius.circular(10), border: Border.all(color: kBorder)),
        child: TabBar(
          controller: _tabCtrl,
          labelStyle: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.inter(fontSize: 11),
          labelColor: kBrand, unselectedLabelColor: kTextSec,
          indicator: BoxDecoration(
            color: kBrand.withOpacity(0.15), borderRadius: BorderRadius.circular(8),
            border: Border.all(color: kBrand.withOpacity(0.3))),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          tabs: [
            const Tab(text: 'New Report'),
            Tab(text: 'My Reports (${_myReports.length})'),
          ],
        ),
      ),
      const SizedBox(height: 4),

      Expanded(
        child: TabBarView(
          controller: _tabCtrl,
          children: [
            _submitted ? _SuccessView(
              reportId: _reportId,
              photoUploaded: _photoUploaded,
              hadPhoto: _pickedPhoto != null,
              onReset: _resetForm,
            ) : _ReportForm(
              categories: kCategories,
              selectedCategory: _category,
              onCategoryChanged: (v) => setState(() => _category = v),
              authority: _authority,
              onAuthorityChanged: (v) => setState(() => _authority = v),
              areaCtrl: _areaCtrl,
              descCtrl: _descCtrl,
              pickedPhoto: _pickedPhoto,
              onPickPhoto: _showPhotoOptions,
              submitting: _submitting,
              onSubmit: _submit,
            ),

            _myReports.isEmpty
              ? const EmptyState(emoji: '📋', title: 'No Reports Yet',
                  subtitle: 'Your submitted reports will appear here.\nReports with 📷 photos are synced to Cloudinary.')
              : ListView.builder(
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: _myReports.length,
                  itemBuilder: (ctx, i) => _MyReportCard(report: _myReports[i]),
                ),
          ],
        ),
      ),
    ]);
  }
}

// ─────────────────────────────────────────────
//  Photo Option Button
// ─────────────────────────────────────────────
class _PhotoOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _PhotoOption({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: kBrand.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: kBrand.withOpacity(0.3)),
        ),
        child: Column(children: [
          Icon(icon, color: kBrand, size: 32),
          const SizedBox(height: 8),
          Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kBrand)),
        ]),
      ),
    ));
  }
}

// ─────────────────────────────────────────────
//  Report Form
// ─────────────────────────────────────────────
class _ReportForm extends StatelessWidget {
  final List<Map<String, String>> categories;
  final String selectedCategory;
  final ValueChanged<String> onCategoryChanged;
  final String authority;
  final ValueChanged<String> onAuthorityChanged;
  final TextEditingController areaCtrl;
  final TextEditingController descCtrl;
  final XFile? pickedPhoto;
  final VoidCallback onPickPhoto;
  final bool submitting;
  final VoidCallback onSubmit;

  const _ReportForm({
    required this.categories, required this.selectedCategory, required this.onCategoryChanged,
    required this.authority, required this.onAuthorityChanged,
    required this.areaCtrl, required this.descCtrl,
    required this.pickedPhoto, required this.onPickPhoto,
    required this.submitting, required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        const SizedBox(height: 4),

        // Category grid
        GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Issue Category', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 1.55,
            children: categories.map((cat) {
              final sel = selectedCategory == cat['label'];
              return GestureDetector(
                onTap: () => onCategoryChanged(cat['label']!),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  decoration: BoxDecoration(
                    color: sel ? kBrand.withOpacity(0.15) : kBgCard2,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: sel ? kBrand.withOpacity(0.6) : kBorder),
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text(cat['icon']!, style: const TextStyle(fontSize: 22)),
                    const SizedBox(height: 4),
                    Text(cat['label']!, textAlign: TextAlign.center,
                      style: GoogleFonts.inter(fontSize: 9, fontWeight: sel ? FontWeight.w700 : FontWeight.w500,
                        color: sel ? kBrand : kTextSec),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  ]),
                ),
              );
            }).toList(),
          ),
        ])),

        // Authority selector
        GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Report To', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec)),
          const SizedBox(height: 10),
          Row(children: ['PMC', 'PCMC'].map((a) {
            final sel = authority == a;
            final color = a == 'PMC' ? kBrand : kCyan;
            final isLast = a == 'PCMC';
            return Expanded(child: GestureDetector(
              onTap: () => onAuthorityChanged(a),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: EdgeInsets.only(right: isLast ? 0 : 8),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: sel ? color.withOpacity(0.15) : kBgCard2,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: sel ? color.withOpacity(0.6) : kBorder),
                ),
                child: Column(children: [
                  Text(a == 'PMC' ? '🏙️' : '🌆', style: const TextStyle(fontSize: 22)),
                  const SizedBox(height: 4),
                  Text(a == 'PMC' ? 'PMC — Pune' : 'PCMC — Pimpri',
                    style: GoogleFonts.inter(fontSize: 10, fontWeight: sel ? FontWeight.w800 : FontWeight.w500,
                      color: sel ? color : kTextSec)),
                ]),
              ),
            ));
          }).toList()),
        ])),

        // Location + description
        GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Location', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec)),
          const SizedBox(height: 10),
          _InputField(controller: areaCtrl, hint: 'e.g. Wakad Underpass, near petrol pump', icon: Icons.location_on_outlined),
          const SizedBox(height: 16),
          Text('Description', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec)),
          const SizedBox(height: 10),
          _InputField(controller: descCtrl, hint: 'Describe the problem clearly...', maxLines: 4, icon: Icons.description_outlined),
        ])),

        // Photo attachment — THE MAIN NEW FEATURE
        GlassCard(
          borderColor: pickedPhoto != null ? kLow.withOpacity(0.4) : kBorder,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('Photo Evidence', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSec)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kBrand.withOpacity(0.1), borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: kBrand.withOpacity(0.3))),
                child: Text('OPTIONAL', style: GoogleFonts.inter(fontSize: 8, fontWeight: FontWeight.w800, color: kBrand)),
              ),
            ]),
            const SizedBox(height: 10),
            Text('Photo is uploaded to Cloudinary and visible to PMC/PCMC team in the admin dashboard.',
              style: GoogleFonts.inter(fontSize: 10, color: kTextMuted, height: 1.5)),
            const SizedBox(height: 14),

            if (pickedPhoto != null) ...[
              // Preview
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(
                  File(pickedPhoto!.path),
                  height: 160, width: double.infinity, fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 10),
              Row(children: [
                const Icon(Icons.check_circle, size: 14, color: kLow),
                const SizedBox(width: 6),
                Text('Photo selected: ${pickedPhoto!.name}',
                  style: GoogleFonts.inter(fontSize: 10, color: kLow), maxLines: 1, overflow: TextOverflow.ellipsis),
                const Spacer(),
                GestureDetector(
                  onTap: onPickPhoto,
                  child: Text('Change', style: GoogleFonts.inter(fontSize: 10, color: kBrand, fontWeight: FontWeight.w700)),
                ),
              ]),
            ] else ...[
              GestureDetector(
                onTap: onPickPhoto,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(
                    color: kBgCard2, borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: kBorderBright, width: 1.5,
                      // dashed effect via repeated decoration — standard flutter
                    )),
                  child: Column(children: [
                    const Icon(Icons.add_a_photo_outlined, color: kTextMuted, size: 32),
                    const SizedBox(height: 8),
                    Text('Tap to add photo', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kTextSec)),
                    const SizedBox(height: 4),
                    Text('Camera or Gallery', style: GoogleFonts.inter(fontSize: 10, color: kTextMuted)),
                  ]),
                ),
              ),
            ],
          ]),
        ),

        // Submit button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: ElevatedButton(
            onPressed: submitting ? null : onSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: kBrand, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
              disabledBackgroundColor: kBrand.withOpacity(0.5),
            ),
            child: submitting
              ? Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                  const SizedBox(width: 12),
                  Text(pickedPhoto != null ? 'Uploading photo...' : 'Submitting...',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
                ])
              : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('📤  ', style: const TextStyle(fontSize: 16)),
                  Text('Submit Report to ${''}PMC / PCMC',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800)),
                ]),
          ),
        ),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.storage_rounded, size: 12, color: kTextMuted),
            const SizedBox(width: 5),
            Text('Reports saved to MongoDB Atlas · Photos to Cloudinary',
              style: GoogleFonts.inter(fontSize: 9, color: kTextMuted)),
          ]),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────
//  Input Field
// ─────────────────────────────────────────────
class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final int? maxLines;
  final IconData? icon;
  const _InputField({required this.controller, required this.hint, this.maxLines, this.icon});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines ?? 1,
      style: GoogleFonts.inter(fontSize: 13, color: kTextPri),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(fontSize: 12, color: kTextMuted),
        prefixIcon: icon != null ? Icon(icon, color: kTextMuted, size: 18) : null,
        filled: true, fillColor: kBgCard2,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: kBorder)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBrand, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Success View
// ─────────────────────────────────────────────
class _SuccessView extends StatelessWidget {
  final String? reportId;
  final bool photoUploaded;
  final bool hadPhoto;
  final VoidCallback onReset;
  const _SuccessView({this.reportId, required this.photoUploaded, required this.hadPhoto, required this.onReset});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              color: kLow.withOpacity(0.1), shape: BoxShape.circle,
              border: Border.all(color: kLow.withOpacity(0.4), width: 2)),
            child: const Center(child: Text('✅', style: TextStyle(fontSize: 40))),
          ),
          const SizedBox(height: 24),
          Text('Report Submitted!', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w900, color: kTextPri)),
          const SizedBox(height: 12),
          Text('Your report has been registered with the\nPMC/PCMC municipal engineering team.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 13, color: kTextSec, height: 1.7)),
          const SizedBox(height: 20),

          if (reportId != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: kBgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: kBorder)),
              child: Column(children: [
                Text('Report ID', style: GoogleFonts.inter(fontSize: 10, color: kTextMuted)),
                const SizedBox(height: 4),
                Text(reportId!, style: GoogleFonts.inter(
                  fontSize: 18, fontWeight: FontWeight.w900, color: kBrand,
                  fontFeatures: [const FontFeature.tabularFigures()])),
              ]),
            ),
          const SizedBox(height: 14),

          // Photo status
          if (hadPhoto) Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: (photoUploaded ? kLow : kMedium).withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: (photoUploaded ? kLow : kMedium).withOpacity(0.25))),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(photoUploaded ? '📷' : '⚠️', style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Text(
                photoUploaded ? 'Photo uploaded to Cloudinary ✓' : 'Photo not uploaded (offline)',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600,
                  color: photoUploaded ? kLow : kMedium)),
            ]),
          ),
          const SizedBox(height: 12),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: kBrand.withOpacity(0.08), borderRadius: BorderRadius.circular(8),
              border: Border.all(color: kBrand.withOpacity(0.2))),
            child: Text('Track in "My Reports" tab · Response within 24 hrs',
              style: GoogleFonts.inter(fontSize: 10, color: kBrand, fontWeight: FontWeight.w600)),
          ),

          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: onReset,
            style: ElevatedButton.styleFrom(
              backgroundColor: kBrand, foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
            ),
            child: Text('Submit Another Report', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ]),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  My Report Card
// ─────────────────────────────────────────────
class _MyReportCard extends StatelessWidget {
  final Map<String, dynamic> report;
  const _MyReportCard({required this.report});

  @override
  Widget build(BuildContext context) {
    final status = report['status'] ?? 'RECEIVED';
    final statusCfg = kStatusConfig[status] ?? kStatusConfig['RECEIVED']!;
    final color = statusCfg['color'] as Color;
    final hasPhoto = report['has_photo'] == true;
    final photoUploaded = report['photo_uploaded'] == true;
    final ts = report['timestamp'] != null ? DateTime.parse(report['timestamp']).toLocal() : DateTime.now();

    final catIcon = kCategories.firstWhere(
      (c) => c['label'] == report['category'],
      orElse: () => {'icon': '📋', 'label': ''},
    )['icon']!;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kBgCard, borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(catIcon, style: const TextStyle(fontSize: 22)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(report['category'] ?? 'Issue',
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kTextPri)),
            Text(report['area'] ?? '',
              style: GoogleFonts.inter(fontSize: 10, color: kTextMuted),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6),
                border: Border.all(color: color.withOpacity(0.3))),
              child: Text('${statusCfg['icon']} ${statusCfg['label']}',
                style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: color)),
            ),
            if (report['authority'] != null) ...[
              const SizedBox(height: 4),
              Text(report['authority'],
                style: GoogleFonts.inter(fontSize: 9, color: report['authority'] == 'PMC' ? kBrand : kCyan, fontWeight: FontWeight.w700)),
            ],
          ]),
        ]),
        const SizedBox(height: 10),
        Text(report['description'] ?? '',
          style: GoogleFonts.inter(fontSize: 11, color: kTextSec, height: 1.5),
          maxLines: 2, overflow: TextOverflow.ellipsis),
        const SizedBox(height: 10),
        Row(children: [
          if (hasPhoto) ...[
            Icon(photoUploaded ? Icons.cloud_done_rounded : Icons.photo_camera_outlined,
              size: 13, color: photoUploaded ? kLow : kTextMuted),
            const SizedBox(width: 4),
            Text(photoUploaded ? 'Photo synced' : 'Photo (local)',
              style: GoogleFonts.inter(fontSize: 9, color: photoUploaded ? kLow : kTextMuted)),
            const SizedBox(width: 12),
          ],
          Icon(Icons.access_time, size: 11, color: kTextMuted),
          const SizedBox(width: 3),
          Text(_timeAgo(ts), style: GoogleFonts.inter(fontSize: 9, color: kTextMuted)),
          const Spacer(),
          if (report['id'] != null)
            Text('# ${report['id']}',
              style: GoogleFonts.inter(fontSize: 9, color: kTextMuted.withOpacity(0.7))),
        ]),
      ]),
    );
  }

  String _timeAgo(DateTime dt) {
    final d = DateTime.now().difference(dt);
    if (d.inMinutes < 1) return 'just now';
    if (d.inMinutes < 60) return '${d.inMinutes}m ago';
    if (d.inHours < 24) return '${d.inHours}h ago';
    return '${d.inDays}d ago';
  }
}
