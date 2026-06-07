import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { Button } from '../../../components/ui/button'
import { CollabifyHero } from '../../../components/ui/hero-section'
import {
  Brain,
  Users,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Shield,
  GraduationCap,
  Activity,
  Sparkles,
  Star,
  Mail,
  Globe,
  Code2,
  Share2,
  Layers,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI Project Planning',
    text: 'Generate structured tasks, milestones, risks, and fair contribution plans — intelligently tailored to your syllabus.',
    color: '#28d7ff',
    image: '/illustrations/kanban.png',
  },
  {
    icon: Users,
    title: 'Realtime Collaboration',
    text: 'Keep classes, groups, messages, submissions, and updates in perfect sync — from project kickoff to final delivery.',
    color: '#23e66e',
    image: '/illustrations/team.png',
  },
  {
    icon: BarChart3,
    title: 'Learning Analytics',
    text: 'Track project health, contribution fairness, outcomes, and curriculum insights with precision analytics.',
    color: '#d9ff44',
    image: '/illustrations/analytics.png',
  },
]

const steps = [
  {
    step: '01',
    icon: GraduationCap,
    title: 'Create your class',
    text: 'Professors set up their class, invite students, and configure curriculum in minutes.',
  },
  {
    step: '02',
    icon: Users,
    title: 'Form project groups',
    text: 'Students join or form groups with professor oversight and built-in peer validation.',
  },
  {
    step: '03',
    icon: Brain,
    title: 'AI plans the project',
    text: 'Our AI generates tasks, milestones, and risk assessments tailored to your syllabus.',
  },
  {
    step: '04',
    icon: BarChart3,
    title: 'Track everything',
    text: 'Monitor contribution fairness, project health, and learning outcomes in real time.',
  },
]

const stats = [
  { value: '500+', label: 'Projects Managed' },
  { value: '2,000+', label: 'Students Served' },
  { value: '98%', label: 'Contribution Accuracy' },
  { value: '10x', label: 'Faster Planning' },
]

const footerNav = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Projects', href: '#projects' },
      { label: 'Analytics', href: '#about' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#about' },
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    heading: 'Get Started',
    links: [
      { label: 'Register', href: '/register' },
      { label: 'Login', href: '/login' },
    ],
  },
]

