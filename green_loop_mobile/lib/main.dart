import 'package:flutter/material.dart';

import 'screens/login_screen.dart';
import 'screens/barcode_scanner_screen.dart';
import 'services/api_service.dart';

void main() {
  runApp(const GreenLoopApp());
}

class UserSession {
  static Map<String, dynamic>? _user;

  static Map<String, dynamic>? get user => _user;

  static String? get id => _user?['id']?.toString() ?? _user?['_id']?.toString();

  static bool get isLoggedIn => id != null;

  static void setUser(Map<String, dynamic> user) {
    _user = Map<String, dynamic>.from(user);
  }

  static void clear() {
    _user = null;
  }
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
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

class ResponsiveHome extends StatefulWidget {
  const ResponsiveHome({super.key});

  @override
  State<ResponsiveHome> createState() => _ResponsiveHomeState();
}

class _ResponsiveHomeState extends State<ResponsiveHome> {
  int selectedIndex = 0;
  Map<String, dynamic>? user;
  List<dynamic> history = [];
  List<dynamic> products = [];
  bool loading = true;
  String? error;

  final desktopTitles = const [
    'Dashboard',
    'Recycling',
    'Products',
    'Rewards',
    'EPR Monitoring',
  ];

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    final id = UserSession.id;
    if (id == null) {
      setState(() {
        loading = false;
        error = 'No logged-in user found.';
      });
      return;
    }

    setState(() {
      loading = true;
      error = null;
    });

