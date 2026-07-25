import {
  ArrowDown,
  ArrowRight,
  Cloud,
  Code2,
  Download,
  Github,
  Laptop,
  LockKeyhole,
  ServerCog,
  WifiOff,
} from "lucide-react";
import Image from "next/image";

import { InstallCommand } from "@/components/install-command";
import { ProductShowcase } from "@/components/product-showcase";

const githubUrl = "https://github.com/badosz0/lifever";
const releaseUrl = `${githubUrl}/releases/latest`;

const principles = [
  {
    number: "01",
    title: "Local by default",
    description:
      "Open the app and start. No account wall, no server required, and useful demo data from the first launch.",
    Icon: WifiOff,
  },
  {
    number: "02",
    title: "Sync when you want",
    description:
      "Sign in when you want the same reminders, events, notes, and projects on another device.",
    Icon: Cloud,
  },
  {
    number: "03",
    title: "Yours to run",
    description:
      "Use the hosted backend or self-host with Cloudflare D1 or PostgreSQL. The entire stack is open source.",
    Icon: ServerCog,
  },
];

const faqs = [
  {
    question: "Do I need an account?",
    answer:
      "No. Lifever starts with a fully usable local profile. Sign in with Discord only when you want cross-device sync.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Local-profile data stays on the device. Signed-in data lives in the configured Lifever API and is scoped to your authenticated account.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "Lifever runs in modern browsers and ships as a native Tauri app for macOS through GitHub Releases and Homebrew.",
  },
  {
    question: "Can I self-host it?",
    answer:
      "Yes. Cloudflare Workers with D1 and Node.js with PostgreSQL are both documented and supported.",
  },
];

function Brand() {
  return (
    <a className="brand" href="#" aria-label="Lifever home">
      <Image
        className="brand-mark"
        src="/lifever-logo.png"
        alt=""
        width={40}
        height={40}
        priority
      />
      <span>Lifever</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#product">Product</a>
            <a href="#principles">Why Lifever</a>
            <a href="#install">Install</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="button button-small" href={releaseUrl}>
            <Download size={15} aria-hidden="true" />
            Download
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Your days, in one place</p>
            <h1>Life, together.</h1>
            <p className="hero-lede">
              Reminders, calendar, notes, projects, and race weekends in one calm
              app.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                <Download size={17} aria-hidden="true" />
                Download for macOS
              </a>
              <a className="button button-secondary" href="#product">
                See how it works
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="hero-meta">Free · Open source · Local first</p>
          </div>

          <div className="hero-frame">
            <div className="window-rail" aria-hidden="true">
              <span />
              <span />
              <span />
              <small>Lifever · Calendar</small>
            </div>
            <Image
              className="hero-image"
              src="/screenshots/calendar-week.jpg"
              alt="Lifever week calendar showing color-coded events across a compact full-day view"
              width={1920}
              height={1080}
              loading="eager"
              priority
              quality={92}
              sizes="(max-width: 720px) 94vw, 1180px"
            />
          </div>
        </section>

        <section className="section product-section" id="product">
          <div className="section-heading">
            <p className="eyebrow">Five focused apps</p>
            <h2>Everything has a place.</h2>
            <p>
              Each app stays simple on its own. Together they cover the ordinary
              work of planning a life.
            </p>
          </div>
          <ProductShowcase />
        </section>

        <section className="principles" id="principles">
          <div className="section principles-inner">
            <div className="principles-heading">
              <p className="eyebrow">Useful before you sign in</p>
              <h2>Start locally. Take it further when you need to.</h2>
            </div>
            <div className="principle-list">
              {principles.map(({ number, title, description, Icon }) => (
                <article className="principle" key={title}>
                  <span className="principle-number">{number}</span>
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
            <p className="privacy-line">
              <LockKeyhole size={15} aria-hidden="true" />
              Authenticated data stays behind your session and is never mixed
              with the local profile.
            </p>
          </div>
        </section>

        <section className="section install-section" id="install">
          <div className="install-copy">
            <Image
              className="install-logo"
              src="/lifever-logo.png"
              alt=""
              width={58}
              height={58}
            />
            <p className="eyebrow">Native on macOS</p>
            <h2>Install in a minute.</h2>
            <p>
              A lightweight Tauri app with native notifications, signed releases,
              and simple Homebrew updates.
            </p>
            <a className="text-link" href={releaseUrl}>
              Download the latest release
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <InstallCommand />
        </section>

        <section className="section source-section">
          <div>
            <p className="eyebrow">Open source, end to end</p>
            <h2>Run it your way.</h2>
          </div>
          <p>
            The product, API, database schemas, desktop host, deployment scripts,
            and release pipeline live in one public repository.
          </p>
          <div className="source-links">
            <a href={`${githubUrl}/blob/main/SELF_HOSTING.md`}>
              <Cloud size={16} aria-hidden="true" />
              Self-hosting
            </a>
            <a href={`${githubUrl}/blob/main/BUILDING.md`}>
              <Code2 size={16} aria-hidden="true" />
              Building
            </a>
            <a href={githubUrl}>
              <Github size={16} aria-hidden="true" />
              GitHub
            </a>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="faq-heading">
            <p className="eyebrow">A few useful answers</p>
            <h2>Good to know.</h2>
          </div>
          <div className="faq-list">
            {faqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <span className="summary-plus" aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <Image
            className="final-mark"
            src="/lifever-logo.png"
            alt=""
            width={72}
            height={72}
          />
          <h2>Make a little room for life.</h2>
          <div className="hero-actions">
            <a className="button" href={releaseUrl}>
              <Download size={17} aria-hidden="true" />
              Download Lifever
            </a>
            <a className="button button-secondary" href={githubUrl}>
              <Github size={17} aria-hidden="true" />
              View on GitHub
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Brand />
          <p>Built for ordinary days.</p>
          <div className="footer-links">
            <a href={releaseUrl}>Download</a>
            <a href={githubUrl}>GitHub</a>
            <a href={`${githubUrl}/blob/main/SELF_HOSTING.md`}>Self-host</a>
          </div>
          <span className="footer-platform">
            <Laptop size={14} aria-hidden="true" />
            macOS and web
          </span>
        </div>
      </footer>
    </>
  );
}
