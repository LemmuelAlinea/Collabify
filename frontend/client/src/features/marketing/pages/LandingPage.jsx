import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { CollabifyHero } from '../../../components/ui/hero-section'

const features = [
  { title: 'AI project planning', text: 'Generate structured tasks, milestones, risks, and fair contribution plans.', image: '/illustrations/kanban.png' },
  { title: 'Realtime collaboration', text: 'Keep classes, groups, messages, submissions, and updates in sync.', image: '/illustrations/team.png' },
  { title: 'Learning analytics', text: 'Track project health, contribution fairness, outcomes, and curriculum insights.', image: '/illustrations/analytics.png' },
]

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="landing-shell">
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

        <section className="feature-strip" id="features">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <img src={feature.image} alt="" aria-hidden="true" />
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="marketing-section" id="projects">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Plan, validate, execute, and measure every academic project.</h2>
          </div>
          <img src="/illustrations/checklist.png" alt="" aria-hidden="true" />
        </section>

        <section className="marketing-section marketing-section-split" id="about">
          <img src="/illustrations/clock.png" alt="" aria-hidden="true" />
          <div>
            <p className="eyebrow">About</p>
            <h2>Designed around professor oversight and student accountability.</h2>
          </div>
        </section>

        <section className="marketing-section" id="contact">
          <div>
            <p className="eyebrow">Contact</p>
            <h2>Bring Collabify into your BSIT project workflow.</h2>
          </div>
          <Button asChild>
            <Link to="/register">Start now</Link>
          </Button>
        </section>
      </main>
    </div>
  )
}
