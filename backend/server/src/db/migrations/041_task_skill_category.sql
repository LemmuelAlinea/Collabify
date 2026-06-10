alter table public.tasks
  add column if not exists skill_category text
  check (skill_category in (
    'frontend',
    'backend',
    'ui_ux_design',
    'mobile_dev',
    'database',
    'qa_testing',
    'documentation_technical_writing',
    'project_management'
  ));
