from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import html

OUT = Path("SSDLC_Implementation_Collabify.docx")
DXA_WIDTH = 9360


def e(text):
    return html.escape(str(text), quote=False)


def run(text, bold=False, italic=False):
    props = []
    if bold:
        props.append("<w:b/>")
    if italic:
        props.append("<w:i/>")
    prop_xml = f"<w:rPr>{''.join(props)}</w:rPr>" if props else ""
    parts = []
    lines = str(text).split("\n")
    for index, line in enumerate(lines):
        if index:
            parts.append("<w:br/>")
        parts.append(f'<w:t xml:space="preserve">{e(line)}</w:t>')
    return f"<w:r>{prop_xml}{''.join(parts)}</w:r>"


def p(text="", style=None, align=None, keep=False, runs=None):
    ppr = []
    if style:
        ppr.append(f'<w:pStyle w:val="{style}"/>')
    if align:
        ppr.append(f'<w:jc w:val="{align}"/>')
    if keep:
        ppr.append("<w:keepNext/>")
    ppr_xml = f"<w:pPr>{''.join(ppr)}</w:pPr>" if ppr else ""
    body = "".join(runs) if runs else run(text)
    return f"<w:p>{ppr_xml}{body}</w:p>"


def list_p(text, num_id=1):
    return (
        "<w:p><w:pPr><w:numPr><w:ilvl w:val=\"0\"/>"
        f"<w:numId w:val=\"{num_id}\"/></w:numPr></w:pPr>"
        f"{run(text)}</w:p>"
    )


def cell(content, width, fill=None, header=False):
    tcpr = [f'<w:tcW w:w="{width}" w:type="dxa"/>']
    if fill:
        tcpr.append(f'<w:shd w:fill="{fill}"/>')
    text_style = "TableHeader" if header else "TableText"
    if isinstance(content, list):
        inner = "".join(content)
    else:
        inner = p(content, text_style)
    return f"<w:tc><w:tcPr>{''.join(tcpr)}</w:tcPr>{inner}</w:tc>"


def table(headers, rows, widths):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    tbl = [
        "<w:tbl>",
        "<w:tblPr>",
        f'<w:tblW w:w="{sum(widths)}" w:type="dxa"/>',
        '<w:tblInd w:w="120" w:type="dxa"/>',
        '<w:tblLayout w:type="fixed"/>',
        "<w:tblBorders>",
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>',
        "</w:tblBorders>",
        '<w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>',
        "</w:tblPr>",
        f"<w:tblGrid>{grid}</w:tblGrid>",
    ]
    tbl.append("<w:tr>" + "".join(cell(h, widths[i], "F2F4F7", True) for i, h in enumerate(headers)) + "</w:tr>")
    for row in rows:
        tbl.append("<w:tr>" + "".join(cell(row[i], widths[i]) for i in range(len(widths))) + "</w:tr>")
    tbl.append("</w:tbl>")
    return "".join(tbl)


def code_block(text):
    lines = [p(line, "Code") for line in str(text).strip("\n").split("\n")]
    return table(["Implementation Evidence"], [[lines]], [DXA_WIDTH])


def page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


body = []
body.append(p("Secure Software Development Lifecycle (SSDLC) Implementation", "Title", "center"))
body.append(p("for Collabify: AI-Assisted Collaborative Academic Project Management System", "Subtitle", "center"))
body.append(p("Final Project", "Meta", "center"))
body.append(p("Prepared for Secure Software Development Lifecycle final activity", "Meta", "center"))
body.append(p(""))
body.append(table(
    ["Field", "Details"],
    [
        ["Group Members", "Lemmuel Alinea"],
        ["Course/Section", "BSIT"],
        ["Instructor", "To be filled by instructor"],
        ["Date Submitted", "June 5, 2026"],
        ["Repository/System", "Collabify"],
    ],
    [2300, 7060],
))
body.append(p("Executive Summary", "Heading1"))
body.append(p("This report documents the SSDLC implementation for Collabify, a web-based academic collaboration platform for professors and students. Security was integrated through risk assessment, STRIDE threat modeling, secure coding controls, static analysis, dependency scanning, secure configuration, and deployment controls. The implementation focuses on protecting accounts, class data, project submissions, chat messages, AI-assisted workflows, and professor-only administrative actions."))
body.append(page_break())

