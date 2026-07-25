import {
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
    title: "Start without setup",
    description:
      "Open Lifever and it is already useful. A local profile and thoughtful demo data are ready before an account exists.",
    Icon: WifiOff,
  },
  {
    number: "02",
    title: "Sync on your terms",
    description:
      "Sign in only when you want the same reminders, events, notes, and projects waiting on another device.",
    Icon: Cloud,
  },
  {
    number: "03",
    title: "Own the whole system",
    description:
      "Use the hosted backend or run the full stack yourself with Cloudflare D1 or PostgreSQL. Nothing important is hidden.",
    Icon: ServerCog,
  },
];

const rhythms = [
  { verb: "Remember", app: "Reminders" },
  { verb: "Plan", app: "Calendar" },
  { verb: "Think", app: "Notes" },
  { verb: "Move", app: "Kanban" },
  { verb: "Follow", app: "Formula 1" },
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
            <a href="#principles">Philosophy</a>
            <a href="#install">Install</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="button button-small" href={releaseUrl}>
            Get Lifever
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <a className="announcement" href={releaseUrl}>
              <span>Free</span>
              Open source for macOS and the web
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <h1>
              Life, <mark>together.</mark>
            </h1>
            <p className="hero-lede">
              Reminders, calendar, notes, projects, and race weekends—designed
              as one quiet place, not five apps fighting for attention.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                <Download size={17} aria-hidden="true" />
                Download for macOS
              </a>
              <a className="button button-secondary" href="#product">
                Explore the product
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <ul className="hero-meta" aria-label="Lifever highlights">
              <li>No account required</li>
              <li>Local first</li>
              <li>Cross-device sync</li>
            </ul>
          </div>

          <div className="hero-frame">
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

        <section className="rhythm-section" aria-label="Lifever apps">
          <p>One home for the things that shape a day.</p>
          <div className="rhythm-list">
            {rhythms.map(({ verb, app }) => (
              <div className="rhythm" key={app}>
                <strong>{verb}</strong>
                <span>{app}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section product-section" id="product">
          <div className="section-heading">
            <p className="eyebrow">The product</p>
            <h2>Everything close. Nothing crowded.</h2>
            <p>
              Each app keeps its own rhythm. Together they cover the ordinary
              work of planning a life without turning it into a system to
              maintain.
            </p>
          </div>
          <ProductShowcase />
        </section>

        <section className="principles" id="principles">
          <div className="section principles-inner">
            <div className="principles-heading">
              <p className="eyebrow">A calmer default</p>
              <h2>Useful before an account even exists.</h2>
              <p>
                Most productivity software asks you to build a system before it
                gives anything back. Lifever starts ready, stays understandable,
                and grows only when you ask it to.
              </p>
            </div>
            <div>
              <div className="principle-list">
                {principles.map(({ number, title, description, Icon }) => (
                  <article className="principle" key={title}>
                    <span className="principle-number">{number}</span>
                    <div className="principle-icon">
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="privacy-line">
                <LockKeyhole size={15} aria-hidden="true" />
                Authenticated data stays behind your session and is never mixed
                with the local profile.
              </p>
            </div>
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
            <p className="eyebrow">Native without the ceremony</p>
            <h2>On your Mac in a minute.</h2>
            <p>
              A lightweight Tauri app with native notifications, signed
              releases, and updates that stay as simple as the install.
            </p>
            <a className="text-link" href={releaseUrl}>
              Prefer a direct download?
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <InstallCommand />
        </section>

        <section className="section source-section">
          <div>
            <p className="eyebrow">Yours, end to end</p>
            <h2>Open means open.</h2>
          </div>
          <p>
            The app, API, database schemas, desktop host, deployment scripts,
            and release pipeline all live in one public repository.
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
            <p className="eyebrow">The practical bits</p>
            <h2>Questions, answered.</h2>
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
          <p>Start locally today. Sign in only when sync becomes useful.</p>
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
