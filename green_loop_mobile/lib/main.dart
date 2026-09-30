import 'package:flutter/material.dart';

import 'screens/barcode_scanner_screen.dart';
import 'services/api_service.dart';
void main() {
  runApp(const GreenLoopApp());
}

class GreenLoopApp extends StatelessWidget {
  const GreenLoopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Green Loop',

      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.green,
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F8F6),
      ),

      home: const ResponsiveHome(),
    );
  }
}

// ============================================================
// RESPONSIVE HOME
// ============================================================

class ResponsiveHome extends StatefulWidget {
  const ResponsiveHome({super.key});

  @override
  State<ResponsiveHome> createState() => _ResponsiveHomeState();
}

class _ResponsiveHomeState extends State<ResponsiveHome> {
  int selectedIndex = 0;

  final List<String> desktopTitles = [
    'Dashboard',
    'Recycling',
    'Products',
    'Rewards',
    'EPR Monitoring',
  ];

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    // Desktop / Laptop
    if (width >= 900) {
      return _buildDesktopLayout();
    }

    // Mobile
    return _buildMobileLayout();
  }

  // ==========================================================
  // DESKTOP
  // ==========================================================

  Widget _buildDesktopLayout() {
    return Scaffold(
      body: Row(
        children: [
          _buildDesktopSidebar(),

          Expanded(
            child: Column(
              children: [
                _buildDesktopTopBar(),

                Expanded(
                  child: _desktopPage(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopSidebar() {
    return Container(
      width: 240,
      color: const Color(0xFF123D2A),

      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 25),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.recycling,
                    color: Colors.green,
                  ),
                ),

                const SizedBox(width: 10),

                const Text(
                  'GREEN LOOP',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 40),

            _desktopMenu(
              0,
              Icons.dashboard_outlined,
              'Dashboard',
            ),

            _desktopMenu(
              1,
              Icons.recycling_outlined,
              'Recycling',
            ),

            _desktopMenu(
              2,
              Icons.inventory_2_outlined,
              'Products',
            ),

            _desktopMenu(
              3,
              Icons.card_giftcard_outlined,
              'Rewards',
            ),

            _desktopMenu(
              4,
              Icons.analytics_outlined,
              'EPR Monitoring',
            ),

            const Spacer(),

            _desktopMenu(
              5,
              Icons.settings_outlined,
              'Settings',
            ),

            _desktopMenu(
              6,
              Icons.logout,
              'Logout',
            ),

            const SizedBox(height: 25),
          ],
        ),
      ),
    );
  }

  Widget _desktopMenu(
    int index,
    IconData icon,
    String title,
  ) {
    final selected = selectedIndex == index;

    return InkWell(
      onTap: () {
        if (index < 5) {
          setState(() {
            selectedIndex = index;
          });
        }
      },

      child: Container(
        margin: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 4,
        ),

        padding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),

        decoration: BoxDecoration(
          color: selected
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.transparent,

          borderRadius: BorderRadius.circular(12),
        ),

        child: Row(
          children: [
            Icon(
              icon,
              color: Colors.white,
            ),

            const SizedBox(width: 14),

            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopTopBar() {
    return Container(
      height: 75,
      color: Colors.white,

      padding: const EdgeInsets.symmetric(
        horizontal: 30,
      ),

      child: Row(
        children: [
          Text(
            desktopTitles[selectedIndex],
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),

          const Spacer(),

          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.notifications_none,
            ),
          ),

          const SizedBox(width: 15),

          const CircleAvatar(
            backgroundColor: Color(0xFFE1F2E7),
            child: Icon(
              Icons.person,
              color: Colors.green,
            ),
          ),

          const SizedBox(width: 10),

          const Text(
            'Green Loop Admin',
            style: TextStyle(
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _desktopPage() {
    switch (selectedIndex) {
      case 0:
        return const DesktopDashboard();

      case 1:
        return const DesktopRecycling();

      case 2:
        return const DesktopProducts();

      case 3:
        return DesktopRewards();

      case 4:
        return const DesktopEPR();

      default:
        return const DesktopDashboard();
    }
  }

  // ==========================================================
  // MOBILE
  // ==========================================================

  Widget _buildMobileLayout() {
    return Scaffold(
      body: _mobilePage(),

      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,

        onDestinationSelected: (index) {
          setState(() {
            selectedIndex = index;
          });
        },

        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),

          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),

          NavigationDestination(
            icon: Icon(Icons.history),
            label: 'History',
          ),

          NavigationDestination(
            icon: Icon(Icons.card_giftcard),
            label: 'Rewards',
          ),

          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _mobilePage() {
    switch (selectedIndex) {
      case 0:
        return const MobileDashboard();

      case 1:
        return const BarcodeScannerScreen();

      case 2:
        return const MobileHistory();

      case 3:
        return const MobileRewards();

      case 4:
        return const MobileProfile();

      default:
        return const MobileDashboard();
    }
  }
}

// ============================================================
// MOBILE DASHBOARD
// ============================================================

class MobileDashboard extends StatelessWidget {
  const MobileDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),

        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,

          children: [
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: Color(0xFFE1F2E7),

                  child: Icon(
                    Icons.recycling,
                    color: Colors.green,
                  ),
                ),

                const SizedBox(width: 12),

                const Text(
                  'Green Loop',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const Spacer(),

                IconButton(
                  onPressed: () {},
                  icon: const Icon(
                    Icons.notifications_none,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 30),

            const Text(
              'Welcome back!',
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 5),

            Text(
              'Recycle more. Earn more. Help the planet.',
              style: TextStyle(
                color: Colors.grey.shade600,
              ),
            ),

            const SizedBox(height: 25),

            Row(
              children: [
                Expanded(
                  child: _mobileStat(
                    Icons.stars,
                    '125',
                    'Points',
                  ),
                ),

                const SizedBox(width: 12),

                Expanded(
                  child: _mobileStat(
                    Icons.recycling,
                    '10',
                    'Recycled',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _mobileStat(
                    Icons.scale,
                    '2.4 kg',
                    'Waste',
                  ),
                ),

                const SizedBox(width: 12),

                Expanded(
                  child: _mobileStat(
                    Icons.eco,
                    '5',
                    'Impact',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 25),

            SizedBox(
              width: double.infinity,
              height: 58,

              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) =>
                          const BarcodeScannerScreen(),
                    ),
                  );
                },

                icon: const Icon(
                  Icons.qr_code_scanner,
                ),

                label: const Text(
                  'SCAN BARCODE',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 30),

            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 15),

            _activity(
              'Lays Packaging',
              '+2 points',
            ),

            _activity(
              'Plastic Bottle',
              '+5 points',
            ),

            _activity(
              'Paper Packaging',
              '+3 points',
            ),
          ],
        ),
      ),
    );
  }

  Widget _mobileStat(
    IconData icon,
    String value,
    String title,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),

        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
          ),
        ],
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          Icon(
            icon,
            color: Colors.green,
          ),

          const SizedBox(height: 10),

          Text(
            value,
            style: const TextStyle(
              fontSize: 23,
              fontWeight: FontWeight.bold,
            ),
          ),

          Text(
            title,
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _activity(
    String name,
    String points,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),

      padding: const EdgeInsets.all(15),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
      ),

      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFFE1F2E7),

            child: Icon(
              Icons.recycling,
              color: Colors.green,
            ),
          ),

          const SizedBox(width: 12),

          Expanded(
            child: Text(
              name,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          Text(
            points,
            style: const TextStyle(
              color: Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// DESKTOP DASHBOARD
// ============================================================

class DesktopDashboard extends StatelessWidget {
  const DesktopDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(30),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Overview',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Monitor Green Loop recycling activities.',
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),

          const SizedBox(height: 25),

          Row(
            children: [
              Expanded(
                child: _dashboardCard(
                  'Registered Users',
                  '1,248',
                  Icons.people,
                ),
              ),

              const SizedBox(width: 18),

              Expanded(
                child: _dashboardCard(
                  'Waste Recycled',
                  '2,840 kg',
                  Icons.recycling,
                ),
              ),

              const SizedBox(width: 18),

              Expanded(
                child: _dashboardCard(
                  'Points Distributed',
                  '48,620',
                  Icons.stars,
                ),
              ),

              const SizedBox(width: 18),

              Expanded(
                child: _dashboardCard(
                  'EPR Compliance',
                  '78%',
                  Icons.verified,
                ),
              ),
            ],
          ),

          const SizedBox(height: 25),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,

            children: [
              Expanded(
                flex: 2,
                child: _chartCard(),
              ),

              const SizedBox(width: 20),

              Expanded(
                child: _quickActions(),
              ),
            ],
          ),

          const SizedBox(height: 25),

          _recentRecyclingTable(),
        ],
      ),
    );
  }

  Widget _dashboardCard(
    String title,
    String value,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(22),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),

        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
          ),
        ],
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          Icon(
            icon,
            color: Colors.green,
            size: 30,
          ),

          const SizedBox(height: 18),

          Text(
            value,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 5),

          Text(
            title,
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _chartCard() {
    return Container(
      height: 330,

      padding: const EdgeInsets.all(25),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Recycling Overview',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 25),

          Expanded(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,

              mainAxisAlignment:
                  MainAxisAlignment.spaceEvenly,

              children: [
                _bar('Jan', 0.35),
                _bar('Feb', 0.55),
                _bar('Mar', 0.42),
                _bar('Apr', 0.72),
                _bar('May', 0.60),
                _bar('Jun', 0.85),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bar(
    String month,
    double height,
  ) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,

      children: [
        Container(
          width: 35,
          height: 180 * height,

          decoration: BoxDecoration(
            color: Colors.green,
            borderRadius: BorderRadius.circular(8),
          ),
        ),

        const SizedBox(height: 8),

        Text(
          month,
          style: const TextStyle(
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _quickActions() {
    return Container(
      height: 330,

      padding: const EdgeInsets.all(25),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 20),

          _action(
            Icons.inventory_2,
            'Manage Products',
          ),

          _action(
            Icons.analytics,
            'View EPR Report',
          ),

          _action(
            Icons.people,
            'Manage Users',
          ),

          _action(
            Icons.download,
            'Generate Report',
          ),
        ],
      ),
    );
  }

  Widget _action(
    IconData icon,
    String title,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),

      padding: const EdgeInsets.all(13),

      decoration: BoxDecoration(
        color: const Color(0xFFF5F8F6),
        borderRadius: BorderRadius.circular(12),
      ),

      child: Row(
        children: [
          Icon(
            icon,
            color: Colors.green,
          ),

          const SizedBox(width: 12),

          Text(title),
        ],
      ),
    );
  }

  Widget _recentRecyclingTable() {
    return Container(
      width: double.infinity,

      padding: const EdgeInsets.all(25),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Recent Recycling Activity',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 20),

          const Row(
            children: [
              Expanded(child: Text('Product')),
              Expanded(child: Text('User')),
              Expanded(child: Text('Quantity')),
              Expanded(child: Text('Status')),
              Expanded(child: Text('Points')),
            ],
          ),

          const Divider(),

          _tableRow(
            'Lays Packaging',
            'User 001',
            '3',
            'Verified',
            '+6',
          ),

          _tableRow(
            'Plastic Bottle',
            'User 002',
            '2',
            'Verified',
            '+10',
          ),

          _tableRow(
            'Paper Packaging',
            'User 003',
            '5',
            'Pending',
            '+15',
          ),
        ],
      ),
    );
  }

  Widget _tableRow(
    String product,
    String user,
    String quantity,
    String status,
    String points,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 14,
      ),

      child: Row(
        children: [
          Expanded(child: Text(product)),
          Expanded(child: Text(user)),
          Expanded(child: Text(quantity)),
          Expanded(
            child: Text(
              status,
              style: TextStyle(
                color: status == 'Verified'
                    ? Colors.green
                    : Colors.orange,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              points,
              style: const TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// DESKTOP RECYCLING
// ============================================================

class DesktopRecycling extends StatelessWidget {
  const DesktopRecycling({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Recycling Management',
        style: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

// ============================================================
// DESKTOP PRODUCTS
// ============================================================

class DesktopProducts extends StatefulWidget {
  const DesktopProducts({super.key});

  @override
  State<DesktopProducts> createState() => _DesktopProductsState();
}

class _DesktopProductsState extends State<DesktopProducts> {
  late Future<List<dynamic>> productsFuture;

  @override
  void initState() {
    super.initState();
    productsFuture = ApiService.getProducts();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(30),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Products',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Products registered in the Green Loop system.',
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),

          const SizedBox(height: 20),

          Row(
            children: [
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add),
                label: const Text('Add Product'),
              ),

              const SizedBox(width: 15),

              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    productsFuture =
                        ApiService.getProducts();
                  });
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),

          const SizedBox(height: 25),

          Expanded(
            child: FutureBuilder<List<dynamic>>(
              future: productsFuture,

              builder: (context, snapshot) {

                if (snapshot.connectionState ==
                    ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Text(
                      'Failed to load products:\n${snapshot.error}',
                      textAlign: TextAlign.center,
                    ),
                  );
                }

                final products =
                    snapshot.data ?? [];

                if (products.isEmpty) {
                  return const Center(
                    child: Text(
                      'No products found.',
                    ),
                  );
                }

                return Container(
                  width: double.infinity,

                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.circular(18),
                  ),

                  child: SingleChildScrollView(
                    child: DataTable(
                      columns: const [
                        DataColumn(
                          label: Text('Brand'),
                        ),
                        DataColumn(
                          label: Text('Barcode'),
                        ),
                        DataColumn(
                          label: Text('Weight'),
                        ),
                        DataColumn(
                          label: Text('Points'),
                        ),
                      ],

                      rows: products.map((product) {

                        return DataRow(
                          cells: [
                            DataCell(
                              Text(
                                product['brand']
                                        ?.toString() ??
                                    '-',
                              ),
                            ),

                            DataCell(
                              Text(
                                product['barcode']
                                        ?.toString() ??
                                    '-',
                              ),
                            ),

                            DataCell(
                              Text(
                                '${product['weight'] ?? 0} g',
                              ),
                            ),

                            DataCell(
                              Text(
                                '${product['points'] ?? 0}',
                                style:
                                    const TextStyle(
                                  color: Colors.green,
                                  fontWeight:
                                      FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        );

                      }).toList(),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
// ============================================================
// DESKTOP REWARDS
// ============================================================

class DesktopRewards extends StatelessWidget {
  const DesktopRewards({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(30),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'Rewards Management',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Manage recycling rewards and points.',
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),

          const SizedBox(height: 25),

          Row(
            children: [
              Expanded(
                child: _rewardCard(
                  'Total Points',
                  '48,620',
                  Icons.stars,
                ),
              ),

              const SizedBox(width: 20),

              Expanded(
                child: _rewardCard(
                  'Users Rewarded',
                  '1,024',
                  Icons.people,
                ),
              ),

              const SizedBox(width: 20),

              Expanded(
                child: _rewardCard(
                  'Rewards Redeemed',
                  '326',
                  Icons.card_giftcard,
                ),
              ),
            ],
          ),

          const SizedBox(height: 30),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(25),

            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),

            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,

              children: [
                const Text(
                  'Available Rewards',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 20),

                _rewardRow(
                  '₹50 Shopping Discount',
                  '500 points',
                ),

                _rewardRow(
                  '₹100 Shopping Discount',
                  '1,000 points',
                ),

                _rewardRow(
                  '₹250 Shopping Discount',
                  '2,500 points',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _rewardCard(
    String title,
    String value,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(22),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          Icon(
            icon,
            color: Colors.green,
            size: 30,
          ),

          const SizedBox(height: 15),

          Text(
            value,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 5),

          Text(
            title,
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _rewardRow(
    String reward,
    String points,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),

      padding: const EdgeInsets.all(18),

      decoration: BoxDecoration(
        color: const Color(0xFFF5F8F6),
        borderRadius: BorderRadius.circular(12),
      ),

      child: Row(
        children: [
          const Icon(
            Icons.card_giftcard,
            color: Colors.green,
          ),

          const SizedBox(width: 15),

          Expanded(
            child: Text(
              reward,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),

          Text(
            points,
            style: const TextStyle(
              color: Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}// ============================================================
// DESKTOP EPR
// ============================================================

class DesktopEPR extends StatelessWidget {
  const DesktopEPR({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(30),

      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          const Text(
            'EPR Monitoring',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Monitor manufacturer recycling responsibility.',
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),

          const SizedBox(height: 25),

          Row(
            children: [
              Expanded(
                child: _eprCard(
                  'Target',
                  '10,000 kg',
                ),
              ),

              const SizedBox(width: 20),

              Expanded(
                child: _eprCard(
                  'Collected',
                  '7,500 kg',
                ),
              ),

              const SizedBox(width: 20),

              Expanded(
                child: _eprCard(
                  'Compliance',
                  '75%',
                ),
              ),
            ],
          ),

          const SizedBox(height: 30),

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(25),

            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
            ),

            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,

              children: [
                const Text(
                  'EPR Progress',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 25),

                LinearProgressIndicator(
                  value: 0.75,
                  minHeight: 14,
                  borderRadius:
                      BorderRadius.circular(10),
                ),

                const SizedBox(height: 12),

                const Text(
                  '75% of annual recycling target completed',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _eprCard(
    String title,
    String value,
  ) {
    return Container(
      padding: const EdgeInsets.all(25),

      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),

      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,

        children: [
          Text(
            title,
            style: TextStyle(
              color: Colors.grey.shade600,
            ),
          ),

          const SizedBox(height: 10),

          Text(
            value,
            style: const TextStyle(
              fontSize: 25,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// MOBILE HISTORY
// ============================================================

class MobileHistory extends StatelessWidget {
  const MobileHistory({super.key});

  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text(
          'Recycling History',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

// ============================================================
// MOBILE REWARDS
// ============================================================

class MobileRewards extends StatelessWidget {
  const MobileRewards({super.key});

  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text(
          'Rewards',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

// ============================================================
// MOBILE PROFILE
// ============================================================

class MobileProfile extends StatelessWidget {
  const MobileProfile({super.key});

  @override
  Widget build(BuildContext context) {
    return const SafeArea(
      child: Center(
        child: Text(
          'Profile',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}