body.append(p("I. Introduction", "Heading1"))
body.append(p("Collabify applies the Secure Software Development Lifecycle to a real project-management and classroom collaboration system. The main security goal is to reduce unauthorized access, protect academic records and uploaded files, and keep the application safe during development, deployment, and maintenance."))
body.append(p("The SSDLC work covers security planning, threat identification, secure design, secure coding, analysis, testing, and deployment controls for the React client, Express API, Supabase PostgreSQL database, Supabase Auth, Supabase Storage, Supabase Realtime, n8n automation, and AI integrations."))

body.append(p("II. System Overview", "Heading1"))
body.append(p("A. System Name", "Heading2"))
body.append(p("Collabify"))
body.append(p("B. System Description", "Heading2"))
for item in [
    "Purpose: Help professors manage classes, projects, groups, tasks, submissions, progress, analytics, messages, notifications, project validation, task generation, project health checks, and group pop quizzes.",
    "Target users: Professors and students in academic project-based courses.",
    "Main features: Role-based dashboards, class management, project and group workflows, Kanban-style tasks, file submissions with versions, contribution tracking, realtime messaging, notification center, AI-assisted project validation, AI task generation, health risk reports, and n8n-powered automation.",
    "Protected data: user accounts, profiles, class records, group membership, task assignments, submission files, message attachments, analytics answers, project health reports, and activity logs.",
]:
    body.append(list_p(item))

body.append(p("C. Technologies Used", "Heading2"))
body.append(table(
    ["Component", "Technology"],
    [
        ["Frontend", "React 19, Vite, React Router, Tailwind CSS, Radix UI, Lucide React, Chart.js"],
        ["Backend", "Node.js 20+, Express 4, ES modules, Zod, Helmet, CORS, Morgan"],
        ["Database", "Supabase PostgreSQL with Row Level Security policies"],
        ["Authentication", "Supabase Auth with bearer tokens and role checks"],
        ["Storage", "Supabase Storage buckets for syllabi, curricula, project files, submissions, profile assets, and announcement attachments"],
        ["Realtime", "Supabase Realtime channels for messages, notifications, tasks, submissions, contribution logs, project health, and activity logs"],
        ["Automation/AI", "n8n workflows and OpenAI-backed validation/task/health services"],
        ["Hosting", "Vercel-ready frontend and Node-compatible backend deployment such as Render, Railway, or VPS"],
    ],
    [2300, 7060],
))

