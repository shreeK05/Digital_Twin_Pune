import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config.dart';
import 'pages/alerts_page.dart';
import 'pages/weather_page.dart';
import 'pages/risk_map_page.dart';
import 'pages/report_page.dart';
import 'pages/sos_page.dart';

// ─────────────────────────────────────────────
//  Entry Point
// ─────────────────────────────────────────────
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: kBgCard,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const PuneUrbanShieldApp());
}

// ─────────────────────────────────────────────
//  Root App
// ─────────────────────────────────────────────
class PuneUrbanShieldApp extends StatelessWidget {
  const PuneUrbanShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pune Urban Shield',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kBgDark,
        colorScheme: const ColorScheme.dark(
          primary: kBrand,
          secondary: kCyan,
          surface: kBgCard,
          error: kCritical,
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        useMaterial3: true,
        splashFactory: InkRipple.splashFactory,
      ),
      home: const _RootNavigator(),
    );
  }
}

// ─────────────────────────────────────────────
//  Root Navigator — handles onboarding vs main
// ─────────────────────────────────────────────
class _RootNavigator extends StatefulWidget {
  const _RootNavigator();

  @override
  State<_RootNavigator> createState() => _RootNavigatorState();
}

class _RootNavigatorState extends State<_RootNavigator> {
  bool? _hasOnboarded;
  String? _userName;
  String? _userWard;

  @override
  void initState() {
    super.initState();
    _checkOnboarding();
  }

  Future<void> _checkOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    final done = prefs.getBool('onboarded') ?? false;
    final name = prefs.getString('user_name');
    final ward = prefs.getString('user_ward');
    setState(() { _hasOnboarded = done; _userName = name; _userWard = ward; });
  }

  void _onOnboardingComplete(String name, String ward) {
    setState(() { _hasOnboarded = true; _userName = name; _userWard = ward; });
  }

  @override
  Widget build(BuildContext context) {
    if (_hasOnboarded == null) return const SplashScreen();
    if (!_hasOnboarded!) return OnboardingScreen(onComplete: _onOnboardingComplete);
    return HomeScreen(userName: _userName, userWard: _userWard);
  }
}

// ─────────────────────────────────────────────
//  Splash Screen
// ─────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late AnimationController _fadeCtrl;
  late Animation<double> _scale;
  late Animation<double> _fade;
  late Animation<double> _slideUp;
  int _dotCount = 0;
  Timer? _dotTimer;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat(reverse: true);
    _fadeCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _scale = Tween(begin: 0.9, end: 1.08).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _fade = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _slideUp = Tween(begin: 20.0, end: 0.0).animate(_fade);

    _fadeCtrl.forward();
    _dotTimer = Timer.periodic(const Duration(milliseconds: 400), (_) {
      if (mounted) setState(() => _dotCount = (_dotCount + 1) % 4);
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _fadeCtrl.dispose();
    _dotTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFF050B18), Color(0xFF0A1428), Color(0xFF0D1F3C)],
          ),
        ),
        child: FadeTransition(
          opacity: _fade,
          child: AnimatedBuilder(
            animation: _slideUp,
            builder: (ctx, child) => Transform.translate(
              offset: Offset(0, _slideUp.value),
              child: child,
            ),
            child: Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                // Logo
                ScaleTransition(
                  scale: _scale,
                  child: Container(
                    width: 96, height: 96,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [kBrand, kCyan]),
                      borderRadius: BorderRadius.circular(26),
                      boxShadow: [
                        BoxShadow(color: kBrand.withOpacity(0.4), blurRadius: 40, spreadRadius: 8),
                        BoxShadow(color: kCyan.withOpacity(0.2), blurRadius: 60, spreadRadius: 4),
                      ],
                    ),
                    child: const Center(child: Text('🛡️', style: TextStyle(fontSize: 48))),
                  ),
                ),
                const SizedBox(height: 32),

                Text('PUNE URBAN SHIELD', style: GoogleFonts.inter(
                  fontSize: 22, fontWeight: FontWeight.w900, color: kTextPri, letterSpacing: -0.5)),
                const SizedBox(height: 6),
                Text('Citizen Safety Platform',
                  style: GoogleFonts.inter(fontSize: 13, color: kTextMuted, letterSpacing: 2)),
                const SizedBox(height: 56),

                // Animated dots
                Row(mainAxisSize: MainAxisSize.min, children: List.generate(3, (i) {
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: i == _dotCount % 3 ? 16 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: i == _dotCount % 3 ? kBrand : kBrand.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                })),
                const SizedBox(height: 20),
                Text('Initializing', style: GoogleFonts.inter(fontSize: 10, color: kTextMuted, letterSpacing: 1.5)),
                const SizedBox(height: 48),
                Text('PMC · PCMC · Smart City Mission · Pune',
                  style: GoogleFonts.inter(fontSize: 9, color: kTextMuted.withOpacity(0.6))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  Onboarding Screen
// ─────────────────────────────────────────────
class OnboardingScreen extends StatefulWidget {
  final Function(String name, String ward) onComplete;
  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> with TickerProviderStateMixin {
  final _nameCtrl = TextEditingController();
  String _selectedWard = 'Wakad';
  int _step = 0;
  late AnimationController _anim;
  late Animation<double> _fade;

  final List<String> _wards = [
    'Kasba Peth', 'Shivajinagar', 'Kothrud', 'Hadapsar', 'Kondhwa',
    'Wanowrie', 'Katraj', 'Swargate', 'Deccan Gymkhana', 'Aundh',
    'Baner', 'Pashan', 'Pimpri', 'Chinchwad', 'Wakad',
    'Hinjewadi', 'Akurdi', 'Nigdi', 'Bhosari', 'Dighi', 'Moshi', 'Talegaon',
  ];

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeOut);
    _anim.forward();
  }

  @override
  void dispose() { _anim.dispose(); _nameCtrl.dispose(); super.dispose(); }

  void _nextStep() {
    if (_step == 1 && _nameCtrl.text.trim().isEmpty) return;
    setState(() => _step++);
    _anim.forward(from: 0);
  }

  Future<void> _finish() async {
    final name = _nameCtrl.text.trim().isEmpty ? 'Citizen' : _nameCtrl.text.trim();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarded', true);
    await prefs.setString('user_name', name);
    await prefs.setString('user_ward', _selectedWard);
    widget.onComplete(name, _selectedWard);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgDark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFF050B18), Color(0xFF0A1428)],
          ),
        ),
        child: SafeArea(child: FadeTransition(
          opacity: _fade,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: _step == 0 ? _WelcomeStep(onNext: _nextStep) :
                   _step == 1 ? _NameStep(ctrl: _nameCtrl, onNext: _nextStep) :
                   _WardStep(
                     wards: _wards,
                     selected: _selectedWard,
                     onChanged: (w) => setState(() => _selectedWard = w),
                     onFinish: _finish,
                   ),
          ),
        )),
      ),
    );
  }
}