function Card3D({ children, className }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-80, 80], [6, -6])
  const rotateY = useTransform(x, [-80, 80], [-6, 6])
  const springRotateX = useSpring(rotateX, { stiffness: 200, damping: 25 })
  const springRotateY = useSpring(rotateY, { stiffness: 200, damping: 25 })

  function onMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }

  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      className={className}
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </motion.div>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="landing-shell">
      <div className="landing-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className={`marketing-nav ${isMenuOpen ? 'is-open' : ''}`}>
        <Link className="marketing-logo" to="/">
          <img src="/brand/collabify-logo.png" alt="" />
          Collabify
        </Link>
        <button
          aria-label="Toggle navigation"
          className="marketing-menu"
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="marketing-actions">
          <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </header>

      <main>
        <CollabifyHero
          title={<>AI-powered academic project management for BSIT teams.</>}
          description="Validate projects, plan tasks, track contribution fairness, manage submissions, and measure learning outcomes in one professional workspace."
          primaryText="Get Started"
          primaryLink="/register"
          secondaryText="Login"
          secondaryLink="/login"
        />

        {/* Features */}
        <section className="lp-section features-section" id="features">
          <motion.div
            className="lp-section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.p className="eyebrow-pill" variants={fadeUp}>
              <Sparkles aria-hidden="true" />
              Core Features
            </motion.p>
            <motion.h2 variants={fadeUp}>Everything your academic team needs</motion.h2>
            <motion.p className="lp-section-desc" variants={fadeUp}>
              From AI-generated project plans to real-time contribution tracking — Collabify covers the full lifecycle of every BSIT project.
            </motion.p>
          </motion.div>

          <motion.div
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            {features.map(({ icon: Icon, title, text, color, image }) => (
              <motion.div key={title} variants={fadeUp}>
                <Card3D className="feature-card-3d">
                  <div className="feature-card-glow" style={{ '--accent': color }} aria-hidden="true" />
                  <div className="feature-card-inner" style={{ '--accent': color }}>
                    <div className="feature-card-icon-wrap">
                      <Icon aria-hidden="true" />
                    </div>
                    <img src={image} alt="" aria-hidden="true" className="feature-card-img" />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* How it works */}
        <section className="lp-section how-it-works-section" id="how-it-works">
          <motion.div
            className="lp-section-header"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            <motion.p className="eyebrow-pill" variants={fadeUp}>
              <Activity aria-hidden="true" />
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp}>Up and running in four steps</motion.h2>
          </motion.div>

          <motion.div
            className="steps-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            {steps.map(({ step, icon: Icon, title, text }) => (
              <motion.div key={step} className="step-item" variants={fadeUp}>
                <span className="step-number">{step}</span>
                <div className="step-icon-wrap">
                  <Icon aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Stats */}
        <section className="lp-section lp-stats-section" aria-label="Platform statistics">
          <motion.div
            className="stats-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            {stats.map(({ value, label }) => (
              <motion.div key={label} className="stat-item" variants={fadeUp}>
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Projects */}
        <section className="lp-section" id="projects">
          <motion.div
            className="lp-split-layout"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
          >
            <div className="lp-split-copy">
              <motion.p className="eyebrow-pill" variants={fadeUp}>
                <Layers aria-hidden="true" />
                Projects
              </motion.p>
              <motion.h2 variants={fadeUp}>
                Plan, validate, execute, and measure every academic project.
              </motion.h2>
              <motion.p className="lp-section-desc" variants={fadeUp}>
                Collabify brings professor oversight and student accountability together in one structured, AI-assisted workflow.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Button asChild size="lg">
                  <Link to="/register">
                    Start a project
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </motion.div>
            </div>
            <motion.div className="lp-split-visual" variants={fadeUp}>
              <Card3D className="lp-visual-card">
                <img src="/illustrations/checklist.png" alt="Project planning dashboard" />
              </Card3D>
              <div className="lp-float-badge lp-float-badge-a" aria-hidden="true">
                <CheckCircle2 />
                <span>Validated</span>
              </div>
              <div className="lp-float-badge lp-float-badge-b" aria-hidden="true">
                <Shield />
                <span>Risk Free</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* About */}
        <section className="lp-section" id="about">
          <motion.div
            className="lp-split-layout lp-split-flip"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
          >
            <motion.div className="lp-split-visual" variants={fadeUp}>
              <Card3D className="lp-visual-card">
                <img src="/illustrations/clock.png" alt="Time and accountability tracking" />
              </Card3D>
              <div className="lp-float-badge lp-float-badge-c" aria-hidden="true">
                <Activity />
                <span>Live tracking</span>
              </div>
            </motion.div>
            <div className="lp-split-copy">
              <motion.p className="eyebrow-pill" variants={fadeUp}>
                <Star aria-hidden="true" />
                About
              </motion.p>
              <motion.h2 variants={fadeUp}>
                Designed around professor oversight and student accountability.
              </motion.h2>
              <motion.p className="lp-section-desc" variants={fadeUp}>
                Every feature in Collabify is built for the academic context — from peer-validated contributions to professor dashboards that provide complete visibility into every team&rsquo;s progress.
              </motion.p>
              <motion.ul className="about-checks" variants={stagger}>
                {[
                  'Professor role controls',
                  'Peer contribution validation',
                  'AI risk assessment',
                  'Curriculum-aligned milestones',
                ].map((item) => (
                  <motion.li key={item} variants={fadeUp}>
                    <CheckCircle2 aria-hidden="true" />
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="lp-section lp-cta-section" id="contact">
          <motion.div
            className="lp-cta-inner"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={stagger}
          >
            <motion.p className="eyebrow-pill eyebrow-pill-light" variants={fadeUp}>
              <Mail aria-hidden="true" />
              Get started today
            </motion.p>
            <motion.h2 variants={fadeUp}>Bring Collabify into your BSIT project workflow.</motion.h2>
            <motion.p variants={fadeUp}>
              Join professors and students already managing smarter, fairer, AI-assisted projects.
            </motion.p>
            <motion.div className="lp-cta-actions" variants={fadeUp}>
              <Button asChild size="lg">
                <Link to="/register">
                  Start for free
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/login">Sign in</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <Link className="marketing-logo footer-logo" to="/">
              <img src="/brand/collabify-logo.png" alt="" />
              Collabify
            </Link>
            <p>AI-powered academic project management built for BSIT teams.</p>
            <div className="footer-socials">
              <a href="https://github.com/LemmuelAlinea/Collabify" aria-label="GitHub" target="_blank" rel="noreferrer">
                <Code2 aria-hidden="true" />
              </a>
              <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noreferrer">
                <Share2 aria-hidden="true" />
              </a>
              <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noreferrer">
                <Globe aria-hidden="true" />
              </a>
            </div>
          </div>
          <nav className="footer-nav" aria-label="Footer navigation">
            {footerNav.map(({ heading, links }) => (
              <div key={heading} className="footer-col">
                <h4>{heading}</h4>
                <ul>
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      {href.startsWith('/') ? (
                        <Link to={href}>{label}</Link>
                      ) : (
                        <a href={href}>{label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Collabify. All rights reserved.</p>
          <p>Built for BSIT academic project workflows.</p>
        </div>
      </footer>
    </div>
  )
}
