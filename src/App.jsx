import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToastProvider, useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Link as LinkIcon, Plus, Upload, Download, Wifi, WifiOff, Search, Moon, SunMedium, Globe2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Eaglercraft Server Directory – Single-File React App
 * - Production-ready UI using Tailwind + shadcn/ui
 * - Search, filter, sort, add custom servers, import/export JSON
 * - Lightweight status check via WebSocket (best‑effort; may not work for all servers)
 * - Data persistence via localStorage
 *
 * WHY certain choices:
 * - WebSocket ping is opt-in per server to avoid unnecessary connections and because many servers require specific paths.
 * - LocalStorage used so users can extend/curate their own list without a backend.
 * - Minimal JS footprint, no external backend calls to avoid CORS issues.
 */

// ------------------------------
// Types
// ------------------------------
/** @typedef {"PvP"|"Minigames"|"Survival"|"Creative"|"Economy"|"Factions"|"Practice"|"Skywars"|"Bedwars"|"Skyblock"|"Anarchy"|"Other"} GameTag */

/**
 * @typedef {Object} ServerItem
 * @property {string} id - Stable id
 * @property {string} name
 * @property {string} url - wss:// WebSocket endpoint (or domain that works with wss://)
 * @property {GameTag[]} tags
 * @property {string=} short
 * @property {string=} region
 * @property {number=} votes
 * @property {boolean=} community
 * @property {string=} source
 */

// ------------------------------
// Seed data (sourced from public directories)
// ------------------------------
/** @type {ServerItem[]} */
const SEED_SERVERS = [
  { id: "nexo", name: "NexoX", url: "wss://nexo-app.net", tags: ["PvP", "Economy", "Minigames", "Survival"], short: "Explore endless adventures.", source: "TopEaglerServers" },
  { id: "bedwetter", name: "Bedwetter", url: "wss://bedwetr.bytommy.uk", tags: ["PvP", "Minigames", "Survival"], short: "Bedwars by Tommy.", source: "TopEaglerServers" },
  { id: "brandor", name: "Lost At Brandor", url: "wss://31066.ddnod.es", tags: ["PvP", "Minigames"], short: "1.8.8 Eagler RPG.", source: "TopEaglerServers" },
  { id: "nobnot", name: "noBnoT Anarchy", url: "wss://eagler.noBnoT.org", tags: ["Anarchy", "PvP", "Survival"], short: "True anarchy.", source: "TopEaglerServers" },
  { id: "webmc", name: "WebMC", url: "wss://play.webmc.fun", tags: ["PvP", "Economy", "Minigames", "Survival", "Creative"], short: "Oneblock server.", source: "TopEaglerServers" },
  { id: "carrot", name: "CarrotCraft Network", url: "wss://eagler.carrot-craft.org", tags: ["PvP", "Economy", "Survival"], short: "Survival & Skyblock.", source: "TopEaglerServers" },
  { id: "cleverteaching", name: "xdmany4006MC (Clever Teaching)", url: "wss://clever-teaching.com", tags: ["PvP", "Minigames", "Survival", "Creative"], short: "Public hub.", source: "TopEaglerServers" },
  { id: "ricenetwork", name: "Rice Network x BallCraft", url: "wss://mc.ricenetwork.xyz", tags: ["PvP", "Economy", "Minigames"], short: "Diverse network.", source: "TopEaglerServers" },
  { id: "zentic", name: "Zentic", url: "wss://zentic.cc", tags: ["PvP", "Minigames", "Practice"], short: "Minemen for Eaglercraft.", source: "TopEaglerServers" },
  { id: "zelz", name: "ZelzNET", url: "wss://play.zelz.net", tags: ["Minigames", "Survival"], short: "Active development.", source: "TopEaglerServers" },
  // From Eagler Server List (public listing)
  { id: "arch", name: "ArchMC", url: "wss://arch.mc", tags: ["PvP", "Minigames", "Survival", "Creative", "Other"], short: "Popular mixed modes.", source: "servers.eaglercraft.com" },
  { id: "tuffnet", name: "TuffNET", url: "wss://play.tuff.tf", tags: ["Survival", "PvP", "Other"], short: "Cracked MC; any client.", source: "servers.eaglercraft.com" },
];

const ALL_TAGS = [
  "PvP", "Minigames", "Survival", "Creative", "Economy", "Factions", "Practice", "Skywars", "Bedwars", "Skyblock", "Anarchy", "Other",
];

// ------------------------------
// Utilities
// ------------------------------
const STORAGE_KEY = "eaglercraft-servers-v1";
const THEME_KEY = "eaglercraft-theme";

/** @returns {ServerItem[]} */
function loadServers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_SERVERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_SERVERS;
    // Ensure seed servers exist at least once; merge by id
    const byId = new Map(parsed.map((s) => [s.id, s]));
    for (const s of SEED_SERVERS) if (!byId.has(s.id)) byId.set(s.id, s);
    return [...byId.values()];
  } catch {
    return SEED_SERVERS;
  }
}