class _WelcomeStep extends StatelessWidget {
  final VoidCallback onNext;
  const _WelcomeStep({required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(
        width: 80, height: 80,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [kBrand, kCyan]),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: kBrand.withOpacity(0.4), blurRadius: 30, spreadRadius: 5)],
        ),
        child: const Center(child: Text('🛡️', style: TextStyle(fontSize: 40))),
      ),
      const SizedBox(height: 32),
      Text('Welcome to', style: GoogleFonts.inter(fontSize: 16, color: kTextMuted)),
      const SizedBox(height: 8),
      Text('Pune Urban Shield', style: GoogleFonts.inter(
        fontSize: 28, fontWeight: FontWeight.w900, color: kTextPri)),
      const SizedBox(height: 16),
      Text('Your personal safety companion during floods, disasters, and urban crises in Pune.',
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(fontSize: 14, color: kTextSec, height: 1.7)),
      const SizedBox(height: 40),
      _FeatureRow('🔔', 'Real-Time Alerts', 'Live alerts from PMC & PCMC'),
      const SizedBox(height: 14),
      _FeatureRow('🌧️', 'Live Weather', 'Flood impact assessment & forecast'),
      const SizedBox(height: 14),
      _FeatureRow('🗺️', 'Risk Map', 'Ward-wise risk levels & safe shelters'),
      const SizedBox(height: 14),
      _FeatureRow('🆘', 'SOS Contacts', 'One-tap emergency calling'),
      const SizedBox(height: 48),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: onNext,
          style: ElevatedButton.styleFrom(
            backgroundColor: kBrand, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Text('Get Started →', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800)),
        ),
      ),
    ]);
  }
}

class _FeatureRow extends StatelessWidget {
  final String icon;
  final String title;
  final String subtitle;
  const _FeatureRow(this.icon, this.title, this.subtitle);

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Container(
        width: 42, height: 42,
        decoration: BoxDecoration(
          color: kBrand.withOpacity(0.1), borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kBrand.withOpacity(0.2)),
        ),
        child: Center(child: Text(icon, style: const TextStyle(fontSize: 20))),
      ),
      const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: kTextPri)),
        Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: kTextMuted)),
      ]),
    ]);
  }
}

