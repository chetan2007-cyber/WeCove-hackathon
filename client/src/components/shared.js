import { useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  HeartHandshake,
  Home,
  Images,
  LineChart,
  MessageCircle,
  Play,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";

const images = {
  shillong: "/manus-storage/shillong_cd371abe.jpg",
  ananya: "/manus-storage/ananya_8d4ced56.jpg",
  family: "/manus-storage/family_6e10bf6e.jpg",
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

function BrandMark({ light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cx("brand-mark", light && "brand-mark-light")} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="leading-none">
        <div className={cx("font-serif text-[22px] tracking-[-0.04em]", light ? "text-white" : "text-[#162D3D] ")}>ai</div>
        <div className={cx("mt-1 text-[9px] font-semibold uppercase tracking-[0.19em]", light ? "text-white/55" : "text-[#69808A]")}>memory care</div>
      </div>
    </div>
  );
}

function SoftButton({
  children,
  onClick,
  variant = "primary",
  icon,
  className,
  type = "button",
}) {
  const styles = {
    primary: "bg-[#0F7673] text-white hover:bg-[#0C625F] shadow-[0_12px_28px_rgba(15,118,115,0.18)]",
    secondary: "bg-[#E5F0EE] text-[#0F625F] hover:bg-[#D8E9E6]",
    quiet: "bg-transparent text-[#47616A] hover:bg-[#EEF3F2]",
    light: "bg-white text-[#162D3D] hover:bg-[#F3F6F5]",
    danger: "bg-[#F6E9E6] text-[#9B4D45] hover:bg-[#F0DDDA]",
  };
  return (
    <button type={type} onClick={onClick} className={cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F7673] focus-visible:ring-offset-2", styles[variant], className)}>
      {children}
      {icon}
    </button>
  );
}

function SectionLabel({ children, light = false }) {
  return <div className={cx("mb-3 text-[11px] font-bold uppercase tracking-[0.18em]", light ? "text-white/55" : "text-[#78909A]")}>{children}</div>;
}

function Avatar({ initials = "AD", size = "md", image = true }) {
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-14 w-14 text-sm" };
  return image && initials === "AD" ? (
    <img src={images.ananya} alt="Ananya Devi" className={cx("rounded-full object-cover object-top ring-2 ring-white", sizes[size])} />
  ) : (
    <div className={cx("flex items-center justify-center rounded-full bg-[#DDEAE7] font-bold text-[#0F625F]", sizes[size])}>{initials}</div>
  );
}

function SunIcon() { return <span className="relative inline-block h-4 w-4"><span className="absolute inset-[4px] rounded-full bg-current" /><span className="absolute inset-0 rounded-full border border-current opacity-45" /></span>; }

function TopBar({ role, offline, setOffline, comfort, setComfort, onProfileClick, profilePic }) {
  return (
    <header className="bg-white border-b border-[#DCE5E3] px-6 py-4 flex justify-between items-center z-50 sticky top-0">
      
      {/* LEFT SIDE: Restored Logo and Role */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col cursor-pointer">
          <h1 className="text-3xl font-serif text-[#162D3D] leading-none mb-1">ai</h1>
          <p className="text-[9px] font-bold text-[#78909A] tracking-[0.2em] uppercase leading-none">Memory Care</p>
        </div>

        {/* Role Badge */}
        <div className="flex items-center space-x-3 md:border-l border-[#DCE5E3] md:pl-8">
          <span className="text-xs font-bold text-[#78909A] uppercase tracking-wider hidden md:inline">Viewing as</span>
          <span className="px-4 py-1.5 border border-[#DCE5E3] rounded-full text-sm font-semibold text-[#162D3D] bg-white capitalize shadow-sm">
            {role}
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Synced, Comfort Mode, and Profile */}
      <div className="flex items-center space-x-3 sm:space-x-6">
        
        {/* Sync Status */}
        <button className="hidden lg:flex items-center text-xs font-bold text-[#0F7673] bg-[#E5F0EE] px-4 py-2 rounded-full hover:bg-[#DCE5E3] transition-colors">
          <RefreshCcw className="h-3.5 w-3.5 mr-2" /> Synced just now
        </button>
        
        {/* Restored Comfort Mode Toggle */}
        <button 
          onClick={() => setComfort(!comfort)}
          className={`hidden md:flex items-center space-x-2 border rounded-full px-4 py-1.5 transition-colors duration-300 ${comfort ? 'bg-[#E5F0EE] border-[#0F7673]' : 'border-[#DCE5E3] hover:bg-[#F8FAFA]'}`}
        >
          <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-colors ${comfort ? 'bg-[#0F7673] border-[#0F7673]' : 'border-[#9AAAB0]'}`}>
            {comfort && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
          </div>
          <span className={`text-sm font-semibold transition-colors ${comfort ? 'text-[#0F7673]' : 'text-[#6F858D]'}`}>Comfort mode</span>
        </button>
        
        {/* Clickable Profile Section */}
        <div 
          onClick={onProfileClick}
          className="flex items-center space-x-3 sm:border-l border-[#DCE5E3] sm:pl-6 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-full bg-[#E5ECEB] text-[#0F7673] flex items-center justify-center font-bold text-sm overflow-hidden border-2 border-white shadow-sm shrink-0">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              "CS"
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-bold text-[#162D3D] leading-none">Chetan Sharma P.</p>
            {role === "Patient" ? "PATIENT SETTINGS" : "CAREGIVER SETTINGS"}
          </div>
          <ChevronDown className="h-4 w-4 text-[#78909A] hidden sm:block" />
        </div>

      </div>
    </header>
  );
}

function PatientNav({ view, setView }) {
  const items = [
    { id: "home", label: "Home", icon: Home },
    { id: "memories", label: "Memories", icon: Images },
    { id: "reels", label: "Reels", icon: Play },
    { id: "companion", label: "Companion", icon: MessageCircle },
    { id: "myday", label: "My day", icon: CalendarDays },
  ];
  return <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#DCE5E3] bg-[#FAFBFB]/95 px-2 py-2 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"><div className="mx-auto flex max-w-[740px] justify-around gap-1 lg:block lg:max-w-none lg:space-y-1">{items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cx("flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition lg:w-full lg:justify-start lg:px-4", view === id ? "bg-[#E5F0EE] text-[#0F625F]" : "text-[#7A8D93] hover:bg-white hover:text-[#162D3D]")}><Icon className="h-[18px] w-[18px]" /><span className="lg:inline">{label}</span></button>)}</div></nav>;
}

function PatientShell({ view, setView, children }) {
  return <div className="mx-auto flex max-w-[1440px] gap-8 px-5 pb-24 pt-6 lg:px-10 lg:pb-10 lg:pt-10"><aside className="hidden w-44 shrink-0 lg:block"><SectionLabel>My space</SectionLabel><PatientNav view={view} setView={setView} /><div className="mt-10 border-t border-[#DCE5E3] pt-5"><SectionLabel>Support</SectionLabel><button onClick={() => setView("companion")} className="flex items-center gap-2 px-4 text-sm font-semibold text-[#6F858D] hover:text-[#162D3D]"><CircleHelp className="h-4 w-4" /> Need help?</button></div></aside><main className="min-w-0 flex-1">{children}</main><div className="lg:hidden"><PatientNav view={view} setView={setView} /></div></div>;
}

function MemoryTile({ image, label, meta, onClick, large = false }) {
  return <button onClick={onClick} className={cx("group relative min-h-[170px] overflow-hidden rounded-2xl text-left", large && "col-span-2 row-span-2 min-h-[250px]")}><img src={image} alt={label} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#162D3D]/80 via-transparent to-transparent" /><div className="absolute bottom-4 left-4 right-4 text-white"><div className="font-serif text-lg leading-tight tracking-[-0.02em]">{label}</div><div className="mt-1 text-[11px] font-semibold text-white/70">{meta}</div></div></button>;
}

function CaregiverSidebar({ view, setView, patientName = "Chetan", isStable = true }) {
  const items = [
    { id: "overview", label: "Overview", icon: Home }, 
    { id: "activity", label: "Activity", icon: Activity }, 
    { id: "vault", label: "Memory vault", icon: Images }, 
    { id: "insights", label: "AI insights", icon: Sparkles }, 
    { id: "progress", label: "Progress", icon: LineChart }
  ];
  
  return (
    <aside className="sticky top-[104px] flex-col md:flex hidden w-52 shrink-0 lg:block">
      <div className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#78909A]">
        <HeartHandshake className="h-4 w-4 text-[#0F7673]" /> Care team
      </div>
      <nav className="space-y-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button 
            key={id} 
            onClick={() => setView(id)} 
            className={cx(
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold transition", 
              view === id ? "bg-[#162D3D] text-white shadow-[0_10px_24px_rgba(22,45,61,0.12)]" : "text-[#71878D] hover:bg-white hover:text-[#162D3D]"
            )}
          >
            <Icon className="h-[17px] w-[17px]" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-10 border-t border-[#DCE5E3] pt-6">
        <div className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AAAB0]">Patient</div>
        <button onClick={() => setView("overview")} className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-inset ring-[#DCE5E3]">
          <Avatar size="sm" initials={patientName.charAt(0)} image={false} />
          <span>
            <span className="block text-xs font-bold text-[#162D3D]">{patientName}</span>
            <span className="mt-1 block text-[10px] text-[#78909A]">72 years · {isStable ? "Stable" : "Review"}</span>
          </span>
          <ChevronRight className="ml-auto h-4 w-4 text-[#AAB7BA]" />
        </button>
      </div>
    </aside>
  );
}

function CaregiverShell({ view, setView, children, patientName, isStable }) { 
  return (
    <div className="mx-auto flex max-w-[1440px] gap-10 px-5 pb-12 pt-7 lg:px-10 lg:pt-10">
      <CaregiverSidebar view={view} setView={setView} patientName={patientName} isStable={isStable} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  ); 
}

function CaregiverHeader({ eyebrow, title, copy, aiInsight, onInsightClick }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 relative z-30">
      <div>
        {eyebrow && <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#78909A] mb-2">{eyebrow}</div>}
        <h1 className="font-serif text-4xl tracking-[-0.04em] text-[#162D3D]">{title}</h1>
        {copy && <p className="mt-2 text-sm text-[#6F858D]">{copy}</p>}
      </div>
      
      <div className="flex items-center gap-3 relative">
        {/* Search Icon Removed for cleaner UX */}
        
        {/* Dynamic Notification Bell */}
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE5E3] bg-white text-[#162D3D] hover:bg-[#F8FAFA] transition-colors"
        >
          <Bell className="h-4 w-4" />
          {/* Pulsing indicator activates when AI data is present */}
          {aiInsight && (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#D07A5D] animate-pulse" />
          )}
        </button>

        {/* AI Insight Popover */}
        {showNotifications && (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-[#DCE5E3] bg-white p-5 shadow-[0_14px_34px_rgba(22,45,61,0.12)] animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 border-b border-[#F1F6F4] pb-3 mb-3">
              <Sparkles className="h-4 w-4 text-[#0F7673]" />
              <span className="text-xs font-bold text-[#0F7673] uppercase tracking-wider">New AI Insight</span>
            </div>
            {aiInsight ? (
              <>
                <p className="text-sm text-[#162D3D] font-medium leading-relaxed mb-4">
                  {aiInsight}
                </p>
                <button 
                  onClick={() => {
                    setShowNotifications(false);
                    if(onInsightClick) onInsightClick();
                  }}
                  className="w-full rounded-xl bg-[#F1F6F4] py-2.5 text-xs font-bold text-[#0F7673] hover:bg-[#E5F0EE] transition-colors"
                >
                  Review AI Action Plan
                </button>
              </>
            ) : (
              <p className="text-sm text-[#78909A] italic">No new observations right now.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PatientSummary() { return <div className="flex flex-col justify-between gap-5 rounded-[24px] bg-[#162D3D] p-6 text-white sm:flex-row sm:items-center sm:p-7"><div className="flex items-center gap-4"><Avatar size="lg" /><div><div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Patient summary</div><div className="mt-2 font-serif text-3xl tracking-[-0.04em]">Ananya Devi</div><div className="mt-1 text-sm text-white/60">72 years · Shillong · Last active 18 min ago</div></div></div><div className="flex items-center gap-4"><div className="border-l border-white/15 pl-4 sm:pl-6"><div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Today’s engagement</div><div className="mt-1 text-2xl font-semibold">82<span className="text-sm text-white/50">%</span></div></div><div className="border-l border-white/15 pl-4 sm:pl-6"><div className="text-[10px] uppercase tracking-[0.16em] text-white/50">Care status</div><div className="mt-2 flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-[#8ED1A6]" /> Stable</div></div></div></div>; }

function Metric({ label, value, detail, icon: Icon, tone }) { const tones = { teal: "bg-[#E5F0EE] text-[#0F7673]", sand: "bg-[#FFF4E5] text-[#A57431]", lavender: "bg-[#EFECEE] text-[#756681]" }; return <div className="rounded-2xl border border-[#DCE5E3] bg-white p-5"><div className="flex items-start justify-between"><div className="text-xs font-bold text-[#78909A]">{label}</div><div className={cx("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-4 w-4" /></div></div><div className="mt-6 font-serif text-3xl tracking-[-0.04em] text-[#162D3D]">{value}</div><div className="mt-1 text-xs text-[#78909A]">{detail}</div></div>; }

function InsightCard({ label, title, why, recommendation }) { return <section className="rounded-[24px] border border-[#DCE5E3] bg-white p-6 sm:p-8"><div className="flex gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F0EE] text-[#0F7673]"><Sparkles className="h-4 w-4" /></div><div><div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0F7673]">{label}</div><h2 className="mt-3 font-serif text-2xl leading-snug tracking-[-0.03em] text-[#162D3D]">{title}</h2></div></div><div className="mt-7 grid gap-4 border-t border-[#E8EEEC] pt-5 sm:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9AAAB0]">Why this matters</div><p className="mt-2 text-sm leading-6 text-[#6F858D]">{why}</p></div><div className="rounded-xl bg-[#F1F6F4] p-4"><div className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#0F7673]">Recommendation</div><p className="mt-2 text-sm font-semibold leading-6 text-[#35565D]">{recommendation}</p></div></div></section>; }

function ProgressPanel({ title, value, delta, bars }) { return <section className="rounded-[24px] border border-[#DCE5E3] bg-white p-6"><div className="flex items-start justify-between"><div><SectionLabel>{title}</SectionLabel><div className="font-serif text-4xl tracking-[-0.05em] text-[#162D3D]">{value}</div><div className="mt-1 text-xs font-semibold text-[#528257]">{delta} over 4 weeks</div></div><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1F6F4] text-[#0F7673]"><LineChart className="h-4 w-4" /></div></div><div className="mt-9 flex h-28 items-end gap-2">{bars.map((height, i) => <div key={i} className="flex-1 rounded-t-md bg-[#BFDCD6]" style={{ height: `${height}%` }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-[#9AAAB0]"><span>Aug 18</span><span>Today</span></div></section>; }

function Toast({ message, onClose }) { return <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-[#162D3D] px-4 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-8"><CheckCircle2 className="h-4 w-4 text-[#B7D8CE]" />{message}<button onClick={onClose} className="ml-2 text-white/50 hover:text-white" aria-label="Dismiss"><X className="h-4 w-4" /></button></div>; }

export { cx, images, BrandMark, SoftButton, SectionLabel, Avatar, SunIcon, TopBar, PatientNav, PatientShell, MemoryTile, CaregiverSidebar, CaregiverShell, CaregiverHeader, PatientSummary, Metric, InsightCard, ProgressPanel, Toast };