body.append(p("III. Secure Software Development Lifecycle Implementation", "Heading1"))
body.append(p("1. Risk Assessment", "Heading2"))
body.append(p("A. Risk Identification Table", "Heading3"))
body.append(table(
    ["Risk", "Description", "Impact", "Likelihood", "Mitigation"],
    [
        ["Unauthorized access", "Student or professor accesses data outside their class, group, or role.", "High", "Medium", "Supabase Auth, API bearer-token validation, protected routes, RBAC middleware, and RLS policies."],
        ["Broken role control", "Student performs professor-only actions such as class, project, validation, or review management.", "High", "Medium", "requireRole middleware, route-level checks, ownership queries, and professor-owned class policies."],
        ["Injection and malformed input", "Malformed JSON or unexpected values reach service/database logic.", "High", "Medium", "Zod schemas, UUID checks, enum constraints, PostgreSQL constraints, and Supabase query builder parameterization."],
        ["Data leakage", "Service-role secrets, API keys, uploaded files, or private project data are exposed.", "High", "Low", "Environment variables, Vite-only public keys on client, server-only service-role key, RLS, bucket separation, and restricted CORS."],
        ["API abuse", "Large or repeated requests overload API, AI workflows, or n8n webhooks.", "Medium", "Medium", "JSON body limit, request timeout, webhook secret, planned rate limiting, and production monitoring."],
        ["Dependency vulnerability", "Third-party library contains a known vulnerability.", "High", "Medium", "npm audit, package-lock files, controlled updates, and dependency review before deployment."],
        ["File upload abuse", "Unsafe or oversized uploads target submission, message, syllabus, or announcement storage.", "High", "Medium", "Storage metadata, bucket separation, file-size fields, MIME tracking, and future malware/type scanning."],
        ["Repudiation", "A user denies submitting, editing, messaging, or reassignment actions.", "Medium", "Medium", "activity_logs, contribution_logs, created_at/updated_at triggers, and submission version history."],
    ],
    [1500, 3000, 900, 1000, 2960],
))
body.append(p("B. Risk Prioritization", "Heading3"))
body.append(p("The most critical risks are unauthorized access, broken role control, injection, and data leakage because Collabify stores academic identity data, class membership, project work, private messages, and uploaded submissions. These risks can directly affect confidentiality, integrity, and grading fairness. API abuse and dependency vulnerabilities are also important because AI and n8n workflows may be expensive or sensitive, but they can be controlled with monitoring, limits, and regular scanning."))

body.append(p("2. Threat Modeling", "Heading2"))
body.append(p("A. STRIDE Analysis", "Heading3"))
body.append(table(
    ["Threat Type", "Example in Collabify", "Security Control"],
    [
        ["Spoofing", "Fake user session or stolen token used to call API endpoints.", "Supabase Auth token verification in authenticate middleware; protected frontend routes."],
        ["Tampering", "Modified task, project, group, or submission payload.", "Zod validation, enum constraints, UUID validation, ownership checks, and RLS."],
        ["Repudiation", "User denies submitting a file, sending a message, or requesting reassignment.", "activity_logs, contribution_logs, timestamps, submission versioning, and audit-friendly tables."],
        ["Information Disclosure", "Student views another group's submissions, messages, quiz attempts, or notifications.", "RLS policies, class/group membership checks, role-based API routes, and restricted storage buckets."],
        ["Denial of Service", "Large payload or repeated AI/n8n API calls.", "10 MB JSON limit, 45-second frontend abort timeout, webhook secrets, and planned rate limiting."],
        ["Elevation of Privilege", "Student reaches professor-only class/project management routes.", "requireRole('professor'), ProtectedRoute allowedRoles, professor ownership checks, and database constraints."],
    ],
    [1700, 3900, 3760],
))
body.append(p("B. Data Flow Diagram - Context Diagram", "Heading3"))
body.append(code_block("""
             +--------------------+
             |  Professor/Student |
             +----------+---------+
                        |
                        | HTTPS, Supabase Auth session
                        v
 +----------------------+----------------------+
 |             Collabify Web App              |
 | React/Vite UI + protected route layer       |
 +----------------------+----------------------+
                        |
                        | Bearer token API calls
                        v
 +----------------------+----------------------+
 |              Express API Server             |
 | Helmet, CORS, Zod validation, RBAC          |
 +---------+---------------+-------------------+
           |               |
           | Supabase SDK  | secured webhooks
           v               v
 +---------+---------+   +---------------------+
 | Supabase Auth/DB |   | n8n + OpenAI flows   |
 | Storage/Realtime |   | validation/task/quiz |
 +-------------------+   +---------------------+
"""))
body.append(p("C. Data Flow Diagram - Level 1 DFD", "Heading3"))
body.append(code_block("""
[1] Login/Register
User -> React Client -> Supabase Auth -> Session Token

[2] Protected API Request
React Client -> Express API /api/v1 -> authenticate() -> requireRole()

[3] Data Processing
Controller -> Zod validateBody/validateQuery -> Service -> Supabase Admin Client

[4] Storage and Realtime
Service -> Supabase PostgreSQL / Storage / Realtime

[5] AI and Automation
Service -> n8n webhook with secret -> OpenAI-assisted workflow -> result saved to Supabase

[6] Response
Express API -> JSON response -> React UI updates dashboard, tasks, reports, or messages
"""))

