import 'dart:io';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:image_picker/image_picker.dart';

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
  final ImagePicker _imagePicker = ImagePicker();

  int quantity = 1;

  bool capturingPhoto = false;
  bool verifyingImage = false;
  bool submitting = false;

  File? capturedImage;
  Map<String, dynamic>? verification;

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

  String? get scanToken =>
      widget.product['_scanToken']?.toString();

  String? get verificationId =>
      verification?['verificationId']?.toString();

  bool get verified =>
      verificationId != null && verificationId!.isNotEmpty;

  Future<void> _takeLivePhoto() async {
    if (capturingPhoto || verifyingImage || submitting) return;

    try {
      setState(() => capturingPhoto = true);

      final XFile? photo = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 85,
      );

      if (!mounted) return;

      if (photo == null) return;

      setState(() {
        capturedImage = File(photo.path);
        verification = null;
      });
    } catch (e) {
      _message(
        'Unable to capture photo: '
        '${e.toString().replaceFirst('Exception: ', '')}',
      );
    } finally {
      if (mounted) {
        setState(() => capturingPhoto = false);
      }
    }
  }

  Future<void> _verifyPhoto() async {
    if (capturedImage == null) {
      _message('Please take a live photo first.');
      return;
    }

    if (scanToken == null || scanToken!.isEmpty) {
      _message('Scan token is missing. Please scan again.');
      return;
    }

    if (verifyingImage || submitting) return;

    setState(() {
      verifyingImage = true;
      verification = null;
    });

    try {
      final result = await ApiService.verifyWasteImage(
        image: capturedImage!,
        scanToken: scanToken!,
      );

      if (!mounted) return;

      final id = result['verificationId']?.toString();

      if (id == null || id.isEmpty) {
        throw Exception(
          'The server did not return a verification ID.',
        );
      }

      setState(() {
        verification = result;
      });

      _message('Photo verification completed. You can submit recycling.');
    } catch (e) {
      if (!mounted) return;

      _message(
        'Verification failed: '
        '${e.toString().replaceFirst('Exception: ', '')}',
      );
    } finally {
      if (mounted) {
        setState(() => verifyingImage = false);
      }
    }
  }

  Future<void> _submit() async {
    if (submitting || verifyingImage) return;

    final userId = UserSession.id;

    if (userId == null || userId.isEmpty) {
      _message('Please log in again.');
      return;
    }

    final productId =
        widget.product['_id']?.toString() ??
        widget.product['id']?.toString();

    if (productId == null || productId.isEmpty) {
      _message('Product ID is missing.');
      return;
    }

    if (scanToken == null || scanToken!.isEmpty) {
      _message('Scan token is missing. Please scan again.');
      return;
    }

    if (!verified) {
      _message('Please capture and verify the photo first.');
      return;
    }

    if (quantity < 1) {
      _message('Quantity must be at least 1.');
      return;
    }

    setState(() => submitting = true);

    try {
      final result = await ApiService.submitWaste(
        userId: userId,
        productId: productId,
        quantity: quantity,
        totalWeight: totalWeight,
        scanToken: scanToken!,
        verificationId: verificationId!,
      );

      if (!mounted) return;

      widget.onSubmitted?.call();

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => AlertDialog(
          icon: const Icon(
            Icons.check_circle,
            color: Colors.green,
            size: 55,
          ),
          title: const Text('Recycling Submitted!'),
          content: Text(
            result['message']?.toString() ??
                'Your recycling submission was successful.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Done'),
            ),
          ],
        ),
      );

      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;

      _message(
        'Submission failed: '
        '${e.toString().replaceFirst('Exception: ', '')}',
      );
    } finally {
      if (mounted) {
        setState(() => submitting = false);
      }
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
          // PRODUCT DETAILS
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

          // QUANTITY
          const Text(
            'Select Quantity',
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
                onPressed: quantity > 1 &&
                        !submitting &&
                        !verifyingImage
                    ? () => setState(() {
                          quantity--;
                          verification = null;
                        })
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
                onPressed: !submitting && !verifyingImage
                    ? () => setState(() {
                          quantity++;
                          verification = null;
                        })
                    : null,
                icon: const Icon(
                  Icons.add_circle_outline,
                  size: 36,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // WEIGHT AND POINTS
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
                  'Potential points',
                  '${pointsPerItem * quantity}',
                ),
              ],
            ),
          ),

          const SizedBox(height: 25),

          // LIVE CAMERA
          SizedBox(
            height: 54,
            child: ElevatedButton.icon(
              onPressed: capturingPhoto ||
                      verifyingImage ||
                      submitting
                  ? null
                  : _takeLivePhoto,
              icon: const Icon(Icons.camera_alt),
              label: Text(
                capturingPhoto
                    ? 'Opening Camera...'
                    : 'TAKE LIVE PHOTO',
              ),
            ),
          ),

          if (capturedImage != null) ...[
            const SizedBox(height: 18),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Captured Waste Image',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(
                      capturedImage!,
                      height: 230,
                      width: double.infinity,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: capturingPhoto ||
                            verifyingImage ||
                            submitting
                        ? null
                        : _takeLivePhoto,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retake Photo'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 15),

            // AI VERIFICATION
            SizedBox(
              height: 54,
              child: ElevatedButton.icon(
                onPressed: verifyingImage ||
                        submitting ||
                        verified
                    ? null
                    : _verifyPhoto,
                icon: verifyingImage
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : Icon(
                        verified
                            ? Icons.check_circle
                            : Icons.verified_outlined,
                      ),
                label: Text(
                  verifyingImage
                      ? 'Verifying Photo...'
                      : verified
                          ? 'PHOTO VERIFIED'
                          : 'VERIFY PHOTO',
                ),
              ),
            ),
          ],

          // HIDE THE PREDICTED CATEGORY.
          if (verified) ...[
            const SizedBox(height: 18),

            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFE1F2E7),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Colors.green,
                    size: 34,
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'AI Verification Complete',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                          ),
                        ),
                        SizedBox(height: 5),
                        Text(
                          'You can now submit your recycling.',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // FINAL SUBMISSION
            SizedBox(
              height: 56,
              child: ElevatedButton.icon(
                onPressed: submitting || verifyingImage
                    ? null
                    : _submit,
                icon: submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.recycling),
                label: Text(
                  submitting
                      ? 'Submitting Recycling...'
                      : 'SUBMIT RECYCLING',
                ),
              ),
            ),
          ],
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