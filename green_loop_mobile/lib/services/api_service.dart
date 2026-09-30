import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://10.181.226.213:5000';

  // ==========================================================
  // SCAN PRODUCT
  // ==========================================================

  static Future<Map<String, dynamic>> scanProduct(
      String barcode) async {
    final response = await http.post(
      Uri.parse('$baseUrl/scan-product'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'barcode': barcode,
      }),
    );

    if (response.statusCode == 200 ||
        response.statusCode == 404) {
      return jsonDecode(response.body);
    }

    throw Exception(
      'Failed to scan product: ${response.statusCode}',
    );
  }

  // ==========================================================
  // CREATE USER
  // ==========================================================

  static Future<Map<String, dynamic>> createUser(
      String name,
      String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/create-user'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'name': name,
        'email': email,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }

    throw Exception('Failed to create user');
  }

  // ==========================================================
  // GET USER
  // ==========================================================

  static Future<Map<String, dynamic>> getUser(
      String userId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/user/$userId'),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }

    throw Exception('Failed to load user');
  }

  // ==========================================================
  // GET HISTORY
  // ==========================================================

  static Future<List<dynamic>> getHistory(
      String userId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/history/$userId'),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }

    throw Exception('Failed to load history');
  }

  // ==========================================================
  // GET PRODUCTS
  // ==========================================================

  static Future<List<dynamic>> getProducts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/products'),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }

    throw Exception('Failed to load products');
  }
}