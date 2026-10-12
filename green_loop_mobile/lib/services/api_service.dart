import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ApiService {
  // For a physical Android phone, run:
  // adb reverse tcp:5000 tcp:5000
  static const String baseUrl = 'http://127.0.0.1:5000';

  // Store the JWT returned by login.
  static String? _token;

  // Store the scan token and expiry for the current product scan.
  static String? _scanToken;
  static String? _scanExpiresAt;

  static void setToken(String token) {
    _token = token;
  }

  static void clearToken() {
    _token = null;
    _scanToken = null;
    _scanExpiresAt = null;
  }

  static Map<String, String> _headers({bool json = true}) {
    return {
      if (json) 'Content-Type': 'application/json',
      if (_token != null && _token!.isNotEmpty)
        'Authorization': 'Bearer $_token',
    };
  }

  // Decode JSON responses and report HTTP errors.
  // Supports JSON objects and lists.
  static dynamic _decode(http.Response response) {
    dynamic decoded;

    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      throw Exception(
        'Invalid server response (${response.statusCode}): '
        '${response.body}',
      );
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (decoded is Map) {
        throw Exception(
          decoded['error'] ??
              decoded['message'] ??
              'Request failed (${response.statusCode})',
        );
      }

      throw Exception('Request failed (${response.statusCode}).');
    }

    if (decoded is! Map && decoded is! List) {
      throw Exception('Unexpected server response format.');
    }

    return decoded;
  }

  // ------------------------------------------------------------
  // IMAGE VERIFICATION
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> verifyWasteImage({
    required File image,
    required String scanToken,
  }) async {
    try {
      if (_token == null || _token!.isEmpty) {
        throw Exception('Please log in again. Authentication token missing.');
      }

      if (!await image.exists()) {
        throw Exception('Captured image file does not exist.');
      }

      final uri = Uri.parse('$baseUrl/verify-waste-image');
      final request = http.MultipartRequest('POST', uri);

      request.headers['Authorization'] = 'Bearer $_token';
      request.fields['scanToken'] = scanToken;

      // Send the captured image as JPEG.
      // The backend receives the multipart field named "file".
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          image.path,
          filename: 'waste_image.jpg',
          contentType: MediaType('image', 'jpeg'),
        ),
      );

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 60),
      );

      final response = await http.Response.fromStream(streamedResponse);
      final dynamic decoded;

      try {
        decoded = jsonDecode(response.body);
      } catch (_) {
        throw Exception(
          'Invalid verification response (${response.statusCode}): '
          '${response.body}',
        );
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (decoded is Map) {
          throw Exception(
            decoded['error'] ??
                decoded['message'] ??
                'Image verification failed (${response.statusCode})',
          );
        }

        throw Exception(
          'Image verification failed (${response.statusCode}).',
        );
      }

      if (decoded is! Map) {
        throw Exception('Unexpected image verification response.');
      }

      return Map<String, dynamic>.from(decoded);
    } catch (e) {
      throw Exception('Verification failed: $e');
    }
  }

  // ------------------------------------------------------------
  // SIGNUP
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> signup(
    String name,
    String email,
    String password,
  ) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/auth/signup'),
          headers: _headers(),
          body: jsonEncode({
            'name': name,
            'email': email,
            'password': password,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);

    return Map<String, dynamic>.from(data as Map);
  }

  // ------------------------------------------------------------
  // LOGIN
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/auth/login'),
          headers: _headers(),
          body: jsonEncode({
            'email': email,
            'password': password,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);
    final result = Map<String, dynamic>.from(data as Map);

    final token = result['token'];

    if (token is String && token.isNotEmpty) {
      setToken(token);
    } else {
      throw Exception('Login response did not contain a JWT token.');
    }

    return result;
  }

  // ------------------------------------------------------------
  // SCAN PRODUCT
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> scanProduct(
    String barcode,
  ) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/scan-product'),
          headers: _headers(),
          body: jsonEncode({
            'barcode': barcode,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);
    final map = Map<String, dynamic>.from(data as Map);

    if (map['product'] is Map) {
      final product = Map<String, dynamic>.from(
        map['product'] as Map,
      );

      _scanToken = map['scanToken']?.toString();
      _scanExpiresAt = map['expiresAt']?.toString();

      product['_scanToken'] = _scanToken;
      product['_scanExpiresAt'] = _scanExpiresAt;

      return product;
    }

    return map;
  }

  // ------------------------------------------------------------
  // SUBMIT RECYCLING
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> submitWaste({
    required String userId,
    required String productId,
    required int quantity,
    required double totalWeight,
    required String scanToken,
    required String verificationId,
  }) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/submit-waste'),
          headers: _headers(),
          body: jsonEncode({
            'user_id': userId,
            'product_id': productId,
            'quantity': quantity,
            'total_weight': totalWeight,
            'scanToken': scanToken,
            'verificationId': verificationId,
          }),
        )
        .timeout(const Duration(seconds: 20));

    final data = _decode(response);

    return Map<String, dynamic>.from(data as Map);
  }

  // ------------------------------------------------------------
  // GET USER
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> getUser(
    String userId,
  ) async {
    final response = await http
        .get(
          Uri.parse('$baseUrl/user/$userId'),
          headers: _headers(json: false),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);
    final map = Map<String, dynamic>.from(data as Map);

    if (map['user'] is Map) {
      return Map<String, dynamic>.from(map['user'] as Map);
    }

    return map;
  }

  // ------------------------------------------------------------
  // GET RECYCLING HISTORY
  // ------------------------------------------------------------

  static Future<List<dynamic>> getHistory(
    String userId,
  ) async {
    final response = await http
        .get(
          Uri.parse('$baseUrl/history/$userId'),
          headers: _headers(json: false),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);

    if (data is List) {
      return List<dynamic>.from(data);
    }

    if (data is Map && data['history'] is List) {
      return List<dynamic>.from(data['history']);
    }

    return [];
  }

  // ------------------------------------------------------------
  // GET PRODUCTS
  // ------------------------------------------------------------

  static Future<List<dynamic>> getProducts() async {
    final response = await http
        .get(
          Uri.parse('$baseUrl/products'),
          headers: _headers(json: false),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);

    if (data is List) {
      return List<dynamic>.from(data);
    }

    if (data is Map && data['products'] is List) {
      return List<dynamic>.from(data['products']);
    }

    return [];
  }

  // ------------------------------------------------------------
  // UPDATE USER
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> updateUser(
    String userId, {
    required String name,
    required String email,
  }) async {
    final response = await http
        .patch(
          Uri.parse('$baseUrl/user/$userId'),
          headers: _headers(),
          body: jsonEncode({
            'name': name,
            'email': email,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);

    return Map<String, dynamic>.from(data as Map);
  }

  // ------------------------------------------------------------
  // REDEEM REWARD
  // ------------------------------------------------------------

  static Future<Map<String, dynamic>> redeemReward({
    required String userId,
    required String rewardId,
    required String title,
    required int points,
  }) async {
    final response = await http
        .post(
          Uri.parse('$baseUrl/rewards/redeem'),
          headers: _headers(),
          body: jsonEncode({
            'userId': userId,
            'rewardId': rewardId,
            'title': title,
            'points': points,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final data = _decode(response);

    return Map<String, dynamic>.from(data as Map);
  }
}