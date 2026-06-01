import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils/cn'
import { Button } from './button'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42 },
  },
}

const visualVariants = {
  hidden: { opacity: 0, x: 42 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.62, ease: 'easeOut', staggerChildren: 0.12 },
  },
}

export function CollabifyHero({
  title,
  description,
  primaryText,
  primaryLink,
  secondaryText,
  secondaryLink,
  className,
}) {
  return (
    <section className={cn('collabify-hero', className)} id="home">
      <div className="collabify-hero-grid" aria-hidden="true" />
      <div className="collabify-hero-glow" aria-hidden="true" />

      <motion.div className="collabify-hero-inner" initial="hidden" animate="visible" variants={containerVariants}>
        <div className="collabify-hero-copy">
          <motion.span className="collabify-hero-badge" variants={itemVariants}>
            <Sparkles aria-hidden="true" />
            Built for BSIT project workflows
          </motion.span>
          <motion.h1 variants={itemVariants}>{title}</motion.h1>
          <motion.p variants={itemVariants}>{description}</motion.p>
          <motion.div className="collabify-hero-actions" variants={itemVariants}>
            <Button asChild size="lg">
              <Link to={primaryLink}>
                {primaryText}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to={secondaryLink}>{secondaryText}</Link>
            </Button>
          </motion.div>
          <motion.div className="collabify-hero-points" variants={itemVariants}>
            {['AI validation', 'Realtime groups', 'Contribution analytics'].map((item) => (
              <span key={item}>
                <CheckCircle2 aria-hidden="true" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div className="collabify-hero-visual" variants={visualVariants}>
          <motion.img className="hero-card hero-card-main" src="/illustrations/team.png" alt="Collabify collaboration workspace" variants={itemVariants} />
          <motion.img className="hero-card hero-card-kanban" src="/illustrations/kanban.png" alt="" aria-hidden="true" variants={itemVariants} />
          <motion.img className="hero-card hero-card-analytics" src="/illustrations/analytics.png" alt="" aria-hidden="true" variants={itemVariants} />
          <motion.img className="hero-card hero-card-clock" src="/illustrations/clock.png" alt="" aria-hidden="true" variants={itemVariants} />
        </motion.div>
      </motion.div>
    </section>
  )
}
