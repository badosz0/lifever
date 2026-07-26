import {
  ArrowRight,
  Cloud,
  Code2,
  Download,
  Github,
  Laptop,
} from "lucide-react";
import Image from "next/image";

import { InstallCommand } from "@/components/install-command";
import { ProductShowcase } from "@/components/product-showcase";

const githubUrl = "https://github.com/badosz0/lifever";
const releaseUrl = `${githubUrl}/releases/latest`;
const windowsDownloadUrl = `${releaseUrl}/download/Lifever-Windows-x64-setup.exe`;

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
    question: "Which systems does Lifever support?",
    answer:
      "The desktop app supports macOS 12 or newer on Apple silicon and Intel, plus Windows 10 and 11 on x64. The local web app works in a modern browser.",
  },
  {
    question: "Can I self-host it?",
    answer:
      "Yes. The web app, desktop host, API, database schemas, and deployment scripts are all public. Cloudflare Workers with D1 and Node.js with PostgreSQL are supported.",
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
              <span>Open source</span>
              Available for macOS, Windows, and the web
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <h1>
              Your day, <mark>together.</mark>
            </h1>
            <p className="hero-lede">
              One calm home for reminders, plans, notes, projects, and the
              things you follow.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                <Download size={17} aria-hidden="true" />
                Download Lifever
              </a>
              <a className="button button-secondary" href={githubUrl}>
                <Github size={16} aria-hidden="true" />
                View on GitHub
              </a>
            </div>
            <ul className="hero-meta" aria-label="Lifever highlights">
              <li>No account required</li>
              <li>Local-first</li>
              <li>Sync when you want</li>
            </ul>
          </div>

          <div className="hero-frame">
            <Image
              className="hero-image"
              src="/screenshots/calendar-week.jpg"
              alt="Lifever Calendar showing a compact week with color-coded events and event details"
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
            <p className="eyebrow">A quieter workspace</p>
            <h2>Separate tools. One useful home.</h2>
            <p>
              Start with the day at a glance. Open an app only when you need
              the detail.
            </p>
          </div>
          <ProductShowcase />
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
            <p className="eyebrow">The desktop app</p>
            <h2>Install it once. Keep using it.</h2>
            <p>
              A lightweight native shell for macOS and Windows, with a quiet
              notice when a newer version is ready.
            </p>
            <a className="text-link" href={windowsDownloadUrl}>
              Download for Windows
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <InstallCommand />
        </section>

        <section className="section source-section">
          <div>
            <p className="eyebrow">Public by design</p>
            <h2>Yours, end to end.</h2>
          </div>
          <p>
            App, API, desktop host, deployment, and releases live in one public
            repository.
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
            <p className="eyebrow">Good to know</p>
            <h2>The practical bits.</h2>
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
          <h2>Start with today.</h2>
          <p>Use Lifever locally. Add an account only when sync is useful.</p>
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
            macOS, Windows, and web
          </span>
        </div>
      </footer>
    </>
  );
}