class _NameStep extends StatelessWidget {
  final TextEditingController ctrl;
  final VoidCallback onNext;
  const _NameStep({required this.ctrl, required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Text('👋', style: TextStyle(fontSize: 56)),
      const SizedBox(height: 24),
      Text('What should we call you?', style: GoogleFonts.inter(
        fontSize: 24, fontWeight: FontWeight.w900, color: kTextPri)),
      const SizedBox(height: 12),
      Text('This helps us personalize your safety alerts',
        style: GoogleFonts.inter(fontSize: 13, color: kTextMuted)),
      const SizedBox(height: 40),
      TextField(
        controller: ctrl,
        autofocus: true,
        style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: kTextPri),
        textCapitalization: TextCapitalization.words,
        decoration: InputDecoration(
          hintText: 'Your name (optional)',
          hintStyle: GoogleFonts.inter(fontSize: 16, color: kTextMuted),
          filled: true, fillColor: kBgCard,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: kBorder)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: kBorder)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kBrand, width: 2)),
          contentPadding: const EdgeInsets.all(18),
        ),
        onSubmitted: (_) => onNext(),
      ),
      const SizedBox(height: 32),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: onNext,
          style: ElevatedButton.styleFrom(
            backgroundColor: kBrand, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Text('Continue →', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800)),
        ),
      ),
    ]);
  }
}

class _WardStep extends StatelessWidget {
  final List<String> wards;
  final String selected;
  final ValueChanged<String> onChanged;
  final VoidCallback onFinish;
  const _WardStep({required this.wards, required this.selected, required this.onChanged, required this.onFinish});

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      const SizedBox(height: 40),
      const Text('🗺️', style: TextStyle(fontSize: 48)),
      const SizedBox(height: 20),
      Text('Select Your Ward', style: GoogleFonts.inter(
        fontSize: 22, fontWeight: FontWeight.w900, color: kTextPri)),
      const SizedBox(height: 8),
      Text('We\'ll show you risk alerts relevant to your area',
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(fontSize: 13, color: kTextMuted)),
      const SizedBox(height: 24),

      Expanded(
        child: Container(
          decoration: BoxDecoration(
            color: kBgCard, borderRadius: BorderRadius.circular(16),
            border: Border.all(color: kBorder)),
          child: ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: wards.length,
            itemBuilder: (ctx, i) {
              final ward = wards[i];
              final isSel = selected == ward;
              return GestureDetector(
                onTap: () => onChanged(ward),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(vertical: 3),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isSel ? kBrand.withOpacity(0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isSel ? kBrand.withOpacity(0.5) : Colors.transparent),
                  ),
                  child: Row(children: [
                    Text(ward, style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                      color: isSel ? kBrand : kTextSec)),
                    const Spacer(),
                    if (isSel) const Icon(Icons.check_circle, color: kBrand, size: 20),
                  ]),
                ),
              );
            },
          ),
        ),
      ),

      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: onFinish,
          style: ElevatedButton.styleFrom(
            backgroundColor: kBrand, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 18),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: Text('Enter Pune Urban Shield ✓',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800)),
        ),
      ),
      const SizedBox(height: 8),
    ]);
  }
}

// ─────────────────────────────────────────────
//  Home Screen — Bottom Navigation
// ─────────────────────────────────────────────
class HomeScreen extends StatefulWidget {
  final String? userName;
  final String? userWard;
  const HomeScreen({super.key, this.userName, this.userWard});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  int _tab = 0;
  late AnimationController _fabAnim;

  @override
  void initState() {
    super.initState();
    _fabAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..forward();
  }

  @override
  void dispose() { _fabAnim.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final pages = [
      const AlertsPage(),
      const WeatherPage(),
      const RiskMapPage(),
      const ReportPage(),
      const SosPage(),
    ];

    return Scaffold(
      backgroundColor: kBgDark,
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: child),
        child: KeyedSubtree(key: ValueKey(_tab), child: pages[_tab]),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: kBgCard,
          border: Border(top: BorderSide(color: kBorder, width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            backgroundColor: Colors.transparent,
            indicatorColor: kBrand.withOpacity(0.18),
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            height: 64,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.notifications_outlined, color: kTextSec),
                selectedIcon: Icon(Icons.notifications_rounded, color: kBrand),
                label: 'Alerts',
              ),
              NavigationDestination(
                icon: Icon(Icons.cloud_outlined, color: kTextSec),
                selectedIcon: Icon(Icons.cloud_rounded, color: kBrand),
                label: 'Weather',
              ),
              NavigationDestination(
                icon: Icon(Icons.map_outlined, color: kTextSec),
                selectedIcon: Icon(Icons.map_rounded, color: kBrand),
                label: 'Risk Map',
              ),
              NavigationDestination(
                icon: Icon(Icons.report_problem_outlined, color: kTextSec),
                selectedIcon: Icon(Icons.report_problem_rounded, color: kBrand),
                label: 'Report',
              ),
              NavigationDestination(
                icon: Icon(Icons.sos_outlined, color: kTextSec),
                selectedIcon: Icon(Icons.sos_rounded, color: kCritical),
                label: 'SOS',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