body.append(p("3. Secure Coding Practices", "Heading2"))
body.append(p("A. Secure Coding Practice #1 - Input Validation", "Heading3"))
body.append(p("Purpose: Prevent invalid, unexpected, or malicious request data from reaching business logic."))
body.append(code_block("""
export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      next(new HttpError(422, 'Validation failed', result.error.flatten()))
      return
    }

    req.body = result.data
    next()
  }
}

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(160),
  section: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(160),
  yearLevel: z.number().int().min(1).max(5),
  syllabusId: z.string().uuid().optional().nullable(),
})
"""))
body.append(p("Explanation: Collabify validates body and query data using Zod before controllers and services process the request. This reduces injection, malformed input, invalid UUID, enum, and overlong-string risks."))

body.append(p("B. Secure Coding Practice #2 - Authentication", "Heading3"))
body.append(p("Purpose: Ensure protected API requests come from a valid active Supabase Auth user."))
body.append(code_block("""
export async function authenticate(req, _res, next) {
  const token = getBearerToken(req)

  if (!token) {
    throw new HttpError(401, 'Missing bearer token')
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token)

  if (error || !data.user) {
    throw new HttpError(401, 'Invalid or expired session')
  }
}
"""))
body.append(p("Explanation: The API accepts only Bearer tokens and verifies each token with Supabase Auth. The middleware also checks the matching application profile and active account status before assigning req.auth."))

body.append(p("C. Secure Coding Practice #3 - Authorization and RBAC", "Heading3"))
body.append(p("Purpose: Restrict professor-only and student-only actions."))
body.append(code_block("""
export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, 'Authentication required'))
      return
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(new HttpError(403, 'You do not have permission to access this resource'))
      return
    }

    next()
  }
}
"""))
body.append(p("Explanation: Server-side RBAC prevents unauthorized roles from using restricted routes even if a user manually changes frontend routes or sends direct API requests."))

body.append(p("D. Secure Coding Practice #4 - Secure Headers, CORS, and Request Limits", "Heading3"))
body.append(code_block("""
app.use(helmet())
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
"""))
body.append(p("Explanation: Helmet adds defensive HTTP headers, CORS restricts allowed origins, and Express JSON parsing limits request size to reduce abuse risk."))

body.append(p("E. Secure Coding Practice #5 - Row Level Security", "Heading3"))
body.append(code_block("""
alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles for select
using (user_id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
"""))
body.append(p("Explanation: Supabase RLS limits direct client access to rows that match the authenticated user or allowed class/group membership."))

body.append(p("4. Static Analysis Implementation", "Heading2"))
body.append(p("A. Tool Used", "Heading3"))
for item in ["ESLint for JavaScript/React static analysis.", "npm audit for dependency vulnerability scanning.", "Supabase RLS and migration review for database policy checks."]:
    body.append(list_p(item))
