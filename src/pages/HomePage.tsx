import React, { useState, useEffect, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap,
  ArrowRight,
  BatteryMedium,
  Sun,
  Share2,
  Play,
  Pause,
  Car,
  Home as HomeIcon,
  Volume2,
  VolumeX,
  Activity,
  Leaf,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// 24-hour diurnal simulation data reflecting actual Random Forest models (Solar R² 0.942, Load R² 0.915)
const forecast24hData = [
  { time: '00:00', solar: 0, load: 38 },
  { time: '02:00', solar: 0, load: 32 },
  { time: '04:00', solar: 0, load: 30 },
  { time: '06:00', solar: 8, load: 45 },
  { time: '08:00', solar: 62, load: 92 },
  { time: '10:00', solar: 175, load: 104 },
  { time: '12:00', solar: 250, load: 118 }, // Solar Peak Reverse Surge
  { time: '13:00', solar: 245, load: 122 },
  { time: '14:00', solar: 220, load: 115 },
  { time: '16:00', solar: 130, load: 128 },
  { time: '18:00', solar: 24, load: 158 }, // Evening Peak Load
  { time: '20:00', solar: 0, load: 142 },
  { time: '22:00', solar: 0, load: 88 },
  { time: '24:00', solar: 0, load: 46 },
]

// =========================================================================
// =========================================================================
// REUSABLE SECTION TRANSITION SYSTEM (Clean Straight Edge + Multi-Stop Atmospheric Dissolve)
// =========================================================================
interface SectionTransitionProps {
  from: 'forest' | 'cream' | 'white' | 'light-green'
  to: 'forest' | 'cream' | 'white' | 'light-green'
  styleType?: 'fade' | 'glow' | 'image'
  hasCurve?: boolean
}

const colorData: Record<string, { hex: string; rgb: string }> = {
  forest: { hex: '#064E3B', rgb: '6, 78, 59' },
  cream: { hex: '#F4FAF5', rgb: '244, 250, 245' },
  white: { hex: '#FFFFFF', rgb: '255, 255, 255' },
  'light-green': { hex: '#ECFDF3', rgb: '236, 253, 243' },
}

const SectionTransition: React.FC<SectionTransitionProps> = ({ from, to }) => {
  const fromData = colorData[from] || colorData.forest
  const toData = colorData[to] || colorData.cream

  // Dedicated subtle atmospheric blend tone between neighboring section palettes
  let atmosphericTone = 'rgba(6, 78, 59, 0.05)'
  if ((from === 'forest' && to === 'cream') || (from === 'cream' && to === 'forest')) {
    atmosphericTone = 'rgba(4, 120, 87, 0.08)'
  } else if ((from === 'cream' && to === 'light-green') || (from === 'light-green' && to === 'cream')) {
    atmosphericTone = 'rgba(16, 185, 129, 0.06)'
  } else if ((from === 'light-green' && to === 'forest') || (from === 'forest' && to === 'light-green')) {
    atmosphericTone = 'rgba(6, 78, 59, 0.12)'
  } else if ((from === 'white' && to === 'light-green') || (from === 'light-green' && to === 'white')) {
    atmosphericTone = 'rgba(236, 253, 243, 0.25)'
  }

  return (
    <div
      className="section-transition absolute bottom-0 inset-x-0 h-16 pointer-events-none select-none z-10 overflow-hidden"
      style={{
        transform: 'translateY(1px)',
      }}
    >
      {/* Multi-stop atmospheric gradient dissolution without backdrop blur */}
      <div
        className="w-full h-full"
        style={{
          background: `linear-gradient(to bottom,
            rgba(${fromData.rgb}, 1) 0%,
            rgba(${fromData.rgb}, 0.65) 24%,
            rgba(${fromData.rgb}, 0.28) 42%,
            ${atmosphericTone} 50%,
            rgba(${toData.rgb}, 0.28) 58%,
            rgba(${toData.rgb}, 0.75) 78%,
            rgba(${toData.rgb}, 1) 100%)`,
        }}
      />
    </div>
  )
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const pageContainerRef = useRef<HTMLDivElement>(null)

  // Top Scroll Progress (0 to 100%)
  const [scrollProgress, setScrollProgress] = useState<number>(0)

  // IntersectionObserver Revealed Sections
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({})

  // Video / Demo player state
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [videoProgress, setVideoProgress] = useState<number>(35)
  const [isMuted, setIsMuted] = useState<boolean>(true)

  // Section 2: Interactive Grid Architecture Component Hover
  const [activeArchNode, setActiveArchNode] = useState<string>('substation')

  // Section 5: Engineering Challenge Active Hover
  const [activeChallenge, setActiveChallenge] = useState<'voltage' | 'congestion' | 'unbalance'>('voltage')

  // Section 7: Interactive Digital Twin Canvas Hover
  const [activeTwinNode, setActiveTwinNode] = useState<{
    id: string
    title: string
    metric: string
    detail: string
  } | null>(null)

  // Section 8: AI + Physics Pipeline Step
  const [pipelineStep, setPipelineStep] = useState<number>(0)
  const [isPipelineHovered, setIsPipelineHovered] = useState<boolean>(false)

  // Mitigation Section 6: Animated Countup values once visible
  const [mitigationAnimated, setMitigationAnimated] = useState<boolean>(false)
  const [voltageVal, setVoltageVal] = useState<number>(255.4)
  const [loadingVal, setLoadingVal] = useState<number>(108)
  const [vufVal, setVufVal] = useState<number>(3.1)

  // Periodic Live Digital Twin Node Pulse (Cycles every 2.8s)
  const [livePulseNode, setLivePulseNode] = useState<number>(0)

  // Demo playback phases
  const demoPhases = [
    {
      title: 'Solar Infeed Escalates',
      meta: 'Diurnal Solar Surge • 250 kW Peak',
      voltage: '243.5 V',
      loading: '74%',
      status: 'Normal Forward Power',
      statusColor: 'text-amber-400',
    },
    {
      title: 'Voltage Violation Flagged',
      meta: 'Terminal Swell at Bus 3 / House 08',
      voltage: '255.4 V',
      loading: '108%',
      status: 'Critical Swell (>253V)',
      statusColor: 'text-red-400',
    },
    {
      title: 'Digital Twin Evaluates Dispatches',
      meta: 'AC DistFlow Sensitivity Matrix',
      voltage: '255.4 V',
      loading: '108%',
      status: 'Auditing SOC & Headroom',
      statusColor: 'text-sky-400',
    },
    {
      title: 'Autonomous Volt-VAR Droop Engages',
      meta: 'IEEE 1547 Inductive Reactive Power',
      voltage: '248.8 V',
      loading: '94%',
      status: 'Q < 0 Droop Active',
      statusColor: 'text-lime-400',
    },
    {
      title: 'Grid Stabilized • Safe Equilibrium',
      meta: '100% Green Yield • Conductor Relieved',
      voltage: '247.9 V',
      loading: '92%',
      status: '0 Violations (Safe)',
      statusColor: 'text-[#10B981] dark:text-[#86EFAC]',
    },
  ]

  const activePhaseIndex = Math.floor(videoProgress / 20) % demoPhases.length
  const currentDemoPhase = demoPhases[activePhaseIndex]

  // Track vertical scroll position for subtle GPU parallax
  const [scrollY, setScrollY] = useState<number>(0)

  // Section 10 Results count-up animation state
  const [resultsAnimated, setResultsAnimated] = useState<boolean>(false)
  const [countViolations, setCountViolations] = useState<number>(0)
  const [countSelfConsumption, setCountSelfConsumption] = useState<number>(0)
  const [countFeederLoading, setCountFeederLoading] = useState<number>(0)
  const [countVuf, setCountVuf] = useState<number>(0)

  // PPT Presentation Scene States ('entering' | 'active' | 'exiting')
  const [sceneStates, setSceneStates] = useState<Record<string, 'entering' | 'active' | 'exiting'>>({})

  const getSceneClass = (sectionId: string) => {
    const state = sceneStates[sectionId] || (revealedSections[sectionId] ? 'active' : 'entering')
    if (state === 'active') return 'scene-active section-popped reveal-active'
    if (state === 'exiting') return 'scene-exiting section-popped reveal-active'
    return 'scene-entering'
  }

  // Track scroll position on window with requestAnimationFrame throttling
  useEffect(() => {
    let ticking = false

    const updateScenes = () => {
      const windowH = window.innerHeight || document.documentElement.clientHeight
      const sections = document.querySelectorAll<HTMLElement>('[data-section-id]')

      setSceneStates((prev) => {
        let hasChanges = false
        const next: Record<string, 'entering' | 'active' | 'exiting'> = { ...prev }

        sections.forEach((sec) => {
          const id = sec.getAttribute('data-section-id')
          if (!id || id === 'section-hero') return

          const rect = sec.getBoundingClientRect()
          let state: 'entering' | 'active' | 'exiting'

          // If the top is below 82% of viewport, it's entering
          if (rect.top > windowH * 0.82) {
            state = 'entering'
          }
          // If the section is scrolling out of view towards the top (past 40% of viewport and bottom < 65%)
          else if (rect.top < -windowH * 0.4 && rect.bottom < windowH * 0.65) {
            state = 'exiting'
          }
          // Otherwise, it is the focused active presentation scene
          else {
            state = 'active'
          }

          if (prev[id] !== state) {
            next[id] = state
            hasChanges = true
            if (state === 'active') {
              setRevealedSections((r) => (r[id] ? r : { ...r, [id]: true }))
            }
          }
        })

        return hasChanges ? next : prev
      })
    }

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const mainEl = document.querySelector('main')
          const current = mainEl ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop)
          setScrollY(current)

          const maxScroll = mainEl
            ? mainEl.scrollHeight - mainEl.clientHeight
            : document.documentElement.scrollHeight - window.innerHeight

          if (maxScroll > 0) {
            setScrollProgress(Math.min(100, Math.max(0, (current / maxScroll) * 100)))
          }

          updateScenes()
          ticking = false
        })
        ticking = true
      }
    }

    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateScenes, { passive: true })
    handleScroll()
    updateScenes()

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', updateScenes)
    }
  }, [])

  // IntersectionObserver for staggered section entrance & pop-in fallback
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id')
            if (sectionId) {
              setRevealedSections((prev) => ({ ...prev, [sectionId]: true }))
            }
          }
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    )

    const sections = document.querySelectorAll('[data-section-id]')
    sections.forEach((sec) => observer.observe(sec))

    return () => observer.disconnect()
  }, [])

  // Animate Section 6 values when visible (one-time smooth interpolation)
  useEffect(() => {
    if (revealedSections['section-mitigation'] && !mitigationAnimated) {
      setMitigationAnimated(true)
      let step = 0
      const totalSteps = 24
      const interval = setInterval(() => {
        step++
        const progress = step / totalSteps
        setVoltageVal(+(255.4 - (255.4 - 247.9) * progress).toFixed(1))
        setLoadingVal(Math.round(108 - (108 - 92) * progress))
        setVufVal(+(3.1 - (3.1 - 1.1) * progress).toFixed(1))
        if (step >= totalSteps) clearInterval(interval)
      }, 40)
    }
  }, [revealedSections, mitigationAnimated])

  // Animate Section 10 Results count-up once visible
  useEffect(() => {
    if (revealedSections['section-results'] && !resultsAnimated) {
      setResultsAnimated(true)
      let step = 0
      const totalSteps = 28
      const interval = setInterval(() => {
        step++
        const p = step / totalSteps
        // easeOutCubic
        const ease = 1 - Math.pow(1 - p, 3)
        setCountViolations(Math.round(100 * ease))
        setCountSelfConsumption(+(86.4 * ease).toFixed(1))
        setCountFeederLoading(Math.round(92 * ease))
        setCountVuf(+(1.1 * ease).toFixed(1))
        if (step >= totalSteps) clearInterval(interval)
      }, 35)
    }
  }, [revealedSections, resultsAnimated])

  // Playback timer for demo video simulation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setVideoProgress((prev) => (prev + 1) % 100)
      }, 140)
    }
    return () => clearInterval(interval)
  }, [isPlaying])

  // Continuous pipeline particle traveler
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (!isPipelineHovered) {
      interval = setInterval(() => {
        setPipelineStep((prev) => (prev + 1) % 5)
      }, 2400)
    }
    return () => clearInterval(interval)
  }, [isPipelineHovered])

  // Live Pulse Node cycling (Substation -> Solar -> BESS -> Transformer -> Homes -> EV)
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulseNode((prev) => (prev + 1) % 5)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={pageContainerRef}
      className="w-full flex flex-col bg-white dark:bg-[#0B1E15] text-[#10251A] dark:text-[#F0FDF4] selection:bg-[#86EFAC] selection:text-[#064E3B] relative overflow-x-clip"
    >
      {/* ========================================================================= */}
      {/* CINEMATIC SCROLL PROGRESS BAR */}
      {/* ========================================================================= */}
      <div className="fixed top-0 inset-x-0 h-[3px] z-50 pointer-events-none bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-[#047857] via-[#10B981] to-[#86EFAC] transition-all duration-150 ease-out shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Embedded CSS Animations for Flowing Energy Lines & Floating Badges */}
      <style>{`
        @keyframes energyFlow {
          0% { stroke-dashoffset: 64; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-energy-flow {
          animation: energyFlow 2.6s linear infinite;
        }

        @keyframes floatSlow1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes floatSlow2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(3px); }
        }
        .animate-float-1 {
          animation: floatSlow1 4.5s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: floatSlow2 5.5s ease-in-out infinite;
        }

        /* Subtle Organic Node Status Pulses with Distinct Timing */
        @keyframes subtleNodePulse {
          0%, 100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
          50% { transform: scale(1.35); opacity: 1; box-shadow: 0 0 8px 2px rgba(139, 203, 90, 0.45); }
        }
        .animate-node-pulse-1 { animation: subtleNodePulse 3.2s ease-in-out infinite; }
        .animate-node-pulse-2 { animation: subtleNodePulse 3.8s ease-in-out infinite; animation-delay: 0.8s; }
        .animate-node-pulse-3 { animation: subtleNodePulse 4.2s ease-in-out infinite; animation-delay: 1.6s; }
        .animate-node-pulse-4 { animation: subtleNodePulse 3.5s ease-in-out infinite; animation-delay: 2.2s; }
        .animate-node-pulse-5 { animation: subtleNodePulse 4.0s ease-in-out infinite; animation-delay: 2.9s; }
        .animate-node-pulse-6 { animation: subtleNodePulse 3.6s ease-in-out infinite; animation-delay: 1.2s; }

        /* Powering-Up Entrance Sequence for Section 2 Digital Twin Grid */
        .grid-powerup-1 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 80ms; }
        .grid-powerup-2 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 180ms; }
        .grid-powerup-3 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 300ms; }
        .grid-powerup-4 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 440ms; }
        .grid-powerup-5 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 580ms; }
        .grid-powerup-6 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 720ms; }
        .grid-powerup-7 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 860ms; }
        .grid-powerup-8 { opacity: 0; transform: translateY(6px); transition: opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1); transition-delay: 1000ms; }

        .scene-active .grid-powerup-1, .section-popped .grid-powerup-1,
        .scene-active .grid-powerup-2, .section-popped .grid-powerup-2,
        .scene-active .grid-powerup-3, .section-popped .grid-powerup-3,
        .scene-active .grid-powerup-4, .section-popped .grid-powerup-4,
        .scene-active .grid-powerup-5, .section-popped .grid-powerup-5,
        .scene-active .grid-powerup-6, .section-popped .grid-powerup-6,
        .scene-active .grid-powerup-7, .section-popped .grid-powerup-7,
        .scene-active .grid-powerup-8, .section-popped .grid-powerup-8 {
          opacity: 1;
          transform: translateY(0);
        }

        /* ========================================================================= */
        /* PPT-STYLE SCENE PRESENTATION SCROLL ANIMATIONS */
        /* ========================================================================= */
        .scene-pop-container,
        .section-pop-container {
          opacity: 0;
          transform: translateY(60px) scale(0.94);
          filter: blur(4px);
          transition:
            opacity 800ms cubic-bezier(0.16, 1, 0.3, 1),
            transform 800ms cubic-bezier(0.16, 1, 0.3, 1),
            filter 800ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform, filter;
        }

        /* 1. START / ENTERING: presses into focus */
        .scene-entering .scene-pop-container,
        .scene-entering .section-pop-container {
          opacity: 0;
          transform: translateY(60px) scale(0.94);
          filter: blur(4px);
        }

        /* 2. END / ACTIVE: settled into crisp focus */
        .scene-active .scene-pop-container,
        .scene-active .section-pop-container,
        .section-popped .section-pop-container {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }

        /* 3. EXITING / RECEDING: subtly moves upward */
        .scene-exiting .scene-pop-container,
        .scene-exiting .section-pop-container {
          opacity: 0.9;
          transform: translateY(-16px) scale(0.98);
          filter: blur(0);
        }

        /* Scene Elements Depth Hierarchy (Differential Motion & Stagger) */
        .scene-eyebrow,
        .stagger-eyebrow {
          opacity: 0;
          transform: translateY(15px);
          transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 0ms;
        }
        .scene-active .scene-eyebrow,
        .scene-active .stagger-eyebrow,
        .section-popped .stagger-eyebrow {
          opacity: 1;
          transform: translateY(0);
        }

        .scene-heading,
        .stagger-heading {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 100ms;
        }
        .scene-active .scene-heading,
        .scene-active .stagger-heading,
        .section-popped .stagger-heading {
          opacity: 1;
          transform: translateY(0);
        }

        .scene-body,
        .stagger-desc {
          opacity: 0;
          transform: translateY(25px);
          transition: opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 180ms;
        }
        .scene-active .scene-body,
        .scene-active .stagger-desc,
        .section-popped .stagger-desc {
          opacity: 1;
          transform: translateY(0);
        }

        .scene-visual,
        .stagger-visual {
          opacity: 0;
          transform: scale(0.95);
          transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 280ms;
        }
        .scene-active .scene-visual,
        .scene-active .stagger-visual,
        .section-popped .stagger-visual {
          opacity: 1;
          transform: scale(1);
        }

        .scene-ui,
        .stagger-interactive {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1);
          transition-delay: 400ms;
        }
        .scene-active .scene-ui,
        .scene-active .stagger-interactive,
        .section-popped .stagger-interactive {
          opacity: 1;
          transform: translateY(0);
        }

        .scene-bg {
          transform: scale(1.02);
          transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scene-active .scene-bg {
          transform: scale(1);
        }

        /* Mobile Adjustments (Reduced distance & scale) */
        @media (max-width: 640px) {
          .scene-pop-container,
          .section-pop-container,
          .scene-entering .scene-pop-container,
          .scene-entering .section-pop-container {
            transform: translateY(25px) scale(0.97);
            filter: blur(2px);
          }
          .scene-exiting .scene-pop-container,
          .scene-exiting .section-pop-container {
            transform: translateY(-8px) scale(0.99);
          }
          .scene-heading,
          .stagger-heading {
            transform: translateY(20px);
          }
          .scene-body,
          .stagger-desc {
            transform: translateY(14px);
          }
          .scene-ui,
          .stagger-eyebrow,
          .stagger-interactive {
            transform: translateY(10px);
          }
        }

        /* Reusable Scroll-Reveal System */
        .reveal-item {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .reveal-active .reveal-item {
          opacity: 1;
          transform: translateY(0);
        }

        .reveal-eyebrow {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 650ms cubic-bezier(0.22, 1, 0.36, 1), transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 0ms;
          will-change: opacity, transform;
        }
        .reveal-heading {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 100ms;
          will-change: opacity, transform;
        }
        .reveal-subtitle {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 180ms;
          will-change: opacity, transform;
        }
        .reveal-image {
          opacity: 0;
          transform: scale(0.97) translateY(16px);
          transition: opacity 750ms cubic-bezier(0.22, 1, 0.36, 1), transform 750ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 200ms;
          will-change: opacity, transform;
        }
        .reveal-content {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 750ms cubic-bezier(0.22, 1, 0.36, 1), transform 750ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 260ms;
          will-change: opacity, transform;
        }

        .reveal-active .reveal-eyebrow,
        .reveal-active .reveal-heading,
        .reveal-active .reveal-subtitle,
        .reveal-active .reveal-content {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-active .reveal-image {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        /* Sequential word step for Predict / Detect / Simulate / Resolve */
        .step-word {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .reveal-active .step-word-1 { opacity: 1; transform: translateY(0); transition-delay: 0ms; }
        .reveal-active .step-word-2 { opacity: 1; transform: translateY(0); transition-delay: 140ms; }
        .reveal-active .step-word-3 { opacity: 1; transform: translateY(0); transition-delay: 280ms; }
        .reveal-active .step-word-4 { opacity: 1; transform: translateY(0); transition-delay: 420ms; }

        .reveal-delay-1 { transition-delay: 100ms; }
        .reveal-delay-2 { transition-delay: 180ms; }
        .reveal-delay-3 { transition-delay: 260ms; }
        .reveal-delay-4 { transition-delay: 340ms; }

        @media (prefers-reduced-motion: reduce) {
          .animate-energy-flow, .animate-float-1, .animate-float-2, .animate-pulse, .animate-ping,
          .animate-node-pulse-1, .animate-node-pulse-2, .animate-node-pulse-3, .animate-node-pulse-4, .animate-node-pulse-5, .animate-node-pulse-6 {
            animation: none !important;
          }
          .section-pop-container {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            transition: none !important;
          }
          .reveal-item, .reveal-eyebrow, .reveal-heading, .reveal-subtitle, .reveal-image, .reveal-content, .step-word,
          .stagger-eyebrow, .stagger-heading, .stagger-desc, .stagger-visual, .stagger-interactive,
          .grid-powerup-1, .grid-powerup-2, .grid-powerup-3, .grid-powerup-4, .grid-powerup-5, .grid-powerup-6, .grid-powerup-7, .grid-powerup-8 {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. HERO — CINEMATIC FULL-WIDTH RENEWABLE GRID VISUAL (Dark Forest Green) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. HERO — RENEWABLE DISTRIBUTION GRID DIGITAL TWIN (Matching Reference) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-hero"
        className="relative w-full min-h-[85vh] lg:min-h-[88vh] pt-10 sm:pt-14 pb-8 flex flex-col justify-between bg-gradient-to-b from-white via-[#F4FAF5] to-[#ECFDF3]/60 dark:from-[#0B1E15] dark:via-[#0E2419] dark:to-[#132F21]/60 text-[#10251A] dark:text-white overflow-hidden transition-colors"
      >
        {/* Background Visual Layer: Renewable Grid Landscape Fading to Left */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-3/4 z-0 pointer-events-none overflow-hidden">
          <img
            src="/images/hero_grid.jpg"
            alt="TeamXsparK Renewable Distribution Grid Digital Twin"
            className="w-full h-full object-cover object-right lg:object-center transition-transform duration-75 ease-out opacity-90 dark:opacity-40"
            style={{
              transform: `translateY(${Math.min(50, scrollY * 0.05)}px) scale(${1 + Math.min(0.02, scrollY * 0.00004)})`,
            }}
            loading="eager"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />

          {/* Seamless Soft Gradient Masks for Crisp Typography and Glass Cards */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-[#0B1E15] dark:via-[#0B1E15]/85 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white/40 dark:from-[#0B1E15] dark:via-transparent dark:to-[#0B1E15]/40" />

          {/* Ambient Glowing Green Power Grid Overlay Lines */}
          <svg
            className="absolute inset-0 w-full h-full opacity-65 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 120 480 Q 420 380, 720 420 T 1300 500"
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeDasharray="8 8"
              className="animate-energy-flow"
            />
            <path
              d="M 280 320 Q 580 440, 920 380 T 1500 460"
              fill="none"
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="animate-energy-flow"
            />
          </svg>
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          
          {/* Left Column: Bold Editorial Typography & Actions */}
          <div
            className="max-w-xl space-y-6 transition-transform duration-75 ease-out"
            style={{
              transform: `translateY(-${Math.min(30, scrollY * 0.03)}px)`,
              opacity: Math.max(0.7, 1 - scrollY * 0.0006),
            }}
          >
            
            {/* HackMatrix Badge (Matching Reference) */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/90 dark:bg-[#132F21]/90 backdrop-blur-md text-[#064E3B] dark:text-[#86EFAC] border border-[#86EFAC]/80 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] animate-pulse" />
              PCCOE • HACKMATRIX 5.0
            </div>

            {/* Main Headline (Matching Reference Image) */}
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[#10251A] dark:text-white leading-[1.02]">
                RENEWABLE<br />
                DISTRIBUTION<br />
                <span className="text-[#059669] dark:text-[#10B981] drop-shadow-[0_2px_14px_rgba(5,150,105,0.3)]">
                  GRID DIGITAL<br />
                  TWIN
                </span>
              </h1>
              <p className="text-base sm:text-lg font-medium text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed max-w-md">
                Physics + AI for smarter renewable grids.
              </p>
            </div>

            {/* CTA Buttons (Matching Reference) */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => navigate('/simulation')}
                className="btn-green-gradient px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 group cursor-pointer shadow-md"
              >
                <span>Launch Simulation</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/network')}
                className="btn-white-glass px-6 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Share2 className="w-4 h-4 text-[#047857] dark:text-[#86EFAC]" />
                <span>Explore Grid</span>
              </button>
            </div>
          </div>

          {/* Right Column: Digital-Twin Floating HUD Annotations (Matching Reference) */}
          <div
            className="relative w-full max-w-md lg:max-w-lg space-y-3.5 transition-transform duration-75 ease-out"
            style={{
              transform: `translateY(-${Math.min(45, scrollY * 0.05)}px)`,
            }}
          >
            
            {/* HUD 1: 11 kV Substation */}
            <div className="p-3.5 rounded-2xl bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md border border-[#86EFAC]/50 dark:border-[#86EFAC]/30 shadow-md flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] animate-float-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#047857] flex items-center justify-center text-white shadow-xs">
                  <Zap className="w-4 h-4 fill-current text-[#86EFAC]" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white tracking-wider">11 kV SUBSTATION</div>
                  <div className="text-[11px] text-[#52665A] dark:text-[#A7F3D0]">TX-MAIN Slack Bus (1.020 pu)</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC] flex items-center gap-1.5">
                B1 Slack <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              </span>
            </div>

            {/* HUD 2: Solar Farm & BESS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md border border-amber-300/60 dark:border-amber-500/30 shadow-md animate-float-2">
                <div className="flex items-center gap-1.5 text-amber-500 text-xs font-mono font-bold mb-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>250 kW SOLAR</span>
                </div>
                <div className="text-xs font-bold text-[#10251A] dark:text-white">Solar Farm Alpha</div>
                <div className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono">Bus 2 Injection</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md border border-[#86EFAC]/60 dark:border-emerald-500/30 shadow-md animate-float-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold mb-1">
                  <BatteryMedium className="w-3.5 h-3.5" />
                  <span>100 kWh BESS</span>
                </div>
                <div className="text-xs font-bold text-[#10251A] dark:text-white">50 kW Inverter</div>
                <div className="text-[10px] text-[#52665A] dark:text-[#A7F3D0] font-mono">20% SOC Reserve</div>
              </div>
            </div>

            {/* HUD 3: 100 kVA Transformer & 230V Residential */}
            <div className="p-3.5 rounded-2xl bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md border border-[#86EFAC]/50 dark:border-[#86EFAC]/30 shadow-md flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] animate-float-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ECFDF3] dark:bg-[#1A3D29] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC]">
                  <HomeIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white tracking-wider">230 V RESIDENTIAL GRID</div>
                  <div className="text-[11px] text-[#52665A] dark:text-[#A7F3D0]">8 Houses • 3-Phase L1/L2/L3 (Sunburst Way)</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">100 kVA</span>
            </div>

            {/* HUD 4: V1G EV Charging */}
            <div className="p-3.5 rounded-2xl bg-white/85 dark:bg-[#122C1F]/85 backdrop-blur-md border border-[#86EFAC]/50 dark:border-[#86EFAC]/30 shadow-md flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] animate-float-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ECFDF3] dark:bg-[#1A3D29] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC]">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white tracking-wider">V1G EV CHARGING</div>
                  <div className="text-[11px] text-[#52665A] dark:text-[#A7F3D0]">ISO 15118 Solar Matching</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">+12.6 kW Buffer</span>
            </div>

          </div>

        </div>

        {/* Floating White Glass Metrics Strip (Matching Reference Image) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mt-8 lg:mt-12">
          <div className="bg-white/90 dark:bg-[#0E2419]/90 backdrop-blur-md border border-[#BBF7D0]/80 dark:border-[#86EFAC]/25 rounded-2xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(16,80,55,0.08)] grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y lg:divide-y-0 lg:divide-x divide-[#BBF7D0]/60 dark:divide-[#86EFAC]/15">
            <div className="flex items-center gap-3.5 pt-2 lg:pt-0 lg:px-3">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF3] dark:bg-[#132F21] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC] shrink-0">
                <Leaf className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">100%</div>
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-semibold mt-1">Renewable Integration</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-2 lg:pt-0 lg:px-3">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF3] dark:bg-[#132F21] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">0</div>
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-semibold mt-1">Active Violations</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-2 lg:pt-0 lg:px-3">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF3] dark:bg-[#132F21] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC] shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">92%</div>
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-semibold mt-1">Feeder Loading</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-2 lg:pt-0 lg:px-3">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF3] dark:bg-[#132F21] border border-[#86EFAC]/50 flex items-center justify-center text-[#047857] dark:text-[#86EFAC] shrink-0">
                <Leaf className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#10251A] dark:text-white tracking-tight leading-none">86.4%</div>
                <div className="text-xs text-[#52665A] dark:text-[#A7F3D0] font-semibold mt-1">Self Consumption</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================================= */}
      {/* 2. SECTION 2 — ONE DIGITAL TWIN. TWO GRID LEVELS. (Warm Cream) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-architecture"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#ECFDF3]/40 via-white to-[#F4FAF5] dark:from-[#132F21]/40 dark:via-[#0E2419] dark:to-[#0B1E15] text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-architecture')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column (45%): Large Editorial Intro */}
          <div className="lg:col-span-5 space-y-4">
            <div className="stagger-eyebrow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/50 shadow-xs">
              PHYSICS-GROUNDED COUPLING
            </div>

            <h2 className="stagger-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#10251A] dark:text-white leading-[1.08]">
              ONE DIGITAL TWIN.<br />
              <span className="text-[#047857] dark:text-[#10B981]">TWO GRID LEVELS.</span>
            </h2>

            <p className="stagger-desc text-sm sm:text-base text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
              Traditional distribution was built around simple top-down assumptions. When rooftop PV backfeeds power at noon, voltage gradient reversals ripple from secondary cul-de-sacs right up to primary substations. TeamXsparK calculates bidirectional AC DistFlow physics across both tiers in synchronized real-time.
            </p>

            {/* Quick Interactive Selector */}
            <div className="stagger-interactive pt-2 flex flex-wrap gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveArchNode('substation')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  activeArchNode === 'substation'
                    ? 'bg-[#047857] text-white border-[#047857] shadow-sm'
                    : 'bg-white dark:bg-[#132F21] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/30 hover:bg-[#ECFDF3]'
                }`}
              >
                11 kV Industrial
              </button>
              <button
                type="button"
                onClick={() => setActiveArchNode('transformer')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  activeArchNode === 'transformer'
                    ? 'bg-[#047857] text-white border-[#047857] shadow-sm'
                    : 'bg-white dark:bg-[#132F21] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/30 hover:bg-[#ECFDF3]'
                }`}
              >
                100 kVA Transformer
              </button>
              <button
                type="button"
                onClick={() => setActiveArchNode('residential')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  activeArchNode === 'residential'
                    ? 'bg-[#047857] text-white border-[#047857] shadow-sm'
                    : 'bg-white dark:bg-[#132F21] text-[#425B4C] dark:text-[#A7F3D0] border-[#BBF7D0]/60 dark:border-[#86EFAC]/30 hover:bg-[#ECFDF3]'
                }`}
              >
                230 V Residential
              </button>
            </div>
          </div>

          {/* Right Column (55%): Digital Grid Energy Flow Network */}
          <div className="stagger-visual lg:col-span-7 w-full flex flex-col items-center">
            
            {/* Digital Grid Console Container */}
            <div className="grid-powerup-1 w-full rounded-3xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 p-5 sm:p-6 relative overflow-hidden shadow-sm">
              
              {/* Subtle Engineering Grid Pattern Overlay */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: 'radial-gradient(#10251A 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />

              {/* Console Header Bar */}
              <div className="grid-powerup-2 relative z-10 flex items-center justify-between pb-3 mb-4 border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-node-pulse-1" />
                  <span className="font-bold text-[#10251A] dark:text-white tracking-wide">DIGITAL GRID TOPOLOGY</span>
                  <span className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0] hidden sm:inline">• IEEE 13 / 8-BUS</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#047857] dark:text-[#86EFAC] font-bold">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>LIVE ENERGY FLOW</span>
                </div>
              </div>

              {/* 1. NODE: 11 kV SUBSTATION (TX-MAIN) */}
              <div
                onMouseEnter={() => setActiveArchNode('substation')}
                className={`grid-powerup-3 relative z-10 w-full p-4 sm:p-5 rounded-2xl transition-all duration-300 cursor-pointer border shadow-xs ${
                  activeArchNode === 'substation'
                    ? 'bg-white dark:bg-[#132F21] border-[#10B981] ring-2 ring-[#10B981]/30 scale-[1.01]'
                    : 'bg-[#F4FAF5] dark:bg-[#0E2419] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 hover:border-[#10B981]/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#064E3B] text-[#86EFAC] flex items-center justify-center font-mono font-black text-sm shadow-xs shrink-0">
                      11k
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-[#10251A] dark:text-white tracking-tight">
                          11 kV SUBSTATION
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-node-pulse-1" />
                          ONLINE
                        </span>
                      </div>
                      <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">
                        Primary Feeder Bus (TX-MAIN) • 1.020 pu • 50.0 Hz
                      </p>
                    </div>
                  </div>

                  <div className="font-mono text-xs text-[#047857] dark:text-[#86EFAC] font-bold shrink-0">
                    B1 SLACK BUS
                  </div>
                </div>
              </div>

              {/* UPPER NETWORK BUS & BRANCHES (SOLAR + BESS) */}
              <div className="relative z-10 my-1 py-1 w-full">
                
                {/* SVG Technical Bus Lines with Traveling Energy Particles */}
                <div className="relative w-full h-28 sm:h-32">
                  <svg className="w-full h-full pointer-events-none" viewBox="0 0 540 120" fill="none">
                    <defs>
                      <filter id="particle-glow-mv" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Central Vertical Bus Trunk */}
                    <line x1="60" y1="0" x2="60" y2="120" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                    
                    {/* Branch 1 to Solar */}
                    <path d="M 60 30 L 160 30" stroke="#10B981" strokeWidth="1.75" />
                    <circle cx="60" cy="30" r="3.5" fill="#047857" />
                    <circle cx="160" cy="30" r="2.5" fill="#047857" />

                    {/* Branch 2 to BESS */}
                    <path d="M 60 90 L 160 90" stroke="#10B981" strokeWidth="1.75" />
                    <circle cx="60" cy="90" r="3.5" fill="#047857" />
                    <circle cx="160" cy="90" r="2.5" fill="#047857" />

                    {/* Particle 1: Solar to Central Bus Trunk */}
                    <circle r="3" fill="#D97706" filter="url(#particle-glow-mv)">
                      <animateMotion
                        path="M 160 30 L 60 30 L 60 120"
                        dur="4.4s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Particle 2: Bus Trunk to BESS Buffer */}
                    <circle r="3" fill="#059669" filter="url(#particle-glow-mv)">
                      <animateMotion
                        path="M 60 0 L 60 90 L 160 90"
                        dur="3.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>

                  {/* Branches HTML Cards (Positioned alongside the bus SVG) */}
                  <div className="absolute inset-y-0 left-28 sm:left-36 right-0 flex flex-col justify-around">
                    
                    {/* Solar Branch Node */}
                    <div className="grid-powerup-4 flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#122C1F] border border-amber-200 dark:border-amber-800/40 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">☀</span>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white">250 kW SOLAR</div>
                          <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">PV-ARRAY-01 • Midday Infeed Peak</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-node-pulse-2" />
                        ONLINE
                      </span>
                    </div>

                    {/* BESS Branch Node */}
                    <div className="grid-powerup-5 flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#122C1F] border border-emerald-200 dark:border-emerald-800/40 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔋</span>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white">100 kWh BESS</div>
                          <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">BESS-01 • Buffer Active (SOC 78%)</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-node-pulse-3" />
                        ONLINE
                      </span>
                    </div>

                  </div>
                </div>

              </div>

              {/* 2. NODE: 100 kVA STEP-DOWN TRANSFORMER (TX-LV-01) */}
              <div
                onMouseEnter={() => setActiveArchNode('transformer')}
                className="grid-powerup-6 relative z-10 my-1 py-1 flex flex-col items-center cursor-pointer group w-full"
              >
                <div className={`w-full p-3 sm:p-3.5 rounded-2xl font-mono text-xs shadow-xs flex items-center justify-between transition-all duration-300 border ${
                  activeArchNode === 'transformer'
                    ? 'bg-[#064E3B] text-white border-[#10B981] ring-2 ring-[#10B981]/30 scale-[1.01]'
                    : 'bg-[#064E3B]/90 text-[#A7F3D0] border-[#064E3B] hover:ring-1 hover:ring-[#86EFAC]/40'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#047857] text-[#86EFAC] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">
                        100 kVA TRANSFORMER (TX-LV-01)
                      </div>
                      <div className="text-[10px] text-[#86EFAC]">
                        11 kV Primary → 230 V Secondary Step-Down
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#047857] text-[#86EFAC] border border-[#86EFAC]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-node-pulse-4" />
                    ONLINE
                  </span>
                </div>
              </div>

              {/* LOWER NETWORK BUS & BRANCHES (HOMES + EV) */}
              <div className="relative z-10 my-1 py-1 w-full">
                
                {/* SVG Technical Bus Lines with Traveling Energy Particles */}
                <div className="relative w-full h-28 sm:h-32">
                  <svg className="w-full h-full pointer-events-none" viewBox="0 0 540 120" fill="none">
                    {/* Central Vertical Bus Trunk */}
                    <line x1="60" y1="0" x2="60" y2="120" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                    
                    {/* Branch 3 to Homes */}
                    <path d="M 60 30 L 160 30" stroke="#10B981" strokeWidth="1.75" />
                    <circle cx="60" cy="30" r="3.5" fill="#047857" />
                    <circle cx="160" cy="30" r="2.5" fill="#047857" />

                    {/* Branch 4 to EV */}
                    <path d="M 60 90 L 160 90" stroke="#10B981" strokeWidth="1.75" />
                    <circle cx="60" cy="90" r="3.5" fill="#047857" />
                    <circle cx="160" cy="90" r="2.5" fill="#047857" />

                    {/* Particle 3: Transformer to Residential Grid */}
                    <circle r="3" fill="#0284C7" filter="url(#particle-glow-mv)">
                      <animateMotion
                        path="M 60 0 L 60 30 L 160 30"
                        dur="4.0s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Particle 4: Transformer to EV Charging Fleet */}
                    <circle r="3" fill="#16A34A" filter="url(#particle-glow-mv)">
                      <animateMotion
                        path="M 60 0 L 60 90 L 160 90"
                        dur="4.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </svg>

                  {/* Branches HTML Cards (Positioned alongside the bus SVG) */}
                  <div className="absolute inset-y-0 left-28 sm:left-36 right-0 flex flex-col justify-around">
                    
                    {/* Homes Branch Node */}
                    <div className="grid-powerup-7 flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#122C1F] border border-sky-200 dark:border-sky-800/40 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🏠</span>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white">230 V RESIDENTIAL GRID</div>
                          <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">8 Homes • 3-Phase L1/L2/L3 Balanced</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-node-pulse-5" />
                        ONLINE
                      </span>
                    </div>

                    {/* EV Branch Node */}
                    <div className="grid-powerup-8 flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#122C1F] border border-emerald-200 dark:border-emerald-800/40 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🚗</span>
                        <div>
                          <div className="text-xs font-mono font-bold text-[#10251A] dark:text-white">V1G EV CHARGING</div>
                          <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">ISO 15118 Solar Matching • +12.6 kW Buffer</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-node-pulse-6" />
                        ONLINE
                      </span>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Transition: Warm Cream -> Crisp White (Atmospheric Fade Band) */}
        <SectionTransition from="cream" to="white" styleType="fade" />
      </section>


      {/* ========================================================================= */}
      {/* 3. SECTION 3 — FEATURED CAPABILITIES (Crisp White) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-capabilities"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-[#FFFFFF] text-[#10231B] transition-all duration-700 ${
          getSceneClass('section-capabilities')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-7xl mx-auto space-y-12">
          
          <div className="space-y-3">
            <h2 className="stagger-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#10251A] dark:text-white">
              ENGINEERED FOR THE RENEWABLE GRID
            </h2>
            <p className="stagger-desc text-sm sm:text-base text-[#425B4C] dark:text-[#A7F3D0] max-w-2xl leading-relaxed">
              Discover how distributed generation, storage, and mobility operate seamlessly in the digital twin.
            </p>
          </div>

          {/* Four Visual Application Zones */}
          <div className="stagger-visual grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. Solar Generation */}
            <div
              onClick={() => navigate('/simulation')}
              className="p-6 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 hover:border-[#86EFAC] transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 reveal-item reveal-delay-1"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-2xl font-bold transition-transform group-hover:scale-110">
                  ☀
                </div>
                <h3 className="text-base font-black text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                  SOLAR GENERATION
                </h3>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
                  250 kW utility PV farm combined with domestic rooftop systems up to 9.6 kW on Sunburst Way.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">
                <span>Explore Solar</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* 2. Battery Storage */}
            <div
              onClick={() => navigate('/simulation')}
              className="p-6 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 hover:border-[#86EFAC] transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 reveal-item reveal-delay-2"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-2xl font-bold transition-transform group-hover:scale-110">
                  🔋
                </div>
                <h3 className="text-base font-black text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                  BATTERY STORAGE
                </h3>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
                  100 kWh utility BESS with 50 kW bi-directional inverter and strict 20% safe SOC floor protection.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">
                <span>Explore Storage</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* 3. Smart Grid */}
            <div
              onClick={() => navigate('/actions')}
              className="p-6 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 hover:border-[#86EFAC] transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 reveal-item reveal-delay-3"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/50 flex items-center justify-center text-2xl font-bold transition-transform group-hover:scale-110">
                  ⚡
                </div>
                <h3 className="text-base font-black text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                  SMART GRID
                </h3>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
                  Autonomous Volt-VAR droop (IEEE 1547) and dynamic phase rebalancing to eliminate neutral heating.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">
                <span>Explore Grid Controls</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* 4. EV + V1G */}
            <div
              onClick={() => navigate('/network')}
              className="p-6 rounded-2xl bg-white/90 dark:bg-[#122C1F]/90 backdrop-blur-md border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 hover:border-[#86EFAC] transition-all duration-300 cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 reveal-item reveal-delay-4"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-2xl font-bold transition-transform group-hover:scale-110">
                  🚗
                </div>
                <h3 className="text-base font-black text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                  V1G EV MOBILITY
                </h3>
                <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
                  Smart solar-matched EV charging absorbs 12.6 kW surplus to boost self-consumption to 86.4%.
                </p>
              </div>
              <div className="pt-4 flex items-center gap-1.5 text-xs font-mono font-bold text-[#047857] dark:text-[#86EFAC]">
                <span>Explore V1G Fleet</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

          </div>
        </div>

        {/* Transition: Crisp White -> Warm Cream (Atmospheric Fade Band) */}
        <SectionTransition from="white" to="cream" styleType="fade" />
      </section>


      {/* ========================================================================= */}
      {/* 4. SECTION 4 — PREDICT. DETECT. SIMULATE. RESOLVE. (Warm Cream) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-forecast"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#F4FAF5] via-white to-[#ECFDF3]/40 dark:from-[#0B1E15] dark:via-[#0E2419] dark:to-[#132F21]/40 text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-forecast')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column (40%): Sequential Process Staggered Typography */}
          <div className="lg:col-span-5 space-y-6">
            <div className="stagger-eyebrow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/40 shadow-xs">
              MACHINE LEARNING FORECASTING
            </div>

            <div className="stagger-heading space-y-1 font-black text-3xl sm:text-5xl leading-tight">
              <div className="step-word step-word-1 text-[#10251A] dark:text-white transition-all duration-300 hover:text-[#10B981]">PREDICT.</div>
              <div className="step-word step-word-2 text-[#047857] dark:text-[#86EFAC] transition-all duration-300 hover:translate-x-1">DETECT.</div>
              <div className="step-word step-word-3 text-[#10251A] dark:text-white transition-all duration-300 hover:text-[#10B981]">SIMULATE.</div>
              <div className="step-word step-word-4 text-[#047857] dark:text-[#86EFAC] transition-all duration-300 hover:translate-x-1">RESOLVE.</div>
            </div>

            <p className="stagger-desc text-sm text-[#425B4C] dark:text-[#A7F3D0] leading-relaxed">
              Scikit-Learn Random Forest regressors predict solar irradiance and load curves 24 hours ahead, giving control operators time to schedule battery dispatch before statutory violations trigger.
            </p>

            <div className="stagger-interactive flex items-center gap-4 pt-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-[#F4FAF5] dark:bg-[#122C1F] border border-[#BBF7D0]/60 dark:border-[#86EFAC]/25 shadow-xs">
                <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">Solar Regressor</div>
                <div className="font-bold text-amber-600 dark:text-amber-400">R² 0.942 • MAE 11.4 kW</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F4FAF5] dark:bg-[#122C1F] border border-[#BBF7D0]/60 dark:border-[#86EFAC]/25 shadow-xs">
                <div className="text-[10px] text-[#425B4C] dark:text-[#A7F3D0]">Load Regressor</div>
                <div className="font-bold text-sky-600 dark:text-sky-400">R² 0.915 • MAE 8.2 kW</div>
              </div>
            </div>
          </div>

          {/* Right Column (60%): Integrated 24-Hour Forecast Curve */}
          <div className="stagger-visual lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-[#122C1F]/95 border border-[#BBF7D0]/70 dark:border-[#86EFAC]/30 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <span className="font-bold text-[#10251A] dark:text-white">24-Hour Forecast Horizon (Solar vs. Load)</span>
              <span className="text-[#047857] dark:text-[#86EFAC] font-bold">12 ms DistFlow Solver</span>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast24hData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="solarGradLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="loadGradLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#6B8274" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(16, 80, 55, 0.15)' }} />
                  <YAxis stroke="#6B8274" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(16, 80, 55, 0.15)' }} unit=" kW" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#BBF7D0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(16, 80, 55, 0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Area
                    type="monotone"
                    dataKey="solar"
                    name="Solar Forecast (kW)"
                    stroke="#D97706"
                    strokeWidth={2}
                    fill="url(#solarGradLight)"
                    isAnimationActive={true}
                    animationBegin={400}
                    animationDuration={1300}
                  />
                  <Area
                    type="monotone"
                    dataKey="load"
                    name="Load Forecast (kW)"
                    stroke="#0284C7"
                    strokeWidth={2}
                    fill="url(#loadGradLight)"
                    isAnimationActive={true}
                    animationBegin={650}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Transition: Pale Mint -> Crisp White (Atmospheric Fade Band) */}
        <SectionTransition from="cream" to="white" styleType="fade" />
      </section>


      {/* ========================================================================= */}
      {/* 5. SECTION 5 — ENGINEERING THE RENEWABLE GRID (Crisp White) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-engineering"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-[#FFFFFF] text-[#10231B] transition-all duration-700 ${
          getSceneClass('section-engineering')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column (45%): Editorial Text */}
          <div className="lg:col-span-5 space-y-6">
            <div className="stagger-eyebrow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ECFDF3] text-[#047857] border border-[#BBF7D0] shadow-xs">
              PHYSICAL BOTTLENECKS
            </div>

            <div className="space-y-3">
              <h2 className="stagger-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#10231B] leading-tight">
                ENGINEERING THE RENEWABLE GRID
              </h2>
              <p className="stagger-desc text-sm sm:text-base text-[#52665A] leading-relaxed">
                High rooftop solar penetration changes the way distribution networks behave. Reverse active power flows push voltages up against radial line impedance and overheat neighborhood feeders.
              </p>
            </div>

            {/* Three Interactive Challenge Selectors (Appear one by one) */}
            <div className="space-y-3 pt-2">
              <div
                onClick={() => setActiveChallenge('voltage')}
                style={{ transitionDelay: '220ms' }}
                className={`stagger-interactive p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                  activeChallenge === 'voltage'
                    ? 'bg-white dark:bg-[#132F21] border-red-500 shadow-md ring-2 ring-red-500/20 translate-x-1'
                    : 'bg-[#F4FAF5] dark:bg-[#122C1F] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#10251A] dark:text-white">VOLTAGE SWELL</h3>
                    <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Reverse power flow raises voltage above 253.0 V.</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">255.4 V</span>
              </div>

              <div
                onClick={() => setActiveChallenge('congestion')}
                style={{ transitionDelay: '360ms' }}
                className={`stagger-interactive p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                  activeChallenge === 'congestion'
                    ? 'bg-white dark:bg-[#132F21] border-amber-500 shadow-md ring-2 ring-amber-500/20 translate-x-1'
                    : 'bg-[#F4FAF5] dark:bg-[#122C1F] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#10251A] dark:text-white">FEEDER CONGESTION</h3>
                    <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Midday renewable export pushes cables past 100% ampacity.</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">108%</span>
              </div>

              <div
                onClick={() => setActiveChallenge('unbalance')}
                style={{ transitionDelay: '500ms' }}
                className={`stagger-interactive p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                  activeChallenge === 'unbalance'
                    ? 'bg-white dark:bg-[#132F21] border-sky-500 shadow-md ring-2 ring-sky-500/20 translate-x-1'
                    : 'bg-[#F4FAF5] dark:bg-[#122C1F] border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">↔</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#10251A] dark:text-white">VOLTAGE UNBALANCE</h3>
                    <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Uneven single-phase rooftop solar pushes VUF above 2.0%.</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">3.1% VUF</span>
              </div>
            </div>
          </div>

          {/* Right Column (55%): Large Visual with Highlighted Hotspots */}
          <div className="stagger-visual lg:col-span-7 relative rounded-3xl overflow-hidden shadow-2xl border border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 bg-[#10251A]">
            <img
              src="/images/grid_changing.jpg"
              alt="Grid infrastructure with highlighted stress zones"
              className="w-full h-[400px] lg:h-[440px] object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
              <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold">ACTIVE STRESS POINT AUDITED</span>
              </div>
              <p className="text-sm font-medium text-white/90">
                {activeChallenge === 'voltage' && 'Terminal switchboard at House 08 reaches 255.4V without Volt-VAR compensation.'}
                {activeChallenge === 'congestion' && 'Conductor F-02 reaches 108% rated ampacity under 250 kW solar injection.'}
                {activeChallenge === 'unbalance' && 'Asymmetric Phase L2 generation induces heavy neutral currents in transformer core.'}
              </p>
            </div>
          </div>

        </div>

        {/* Transition: Crisp White -> Light Green (Atmospheric Renewable Glow Band) */}
        <SectionTransition from="white" to="light-green" styleType="glow" />
      </section>


      {/* ========================================================================= */}
      {/* 6. SECTION 6 — FROM GRID STRESS TO GRID STABILITY (Mint Surface) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-mitigation"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#ECFDF3] via-white to-[#F4FAF5] dark:from-[#0E2419] dark:via-[#0B1E15] dark:to-[#061A12] text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-mitigation')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <h2 className="stagger-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#10251A] dark:text-white">
              FROM GRID STRESS TO GRID STABILITY
            </h2>
            <p className="stagger-desc text-sm sm:text-base text-[#425B4C] dark:text-[#A7F3D0] max-w-xl mx-auto">
              Physics-grounded corrective actions without unnecessary solar curtailment.
            </p>
          </div>

          {/* Horizontal Animated Flow Pipeline with Dynamic Live Numbers (Sequential: BEFORE -> ENGINE -> AFTER) */}
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            
            {/* 1. BEFORE (Cols 1-3) */}
            <div
              style={{ transitionDelay: '200ms' }}
              className="stagger-interactive md:col-span-3 p-6 rounded-2xl bg-white dark:bg-[#122C1F] border-2 border-red-300 dark:border-red-900/60 shadow-sm text-center space-y-3"
            >
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                BEFORE (STRESSED)
              </span>
              <div className="space-y-2 pt-1 font-mono">
                <div>
                  <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
                    {mitigationAnimated ? `${voltageVal} V` : '255.4 V'}
                  </div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Terminal Voltage</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    {mitigationAnimated ? `${loadingVal}%` : '108%'}
                  </div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Feeder Loading</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
                    {mitigationAnimated ? `${vufVal}%` : '3.1%'}
                  </div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Voltage Unbalance</div>
                </div>
              </div>
            </div>

            {/* TRANSFORMATION ARROW (Col 4) */}
            <div className="md:col-span-1 flex justify-center text-[#047857] dark:text-[#86EFAC] text-2xl font-black">
              →
            </div>

            {/* 2. TEAMXSPARK ENGINE (Cols 5-7) */}
            <div
              style={{ transitionDelay: '360ms' }}
              className="stagger-interactive md:col-span-3 p-6 rounded-2xl bg-[#064E3B] text-white border-2 border-[#10B981] dark:border-[#86EFAC] shadow-xl text-center space-y-3"
            >
              <span className="w-10 h-10 rounded-2xl bg-[#10B981]/20 border border-[#10B981] text-[#86EFAC] flex items-center justify-center mx-auto text-xl font-bold">
                ⚡
              </span>
              <h3 className="text-base font-black">TEAMXSPARK ENGINE</h3>
              <p className="text-xs font-mono text-[#A7F3D0] leading-relaxed">
                Volt-VAR Droop (cos φ = 0.91)<br />
                Tie-Line F-03 Reconfiguration<br />
                Dynamic Phase Swap (L2 → L1)<br />
                Smart V1G EV Absorption
              </p>
            </div>

            {/* TRANSFORMATION ARROW (Col 8) */}
            <div className="md:col-span-1 flex justify-center text-[#047857] dark:text-[#86EFAC] text-2xl font-black">
              →
            </div>

            {/* 3. AFTER (Cols 9-11) */}
            <div
              style={{ transitionDelay: '520ms' }}
              className="stagger-interactive md:col-span-3 p-6 rounded-2xl bg-white dark:bg-[#122C1F] border-2 border-[#10B981] dark:border-[#86EFAC] shadow-sm text-center space-y-3"
            >
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/40">
                AFTER (STABILIZED)
              </span>
              <div className="space-y-2 pt-1 font-mono">
                <div>
                  <div className="text-2xl font-black text-[#047857] dark:text-[#86EFAC]">247.9 V</div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Voltage Stabilized</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#047857] dark:text-[#86EFAC]">92%</div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Feeder Reconfigured</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#047857] dark:text-[#86EFAC]">1.1%</div>
                  <div className="text-[11px] text-[#425B4C] dark:text-[#A7F3D0]">Phases Balanced</div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Transition: Light Green -> Dark Forest (Clean Atmospheric Glow Boundary) */}
        <SectionTransition from="light-green" to="forest" styleType="glow" />
      </section>


      {/* ========================================================================= */}
      {/* 7. SECTION 7 — SEE THE DIGITAL TWIN IN ACTION (Dark Forest Green) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-twin"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-[#10251A] text-white transition-all duration-700 ${
          getSceneClass('section-twin')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-6xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="stagger-eyebrow text-xs font-mono font-bold uppercase text-[#86EFAC] tracking-widest">
                IMMERSIVE CONTROL CONSOLE
              </div>
              <h2 className="stagger-heading text-3xl sm:5xl font-black tracking-tight text-white mt-1">
                SEE THE DIGITAL TWIN <span className="text-[#86EFAC]">IN ACTION.</span>
              </h2>
              <p className="stagger-desc text-sm text-[#A7F3D0]/80 mt-1">
                Hover over grid assets to inspect telemetry and dynamic energy flow.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/network')}
              className="stagger-interactive btn-green-gradient px-5 py-3 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg hover:shadow-[0_4px_24px_rgba(5,150,105,0.45)] hover:scale-[1.03] group"
            >
              <span>OPEN DIGITAL TWIN</span>
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </div>

          {/* Interactive Visual Network Topology Map Frame */}
          <div className="stagger-visual p-6 sm:p-8 rounded-3xl bg-[#0d1f15] border border-[#86EFAC]/30 shadow-2xl relative">
            
            {/* Active Hover Telemetry Overlay: Responsive placement */}
            {activeTwinNode && (
              <div className="mb-4 sm:mb-0 sm:absolute sm:top-6 sm:right-6 z-20 p-3.5 rounded-xl bg-[#064E3B] border border-[#86EFAC]/60 shadow-2xl animate-in fade-in duration-150">
                <div className="text-xs font-bold text-[#86EFAC]">{activeTwinNode.title}</div>
                <div className="text-[11px] text-[#A7F3D0] font-mono mt-0.5">{activeTwinNode.detail}</div>
                <div className="text-xs font-mono font-bold text-[#86EFAC] mt-1">{activeTwinNode.metric}</div>
              </div>
            )}

            {/* Live Circuit Particle Bridge between Grid Nodes */}
            <div className="relative w-full h-2 mb-1 hidden sm:block overflow-hidden pointer-events-none opacity-80">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 8">
                <line x1="40" y1="4" x2="960" y2="4" stroke="rgba(134, 239, 172, 0.2)" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="40" y1="4" x2="960" y2="4" stroke="#10B981" strokeWidth="2" strokeDasharray="8 8" className="animate-energy-flow" opacity="0.85" />
              </svg>
            </div>

            {/* Five Key Asset Nodes with Staggered Live Network Pulses */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 py-4">
              
              {/* Node 1: Substation */}
              <div
                onMouseEnter={() =>
                  setActiveTwinNode({
                    id: 'substation',
                    title: '11 kV Primary Substation (B1)',
                    detail: 'TX-MAIN Regulated Slack Bus',
                    metric: '1.020 pu • 50.0 Hz Frequency',
                  })
                }
                onMouseLeave={() => setActiveTwinNode(null)}
                className={`p-4 rounded-xl bg-[#064E3B] border transition-all duration-300 cursor-pointer text-center group ${
                  livePulseNode === 0
                    ? 'border-[#10B981] ring-2 ring-[#10B981]/40 shadow-[0_0_18px_rgba(16,185,129,0.35)] scale-[1.02]'
                    : 'border-[#86EFAC]/20 hover:border-[#10B981] hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚡</div>
                <div className="font-bold text-sm">Substation</div>
                <div className="text-[10px] font-mono text-[#86EFAC]">B1 Slack (11 kV)</div>
              </div>

              {/* Node 2: Solar Farm */}
              <div
                onMouseEnter={() =>
                  setActiveTwinNode({
                    id: 'solar',
                    title: 'Solar Farm Alpha (B2)',
                    detail: '250 kW PV Generation Bus',
                    metric: 'Midday Peak Infeed Active',
                  })
                }
                onMouseLeave={() => setActiveTwinNode(null)}
                className={`p-4 rounded-xl bg-[#064E3B] border transition-all duration-300 cursor-pointer text-center group ${
                  livePulseNode === 1
                    ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.35)] scale-[1.02]'
                    : 'border-[#86EFAC]/20 hover:border-amber-400 hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(251,191,36,0.25)]'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">☀</div>
                <div className="font-bold text-sm">Solar Farm</div>
                <div className="text-[10px] font-mono text-amber-400">250 kW Array</div>
              </div>

              {/* Node 3: BESS Storage */}
              <div
                onMouseEnter={() =>
                  setActiveTwinNode({
                    id: 'bess',
                    title: 'BESS Storage System (B3)',
                    detail: '100 kWh / 50 kW Bi-directional',
                    metric: 'SOC: 62% (≥20% Safe Floor)',
                  })
                }
                onMouseLeave={() => setActiveTwinNode(null)}
                className={`p-4 rounded-xl bg-[#064E3B] border transition-all duration-300 cursor-pointer text-center group ${
                  livePulseNode === 2
                    ? 'border-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.35)] scale-[1.02]'
                    : 'border-[#86EFAC]/20 hover:border-emerald-400 hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(52,211,153,0.25)]'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🔋</div>
                <div className="font-bold text-sm">BESS Storage</div>
                <div className="text-[10px] font-mono text-emerald-400">100 kWh / 50 kW</div>
              </div>

              {/* Node 4: 230 V Residential */}
              <div
                onMouseEnter={() =>
                  setActiveTwinNode({
                    id: 'residential',
                    title: '230 V Residential Street (B4)',
                    detail: '8 Houses • 3-Phase (Sunburst Way)',
                    metric: 'Terminal Potential: 247.9 V',
                  })
                }
                onMouseLeave={() => setActiveTwinNode(null)}
                className={`p-4 rounded-xl bg-[#064E3B] border transition-all duration-300 cursor-pointer text-center group ${
                  livePulseNode === 3
                    ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.35)] scale-[1.02]'
                    : 'border-[#86EFAC]/20 hover:border-sky-400 hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(56,189,248,0.25)]'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🏠</div>
                <div className="font-bold text-sm">8 Homes</div>
                <div className="text-[10px] font-mono text-sky-400">Sunburst Way</div>
              </div>

              {/* Node 5: EV Charging */}
              <div
                onMouseEnter={() =>
                  setActiveTwinNode({
                    id: 'ev',
                    title: 'Smart EV Fleet (V1G)',
                    detail: 'ISO 15118 Solar Absorption',
                    metric: '+12.6 kW Local Buffer',
                  })
                }
                onMouseLeave={() => setActiveTwinNode(null)}
                className={`p-4 rounded-xl bg-[#064E3B] border transition-all duration-300 cursor-pointer text-center col-span-2 sm:col-span-1 group ${
                  livePulseNode === 4
                    ? 'border-[#10B981] ring-2 ring-[#10B981]/40 shadow-[0_0_18px_rgba(16,185,129,0.35)] scale-[1.02]'
                    : 'border-[#86EFAC]/20 hover:border-[#10B981] hover:scale-[1.02] hover:shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                }`}
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🚗</div>
                <div className="font-bold text-sm">EV Fleet</div>
                <div className="text-[10px] font-mono text-[#86EFAC]">V1G Matching</div>
              </div>

            </div>

            {/* Bottom Feeder Flow Ribbon */}
            <div className="pt-4 border-t border-[#86EFAC]/20 flex flex-wrap items-center justify-between text-xs font-mono text-[#A7F3D0]/70 gap-2">
              <span>Feeder Conductor: AC DistFlow Active Mesh</span>
              <span className="text-[#86EFAC] font-bold">Tie-Line F-03: Switchable Reconfiguration</span>
            </div>

          </div>
        </div>

        {/* Transition: Dark Forest -> Warm Cream (Clean Atmospheric Glow Boundary) */}
        <SectionTransition from="forest" to="cream" styleType="glow" />
      </section>


      {/* ========================================================================= */}
      {/* 8. SECTION 8 — AI PREDICTION. PHYSICS VALIDATION. (Warm Cream) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-pipeline"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#F4FAF5] via-white to-[#ECFDF3]/40 dark:from-[#0B1E15] dark:via-[#0E2419] dark:to-[#132F21]/40 text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-pipeline')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-5xl mx-auto space-y-10 text-center">
          
          <div className="space-y-2">
            <div className="stagger-eyebrow inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-[#ECFDF3] dark:bg-[#132F21] text-[#047857] dark:text-[#86EFAC] border border-[#86EFAC]/40 shadow-xs">
              ANTI-HALLUCINATION DECISION PIPELINE
            </div>
            <h2 className="stagger-heading text-3xl sm:text-4xl font-black tracking-tight text-[#10251A] dark:text-white">
              AI PREDICTION. PHYSICS VALIDATION.
            </h2>
            <p className="stagger-desc text-sm text-[#425B4C] dark:text-[#A7F3D0] max-w-lg mx-auto">
              Hover along the pipeline to inspect physical constraint verification.
            </p>
          </div>

          {/* Interactive Traveling Pipeline (Sequential Entrance) */}
          <div
            onMouseEnter={() => setIsPipelineHovered(true)}
            onMouseLeave={() => setIsPipelineHovered(false)}
            className="stagger-visual p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-[#0E2419]/90 backdrop-blur-md border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 shadow-sm"
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center font-mono text-xs">
              
              {/* Step 1: Forecast */}
              <div
                onClick={() => setPipelineStep(0)}
                style={{ transitionDelay: '150ms' }}
                className={`stagger-interactive p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  pipelineStep === 0
                    ? 'bg-[#047857] text-white border-[#047857] shadow-md scale-105'
                    : 'bg-white dark:bg-[#122C1F] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white'
                }`}
              >
                <div className="text-xl mb-1">📈</div>
                <div className="font-bold">1. FORECAST</div>
                <div className="text-[10px] opacity-80">24h Generation</div>
              </div>

              {/* Step 2: Violation */}
              <div
                onClick={() => setPipelineStep(1)}
                style={{ transitionDelay: '270ms' }}
                className={`stagger-interactive p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  pipelineStep === 1
                    ? 'bg-red-600 text-white border-red-600 shadow-md scale-105'
                    : 'bg-white dark:bg-[#122C1F] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white'
                }`}
              >
                <div className="text-xl mb-1">⚠</div>
                <div className="font-bold">2. VIOLATION</div>
                <div className="text-[10px] opacity-80">IEEE 1547 Audit</div>
              </div>

              {/* Step 3: Physics Check */}
              <div
                onClick={() => setPipelineStep(2)}
                style={{ transitionDelay: '390ms' }}
                className={`stagger-interactive p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  pipelineStep === 2
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105'
                    : 'bg-white dark:bg-[#122C1F] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white'
                }`}
              >
                <div className="text-xl mb-1">⚖</div>
                <div className="font-bold">3. PHYSICS CHECK</div>
                <div className="text-[10px] opacity-80">20% SOC Floor</div>
              </div>

              {/* Step 4: Corrective Action */}
              <div
                onClick={() => setPipelineStep(3)}
                style={{ transitionDelay: '510ms' }}
                className={`stagger-interactive p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  pipelineStep === 3
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md scale-105'
                    : 'bg-white dark:bg-[#122C1F] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white'
                }`}
              >
                <div className="text-xl mb-1">🔧</div>
                <div className="font-bold">4. ACTION</div>
                <div className="text-[10px] opacity-80">Volt-VAR &amp; F-03</div>
              </div>

              {/* Step 5: Verification */}
              <div
                onClick={() => setPipelineStep(4)}
                style={{ transitionDelay: '630ms' }}
                className={`stagger-interactive p-4 rounded-xl border transition-all duration-300 cursor-pointer col-span-2 sm:col-span-1 ${
                  pipelineStep === 4
                    ? 'bg-[#047857] text-white border-[#047857] shadow-md scale-105'
                    : 'bg-white dark:bg-[#122C1F] border-[#BBF7D0]/70 dark:border-[#86EFAC]/25 text-[#10251A] dark:text-white'
                }`}
              >
                <div className="text-xl mb-1">✓</div>
                <div className="font-bold">5. VERIFY</div>
                <div className="text-[10px] opacity-80">Safe Equilibrium</div>
              </div>

            </div>

            {/* Step Explanation Callout */}
            <div className="mt-6 pt-4 border-t border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 font-mono text-xs text-[#425B4C] dark:text-[#A7F3D0]">
              {pipelineStep === 0 && 'AI forecasts midday solar peak and residential load to detect upcoming reverse power.'}
              {pipelineStep === 1 && 'AC DistFlow solver flags Bus 3 voltage exceeding statutory limits (>1.05 pu / 253V).'}
              {pipelineStep === 2 && 'Feasibility engine strictly enforces 20% minimum battery SOC reserve floor and inverter ratings.'}
              {pipelineStep === 3 && 'Automated smart inverter Volt-VAR droop and tie-line F-03 reconfiguration dispatched.'}
              {pipelineStep === 4 && 'Grid returns to safe operational band with zero solar active power curtailed.'}
            </div>
          </div>

        </div>

        {/* Transition: Warm Cream -> Dark Forest (Cinematic Image Atmosphere) */}
        <SectionTransition from="cream" to="forest" styleType="image" />
      </section>


      {/* ========================================================================= */}
      {/* 9. SECTION 9 — VIDEO / IMMERSIVE VISUAL (Dark Forest Green) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-media"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-[#10251A] text-white transition-all duration-700 ${
          getSceneClass('section-media')
        }`}
      >
        {/* Ambient Subtle Background Graphic */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f15] via-transparent to-[#10251A] z-0 pointer-events-none" />

        <div className="scene-pop-container section-pop-container relative z-10 max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="stagger-eyebrow text-xs font-mono font-bold uppercase text-[#86EFAC] tracking-widest">
                CINEMATIC MEDIA VISUAL
              </div>
              <h2 className="stagger-heading text-3xl sm:text-4xl font-black tracking-tight text-white">
                SEE THE GRID BEFORE YOU CHANGE IT.
              </h2>
            </div>

            <div className="stagger-interactive flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2.5 rounded-xl bg-[#0d1f15] border border-[#2C3C2E] hover:border-[#86EFAC] transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-[#86EFAC]" />}
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2.5 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white transition-colors cursor-pointer font-bold shadow-md"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            </div>
          </div>

          {/* Dedicated Media Panel Frame */}
          <div className="stagger-visual w-full rounded-3xl bg-[#0d1f15] border-2 border-[#86EFAC]/25 p-6 sm:p-8 lg:p-10 text-white shadow-2xl relative flex flex-col justify-between min-h-[380px] sm:min-h-[440px] gap-8">
            
            {/* Top Video Status */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span>TEAMXSPARK LIVE CONTROL SIMULATION</span>
              </div>
              <span className="text-[#86EFAC]">PHASE 0{activePhaseIndex + 1} / 05</span>
            </div>

            {/* Center Dynamic Video Stage */}
            <div className="py-4 text-center space-y-2">
              <div className="text-xs uppercase font-mono tracking-widest text-[#A7F3D0]/70">
                {currentDemoPhase.meta}
              </div>
              <div className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                {currentDemoPhase.title}
              </div>
              <div className={`text-sm sm:text-base font-bold font-mono ${currentDemoPhase.statusColor}`}>
                {currentDemoPhase.status}
              </div>
            </div>

            {/* Video Telemetry Overlay Bar */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-[#064E3B] border border-[#86EFAC]/25">
                  <span className="text-[#A7F3D0]/70 block text-[10px]">Bus 3 Voltage</span>
                  <span className={`text-sm font-bold ${currentDemoPhase.statusColor}`}>
                    {currentDemoPhase.voltage}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#064E3B] border border-[#86EFAC]/25">
                  <span className="text-[#A7F3D0]/70 block text-[10px]">Feeder Ampacity</span>
                  <span className="text-sm font-bold text-white">
                    {currentDemoPhase.loading}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#064E3B] border border-[#86EFAC]/25">
                  <span className="text-[#A7F3D0]/70 block text-[10px]">Solar Curtailment</span>
                  <span className="text-sm font-bold text-[#86EFAC]">0 kW</span>
                </div>
              </div>

              {/* Progress Scrubber Bar */}
              <div className="w-full bg-[#064E3B] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#10B981] h-full transition-all duration-100 ease-linear shadow-[0_0_8px_#10B981]"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Transition: Dark Forest -> Light Green (Clean Atmospheric Glow Boundary) */}
        <SectionTransition from="forest" to="light-green" styleType="image" />
      </section>


      {/* ========================================================================= */}
      {/* 10. SECTION 10 — RESULTS (Light Green #E8F3D8) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-results"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#ECFDF3] via-white to-[#F4FAF5] dark:from-[#0E2419] dark:via-[#0B1E15] dark:to-[#061A12] text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-results')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-6xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="stagger-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#10251A] dark:text-white">
              ENGINEERED FOR REAL GRID CONSTRAINTS
            </h2>
            <p className="stagger-desc text-sm text-[#425B4C] dark:text-[#A7F3D0] max-w-xl mx-auto">
              Empirical benchmark figures validated against IEEE standards.
            </p>
          </div>

          {/* Asymmetric Large Typography Layout with Smooth Viewport Count-up */}
          <div className="stagger-visual grid grid-cols-2 lg:grid-cols-4 gap-8 text-center font-mono">
            
            <div className="space-y-1 reveal-item reveal-delay-1">
              <div className="text-4xl sm:text-6xl font-black text-[#10251A] dark:text-white">
                {resultsAnimated ? `${countViolations}%` : '100%'}
              </div>
              <div className="text-xs font-bold text-[#047857] dark:text-[#86EFAC] uppercase tracking-wider">
                STATUTORY VIOLATIONS RESOLVED
              </div>
            </div>

            <div className="space-y-1 reveal-item reveal-delay-2">
              <div className="text-4xl sm:text-6xl font-black text-[#10251A] dark:text-white">
                {resultsAnimated ? `${countSelfConsumption}%` : '86.4%'}
              </div>
              <div className="text-xs font-bold text-[#047857] dark:text-[#86EFAC] uppercase tracking-wider">
                SELF-CONSUMPTION
              </div>
            </div>

            <div className="space-y-1 reveal-item reveal-delay-3">
              <div className="text-4xl sm:text-6xl font-black text-[#10251A] dark:text-white">
                {resultsAnimated ? `${countFeederLoading}%` : '92%'}
              </div>
              <div className="text-xs font-bold text-[#047857] dark:text-[#86EFAC] uppercase tracking-wider">
                FEEDER LOADING
              </div>
            </div>

            <div className="space-y-1 reveal-item reveal-delay-4">
              <div className="text-4xl sm:text-6xl font-black text-[#10251A] dark:text-white">
                {resultsAnimated ? `${countVuf}%` : '1.1%'}
              </div>
              <div className="text-xs font-bold text-[#047857] dark:text-[#86EFAC] uppercase tracking-wider">
                VUF UNBALANCE
              </div>
            </div>

          </div>
        </div>

        {/* Transition: Light Green -> Warm Cream (Atmospheric Fade Band) */}
        <SectionTransition from="light-green" to="cream" styleType="fade" />
      </section>


      {/* ========================================================================= */}
      {/* 11. SECTION 11 — TECHNICAL RESOURCES (Warm Cream) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-resources"
        className={`relative w-full py-20 lg:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-[#F4FAF5] via-white to-[#ECFDF3]/40 dark:from-[#0B1E15] dark:via-[#0E2419] dark:to-[#132F21]/40 text-[#10251A] dark:text-[#F0FDF4] transition-all duration-700 ${
          getSceneClass('section-resources')
        }`}
      >
        <div className="scene-pop-container section-pop-container relative z-10 max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 pb-4">
            <div>
              <div className="stagger-eyebrow text-xs font-mono font-bold uppercase text-[#047857] dark:text-[#86EFAC] tracking-widest">
                ARCHITECTURE REPOSITORIES
              </div>
              <h2 className="stagger-heading text-3xl sm:text-4xl font-black tracking-tight text-[#10251A] dark:text-white mt-1">
                TECHNICAL RESOURCES
              </h2>
            </div>
            <p className="stagger-desc text-xs sm:text-sm text-[#425B4C] dark:text-[#A7F3D0]">
              Access engineering modules directly.
            </p>
          </div>

          {/* Clean Navigation Rows */}
          <div className="stagger-interactive divide-y divide-[#BBF7D0]/50 dark:divide-[#86EFAC]/15">
            
            <div
              onClick={() => navigate('/simulation')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">01</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    Physics Engine (AC DistFlow)
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Exact radial branch power flow solver &amp; impedance matrix.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

            <div
              onClick={() => navigate('/forecasts')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">02</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    AI Forecasting Pipeline
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Scikit-Learn Random Forest 24h solar &amp; load regressors.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

            <div
              onClick={() => navigate('/actions')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">03</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    Volt-VAR Inverter Control
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">IEEE 1547 reactive power absorption droop curves.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

            <div
              onClick={() => navigate('/actions')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">04</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    Dynamic Phase Rebalancing
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">L1/L2/L3 household phase transfer logic for VUF recovery.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

            <div
              onClick={() => navigate('/network')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">05</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    Feeder Reconfiguration
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">Normally-open tie-line F-03 switching and branch redirection.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

            <div
              onClick={() => navigate('/reports')}
              className="py-4 px-2 flex items-center justify-between group hover:bg-white/80 dark:hover:bg-[#122C1F]/80 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-bold text-[#047857] dark:text-[#86EFAC]">06</span>
                <div>
                  <h3 className="text-sm font-bold text-[#10251A] dark:text-white group-hover:text-[#047857] dark:group-hover:text-[#86EFAC] transition-colors">
                    V1G EV Smart Solar Matching
                  </h3>
                  <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0]">ISO 15118 electric vehicle charging modulation.</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#047857] dark:text-[#86EFAC] group-hover:translate-x-1.5 transition-transform" />
            </div>

          </div>
        </div>

        {/* Transition: Warm Cream -> Dark Forest (Clean Atmospheric Glow Boundary) */}
        <SectionTransition from="cream" to="forest" styleType="glow" />
      </section>


      {/* ========================================================================= */}
      {/* 12. SECTION 12 — FINAL CTA (Dark Forest Green) */}
      {/* ========================================================================= */}
      <section
        data-section-id="section-cta"
        className={`relative w-full py-24 lg:py-28 px-6 sm:px-8 lg:px-12 text-center bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#022C1E] text-white overflow-hidden transition-all duration-700 ${
          getSceneClass('section-cta')
        }`}
      >
        {/* Ambient Background Visual */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/images/hero_grid.jpg"
            alt="Renewable Grid"
            className="w-full h-full object-cover opacity-25"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10251A] via-[#10251A]/85 to-[#10251A]" />
        </div>

        <div className="scene-pop-container section-pop-container relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="stagger-heading text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            THE GRID IS READY<br />
            FOR THE NEXT GENERATION.
          </h2>

          <p className="stagger-desc text-base sm:text-lg text-[#A7F3D0] max-w-md mx-auto">
            Physics-grounded intelligence for renewable distribution networks.
          </p>

          <div className="stagger-interactive pt-4">
            <button
              type="button"
              onClick={() => navigate('/simulation')}
              className="btn-green-gradient px-8 py-4 rounded-xl text-base font-bold text-white transition-all duration-300 shadow-xl hover:shadow-[0_8px_28px_rgba(5,150,105,0.45)] hover:scale-[1.02] flex items-center gap-2 mx-auto cursor-pointer font-sans"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>LAUNCH DIGITAL TWIN →</span>
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}

export default HomePage
