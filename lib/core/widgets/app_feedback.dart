import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum AppFeedbackType { success, error, info }

class AppFeedback {
  static void showSnackBar(
    BuildContext context, {
    required String message,
    AppFeedbackType type = AppFeedbackType.info,
  }) {
    final (background, icon) = switch (type) {
      AppFeedbackType.success => (AppColors.success, Icons.check_circle_outline),
      AppFeedbackType.error => (AppColors.danger, Icons.error_outline),
      AppFeedbackType.info => (AppColors.primary, Icons.info_outline),
    };

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: background,
        behavior: SnackBarBehavior.floating,
        content: Row(
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
      ),
    );
  }
}