body.append(p("B. Implementation Commands", "Heading3"))
body.append(code_block("""
backend/server> npm run lint
backend/server> npm audit --audit-level=moderate

frontend/client> npm run lint
frontend/client> npm audit --audit-level=moderate
"""))
body.append(p("C. Findings", "Heading3"))
body.append(table(
    ["Issue Detected", "Severity", "Evidence", "Resolution / Action"],
    [
        ["Backend ESLint configuration missing", "Medium", "ESLint 9 reported no eslint.config.js in backend/server.", "Add backend eslint.config.js or share frontend ESLint flat config before release."],
        ["Frontend lint errors", "Medium", "55 errors and 6 warnings.", "Refactor mixed exports, adjust useEffect data loading patterns, remove unused variables, and attach caught error cause."],
        ["Backend dependency vulnerabilities", "Low", "npm audit: found 0 vulnerabilities.", "No vulnerable package found at scan time."],
        ["Frontend dependency vulnerabilities", "Low", "npm audit: found 0 vulnerabilities.", "No vulnerable package found at scan time."],
    ],
    [2300, 900, 2950, 3210],
))
body.append(p("D. Screenshot / Console Evidence", "Heading3"))
body.append(code_block("""
backend/server> npm audit --audit-level=moderate
found 0 vulnerabilities

frontend/client> npm audit --audit-level=moderate
found 0 vulnerabilities

frontend/client> npm run lint
55 errors, 6 warnings
Sample rules: react-refresh/only-export-components,
react-hooks/set-state-in-effect, no-unused-vars,
react-hooks/static-components, preserve-caught-error.

backend/server> npm run lint
ESLint could not find eslint.config.(js|mjs|cjs).
"""))

body.append(p("5. Secure Configuration Techniques", "Heading2"))
body.append(p("A. Environment Variables", "Heading3"))
body.append(code_block("""
const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = requiredEnv.filter((key) => !process.env[key])

if (missing.length > 0) {
  throw new Error(`Missing required server env: ${missing.join(', ')}`)
}
"""))
body.append(p("Server-only secrets such as SUPABASE_SERVICE_ROLE_KEY, N8N_WEBHOOK_SECRET, and OPENAI_API_KEY are stored outside source code. Frontend variables use VITE_ keys and expose only public configuration such as VITE_SUPABASE_ANON_KEY."))
body.append(p("B. HTTPS Enforcement", "Heading3"))
body.append(p("Production deployment must serve the Vite client and Express API through HTTPS. Supabase endpoints, Vercel hosting, Render/Railway/VPS reverse proxies, and webhook callbacks should use TLS certificates."))
body.append(p("C. CORS Configuration", "Heading3"))
body.append(p("The API reads CORS_ORIGIN from environment variables and restricts browser origins. Production should replace localhost origins with the deployed Collabify domain."))
body.append(p("D. Supabase Security Rules / RLS", "Heading3"))
body.append(p("RLS is enabled for users, profiles, classes, class_members, projects, groups, tasks, submissions, messages, notifications, project_health, group_pop_quiz_attempts, and related domain tables. Policies use auth.uid(), class membership, group membership, and professor ownership."))

body.append(p("6. Dependency Management Techniques", "Heading2"))
body.append(p("A. Dependency Monitoring", "Heading3"))
body.append(p("npm audit is used in both backend/server and frontend/client. Both scans returned 0 known vulnerabilities at the time of documentation."))
body.append(p("B. Version Control", "Heading3"))
body.append(p("package-lock.json files are committed for backend and frontend to keep dependency versions reproducible. Node engines require Node.js >=20.0.0 for the backend."))
body.append(p("C. Vulnerability Scanning", "Heading3"))
body.append(code_block("""
cd backend/server
npm audit --audit-level=moderate

cd frontend/client
npm audit --audit-level=moderate
"""))
body.append(p("D. Updating Vulnerable Packages", "Heading3"))
body.append(p("When npm audit reports a vulnerable package, the remediation process is to identify the dependency path, update the direct package when possible, run tests/lint/build, and verify that the lockfile no longer contains the vulnerable version."))

