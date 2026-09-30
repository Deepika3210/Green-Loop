import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../services/api_service.dart';

class BarcodeScannerScreen extends StatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  State<BarcodeScannerScreen> createState() =>
      _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState
    extends State<BarcodeScannerScreen> {

  bool isProcessing = false;

  Future<void> handleBarcode(String barcode) async {

    if (isProcessing) return;

    if (barcode.isEmpty) return;

    setState(() {
      isProcessing = true;
    });

    try {

      final result =
          await ApiService.scanProduct(barcode);

      if (!mounted) return;

      setState(() {
        isProcessing = false;
      });

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductResultScreen(
            barcode: barcode,
            result: result,
          ),
        ),
      );

    } catch (error) {

      if (!mounted) return;

      setState(() {
        isProcessing = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Could not connect to Green Loop server',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {

    return Scaffold(

      backgroundColor: const Color(0xFFF7FAF8),

      appBar: AppBar(
        title: const Text(
          'Barcode Scanner',
          style: TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      body: Stack(

        children: [

          MobileScanner(

            onDetect: (capture) {

              final List<Barcode> barcodes =
                  capture.barcodes;

              if (barcodes.isEmpty) return;

              final String? value =
                  barcodes.first.rawValue;

              if (value != null) {
                handleBarcode(value);
              }
            },
          ),

          // Scanner overlay
          Center(
            child: Container(
              width: 280,
              height: 160,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.white,
                  width: 3,
                ),
                borderRadius:
                    BorderRadius.circular(16),
              ),
            ),
          ),

          Positioned(
            bottom: 70,
            left: 0,
            right: 0,
            child: Column(
              children: [

                const Text(
                  'Position the barcode inside the frame',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 12),

                if (isProcessing)
                  const CircularProgressIndicator(
                    color: Colors.white,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ======================================================
// PRODUCT RESULT
// ======================================================

class ProductResultScreen extends StatefulWidget {

  final String barcode;
  final Map<String, dynamic> result;

  const ProductResultScreen({
    super.key,
    required this.barcode,
    required this.result,
  });

  @override
  State<ProductResultScreen> createState() =>
      _ProductResultScreenState();
}

class _ProductResultScreenState
    extends State<ProductResultScreen> {

  int quantity = 1;

  @override
  Widget build(BuildContext context) {

    final product = widget.result;
    if (product == null) {

      return Scaffold(

        appBar: AppBar(
          title: const Text('Product'),
        ),

        body: const Center(
          child: Text(
            'Product Not Found',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    final String name =
        product['name']?.toString() ??
        'Unknown Product';

    final String brand =
        product['brand']?.toString() ??
        '';

    final num weight =
        product['weight'] ?? 0;

    final num points =
        product['points'] ?? 0;

    return Scaffold(

      backgroundColor:
          const Color(0xFFF7FAF8),

      appBar: AppBar(
        title: const Text(
          'Product Details',
        ),
      ),

      body: SingleChildScrollView(

        padding: const EdgeInsets.all(20),

        child: Column(

          crossAxisAlignment:
              CrossAxisAlignment.start,

          children: [

            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),

              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius:
                    BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color:
                        Colors.black.withOpacity(0.06),
                    blurRadius: 12,
                  ),
                ],
              ),

              child: Column(

                crossAxisAlignment:
                    CrossAxisAlignment.start,

                children: [

                  const Icon(
                    Icons.recycling,
                    size: 55,
                    color: Colors.green,
                  ),

                  const SizedBox(height: 15),

                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 25,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  if (brand.isNotEmpty)
                    Text(
                      brand,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 16,
                      ),
                    ),

                  const Divider(height: 30),

                  _infoRow(
                    'Barcode',
                    widget.barcode,
                  ),

                  _infoRow(
                    'Weight',
                    '$weight g',
                  ),

                  _infoRow(
                    'Points',
                    '$points points',
                  ),
                ],
              ),
            ),

            const SizedBox(height: 25),

            const Text(
              'Quantity',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 12),

            Row(

              mainAxisAlignment:
                  MainAxisAlignment.center,

              children: [

                IconButton(
                  onPressed: () {

                    if (quantity > 1) {
                      setState(() {
                        quantity--;
                      });
                    }
                  },

                  icon: const Icon(
                    Icons.remove_circle_outline,
                    size: 35,
                  ),
                ),

                const SizedBox(width: 20),

                Text(
                  '$quantity',
                  style: const TextStyle(
                    fontSize: 25,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(width: 20),

                IconButton(
                  onPressed: () {

                    setState(() {
                      quantity++;
                    });

                  },

                  icon: const Icon(
                    Icons.add_circle_outline,
                    size: 35,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 55,

              child: ElevatedButton(

                onPressed: () {

                  ScaffoldMessenger.of(context)
                      .showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Product selected. Recycling submission will be connected next.',
                      ),
                    ),
                  );

                },

                child: const Text(
                  'CONTINUE',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(
    String title,
    String value,
  ) {

    return Padding(

      padding:
          const EdgeInsets.only(bottom: 14),

      child: Row(

        mainAxisAlignment:
            MainAxisAlignment.spaceBetween,

        children: [

          Text(
            title,
            style: TextStyle(
              color: Colors.grey[600],
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