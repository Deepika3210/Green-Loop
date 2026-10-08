import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // For a Redmi phone connected by USB:
  // adb reverse tcp:5000 tcp:5000
  //
  // For Chrome on the same laptop, this also works.
  static const String baseUrl = 'http://127.0.0.1:5000';

  static Future<dynamic> _decode(http.Response response) async {
    dynamic data;
    try {
      data = jsonDecode(response.body);
    } catch (_) {
      data = {'message': response.body};
    }

    if (response.statusCode >= 400) {
      final message = data is Map
          ? data['message'] ?? 'Request failed'
          : 'Request failed';
      throw Exception(message.toString());
    }

    return data;
  }

  static Future<Map<String, dynamic>> signup(
    String name,
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    return Map<String, dynamic>.from(data as Map);
  }

  static Future<Map<String, dynamic>> login(
    String email,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    return Map<String, dynamic>.from(data as Map);
  }

  static Future<Map<String, dynamic>> scanProduct(
    String barcode,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/scan-product'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'barcode': barcode}),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    final map = Map<String, dynamic>.from(data as Map);

    if (map['product'] is Map) {
      return Map<String, dynamic>.from(map['product'] as Map);
    }

    return map;
  }

  static Future<Map<String, dynamic>> submitWaste({
    required String userId,
    required String productId,
    required int quantity,
    required double totalWeight,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/submit-waste'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'user_id': userId,
        'product_id': productId,
        'quantity': quantity,
        'total_weight': totalWeight,
      }),
    ).timeout(const Duration(seconds: 20));

    final data = await _decode(response);
    return Map<String, dynamic>.from(data as Map);
  }

  static Future<Map<String, dynamic>> getUser(
    String userId,
  ) async {
    final response = await http.get(
      Uri.parse('$baseUrl/user/$userId'),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    final map = Map<String, dynamic>.from(data as Map);

    if (map['user'] is Map) {
      return Map<String, dynamic>.from(map['user'] as Map);
    }

    return map;
  }

  static Future<List<dynamic>> getHistory(
    String userId,
  ) async {
    final response = await http.get(
      Uri.parse('$baseUrl/history/$userId'),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);

    if (data is List) return List<dynamic>.from(data);
    if (data is Map && data['history'] is List) {
      return List<dynamic>.from(data['history']);
    }
    return [];
  }

  static Future<List<dynamic>> getProducts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/products'),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);

    if (data is List) return List<dynamic>.from(data);
    if (data is Map && data['products'] is List) {
      return List<dynamic>.from(data['products']);
    }
    return [];
  }

  static Future<Map<String, dynamic>> updateUser(
    String userId, {
    required String name,
    required String email,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/user/$userId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    return Map<String, dynamic>.from(data as Map);
  }

  static Future<Map<String, dynamic>> redeemReward({
    required String userId,
    required String rewardId,
    required String title,
    required int points,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/rewards/redeem'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'userId': userId,
        'rewardId': rewardId,
        'title': title,
        'points': points,
      }),
    ).timeout(const Duration(seconds: 15));

    final data = await _decode(response);
    return Map<String, dynamic>.from(data as Map);
  }
}