body.append(p("7. Server Deployment Requirements and Implementation", "Heading2"))
body.append(p("A. Server Requirements", "Heading3"))
body.append(table(
    ["Requirement", "Specification"],
    [
        ["Operating System", "Ubuntu Linux 22.04 LTS or compatible Node hosting environment"],
        ["Runtime", "Node.js 20 or later"],
        ["RAM", "2 GB minimum for API, background work, and AI/n8n calls"],
        ["Storage", "20 GB minimum for logs and temporary processing; persistent files stored in Supabase Storage"],
        ["SSL Certificate", "Required for web client, API, Supabase, and webhook traffic"],
        ["Database Backup", "Enabled through Supabase scheduled backups"],
        ["Secrets", "Configured in platform environment variables only"],
        ["Monitoring", "API logs, Supabase logs, deployment logs, and audit tables"],
    ],
    [2500, 6860],
))
body.append(p("B. Deployment Architecture", "Heading3"))
body.append(code_block("""
Browser User
    |
    | HTTPS
    v
Vercel Frontend (React/Vite)
    |
    | HTTPS + Bearer Token
    v
Node/Express API (Render/Railway/VPS)
    |-- Helmet, CORS, JSON limit, Morgan logs
    |-- Auth middleware and RBAC
    |
    | Supabase SDK over TLS
    v
Supabase Platform
    |-- Auth
    |-- PostgreSQL + RLS
    |-- Storage buckets
    |-- Realtime
    |
    | signed/secret webhook calls
    v
n8n Workflows + OpenAI Services
"""))
body.append(p("C. Deployment Security Measures", "Heading3"))
for item in [
    "HTTPS enabled for frontend, API, Supabase, and webhook communications.",
    "Firewall allows only required public ports such as 80 and 443; SSH is restricted to administrators.",
    "Environment variables store Supabase, n8n, and OpenAI secrets outside the repository.",
    "Database access is restricted through Supabase Auth, RLS, service-role usage on the backend, and role-specific policies.",
    "Backups and recovery are handled through Supabase scheduled backups and package-lock reproducibility.",
    "Production CORS_ORIGIN must be narrowed to the deployed Collabify domain.",
    "Rate limiting should be enabled using RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS before public release.",
]:
    body.append(list_p(item))

body.append(p("IV. Testing and Validation", "Heading1"))
body.append(p("A. Security Testing Performed", "Heading2"))
body.append(table(
    ["Test Type", "Purpose", "Result"],
    [
        ["Authentication testing", "Verify protected API endpoints reject missing/invalid sessions.", "authenticate middleware returns 401 for missing or invalid Bearer tokens."],
        ["Authorization testing", "Verify professor/student route restrictions.", "requireRole and ProtectedRoute enforce allowed roles."],
        ["Input validation testing", "Reject malformed request bodies and query parameters.", "Zod schemas return 422 with validation details."],
        ["RLS review", "Verify database policies restrict records by auth.uid(), class membership, or group membership.", "RLS enabled on domain tables with baseline and pop quiz policies."],
        ["Static analysis", "Detect code-quality and security-adjacent issues.", "Frontend ESLint found 59 errors and 6 warnings; backend lint config needs setup."],
        ["Dependency scanning", "Detect vulnerable packages.", "npm audit found 0 vulnerabilities for backend and frontend."],
        ["API abuse control", "Reduce oversized request abuse.", "Express JSON body limit set to 10 MB; client request timeout set to 45 seconds."],
    ],
    [1900, 3600, 3860],
))
body.append(p("B. Results Summary", "Heading2"))
body.append(p("The implemented controls provide a strong security baseline: authenticated sessions, role-based authorization, Zod validation, secure headers, restricted CORS, environment-variable secret management, RLS, audit-friendly database tables, and dependency scanning. Remaining improvements before production release are backend ESLint configuration, frontend lint remediation, explicit API rate limiting, stricter production CORS, upload scanning/type restrictions, and deeper automated security tests."))

body.append(p("V. Conclusion", "Heading1"))
body.append(p("The SSDLC implementation significantly improves Collabify's security posture by applying secure design, threat modeling, validation, authentication, authorization, RLS, secure configuration, dependency scanning, and deployment safeguards. The project demonstrates how security controls can be integrated into the actual application instead of being added only after development."))
body.append(p("Lessons learned: security must be designed into the data model, route structure, frontend navigation, storage model, deployment configuration, and development workflow. Future enhancements should include automated backend ESLint, rate limiting middleware, upload malware scanning, formal penetration testing, CI/CD security gates, and complete RLS policy coverage for every new table."))