    try {
      final results = await Future.wait([
        ApiService.getUser(id),
        ApiService.getHistory(id),
        ApiService.getProducts(),
      ]);

      final loadedUser = Map<String, dynamic>.from(results[0] as Map);
      UserSession.setUser(loadedUser);

      if (!mounted) return;

      setState(() {
        user = loadedUser;
        history = List<dynamic>.from(results[1] as List);
        products = List<dynamic>.from(results[2] as List);
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loading = false;
        error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  void _logout() {
    UserSession.clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  void _onSubmitted() {
    _loadAll();
  }

  @override
  Widget build(BuildContext context) {
    if (loading && user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final width = MediaQuery.of(context).size.width;

    if (width >= 900) {
      return _desktop();
    }

    return _mobile();
  }

  Widget _desktop() {
    return Scaffold(
      body: Row(
        children: [
          _desktopSidebar(),
          Expanded(
            child: Column(
              children: [
                _desktopTopBar(),
                Expanded(child: _desktopPage()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _desktopSidebar() {
    return Container(
      width: 245,
      color: const Color(0xFF123D2A),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 25),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: const Icon(
                    Icons.recycling,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(width: 9),
                const Text(
                  'GREEN LOOP',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 35),
            _desktopMenu(0, Icons.dashboard_outlined, 'Dashboard'),
            _desktopMenu(1, Icons.recycling_outlined, 'Recycling'),
            _desktopMenu(2, Icons.inventory_2_outlined, 'Products'),
            _desktopMenu(3, Icons.card_giftcard_outlined, 'Rewards'),
            _desktopMenu(4, Icons.analytics_outlined, 'EPR Monitoring'),
            const Spacer(),
            _desktopMenu(5, Icons.settings_outlined, 'Settings'),
            _desktopMenu(6, Icons.logout, 'Logout'),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _desktopMenu(int index, IconData icon, String title) {
    final selected = selectedIndex == index;

    return InkWell(
      onTap: () {
        if (index < 5) {
          setState(() => selectedIndex = index);
        } else if (index == 5) {
          _showSettings();
        } else {
          _logout();
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 13),
        decoration: BoxDecoration(
          color: selected
              ? Colors.white.withValues(alpha: 0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(icon, color: Colors.white),
            const SizedBox(width: 13),
            Text(
              title,
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  Widget _desktopTopBar() {
    return Container(
      height: 74,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 28),
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
            onPressed: _loadAll,
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh database data',
          ),
          const SizedBox(width: 12),
          CircleAvatar(
            backgroundColor: const Color(0xFFE1F2E7),
            child: const Icon(
              Icons.person,
              color: Colors.green,
            ),
          ),
          const SizedBox(width: 10),
          Text(
            user?['name']?.toString() ?? 'Green Loop User',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _desktopPage() {
    switch (selectedIndex) {
      case 0:
        return DesktopDashboard(
          user: user ?? {},
          history: history,
          onRefresh: _loadAll,
          onScan: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BarcodeScannerScreen(
                  onSubmitted: _onSubmitted,
                ),
              ),
            );
            _loadAll();
          },
        );
      case 1:
        return DesktopRecycling(
          history: history,
          onRefresh: _loadAll,
          onScan: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BarcodeScannerScreen(
                  onSubmitted: _onSubmitted,
                ),
              ),
            );
            _loadAll();
          },
        );
      case 2:
        return DesktopProducts(products: products);
      case 3:
        return DesktopRewards(
          user: user ?? {},
          onChanged: _loadAll,
        );
      case 4:
        return DesktopEPR(history: history);
      default:
        return DesktopDashboard(
          user: user ?? {},
          history: history,
          onRefresh: _loadAll,
        );
    }
  }

  Widget _mobile() {
    return Scaffold(
      body: _mobilePage(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) {
          setState(() => selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner),
            selectedIcon: Icon(Icons.qr_code_scanner),
            label: 'Scan',
          ),
          NavigationDestination(
            icon: Icon(Icons.history),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.card_giftcard_outlined),
            selectedIcon: Icon(Icons.card_giftcard),
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
        return MobileDashboard(
          user: user ?? {},
          history: history,
          onRefresh: _loadAll,
          onScan: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BarcodeScannerScreen(
                  onSubmitted: _onSubmitted,
                ),
              ),
            );
            _loadAll();
          },
        );
      case 1:
        return BarcodeScannerScreen(
          onSubmitted: _onSubmitted,
        );
      case 2:
        return MobileHistory(
          history: history,
          onRefresh: _loadAll,
        );
      case 3:
        return MobileRewards(
          user: user ?? {},
          onChanged: _loadAll,
        );
      case 4:
        return MobileProfile(
          user: user ?? {},
          onChanged: _loadAll,
          onLogout: _logout,
        );
      default:
        return const SizedBox.shrink();
    }
  }

  void _showSettings() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Settings'),
        content: const Text(
          'Green Loop database-connected application.\n\n'
          'Use Refresh to reload the latest data from MongoDB.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// COMMON WIDGETS
// ============================================================

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.green, size: 29),
          const SizedBox(height: 14),
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
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }
}

String _date(dynamic value) {
  if (value == null) return '-';
  final parsed = DateTime.tryParse(value.toString());
  if (parsed == null) return value.toString();
  final local = parsed.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/'
      '${local.month.toString().padLeft(2, '0')}/'
      '${local.year}';
}

String _historyProduct(dynamic item) {
  if (item is Map && item['product'] is Map) {
    final p = item['product'];
    return p['brand']?.toString() ??
        p['name']?.toString() ??
        'Recycled Item';
  }
  if (item is Map) {
    return item['product_name']?.toString() ??
        item['brand']?.toString() ??
        'Recycled Item';
  }
  return 'Recycled Item';
}

// ============================================================
// DESKTOP DASHBOARD
// ============================================================

class DesktopDashboard extends StatelessWidget {
  final Map<String, dynamic> user;
  final List<dynamic> history;
  final VoidCallback? onRefresh;
  final VoidCallback? onScan;

  const DesktopDashboard({
    super.key,
    required this.user,
    required this.history,
    this.onRefresh,
    this.onScan,
  });

  @override
  Widget build(BuildContext context) {
    final weight = history.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(
            item['total_weight']?.toString() ?? '0',
          ) ??
          0),
    );

    return RefreshIndicator(
      onRefresh: () async => onRefresh?.call(),
      child: ListView(
        padding: const EdgeInsets.all(30),
        children: [
          const Text(
            'Dashboard',
            style: TextStyle(
              fontSize: 29,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Your Green Loop recycling overview.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 25),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'My Points',
                  value: '${user['points'] ?? 0}',
                  icon: Icons.stars,
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: _StatCard(
                  title: 'Items Recycled',
                  value: '${history.length}',
                  icon: Icons.recycling,
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: _StatCard(
                  title: 'Waste Recycled',
                  value: '${weight.toStringAsFixed(2)} g',
                  icon: Icons.scale,
                ),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: _StatCard(
                  title: 'Impact',
                  value: '${history.length}',
                  icon: Icons.eco,
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
                child: _desktopRecent(history),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: _desktopQuickActions(
                  context,
                  onScan,
                  onRefresh,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _desktopRecent(List<dynamic> items) {
    return Container(
      padding: const EdgeInsets.all(24),
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
          const SizedBox(height: 18),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text('No recycling activity yet.'),
            )
          else
            ...items.take(6).map(
              (item) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const CircleAvatar(
                  backgroundColor: Color(0xFFE1F2E7),
                  child: Icon(
                    Icons.recycling,
                    color: Colors.green,
                  ),
                ),
                title: Text(_historyProduct(item)),
                subtitle: Text(
                  '${item['quantity'] ?? 0} item(s) • '
                  '${item['status'] ?? 'Verified'} • '
                  '${_date(item['createdAt'] ?? item['created_at'])}',
                ),
                trailing: Text(
                  '+${item['points_earned'] ?? 0}',
                  style: const TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _desktopQuickActions(
    BuildContext context,
    VoidCallback? scan,
    VoidCallback? refresh,
  ) {
    return Container(
      padding: const EdgeInsets.all(24),
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
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: scan,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('Scan Product'),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: refresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh Data'),
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
  final List<dynamic> history;
  final VoidCallback? onRefresh;
  final VoidCallback? onScan;

  const DesktopRecycling({
    super.key,
    required this.history,
    this.onRefresh,
    this.onScan,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(30),
      children: [
        Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Recycling Management',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text('All recycling submissions from your account.'),
                ],
              ),
            ),
            ElevatedButton.icon(
              onPressed: onScan,
              icon: const Icon(Icons.qr_code_scanner),
              label: const Text('New Recycling'),
            ),
          ],
        ),
        const SizedBox(height: 25),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: history.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(30),
                  child: Text('No recycling records found.'),
                )
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Product')),
                      DataColumn(label: Text('Quantity')),
                      DataColumn(label: Text('Weight')),
                      DataColumn(label: Text('Status')),
                      DataColumn(label: Text('Points')),
                      DataColumn(label: Text('Date')),
                    ],
                    rows: history.map((item) {
                      return DataRow(
                        cells: [
                          DataCell(Text(_historyProduct(item))),
                          DataCell(Text('${item['quantity'] ?? 0}')),
                          DataCell(
                            Text('${item['total_weight'] ?? 0} g'),
                          ),
                          DataCell(
                            Text('${item['status'] ?? '-'}'),
                          ),
                          DataCell(
                            Text(
                              '+${item['points_earned'] ?? 0}',
                              style: const TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          DataCell(
                            Text(
                              _date(
                                item['createdAt'] ??
                                    item['created_at'],
                              ),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
        ),
      ],
    );
  }
}

// ============================================================
// DESKTOP PRODUCTS
// ============================================================

class DesktopProducts extends StatelessWidget {
  final List<dynamic> products;

  const DesktopProducts({
    super.key,
    required this.products,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(30),
      children: [
        const Text(
          'Products',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Products registered in the Green Loop database.',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 25),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: products.isEmpty
              ? const Padding(
                  padding: EdgeInsets.all(30),
                  child: Text('No products found in MongoDB.'),
                )
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: const [
                      DataColumn(label: Text('Brand')),
                      DataColumn(label: Text('Barcode')),
                      DataColumn(label: Text('Weight')),
                      DataColumn(label: Text('Points')),
                    ],
                    rows: products.map((product) {
                      return DataRow(
                        cells: [
                          DataCell(
                            Text(
                              product['brand']?.toString() ?? '-',
                            ),
                          ),
                          DataCell(
                            Text(
                              product['barcode']?.toString() ?? '-',
                            ),
                          ),
                          DataCell(
                            Text('${product['weight'] ?? 0} g'),
                          ),
                          DataCell(
                            Text(
                              '${product['points'] ?? 0}',
                              style: const TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                ),
        ),
      ],
    );
  }
}

// ============================================================
// DESKTOP REWARDS
// ============================================================

class DesktopRewards extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onChanged;

  const DesktopRewards({
    super.key,
    required this.user,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final rewards = const [
      {'id': 'r50', 'title': '₹50 Shopping Discount', 'points': 500},
      {'id': 'r100', 'title': '₹100 Shopping Discount', 'points': 1000},
      {'id': 'r250', 'title': '₹250 Shopping Discount', 'points': 2500},
    ];

    return ListView(
      padding: const EdgeInsets.all(30),
      children: [
        const Text(
          'Rewards',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Redeem your recycling points.',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 25),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Available Points',
                value: '${user['points'] ?? 0}',
                icon: Icons.stars,
              ),
            ),
          ],
        ),
        const SizedBox(height: 25),
        Container(
          padding: const EdgeInsets.all(24),
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
              const SizedBox(height: 15),
              ...rewards.map(
                (reward) => _RewardTile(
                  reward: reward,
                  user: user,
                  onChanged: onChanged,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RewardTile extends StatefulWidget {
  final Map<String, dynamic> reward;
  final Map<String, dynamic> user;
  final VoidCallback onChanged;

  const _RewardTile({
    required this.reward,
    required this.user,
    required this.onChanged,
  });

  @override
  State<_RewardTile> createState() => _RewardTileState();
}

class _RewardTileState extends State<_RewardTile> {
  bool loading = false;

  Future<void> _redeem() async {
    final userId = UserSession.id;
    if (userId == null) return;

    final cost = int.parse(widget.reward['points'].toString());
    final current = int.tryParse(
          widget.user['points']?.toString() ?? '0',
        ) ??
        0;

    if (current < cost) {
      _message('You do not have enough points.');
      return;
    }

    setState(() => loading = true);

    try {
      final result = await ApiService.redeemReward(
        userId: userId,
        rewardId: widget.reward['id'].toString(),
        title: widget.reward['title'].toString(),
        points: cost,
      );

      if (!mounted) return;
      _message(result['message']?.toString() ?? 'Reward redeemed.');
      widget.onChanged();
    } catch (e) {
      if (!mounted) return;
      _message(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _message(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(17),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F8F6),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        children: [
          const Icon(Icons.card_giftcard, color: Colors.green),
          const SizedBox(width: 13),
          Expanded(
            child: Text(
              widget.reward['title'].toString(),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Text(
            '${widget.reward['points']} pts',
            style: const TextStyle(
              color: Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 12),
          ElevatedButton(
            onPressed: loading ? null : _redeem,
            child: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Redeem'),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// DESKTOP EPR
// ============================================================

class DesktopEPR extends StatelessWidget {
  final List<dynamic> history;

  const DesktopEPR({
    super.key,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    final collected = history.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(
            item['total_weight']?.toString() ?? '0',
          ) ??
          0),
    );

    const target = 10000.0;
    final progress = (collected / target).clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.all(30),
      children: [
        const Text(
          'EPR Monitoring',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Monitor recycling activity recorded by Green Loop.',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 25),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Target',
                value: '10,000 g',
                icon: Icons.flag,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: _StatCard(
                title: 'Collected',
                value: '${collected.toStringAsFixed(2)} g',
                icon: Icons.recycling,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: _StatCard(
                title: 'Compliance',
                value: '${(progress * 100).toStringAsFixed(1)}%',
                icon: Icons.verified,
              ),
            ),
          ],
        ),
        const SizedBox(height: 25),
        Container(
          padding: const EdgeInsets.all(25),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'EPR Progress',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              LinearProgressIndicator(
                value: progress,
                minHeight: 13,
                borderRadius: BorderRadius.circular(10),
              ),
              const SizedBox(height: 12),
              Text(
                '${(progress * 100).toStringAsFixed(1)}% of the demo '
                'recycling target is represented by recorded activity.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ============================================================
// MOBILE DASHBOARD
// ============================================================

class MobileDashboard extends StatelessWidget {
  final Map<String, dynamic> user;
  final List<dynamic> history;
  final VoidCallback? onRefresh;
  final VoidCallback? onScan;

  const MobileDashboard({
    super.key,
    required this.user,
    required this.history,
    this.onRefresh,
    this.onScan,
  });

  @override
  Widget build(BuildContext context) {
    final weight = history.fold<double>(
      0,
      (sum, item) => sum + (double.tryParse(
            item['total_weight']?.toString() ?? '0',
          ) ??
          0),
    );

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async => onRefresh?.call(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Green Loop',
                    style: TextStyle(
                      fontSize: 27,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF123D2A),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              'Hello, ${user['name'] ?? 'User'} 👋',
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF123D2A),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.stars,
                    color: Colors.white,
                    size: 40,
                  ),
                  const SizedBox(width: 15),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Available Points',
                        style: TextStyle(
                          color: Colors.white70,
                        ),
                      ),
                      Text(
                        '${user['points'] ?? 0}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 30,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 15),
            Row(
              children: [
                Expanded(
                  child: _mobileStat(
                    Icons.recycling,
                    '${history.length}',
                    'Recycled',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _mobileStat(
                    Icons.scale,
                    '${weight.toStringAsFixed(1)} g',
                    'Waste',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 15),
            SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: onScan,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text(
                  'SCAN BARCODE',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Recent Activity',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (history.isEmpty)
              const _EmptyCard(
                text: 'No recycling activity yet.',
              )
            else
              ...history.take(5).map(
                (item) => _activity(
                  _historyProduct(item),
                  '+${item['points_earned'] ?? 0} points',
                ),
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
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.green),
          const SizedBox(height: 9),
          Text(
            value,
            style: const TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _activity(String name, String points) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
              style: const TextStyle(fontWeight: FontWeight.bold),
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
// MOBILE HISTORY
// ============================================================

class MobileHistory extends StatelessWidget {
  final List<dynamic> history;
  final VoidCallback? onRefresh;

  const MobileHistory({
    super.key,
    required this.history,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async => onRefresh?.call(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Recycling History',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Every recycling submission saved to MongoDB.',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 20),
            if (history.isEmpty)
              const _EmptyCard(
                text: 'No recycling history found.',
              )
            else
              ...history.map(
                (item) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(17),
                  ),
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
                          Expanded(
                            child: Text(
                              _historyProduct(item),
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Text(
                            '+${item['points_earned'] ?? 0}',
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                              fontSize: 17,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      _detail(
                        'Quantity',
                        '${item['quantity'] ?? 0}',
                      ),
                      _detail(
                        'Weight',
                        '${item['total_weight'] ?? 0} g',
                      ),
                      _detail(
                        'Status',
                        '${item['status'] ?? '-'}',
                      ),
                      _detail(
                        'Date',
                        _date(
                          item['createdAt'] ??
                              item['created_at'],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _detail(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// MOBILE REWARDS
// ============================================================

class MobileRewards extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onChanged;

  const MobileRewards({
    super.key,
    required this.user,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final rewards = const [
      {'id': 'r50', 'title': '₹50 Shopping Discount', 'points': 500},
      {'id': 'r100', 'title': '₹100 Shopping Discount', 'points': 1000},
      {'id': 'r250', 'title': '₹250 Shopping Discount', 'points': 2500},
    ];

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Rewards',
            style: TextStyle(
              fontSize: 27,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Use your verified recycling points.',
            style: TextStyle(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF123D2A),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.stars,
                  color: Colors.white,
                  size: 38,
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Your Points',
                      style: TextStyle(color: Colors.white70),
                    ),
                    Text(
                      '${user['points'] ?? 0}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),
          ...rewards.map(
            (reward) => _RewardTile(
              reward: reward,
              user: user,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// MOBILE PROFILE
// ============================================================

class MobileProfile extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onChanged;
  final VoidCallback onLogout;

  const MobileProfile({
    super.key,
    required this.user,
    required this.onChanged,
    required this.onLogout,
  });

  @override
  State<MobileProfile> createState() => _MobileProfileState();
}

class _MobileProfileState extends State<MobileProfile> {
  late TextEditingController nameController;
  late TextEditingController emailController;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    nameController = TextEditingController(
      text: widget.user['name']?.toString() ?? '',
    );
    emailController = TextEditingController(
      text: widget.user['email']?.toString() ?? '',
    );
  }

  @override
  void didUpdateWidget(covariant MobileProfile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user['name'] != widget.user['name']) {
      nameController.text = widget.user['name']?.toString() ?? '';
    }
    if (oldWidget.user['email'] != widget.user['email']) {
      emailController.text = widget.user['email']?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final id = UserSession.id;
    if (id == null) return;

    final name = nameController.text.trim();
    final email = emailController.text.trim().toLowerCase();

    if (name.isEmpty || email.isEmpty) {
      _message('Name and email are required.');
      return;
    }

    setState(() => saving = true);

    try {
      final result = await ApiService.updateUser(
        id,
        name: name,
        email: email,
      );

      final updated = Map<String, dynamic>.from(
        result['user'] ?? result,
      );
      UserSession.setUser(updated);

      if (!mounted) return;
      _message('Profile updated successfully.');
      widget.onChanged();
    } catch (e) {
      if (!mounted) return;
      _message(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  void _message(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Profile',
            style: TextStyle(
              fontSize: 27,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 20),
          Center(
            child: CircleAvatar(
              radius: 42,
              backgroundColor: const Color(0xFFE1F2E7),
              child: Text(
                (widget.user['name']?.toString().isNotEmpty ?? false)
                    ? widget.user['name']
                        .toString()
                        .substring(0, 1)
                        .toUpperCase()
                    : 'U',
                style: const TextStyle(
                  color: Colors.green,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 25),
          _field('Name', nameController, Icons.person_outline),
          const SizedBox(height: 15),
          _field(
            'Email',
            emailController,
            Icons.email_outlined,
          ),
          const SizedBox(height: 15),
          _readOnly(
            'Role',
            widget.user['role']?.toString() ?? 'user',
            Icons.badge_outlined,
          ),
          const SizedBox(height: 15),
          _readOnly(
            'Points',
            '${widget.user['points'] ?? 0}',
            Icons.stars_outlined,
          ),
          const SizedBox(height: 25),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: saving ? null : _save,
              child: saving
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Text('Save Changes'),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: widget.onLogout,
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    String label,
    TextEditingController controller,
    IconData icon,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 7),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            prefixIcon: Icon(icon),
            hintText: label,
          ),
        ),
      ],
    );
  }

  Widget _readOnly(
    String label,
    String value,
    IconData icon,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 7),
        TextField(
          readOnly: true,
          controller: TextEditingController(text: value),
          decoration: InputDecoration(
            prefixIcon: Icon(icon),
          ),
        ),
      ],
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String text;

  const _EmptyCard({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
      ),
      child: Center(child: Text(text)),
    );
  }
}
