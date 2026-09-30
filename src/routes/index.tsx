import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bird,
  Check,
  ChevronDown,
  Clock3,
  Headphones,
  History,
  Home,
  Leaf,
  LoaderCircle,
  Map,
  MapPin,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type View = "home" | "record" | "dashboard" | "map" | "history";
type RecordingState = "idle" | "recording" | "review" | "analyzing" | "results" | "saved";
type Detection = { species: string; confidence: number };
type Observation = Detection & {
  id: string;
  timestamp: string;
  duration: number;
  latitude: number | null;
  longitude: number | null;
  demo: boolean;
};

const demoObservations: Observation[] = [
  { id: "1", species: "Asian Koel", confidence: 0.91, timestamp: "2026-09-30T08:02:00.000Z", duration: 26, latitude: 10.902, longitude: 76.899, demo: true },
  { id: "2", species: "Common Myna", confidence: 0.84, timestamp: "2026-09-30T07:46:00.000Z", duration: 22, latitude: 10.903, longitude: 76.897, demo: true },
  { id: "3", species: "House Crow", confidence: 0.76, timestamp: "2026-09-29T11:24:00.000Z", duration: 29, latitude: 10.9, longitude: 76.901, demo: true },
  { id: "4", species: "Red-vented Bulbul", confidence: 0.72, timestamp: "2026-09-29T06:18:00.000Z", duration: 24, latitude: 10.905, longitude: 76.9, demo: true },
  { id: "5", species: "Asian Koel", confidence: 0.88, timestamp: "2026-09-28T09:12:00.000Z", duration: 30, latitude: 10.901, longitude: 76.895, demo: true },
  { id: "6", species: "Oriental Magpie-Robin", confidence: 0.68, timestamp: "2026-09-28T05:30:00.000Z", duration: 27, latitude: 10.906, longitude: 76.902, demo: true },
];

const demoResults: Detection[] = [
  { species: "Asian Koel", confidence: 0.91 },
  { species: "Common Myna", confidence: 0.84 },
  { species: "House Crow", confidence: 0.76 },
];

const wave = [18, 30, 47, 25, 58, 38, 74, 45, 88, 52, 67, 36, 78, 42, 60, 28, 50, 22, 41, 31, 19];

async function analyzeAudio(_audio: Blob): Promise<Detection[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 1800));
  return demoResults.filter((item) => item.confidence >= 0.6);
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EchoLeaf — Listen. Discover. Protect." },
      { name: "description", content: "AI-powered campus biodiversity monitoring through environmental sound." },
      { property: "og:title", content: "EchoLeaf — Campus Biodiversity Monitoring" },
      { property: "og:description", content: "Record environmental sound, discover bird species, and map campus biodiversity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EchoLeaf,
});

