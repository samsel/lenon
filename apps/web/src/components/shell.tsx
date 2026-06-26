import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  Compass,
  Home,
  KeyRound,
  LibraryBig,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  TerminalSquare,
  Trophy,
  Users
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: string;
};

const parentItems: NavItem[] = [
  { href: "/parent/home", label: "Family", icon: <Home />, match: "/parent/home" },
  { href: "/parent/onboarding", label: "Onboarding", icon: <Users />, match: "/parent/onboarding" },
  { href: "/parent/children/child_ava/policy", label: "Policy", icon: <ShieldCheck />, match: "/parent/children/child_ava/policy" },
  { href: "/parent/children/child_ava/skills", label: "Skills", icon: <Store />, match: "/parent/children/child_ava/skills" },
  { href: "/parent/children/child_ava/activity", label: "Activity", icon: <ClipboardCheck />, match: "/parent/children/child_ava/activity" },
  { href: "/parent/alerts", label: "Alerts", icon: <Bell />, match: "/parent/alerts" }
];

const runtimeItems: NavItem[] = [
  { href: "/child/home", label: "Child App", icon: <Sparkles />, match: "/child" },
  { href: "/admin/home", label: "Admin", icon: <TerminalSquare />, match: "/admin" },
  { href: "/creator/home", label: "Creator", icon: <LibraryBig />, match: "/creator" },
  { href: "/parent/settings/privacy", label: "Privacy", icon: <KeyRound />, match: "/parent/settings/privacy" }
];

export function AppShell({ activePath, children }: { activePath: string; children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <aside className="side-nav">
        <Link className="brand-lockup" href="/parent/home">
          <span className="brand-mark">
            <BrainCircuit size={24} />
          </span>
          <span className="brand-title">
            <strong>Lenon</strong>
            <span>Family safety console</span>
          </span>
        </Link>

        <nav className="nav-section" aria-label="Parent navigation">
          <span className="nav-label">Parent Control</span>
          {parentItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${activePath.startsWith(item.match ?? item.href) ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="nav-section" aria-label="Runtime navigation">
          <span className="nav-label">Surfaces</span>
          {runtimeItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${activePath.startsWith(item.match ?? item.href) ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main-shell">{children}</main>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "ok"
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "danger";
}) {
  return (
    <span className={`status-pill ${tone === "warn" ? "warn" : tone === "danger" ? "danger" : ""}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function RouteTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="route-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function RuntimeMap() {
  return (
    <div className="runtime-map" aria-label="Hermes architecture map">
      <div className="runtime-node">
        <strong>Parent policy</strong>
        <span>settings</span>
      </div>
      <div className="runtime-node">
        <strong>Lenon child space</strong>
        <span>runtime</span>
      </div>
      <div className="runtime-node">
        <strong>Hermes gateway</strong>
        <span>model + tools</span>
      </div>
    </div>
  );
}

export const iconMap = {
  bot: <Bot />,
  compass: <Compass />,
  message: <MessageCircle />,
  settings: <Settings />,
  trophy: <Trophy />,
  badge: <BadgeCheck />
};