body.append(p("VI. Appendices", "Heading1"))
body.append(p("Appendix A - Source Code Evidence", "Heading2"))
body.append(table(
    ["Control", "File Evidence"],
    [
        ["HTTP security headers and CORS", "backend/server/src/app.js"],
        ["Environment variables and required secrets", "backend/server/src/config/env.js"],
        ["Authentication middleware", "backend/server/src/core/middleware/authenticate.js"],
        ["Role-based authorization", "backend/server/src/core/middleware/requireRole.js"],
        ["Request validation", "backend/server/src/core/middleware/validateRequest.js"],
        ["Frontend protected routes", "frontend/client/src/app/router/ProtectedRoute.jsx"],
        ["Client token forwarding and timeout", "frontend/client/src/services/api/client.js"],
        ["RLS and baseline policies", "backend/server/src/db/migrations/001_initial_schema.sql"],
        ["Group pop quiz RLS policies", "backend/server/src/db/migrations/037_group_pop_quiz.sql"],
    ],
    [3000, 6360],
))
body.append(p("Appendix B - Video Presentation Checklist", "Heading2"))
body.append(table(
    ["Required Segment", "Prepared Talking Point"],
    [
        ["Introduction of group members", "Introduce Lemmuel Alinea and project role."],
        ["Overview of the system", "Describe Collabify as an academic collaboration and project management platform."],
        ["SSDLC phases", "Explain risk assessment, threat modeling, secure coding, analysis, configuration, dependency management, deployment, and testing."],
        ["Risk Assessment", "Show the risk table and explain unauthorized access, role abuse, injection, leakage, API abuse, and dependencies."],
        ["Threat Modeling", "Present STRIDE and the DFD diagrams."],
        ["Secure Coding Practices", "Demonstrate validation, authentication, authorization, Helmet/CORS, and RLS code snippets."],
        ["Static Analysis", "Show ESLint and npm audit evidence."],
        ["Secure Configuration", "Show environment-variable handling and CORS configuration."],
        ["Dependency Management", "Show package-lock files and npm audit result."],
        ["Secure Deployment", "Present HTTPS, firewall, secrets, backups, CORS, and rate-limiting plan."],
        ["Actual system demo", "Login, view role dashboard, open class/project, create task/group, submit file, view notification or health report."],
        ["Conclusion", "Summarize controls implemented and future improvements."],
    ],
    [2700, 6660],
))

document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {''.join(body)}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:sz w:val="52"/><w:color w:val="0B2545"/></w:rPr><w:pPr><w:spacing w:after="160"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="28"/><w:color w:val="1F4D78"/></w:rPr><w:pPr><w:spacing w:after="160"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/></w:rPr><w:pPr><w:spacing w:after="80"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2E74B5"/></w:rPr><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="1F4D78"/></w:rPr><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="19"/></w:rPr><w:pPr><w:spacing w:after="40" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="TableText"/><w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="0B2545"/></w:rPr><w:pPr><w:spacing w:after="40"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="17"/><w:color w:val="111827"/></w:rPr><w:pPr><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
</w:styles>'''

numbering_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
</w:numbering>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>'''

now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>SSDLC Implementation for Collabify</dc:title>
  <dc:creator>Collabify</dc:creator>
  <cp:lastModifiedBy>Collabify</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>'''

app = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
</Properties>'''

settings = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
</w:settings>'''

with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("_rels/.rels", rels)
    z.writestr("word/_rels/document.xml.rels", doc_rels)
    z.writestr("word/document.xml", document_xml)
    z.writestr("word/styles.xml", styles_xml)
    z.writestr("word/numbering.xml", numbering_xml)
    z.writestr("word/settings.xml", settings)
    z.writestr("docProps/core.xml", core)
    z.writestr("docProps/app.xml", app)

print(OUT.resolve())