function ActionButton({ children, onClick, variant = "primary", disabled = false, className = "", ariaLabel }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; className?: string; ariaLabel?: string }) {
  const variants = {
    primary: "bg-primary text-primary-foreground shadow-glow hover:bg-primary-bright",
    secondary: "border border-border bg-secondary text-secondary-foreground hover:bg-accent",
    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
  };
  return <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-45 ${variants[variant]} ${className}`}>{children}</button>;
}

function Logo() {
  return <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Leaf size={21} strokeWidth={2.3} /></span><div className="min-w-0"><span className="block truncate font-display text-xl font-semibold">EchoLeaf</span><span className="hidden text-xs text-muted-foreground sm:block">Campus listening network</span></div></div>;
}

function Waveform({ active = false }: { active?: boolean }) {
  return <div className={`waveform ${active ? "is-active" : ""}`} aria-label={active ? "Live audio waveform" : "Recorded audio waveform"}>{wave.map((height, index) => <span key={index} style={{ "--bar-height": `${height}%`, "--delay": `${index * 45}ms` } as React.CSSProperties} />)}</div>;
}

function EchoLeaf() {
  const [view, setView] = useState<View>("home");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState<Detection[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("Finding your location…");
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>(demoObservations);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("echoleaf-observations");
      if (stored) setObservations(JSON.parse(stored) as Observation[]);
    } catch { /* use bundled demo data */ }
    if (!navigator.geolocation) { setLocationStatus("Location unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ latitude: coords.latitude, longitude: coords.longitude }); setLocationStatus("Campus location detected"); },
      () => setLocationStatus("Location unavailable — recording still works"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    if (recordingState !== "recording") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recordingState]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const counts = useMemo(() => Object.entries(observations.reduce<Record<string, number>>((acc, item) => { acc[item.species] = (acc[item.species] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]), [observations]);

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Audio recording isn’t supported in this browser."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob); setAudioUrl(url); setRecordingState("review");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(); recorderRef.current = recorder; setSeconds(0); setRecordingState("recording");
    } catch { setError("Microphone access was blocked. Allow access and try again."); }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function resetRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setSeconds(0); setResults([]); setError(null); setRecordingState("idle");
  }

  async function runAnalysis() {
    if (!audioBlob) { setError("Record a sound clip before analysis."); return; }
    setRecordingState("analyzing"); setError(null);
    try { setResults(await analyzeAudio(audioBlob)); setRecordingState("results"); }
    catch { setError("Analysis couldn’t finish. Please try again."); setRecordingState("review"); }
  }

  function saveObservation() {
    const now = new Date().toISOString();
    const additions = results.map((item, index) => ({ ...item, id: `${Date.now()}-${index}`, timestamp: now, duration: seconds, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, demo: true }));
    const next = [...additions, ...observations];
    setObservations(next); window.localStorage.setItem("echoleaf-observations", JSON.stringify(next)); setRecordingState("saved");
  }

  function navigate(next: View) { setView(next); if (next === "record" && recordingState === "saved") resetRecording(); }

  const labels: Record<View, string> = { home: "Home", record: "Record", dashboard: "Insights", map: "Map", history: "History" };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-border bg-surface px-6 py-7 lg:flex">
        <Logo />
        <nav className="mt-12 space-y-2">{(["home", "record", "dashboard", "map", "history"] as View[]).map((item) => <NavButton key={item} active={view === item} label={labels[item]} icon={item === "home" ? Home : item === "record" ? Mic : item === "dashboard" ? BarChart3 : item === "map" ? Map : History} onClick={() => navigate(item)} />)}</nav>
        <div className="mt-auto rounded-lg border border-primary/20 bg-primary-soft p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase text-primary"><Sparkles size={14} /> Demo mode</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Recordings are real. Species results are simulated for this prototype.</p></div>
      </aside>

      <main className="min-h-screen pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-5 py-4 backdrop-blur-xl lg:px-10">
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="lg:hidden"><Logo /></div>
            <div className="hidden min-w-0 lg:block"><p className="text-xs font-semibold uppercase text-primary">EchoLeaf field station</p><h1 className="truncate font-display text-2xl font-semibold">{labels[view]}</h1></div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary shadow-glow" /><span className="hidden sm:inline">Demo network</span></div>
          </div>
        </header>

        {view === "home" && <HomeView stats={{ recordings: new Set(observations.map((o) => o.timestamp)).size, species: counts.length, detections: observations.length }} onRecord={() => navigate("record")} onNavigate={navigate} />}
        {view === "record" && <RecordView state={recordingState} seconds={seconds} audioUrl={audioUrl} isPlaying={isPlaying} setIsPlaying={setIsPlaying} audioRef={audioRef} results={results} locationStatus={locationStatus} error={error} onStart={startRecording} onStop={stopRecording} onReset={resetRecording} onAnalyze={runAnalysis} onSave={saveObservation} onDashboard={() => navigate("dashboard")} />}
        {view === "dashboard" && <DashboardView observations={observations} counts={counts} />}
        {view === "map" && <MapView observations={observations} />}
        {view === "history" && <HistoryView observations={observations} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface/95 px-2 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">{(["home", "record", "dashboard", "map"] as View[]).map((item) => { const Icon = item === "home" ? Home : item === "record" ? Mic : item === "dashboard" ? BarChart3 : Map; return <button key={item} onClick={() => navigate(item)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition ${view === item ? "bg-primary-soft text-primary" : "text-muted-foreground"}`}><Icon size={20} /><span>{labels[item]}</span></button>; })}</nav>
    </div>
  );
}

function NavButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof Home; onClick: () => void }) {
  return <button onClick={onClick} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-4 text-sm font-semibold transition ${active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Icon size={19} /><span>{label}</span></button>;
}

function HomeView({ stats, onRecord, onNavigate }: { stats: { recordings: number; species: number; detections: number }; onRecord: () => void; onNavigate: (v: View) => void }) {
  return <div className="mx-auto max-w-6xl px-5 py-7 lg:px-10 lg:py-12">
    <section className="grid items-center gap-9 lg:grid-cols-[1fr_.8fr] lg:gap-20">
      <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase text-primary"><Activity size={14} /> Live biodiversity lab</div><h2 className="max-w-2xl font-display text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">Listen.<br /><span className="text-primary">Discover.</span> Protect.</h2><p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Turn everyday environmental sounds into biodiversity insights for your campus.</p><ActionButton onClick={onRecord} className="mt-7 min-h-14 px-6 text-base"><Mic size={20} /> Start recording</ActionButton></div>
      <div className="relative mx-auto aspect-square w-full max-w-[420px]"><div className="absolute inset-[6%] rounded-full border border-primary/15" /><div className="absolute inset-[17%] rounded-full border border-primary/25" /><div className="absolute inset-[29%] grid place-items-center rounded-full bg-primary shadow-glow-strong"><div className="text-center text-primary-foreground"><Volume2 className="mx-auto" size={42} /><span className="mt-2 block text-xs font-bold uppercase">Sound to signal</span></div></div>{[20,60,95,135,180,220,270,315].map((angle, i) => <span key={angle} className="sound-dot" style={{ "--angle": `${angle}deg`, "--distance": `${42 + (i % 3) * 5}%` } as React.CSSProperties} />)}</div>
    </section>
    <section className="mt-14 grid grid-cols-3 gap-2 border-y border-border py-6 sm:gap-6">{[[stats.recordings,"Recordings"],[stats.species,"Species"],[stats.detections,"Detections"]].map(([value,label]) => <div key={label} className="text-center sm:text-left"><strong className="font-display text-2xl font-semibold sm:text-4xl">{value}</strong><span className="mt-1 block text-[10px] uppercase text-muted-foreground sm:text-xs">{label}</span></div>)}</section>
    <div className="mt-8 grid gap-3 sm:grid-cols-3"><QuickLink icon={BarChart3} title="Biodiversity insights" copy="Track species detections" onClick={() => onNavigate("dashboard")} /><QuickLink icon={Map} title="Campus map" copy="Explore listening locations" onClick={() => onNavigate("map")} /><QuickLink icon={History} title="Observation history" copy="Review recent discoveries" onClick={() => onNavigate("history")} /></div>
  </div>;
}

function QuickLink({ icon: Icon, title, copy, onClick }: { icon: typeof Map; title: string; copy: string; onClick: () => void }) { return <button onClick={onClick} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left transition hover:border-primary/35 hover:bg-accent"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon size={19} /></span><span className="min-w-0"><strong className="block truncate text-sm">{title}</strong><span className="block truncate text-xs text-muted-foreground">{copy}</span></span><ChevronDown className="-rotate-90 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" size={17} /></button>; }

function RecordView({ state, seconds, audioUrl, isPlaying, setIsPlaying, audioRef, results, locationStatus, error, onStart, onStop, onReset, onAnalyze, onSave, onDashboard }: { state: RecordingState; seconds: number; audioUrl: string | null; isPlaying: boolean; setIsPlaying: (v: boolean) => void; audioRef: React.RefObject<HTMLAudioElement | null>; results: Detection[]; locationStatus: string; error: string | null; onStart: () => void; onStop: () => void; onReset: () => void; onAnalyze: () => void; onSave: () => void; onDashboard: () => void }) {
  const format = `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
  return <div className="mx-auto max-w-3xl px-5 py-7 lg:px-10 lg:py-10">
    <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Field recorder</p><h2 className="mt-1 font-display text-3xl font-semibold">Capture the soundscape</h2><p className="mt-2 text-sm text-muted-foreground">Record 20–30 seconds of natural surroundings for better detection.</p></div>{state !== "idle" && <ActionButton variant="ghost" onClick={onReset} ariaLabel="Cancel recording" className="shrink-0 px-3"><X size={19} /></ActionButton>}</div>
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-7">
      <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3"><MapPin size={18} className="shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{locationStatus}</p><p className="text-xs text-muted-foreground">Approximate coordinates are saved privately</p></div><ShieldCheck size={17} className="ml-auto shrink-0 text-muted-foreground" /></div>
      {(state === "idle" || state === "recording") && <div className="flex min-h-[400px] flex-col items-center justify-center py-8"><div className="relative grid place-items-center"><span className={`absolute size-48 rounded-full border ${state === "recording" ? "animate-ping-slow border-recording/45" : "border-primary/20"}`} /><button aria-label={state === "recording" ? "Stop recording" : "Start recording"} onClick={state === "recording" ? onStop : onStart} className={`relative grid size-36 place-items-center rounded-full transition hover:scale-[1.03] ${state === "recording" ? "bg-recording text-primary-foreground shadow-recording" : "bg-primary text-primary-foreground shadow-glow-strong"}`}>{state === "recording" ? <Square size={38} fill="currentColor" /> : <Mic size={48} />}</button></div><p className={`mt-12 font-mono text-4xl font-semibold ${state === "recording" ? "text-recording" : "text-foreground"}`}>{format}</p><p className="mt-2 text-sm text-muted-foreground">{state === "recording" ? "Listening… tap to stop" : "Tap to begin recording"}</p>{state === "recording" && <div className="mt-8 w-full max-w-md"><Waveform active /></div>}</div>}
      {state === "review" && <div className="py-8 text-center"><p className="text-xs font-bold uppercase text-primary">Recording ready</p><p className="mt-2 font-mono text-4xl font-semibold">{format}</p><div className="my-8"><Waveform /></div>{audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}<div className="flex flex-wrap justify-center gap-3"><ActionButton variant="secondary" onClick={() => { if (!audioRef.current) return; if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); }}>{isPlaying ? <Pause size={18} /> : <Play size={18} />}{isPlaying ? "Pause" : "Play"}</ActionButton><ActionButton variant="secondary" onClick={onReset}><RotateCcw size={18} /> Re-record</ActionButton><ActionButton onClick={onAnalyze}><Sparkles size={18} /> Analyze recording</ActionButton></div></div>}
      {state === "analyzing" && <div className="grid min-h-[400px] place-items-center py-12 text-center"><div><span className="mx-auto grid size-24 place-items-center rounded-full bg-primary-soft text-primary"><LoaderCircle className="animate-spin" size={40} /></span><h3 className="mt-6 font-display text-2xl font-semibold">Analyzing your recording…</h3><p className="mt-2 text-sm text-muted-foreground">Matching acoustic patterns with known species.</p><div className="mx-auto mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-secondary"><span className="analysis-progress block h-full rounded-full bg-primary" /></div></div></div>}
      {state === "results" && <div className="py-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">AI-detected species</p><h3 className="mt-1 font-display text-2xl font-semibold">Soundscape results</h3></div><span className="rounded-full bg-warning-soft px-3 py-1 text-[10px] font-bold uppercase text-warning">Simulated</span></div><div className="mt-6 space-y-3">{results.map((item, index) => <div key={item.species} className="rounded-lg border border-border bg-secondary p-4"><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Bird size={20} /></span><div className="min-w-0"><strong className="truncate text-sm">{item.species}</strong><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><span className="block h-full rounded-full bg-primary" style={{ width: `${item.confidence * 100}%` }} /></div></div><span className="font-mono text-sm font-semibold">{Math.round(item.confidence * 100)}%</span></div>{index === 0 && <p className="mt-3 text-xs text-muted-foreground">Highest confidence match</p>}</div>)}</div><p className="mt-5 text-xs leading-relaxed text-muted-foreground">Demo analysis only. Results represent species detections, not individual bird counts.</p><ActionButton onClick={onSave} className="mt-5 w-full"><Save size={18} /> Save observation</ActionButton></div>}
      {state === "saved" && <div className="grid min-h-[400px] place-items-center py-12 text-center"><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-primary-soft text-primary"><Check size={36} /></span><h3 className="mt-6 font-display text-3xl font-semibold">Observation saved</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Detection counts and the campus biodiversity view are now up to date.</p><div className="mt-7 flex justify-center gap-3"><ActionButton variant="secondary" onClick={onReset}><Mic size={18} /> Record again</ActionButton><ActionButton onClick={onDashboard}><BarChart3 size={18} /> View insights</ActionButton></div></div></div>}
    </div>{error && <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive"><X size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
  </div>;
}

function DashboardView({ observations, counts }: { observations: Observation[]; counts: [string, number][] }) {
  const locations = new Set(observations.filter((o) => o.latitude).map((o) => `${o.latitude?.toFixed(3)},${o.longitude?.toFixed(3)}`)).size;
  const max = Math.max(...counts.map(([, count]) => count), 1);
  return <div className="mx-auto max-w-6xl px-5 py-7 lg:px-10 lg:py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Campus pulse</p><h2 className="mt-1 font-display text-3xl font-semibold">Biodiversity insights</h2><p className="mt-2 text-sm text-muted-foreground">A living snapshot built from environmental sound.</p></div><span className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">Updated now</span></div><div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat icon={Leaf} value={counts.length} label="Total species" /><Stat icon={Mic} value={new Set(observations.map((o) => o.timestamp)).size} label="Recordings" /><Stat icon={Bird} value={observations.length} label="Species detections" /><Stat icon={MapPin} value={locations} label="Locations" /></div><div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-lg border border-border bg-surface p-5 sm:p-6"><h3 className="font-display text-xl font-semibold">Species detection counts</h3><p className="mt-1 text-xs text-muted-foreground">Ranked by saved observations</p><div className="mt-7 space-y-5">{counts.map(([name,count],i) => <div key={name}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="truncate"><span className="mr-3 font-mono text-xs text-muted-foreground">{String(i+1).padStart(2,"0")}</span>{name}</span><strong>{count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(12,(count/max)*100)}%` }} /></div></div>)}</div></section><section className="rounded-lg border border-border bg-surface p-5 sm:p-6"><h3 className="font-display text-xl font-semibold">Recent observations</h3><div className="mt-5 divide-y divide-border">{observations.slice(0,5).map((o) => <ObservationRow key={o.id} item={o} compact />)}</div></section></div></div>;
}

