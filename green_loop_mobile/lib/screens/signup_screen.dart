import 'package:flutter/material.dart';

import '../main.dart';
import '../services/api_service.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();

  bool loading = false;
  bool obscure = true;
  bool obscureConfirm = true;

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    final name = nameController.text.trim();
    final email = emailController.text.trim().toLowerCase();
    final password = passwordController.text;
    final confirm = confirmPasswordController.text;

    if (name.isEmpty ||
        email.isEmpty ||
        password.isEmpty ||
        confirm.isEmpty) {
      _message('Please fill all fields.');
      return;
    }

    if (!email.contains('@')) {
      _message('Please enter a valid email.');
      return;
    }

    if (password.length < 6) {
      _message('Password must contain at least 6 characters.');
      return;
    }

    if (password != confirm) {
      _message('Passwords do not match.');
      return;
    }

    setState(() => loading = true);

    try {
      final result = await ApiService.signup(
        name,
        email,
        password,
      );

      final user = Map<String, dynamic>.from(
        result['user'] ?? result,
      );

      UserSession.setUser(user);

      if (!mounted) return;

      _message(
        result['message']?.toString() ??
            'Account created successfully.',
      );

      await Future<void>.delayed(
        const Duration(milliseconds: 400),
      );

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => const ResponsiveHome(),
        ),
        (_) => false,
      );
    } catch (e) {
      if (!mounted) return;
      _message(
        e.toString().replaceFirst('Exception: ', ''),
      );
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _message(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F8F6),
      appBar: AppBar(
        title: const Text('Create Account'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                children: [
                  const Text(
                    'Join Green Loop',
                    style: TextStyle(
                      fontSize: 27,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Create your recycling account.',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 30),
                  TextField(
                    controller: nameController,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.person_outline),
                      hintText: 'Full name',
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: emailController,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.email_outlined),
                      hintText: 'Email',
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: passwordController,
                    obscureText: obscure,
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.lock_outline),
                      hintText: 'Password',
                      suffixIcon: IconButton(
                        onPressed: () {
                          setState(() => obscure = !obscure);
                        },
                        icon: Icon(
                          obscure
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: confirmPasswordController,
                    obscureText: obscureConfirm,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _signup(),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.lock_reset_outlined),
                      hintText: 'Confirm password',
                      suffixIcon: IconButton(
                        onPressed: () {
                          setState(
                            () => obscureConfirm = !obscureConfirm,
                          );
                        },
                        icon: Icon(
                          obscureConfirm
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: loading ? null : _signup,
                      child: loading
                          ? const CircularProgressIndicator()
                          : const Text('Create Account'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

