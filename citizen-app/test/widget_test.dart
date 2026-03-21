// Pune Urban Shield — Basic smoke test
import 'package:flutter_test/flutter_test.dart';
import 'package:pune_urban_shield_citizen/main.dart';

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const PuneUrbanShieldApp());
    // Splash screen should be visible initially
    expect(find.text('PUNE URBAN SHIELD'), findsOneWidget);
  });
}
