import { ArrowRight, Download, Github } from "lucide-react";
import Image from "next/image";

import { HeroShowcase } from "@/components/hero-showcase";
import { InstallCommand } from "@/components/install-command";

const githubUrl = "https://github.com/badosz0/lifever";
const releaseUrl = `${githubUrl}/releases/latest`;

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
            <a href="#install">Install</a>
            <a href={githubUrl}>GitHub</a>
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
            <h1>
              Your day, <mark>together.</mark>
            </h1>
            <p className="hero-lede">
              Reminders, calendar, notes, projects, and more—in one calm place.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                <Download size={17} aria-hidden="true" />
                Download Lifever
              </a>
              <a className="button button-secondary" href={githubUrl}>
                <Github size={16} aria-hidden="true" />
                GitHub
              </a>
            </div>
          </div>

          <HeroShowcase />
        </section>

        <section className="install-section" id="install">
          <div className="install-copy">
            <h2>Made for your desktop.</h2>
          </div>
          <InstallCommand />
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <Brand />
          <div className="footer-links">
            <a href={releaseUrl}>Download</a>
            <a href={githubUrl}>GitHub</a>
            <a href={`${githubUrl}/blob/main/SELF_HOSTING.md`}>Self-host</a>
          </div>
        </div>
      </footer>
    </>
  );
}
