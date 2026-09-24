// Signal Atlas philosophy: make dense engineering knowledge scan-friendly, searchable, and operational.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Copy, Check, ArrowUpRight, Brackets, Clock3, BookOpen, ShieldCheck, Sparkles, Menu, X } from "lucide-react";
import { toast } from "sonner";

const topics = [
  { id: "thesis", label: "The central thesis", kicker: "01", type: "Foundation" },
  { id: "workflow", label: "AI development workflow", kicker: "02", type: "Workflow" },
  { id: "language", label: "Ubiquitous language", kicker: "03", type: "Design" },
  { id: "tdd", label: "TDD as a speed limit", kicker: "04", type: "Practice" },
  { id: "modules", label: "Deep vs. shallow modules", kicker: "05", type: "Architecture" },
  { id: "greybox", label: "Grey-box implementation", kicker: "06", type: "Delegation" },
  { id: "signals", label: "Warning signals", kicker: "07", type: "Review" },
  { id: "resources", label: "Books & resources", kicker: "08", type: "Further reading" },
];

const cards = [
  { title: "Design before implementation", text: "Delay code until the developer and agent share a temporary theory of the system: domain, boundaries, interfaces, constraints, and feedback.", tags: ["strategy", "planning"], topic: "thesis" },
  { title: "Human = strategic / AI = tactical", text: "Keep ownership of meaning, trade-offs, module boundaries, and acceptance criteria. Delegate bounded implementation where the contract is clear.", tags: ["roles", "architecture"], topic: "thesis" },
  { title: "Create the vocabulary", text: "One domain concept should have one name across conversations, docs, tests, APIs, database fields, and UI labels.", tags: ["DDD", "naming"], topic: "language" },
  { title: "Run the short loop", text: "Write one failing test, implement only enough to pass, inspect the result, then refactor without changing behavior.", tags: ["TDD", "feedback"], topic: "tdd" },
  { title: "Prefer deep modules", text: "Concentrate complexity behind a small, meaningful interface instead of scattering behavior across thin wrappers and helpers.", tags: ["design", "changeability"], topic: "modules" },
  { title: "Make implementation a grey box", text: "The human designs the interface, invariants, and tests. The agent can own much of the internal how, as long as the boundary remains trustworthy.", tags: ["delegation", "contracts"], topic: "greybox" },
];

