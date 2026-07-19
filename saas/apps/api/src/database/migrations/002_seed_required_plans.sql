INSERT INTO plans (
  id, slug, name, description, status,
  max_users, max_research_submissions_monthly, max_report_pdfs_monthly,
  max_active_action_tasks, max_ai_questions_monthly,
  created_at, updated_at
) VALUES (
  'plan-starter', 'starter', 'Starter',
  'Plano inicial para operacao controlada do SaaS.',
  'ACTIVE', 5, 20, 30, 100, 100, NOW()::TEXT, NOW()::TEXT
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  max_users = EXCLUDED.max_users,
  max_research_submissions_monthly = EXCLUDED.max_research_submissions_monthly,
  max_report_pdfs_monthly = EXCLUDED.max_report_pdfs_monthly,
  max_active_action_tasks = EXCLUDED.max_active_action_tasks,
  max_ai_questions_monthly = EXCLUDED.max_ai_questions_monthly,
  updated_at = EXCLUDED.updated_at;

INSERT INTO plans (
  id, slug, name, description, status,
  max_users, max_research_submissions_monthly, max_report_pdfs_monthly,
  max_active_action_tasks, max_ai_questions_monthly,
  created_at, updated_at
) VALUES (
  'plan-growth', 'growth', 'Growth',
  'Plano intermediario preparado para beta e expansao.',
  'ACTIVE', 20, 100, 150, 500, 500, NOW()::TEXT, NOW()::TEXT
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  max_users = EXCLUDED.max_users,
  max_research_submissions_monthly = EXCLUDED.max_research_submissions_monthly,
  max_report_pdfs_monthly = EXCLUDED.max_report_pdfs_monthly,
  max_active_action_tasks = EXCLUDED.max_active_action_tasks,
  max_ai_questions_monthly = EXCLUDED.max_ai_questions_monthly,
  updated_at = EXCLUDED.updated_at;