function Stat({ icon: Icon, value, label }: { icon: typeof Leaf; value: number; label: string }) { return <div className="rounded-lg border border-border bg-surface p-4 sm:p-5"><span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon size={18} /></span><strong className="mt-5 block font-display text-3xl font-semibold">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div>; }

function MapView({ observations }: { observations: Observation[] }) {
  const located = observations.filter((o) => o.latitude !== null);
  return <div className="mx-auto max-w-6xl px-5 py-7 lg:px-10 lg:py-10"><p className="text-xs font-bold uppercase text-primary">Spatial listening</p><h2 className="mt-1 font-display text-3xl font-semibold">Biodiversity map</h2><p className="mt-2 text-sm text-muted-foreground">Where campus species were heard and recorded.</p><div className="map-grid relative mt-8 min-h-[560px] overflow-hidden rounded-lg border border-border bg-map"><div className="absolute inset-0 opacity-70" />
    <svg className="absolute inset-0 h-full w-full text-map-line" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><path d="M-20 120 C180 100 240 180 430 145 S760 80 1030 130" fill="none" stroke="currentColor" strokeWidth="18" /><path d="M110 -20 C160 120 145 245 290 350 S380 530 340 680" fill="none" stroke="currentColor" strokeWidth="12" /><path d="M700 -20 C620 190 690 300 580 430 S570 560 680 680" fill="none" stroke="currentColor" strokeWidth="9" /><path d="M-20 500 C180 460 370 520 520 495 S790 420 1030 470" fill="none" stroke="currentColor" strokeWidth="10" /></svg>
    {located.slice(0,12).map((o,index) => <div key={o.id} className="map-marker group" style={{ left: `${18 + ((index * 29) % 67)}%`, top: `${18 + ((index * 37) % 62)}%` }}><span className="grid size-10 place-items-center rounded-full border-4 border-map bg-primary text-primary-foreground shadow-glow"><Bird size={17} /></span><div className="pointer-events-none absolute bottom-12 left-1/2 z-10 hidden w-44 -translate-x-1/2 rounded-md border border-border bg-popover p-3 text-left shadow-xl group-hover:block"><strong className="block text-xs">{o.species}</strong><span className="mt-1 block text-[10px] text-muted-foreground">{Math.round(o.confidence*100)}% confidence · {o.duration}s</span></div></div>)}
    <div className="absolute bottom-4 left-4 rounded-md border border-border bg-surface/90 px-3 py-2 backdrop-blur"><p className="text-xs font-semibold">Campus acoustic zone</p><p className="text-[10px] text-muted-foreground">{located.length} mapped detections</p></div></div></div>;
}