const resources = [
  ["John Ousterhout", "A Philosophy of Software Design", "Deep modules, complexity management, and design quality."],
  ["Eric Evans", "Domain-Driven Design", "Shared language and domain modeling."],
  ["Kent Beck", "Extreme Programming Explained", "TDD, feedback, and continuous design discipline."],
  ["Frederick P. Brooks", "The Design of Design", "Why design remains a core engineering activity."],
  ["David Thomas & Andrew Hunt", "The Pragmatic Programmer", "Software craftsmanship and maintainability."],
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="copy-button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 1600); }} aria-label="Copy prompt">
    {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
  </button>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("thesis");
  const [mobileOpen, setMobileOpen] = useState(false);
  const filteredTopics = useMemo(() => topics.filter((topic) => `${topic.label} ${topic.type}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredCards = useMemo(() => cards.filter((card) => `${card.title} ${card.text} ${card.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query]);

  const jump = (id: string) => { setActive(id); setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return <div className="atlas-app">
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><Brackets size={21} strokeWidth={1.8} /><span /></div><div><div className="eyebrow">FIELD GUIDE / 001</div><div className="brand-name">Signal Atlas</div></div></div>
      <div className="topbar-note"><span className="status-dot" /> Built for the AI-assisted engineer</div>
      <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button>
    </header>
    <div className="atlas-layout">
      <aside className={`side-rail ${mobileOpen ? "open" : ""}`}>
        <div className="rail-intro"><span className="rail-index">INDEX</span><p>Search the failure mode before you ship it.</p></div>
        <label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the guide…" aria-label="Search guide" /><kbd>⌘ K</kbd></label>
        <nav className="topic-nav" aria-label="Guide sections">
          {filteredTopics.map((topic) => <button key={topic.id} className={`topic-link ${active === topic.id ? "active" : ""}`} onClick={() => jump(topic.id)}><span className="topic-kicker">{topic.kicker}</span><span>{topic.label}</span><ArrowUpRight size={14} /></button>)}
        </nav>
        <div className="rail-foot"><div className="rail-foot-row"><Clock3 size={14} /> 18 min read</div><div className="rail-foot-row"><BookOpen size={14} /> 8 field notes</div><Link href="#resources" onClick={() => jump("resources")} className="source-link">View source video <ArrowUpRight size={14} /></Link></div>
      </aside>
      <main className="reading-canvas">
        <section className="hero-panel" id="thesis">
          <div className="hero-text"><div className="section-label"><span className="signal-line" /> ORIENTATION / 01</div><h1>Give the agent a <em>boundary</em> worth keeping.</h1><p className="hero-dek">A practical reference for building with AI without surrendering software design. Translate speed into changeability—not entropy.</p><div className="hero-actions"><button className="primary-action" onClick={() => jump("workflow")}>Start with the workflow <ArrowUpRight size={16} /></button><button className="quiet-action" onClick={() => { navigator.clipboard.writeText("/grill-me I want to add [feature]. Inspect the repository, ask the high-leverage questions, and stop before coding."); toast.success("Design prompt copied"); }}>Copy design prompt <Copy size={15} /></button></div></div>
          <div className="hero-art"><img src="/manus-storage/signal-atlas-hero-texture_0334d338.jpg" alt="Abstract technical atlas texture" /><div className="hero-stamp"><span>HUMAN</span><strong>+</strong><span>AGENT</span></div><div className="hero-caption">The strategic / tactical split<br /><b>is the interface.</b></div></div>
        </section>

        <section className="signal-summary"><div className="summary-block"><span className="summary-label">THE CLAIM</span><p>AI makes code generation cheap. It does not make design, maintenance, or changeability cheap.</p></div><div className="summary-divider" /><div className="summary-block"><span className="summary-label">THE MOVE</span><p>Keep strategy human. Make implementation bounded, testable, and easy to inspect.</p></div></section>

        <section className="section-block" id="workflow"><div className="section-heading"><div><div className="section-label"><span className="signal-line" /> FIELD NOTE / 02</div><h2>The operating loop</h2></div><p>Slow down before the first line. Speed up inside a boundary you understand.</p></div><div className="workflow-grid">{["Understand", "Design", "Name", "Specify", "Implement", "Review"].map((step, i) => <div className="workflow-step" key={step}><span>0{i + 1}</span><strong>{step}</strong><p>{["Explain the user, domain, and constraints.", "Choose boundaries and trade-offs.", "Define the shared vocabulary.", "Turn behavior into acceptance tests.", "Ship one small vertical slice.", "Inspect the diff and changeability."][i]}</p></div>)}</div></section>

        <section className="section-block" id="language"><div className="section-heading"><div><div className="section-label"><span className="signal-line" /> REFERENCE INDEX / 03</div><h2>Find the useful idea</h2></div><p>{query ? `${filteredCards.length} matching field notes` : "Search the extracted principles, practices, and failure modes."}</p></div><div className="notes-grid">{filteredCards.map((card, i) => <article className="note-card" key={card.title} onClick={() => jump(card.topic)}><div className="note-card-top"><span className="note-number">0{i + 1}</span><span className="note-arrow"><ArrowUpRight size={16} /></span></div><h3>{card.title}</h3><p>{card.text}</p><div className="tag-row">{card.tags.map(tag => <span key={tag}>#{tag}</span>)}</div></article>)}</div>{filteredCards.length === 0 && <div className="empty-state"><Search size={24} /><p>No field notes match “{query}”. Try “modules”, “TDD”, or “language”.</p></div>}</section>

        <section className="split-section" id="tdd"><div className="split-copy"><div className="section-label"><span className="signal-line" /> PRACTICE / 04</div><h2>Use TDD as a speed limit.</h2><p>The point is not ceremony. It is to stop the agent from outrunning its headlights. One failing test, one small change, one honest feedback loop.</p><div className="prompt-card"><div className="prompt-header"><span>AGENT PROMPT</span><CopyButton value="Implement only the next vertical slice. Start by writing the failing test. Do not introduce abstractions unless required by current behavior." /></div><code>Implement only the next vertical slice. Start by writing the failing test. Do not introduce abstractions unless required by current behavior.</code></div></div><div className="diagram-card" id="modules"><img src="/manus-storage/signal-atlas-module-diagram_6be04bdf.jpg" alt="Abstract module architecture diagram" /><div className="diagram-overlay"><span>DEEP MODULES</span><b>Simple interface.<br />Substantial behavior.</b></div></div></section>

        <section className="warning-section" id="signals"><div className="warning-header"><div><div className="section-label coral"><span className="signal-line" /> DIAGNOSTICS / 07</div><h2>Warning signals</h2></div><p>When these show up, stop adding code and inspect the boundary.</p></div><div className="warning-list">{[["01", "Many tiny files", "Shallow modularity or premature abstraction."], ["02", "Several names for one concept", "Missing ubiquitous language."], ["03", "Large changes, few tests", "Weak feedback loop."], ["04", "One change touches many modules", "Leaky or shallow boundaries."]].map(([num, title, text]) => <div className="warning-row" key={num}><span>{num}</span><strong>{title}</strong><p>{text}</p><ArrowUpRight size={16} /></div>)}</div></section>

        <section className="resources-section" id="resources"><div className="section-label"><span className="signal-line" /> FURTHER READING / 08</div><h2>Keep the signal alive.</h2><p className="resources-intro">The video’s operating model is grounded in a longer tradition of software design and craftsmanship.</p><div className="resource-list">{resources.map(([author, title, desc]) => <div className="resource-row" key={title}><div><span>{author}</span><strong>{title}</strong></div><p>{desc}</p><ArrowUpRight size={16} /></div>)}</div><footer><span>Signal Atlas / AI-assisted programming reference</span><a href="https://youtu.be/v4F1gFy-hqg?si=v5dnLiTaRSYFhbCh" target="_blank" rel="noreferrer">Source video <ArrowUpRight size={14} /></a></footer></section>
      </main>
    </div>
  </div>;
}