/** @param {ServerItem[]} servers */
function saveServers(servers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

// ------------------------------
// Components
// ------------------------------
function Header({ theme, onToggleTheme }) {
  return (
    <div className="flex items-center justify-between gap-2 py-4">
      <div className="flex items-center gap-3">
        <Globe2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Eaglercraft Server Directory</h1>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary" onClick={onToggleTheme} aria-label="Toggle theme">
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle dark mode</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <a
          className="text-sm text-muted-foreground hover:underline"
          href="https://servers.eaglercraft.com/" target="_blank" rel="noreferrer"
        >Official List</a>
        <a
          className="text-sm text-muted-foreground hover:underline"
          href="https://topeaglerservers.com/" target="_blank" rel="noreferrer"
        >TopEaglerServers</a>
      </div>
    </div>
  );
}

function Filters({ q, setQ, selected, setSelected, sort, setSort }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Find servers</CardTitle>
        <CardDescription>Search, filter by tags, and sort.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or host…" />
          </div>
        </div>
        <div className="col-span-1 flex flex-wrap gap-2">
          {ALL_TAGS.map((t) => (
            <label key={t} className="inline-flex items-center gap-2">
              <Checkbox checked={selected.includes(t)} onCheckedChange={(c) => {
                if (c) setSelected([...selected, t]);
                else setSelected(selected.filter((x) => x !== t));
              }} />
              <span className="text-sm">{t}</span>
            </label>
          ))}
        </div>
        <div className="col-span-1">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A→Z)</SelectItem>
              <SelectItem value="votes">Votes (desc)</SelectItem>
              <SelectItem value="source">Source</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function ServerCard({ s, onCopy, onPing }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between gap-2">
            <span className="truncate" title={s.name}>{s.name}</span>
            <Badge variant="secondary">{s.source || "community"}</Badge>
          </CardTitle>
          {s.short && <CardDescription className="line-clamp-2">{s.short}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm truncate" title={s.url}>{s.url}</code>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={() => onCopy(s.url)} aria-label="Copy">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy wss address</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="outline" onClick={() => onPing(s)} aria-label="Check status">
                      <Wifi className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Quick status check</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {s.tags?.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            {s.region && <Badge variant="secondary">{s.region}</Badge>}
          </div>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-xs text-muted-foreground">{s.votes ? `${s.votes} votes` : "community listed"}</span>
          <a className="text-xs inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline" href={new URL("/", s.url.replace(/^wss:\/\//, "https://")).toString()} target="_blank" rel="noreferrer">
            <LinkIcon className="h-3 w-3" />
            Open host
          </a>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function AddServerDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState([]);
  const [short, setShort] = useState("");
  const valid = name.trim() && /^wss:\/\//.test(url.trim());
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Add server</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a custom server</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="wss://host.example" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Short description (optional)" value={short} onChange={(e) => setShort(e.target.value)} />
          <div>
            <div className="text-xs text-muted-foreground mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((t) => (
                <label key={t} className="inline-flex items-center gap-2">
                  <Checkbox checked={tags.includes(t)} onCheckedChange={(c) => {
                    setTags((prev) => c ? [...prev, t] : prev.filter((x) => x !== t));
                  }} />
                  <span className="text-sm">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!valid} onClick={() => {
            onAdd({ id: `custom-${Date.now()}`, name: name.trim(), url: url.trim(), tags, short, community: true });
            setOpen(false); setName(""); setUrl(""); setTags([]); setShort("");
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportExport({ servers, onImport }) {
  const fileRef = useRef(null);
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />Import JSON
      </Button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try {
          const text = await f.text();
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) throw new Error("Invalid JSON");
          onImport(parsed);
          toast({ title: "Imported", description: `Loaded ${parsed.length} servers.` });
        } catch (err) {
          toast({ title: "Import failed", description: String(err), variant: "destructive" });
        } finally {
          e.target.value = "";
        }
      }} />
      <Button variant="outline" onClick={() => {
        const blob = new Blob([JSON.stringify(servers, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "eaglercraft-servers.json"; a.click();
        URL.revokeObjectURL(url);
      }}>
        <Download className="h-4 w-4 mr-2" />Export JSON
      </Button>
    </div>
  );
}

function FooterNote() {
  return (
    <p className="text-xs text-muted-foreground mt-6">
      Sources: servers.eaglercraft.com & topeaglerservers.com public listings. Some servers may change endpoints or require specific paths.
      Use the quick status check to verify live connectivity.
    </p>
  );
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

// ------------------------------
// Main App
// ------------------------------
export default function App() {
  const [servers, setServers] = useState(loadServers);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState("name");
  const [pingingId, setPingingId] = useState(null);
  const { toast } = useToast();
  const { theme, toggle } = useTheme();

  useEffect(() => { saveServers(servers); }, [servers]);

  const filtered = useMemo(() => {
    let out = servers.filter((s) => {
      const matchesQ = (s.name + " " + s.url).toLowerCase().includes(q.toLowerCase());
      const matchesTags = selected.length === 0 || selected.every((t) => s.tags?.includes(t));
      return matchesQ && matchesTags;
    });
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "votes") out.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    else if (sort === "source") out.sort((a, b) => (a.source || "zzz").localeCompare(b.source || "zzz"));
    return out;
  }, [servers, q, selected, sort]);

  function addServer(newS) {
    setServers((prev) => [{ ...newS }, ...prev]);
    toast({ title: "Added", description: `${newS.name} saved locally.` });
  }

  function importList(list) {
    // Basic sanitize & merge by id or url
    /** @type {ServerItem[]} */
    const cleaned = list.map((s, i) => ({
      id: s.id || `import-${Date.now()}-${i}`,
      name: String(s.name || s.url || "Unnamed"),
      url: String(s.url || ""),
      tags: Array.isArray(s.tags) ? s.tags.filter(Boolean) : [],
      short: s.short || "",
      region: s.region || "",
      votes: typeof s.votes === "number" ? s.votes : undefined,
      community: true,
      source: s.source || "import",
    })).filter((s) => /^wss:\/\//.test(s.url));

    setServers((prev) => {
      const byKey = new Map(prev.map((p) => [p.id || p.url, p]));
      for (const s of cleaned) byKey.set(s.id || s.url, s);
      return Array.from(byKey.values());
    });
  }

  async function quickPing(s) {
    // Best-effort WebSocket open/close with short timeout
    setPingingId(s.id);
    const timeoutMs = 3000;
    let ws;
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true; try { ws?.close(); } catch {}
        toast({ title: "Status", description: `${s.name}: timed out`, variant: "destructive" });
        setPingingId(null);
      }
    }, timeoutMs);
    try {
      ws = new WebSocket(s.url);
      ws.onopen = () => {
        if (done) return; done = true; clearTimeout(timer);
        toast({ title: "Status", description: `${s.name}: online (socket opened)` });
        try { ws.close(); } catch {}
        setPingingId(null);
      };
      ws.onerror = () => {
        if (done) return; done = true; clearTimeout(timer);
        toast({ title: "Status", description: `${s.name}: unreachable`, variant: "destructive" });
        setPingingId(null);
      };
    } catch (e) {
      clearTimeout(timer);
      toast({ title: "Status", description: `${s.name}: ${String(e)}`, variant: "destructive" });
      setPingingId(null);
    }
  }

  return (
    <ToastProvider>
      <div className="mx-auto max-w-7xl p-4">
        <Header theme={theme} onToggleTheme={toggle} />
        <Separator className="mb-4" />

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <AddServerDialog onAdd={addServer} />
          <ImportExport servers={servers} onImport={importList} />
        </div>

        <Filters q={q} setQ={setQ} selected={selected} setSelected={setSelected} sort={sort} setSort={setSort} />

        <Tabs defaultValue="grid" className="w-full">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="grid" className="mt-4">
            <AnimatePresence>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((s) => (
                  <ServerCard key={s.id} s={s} onCopy={(text) => {
                    navigator.clipboard.writeText(text);
                    // eslint-disable-next-line no-undef
                    if (window) {
                      const ev = new CustomEvent('copied');
                      window.dispatchEvent(ev);
                    }
                    
                    toast({ title: "Copied", description: s.url });
                  }} onPing={quickPing} />
                ))}
              </div>
            </AnimatePresence>
          </TabsContent>
          <TabsContent value="table" className="mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Address</th>
                    <th className="py-2 pr-2">Tags</th>
                    <th className="py-2 pr-2">Source</th>
                    <th className="py-2 pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">{s.name}</td>
                      <td className="py-2 pr-2"><code className="break-words">{s.url}</code></td>
                      <td className="py-2 pr-2">{s.tags?.join(", ")}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{s.source || "community"}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(s.url); toast({ title: "Copied", description: s.url }); }}><Copy className="h-3 w-3 mr-1"/>Copy</Button>
                          <Button size="sm" variant="outline" onClick={() => quickPing(s)} disabled={pingingId === s.id}>
                            {pingingId === s.id ? <WifiOff className="h-3 w-3 mr-1 animate-pulse"/> : <Wifi className="h-3 w-3 mr-1"/>}
                            Check
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <FooterNote />
      </div>
    </ToastProvider>
  );
}

// Tailwind Light/Dark base styles (for preview friendliness)
const root = document.documentElement;
if (!root.getAttribute("data-cc-mounted")) {
  root.setAttribute("data-cc-mounted", "true");
  root.classList.add("min-h-screen", "bg-background", "text-foreground");
}