function HistoryView({ observations }: { observations: Observation[] }) { return <div className="mx-auto max-w-4xl px-5 py-7 lg:px-10 lg:py-10"><p className="text-xs font-bold uppercase text-primary">Archive</p><h2 className="mt-1 font-display text-3xl font-semibold">Observation history</h2><p className="mt-2 text-sm text-muted-foreground">Every species detection, in listening order.</p><div className="mt-8 overflow-hidden rounded-lg border border-border bg-surface px-4 sm:px-6">{observations.map((o) => <ObservationRow key={o.id} item={o} />)}</div></div>; }

function ObservationRow({ item, compact = false }: { item: Observation; compact?: boolean }) { const date = new Date(item.timestamp); return <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-4 last:border-0 ${compact ? "" : "sm:gap-5"}`}><span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Bird size={19} /></span><div className="min-w-0"><strong className="block truncate text-sm">{item.species}</strong><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"><span className="flex items-center gap-1"><Clock3 size={11} />{date.toLocaleDateString([], { month: "short", day: "numeric" })}, {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>{!compact && <><span className="flex items-center gap-1"><MapPin size={11} />{item.latitude ? "Campus" : "Unavailable"}</span><span className="flex items-center gap-1"><Headphones size={11} />{item.duration}s</span></>}</span></div><span className="shrink-0 font-mono text-xs font-semibold text-primary">{Math.round(item.confidence*100)}%</span></div>; }