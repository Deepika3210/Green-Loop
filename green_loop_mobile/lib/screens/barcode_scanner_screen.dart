import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../main.dart';
import '../services/api_service.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final VoidCallback? onSubmitted;

  const BarcodeScannerScreen({
    super.key,
    this.onSubmitted,
  });

  @override
  State<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState
    extends State<BarcodeScannerScreen> {
  bool processing = false;

  Future<void> _handleBarcode(String barcode) async {
    if (processing || barcode.trim().isEmpty) return;

    setState(() => processing = true);

    try {
      final product = await ApiService.scanProduct(barcode.trim());

      if (!mounted) return;

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductResultScreen(
            barcode: barcode.trim(),
            product: product,
            onSubmitted: widget.onSubmitted,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst('Exception: ', ''),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan Product'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: (capture) {
              if (capture.barcodes.isEmpty) return;

              final value = capture.barcodes.first.rawValue;
              if (value == null) return;

              _handleBarcode(value);
            },
          ),
          Center(
            child: Container(
              width: 285,
              height: 170,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.white,
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 60,
            child: Column(
              children: [
                const Text(
                  'Place the barcode inside the frame',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (processing) ...[
                  const SizedBox(height: 15),
                  const CircularProgressIndicator(
                    color: Colors.white,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProductResultScreen extends StatefulWidget {
  final String barcode;
  final Map<String, dynamic> product;
  final VoidCallback? onSubmitted;

  const ProductResultScreen({
    super.key,
    required this.barcode,
    required this.product,
    this.onSubmitted,
  });

  @override
  State<ProductResultScreen> createState() =>
      _ProductResultScreenState();
}

class _ProductResultScreenState
    extends State<ProductResultScreen> {
  int quantity = 1;
  bool submitting = false;

  double get unitWeight {
    return double.tryParse(
          widget.product['weight']?.toString() ?? '0',
        ) ??
        0;
  }

  int get pointsPerItem {
    return int.tryParse(
          widget.product['points']?.toString() ?? '0',
        ) ??
        0;
  }

  double get totalWeight => unitWeight * quantity;

  Future<void> _submit() async {
    final userId = UserSession.id;
    if (userId == null) {
      _message('Please log in again.');
      return;
    }

    final productId = widget.product['_id']?.toString() ??
        widget.product['id']?.toString();

    if (productId == null || productId.isEmpty) {
      _message('Product ID is missing.');
      return;
    }

    setState(() => submitting = true);

    try {
      final result = await ApiService.submitWaste(
        userId: userId,
        productId: productId,
        quantity: quantity,
        totalWeight: totalWeight,
      );

      if (!mounted) return;

      _message(
        result['message']?.toString() ??
            'Recycling submitted successfully.',
      );

      widget.onSubmitted?.call();

      await Future<void>.delayed(
        const Duration(milliseconds: 500),
      );

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;

      _message(
        e.toString().replaceFirst('Exception: ', ''),
      );
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  void _message(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final brand =
        widget.product['brand']?.toString() ?? 'Unknown Product';

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF8),
      appBar: AppBar(
        title: const Text('Product Details'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.recycling,
                  color: Colors.green,
                  size: 58,
                ),
                const SizedBox(height: 15),
                Text(
                  brand,
                  style: const TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Registered Green Loop product',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                  ),
                ),
                const Divider(height: 30),
                _row('Barcode', widget.barcode),
                _row('Unit weight', '$unitWeight g'),
                _row('Points / item', '$pointsPerItem'),
              ],
            ),
          ),
          const SizedBox(height: 22),
          const Text(
            'Quantity',
            style: TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: quantity > 1 && !submitting
                    ? () => setState(() => quantity--)
                    : null,
                icon: const Icon(
                  Icons.remove_circle_outline,
                  size: 36,
                ),
              ),
              const SizedBox(width: 20),
              Text(
                '$quantity',
                style: const TextStyle(
                  fontSize: 27,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 20),
              IconButton(
                onPressed: !submitting
                    ? () => setState(() => quantity++)
                    : null,
                icon: const Icon(
                  Icons.add_circle_outline,
                  size: 36,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFFE1F2E7),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _row('Total weight', '$totalWeight g'),
                _row(
                  'Points earned',
                  '${pointsPerItem * quantity}',
                ),
              ],
            ),
          ),
          const SizedBox(height: 25),
          SizedBox(
            height: 55,
            child: ElevatedButton.icon(
              onPressed: submitting ? null : _submit,
              icon: submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.check_circle_outline),
              label: Text(
                submitting
                    ? 'Saving...'
                    : 'CONFIRM RECYCLING',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String title, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
