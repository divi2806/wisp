"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip, ArrowUp, X, Copy, Check, FileText,
  Mic, MicOff, Square, ThumbsUp, ThumbsDown, RotateCcw,
  ChevronDown, Trash2,
} from "lucide-react";
import WispMascot, { WispMood } from "@/components/WispMascot";

/* ─────────────────── Types ─────────────────── */
type Reaction = "up" | "down" | null;
type AttachedFile = { id: string; name: string; size: string };
type Message = {
  id: string;
  role: "user" | "wisp";
  content: string;
  files?: AttachedFile[];
  timestamp: Date;
  reaction?: Reaction;
  streaming?: boolean;
};

/* ─────────────────── Data ─────────────────── */
const SUGGESTIONS = [
  { label: "Liquidation risk", prompt: "Which positions are closest to liquidation?" },
  { label: "Best APY",         prompt: "Where am I earning the best APY today?" },
  { label: "SOL -20%",         prompt: "If SOL drops 20%, what’s the damage?" },
  { label: "Rebalance",        prompt: "Should I rebalance Kamino vs Jupiter?" },
];

const RESPONSES: Record<string, string> = {
  liquidation:
    "Based on your current positions, your **Drift SOL ×3 Perp** is the most at-risk — currently **68% toward liquidation**.\n\nTo stay safe, consider one of these moves:\n- Add ~$340 in margin to that position\n- Reduce position size by 25%\n\nYour Kamino, Jupiter, and Marinade positions all have comfortable buffers above their liquidation thresholds right now.",
  apy:
    "Right now **Jupiter SOL-USDC LP** is your top performer at **38.7% APY**. Your Kamino USDC Vault is at 12.4% — that's dropped 2.1% in the last 24h.\n\nThree alternatives worth considering:\n- **Orca SOL-USDC** — 41.2% APY\n- **Marginfi USDC** — 14.8% APY\n- **Kamino JitoSOL** — 16.3% APY",
  sol:
    "If SOL dropped 20% from current prices:\n\n- **Drift SOL ×3 Perp** → liquidated immediately\n- **Jupiter SOL-USDC LP** → ~$1,840 loss (22% IL exposure)\n- **Marinade mSOL** → drops proportionally with SOL\n\nTotal estimated impact: **-$4,120 (-19.4%)**. Your Drift position is the biggest risk here — consider hedging before this scenario plays out.",
  rebalance:
    "Your Kamino–Jupiter allocation looks solid overall, but I'd trim the **Drift ×3 perp** — it's your highest risk at 68% liquidation proximity.\n\nRotating 50% of that into Jupiter SOL-USDC LP would maintain upside exposure while significantly reducing liquidation risk.\n\nWant me to run a backtest on that reallocation?",
  default:
    "Connect your wallet and I'll give you real, specific insights about your live positions across Kamino, Jupiter, Drift and more.\n\nFor now I'm running on demo data — but the analysis you'll get will look a lot like this. Try one of the suggested questions above to see a preview.",
};

function getResponse(msg: string) {
  const l = msg.toLowerCase();
  if (l.includes("liquidat")) return RESPONSES.liquidation;
  if (l.includes("apy") || l.includes("yield") || l.includes("best")) return RESPONSES.apy;
  if (l.includes("drop") || l.includes("20%") || l.includes("scenario")) return RESPONSES.sol;
  if (l.includes("rebalanc") || l.includes("kamino") || l.includes("jupiter")) return RESPONSES.rebalance;
  return RESPONSES.default;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/* ─────────────────── Prose renderer ─────────────────── */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, li, arr) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/).map((chunk, ci) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={ci} style={{ color: "#e4e4e7", fontWeight: 700 }}>
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              <span key={ci}>{chunk}</span>
            )
          )}
          {li < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

/* ─────────────────── Typewriter ─────────────────── */
function TypewriterText({ text, onComplete }: { text: string; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const cbRef = useRef(onComplete);

  useEffect(() => {
    cbRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let i = 0;

    const tick = () => {
      if (i >= text.length) {
        setDone(true);
        cbRef.current();
        return;
      }
      // slightly variable chunk size for organic feel
      const chunk = Math.min(i < 60 ? 2 : 3, text.length - i);
      i += chunk;
      setIdx(i);
      setTimeout(tick, i < 60 ? 22 : 14);
    };

    const t = setTimeout(tick, 120);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <>
      <Prose text={text.slice(0, idx)} />
      {!done && (
        <motion.span
          className="inline-block w-[2px] h-[13px] rounded-full ml-[2px] align-middle"
          style={{ background: "#a78bfa" }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.55, repeat: Infinity }}
        />
      )}
    </>
  );
}

/* ─────────────────── Typing dots ─────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#3f3f46" }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.13 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Copy button ─────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <motion.button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-1 rounded-lg"
      style={{ color: "#3f3f46", fontSize: 11 }}
      whileHover={{ color: "#71717a", background: "rgba(255,255,255,0.05)" }}
    >
      {done ? <Check size={11} /> : <Copy size={11} />}
      <span>{done ? "Copied" : "Copy"}</span>
    </motion.button>
  );
}

/* ─────────────────── Voice hook ─────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;
function useVoice(onTranscript: (t: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return Boolean(SR);
  }, []);
  const recRef = useRef<AnyRec>(null);
  const cbRef  = useRef(onTranscript);

  useEffect(() => {
    cbRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r: AnyRec = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.onresult = (e: AnyRec) => {
      const transcript = Array.from(e.results as AnyRec[]).map((res: AnyRec) => res[0].transcript).join("");
      cbRef.current(transcript, e.results[e.results.length - 1].isFinal);
    };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    recRef.current = r;
    return () => r.abort();
  }, []);

  const start = useCallback(() => { recRef.current?.start(); setListening(true); }, []);
  const stop  = useCallback(() => { recRef.current?.stop();  setListening(false); }, []);
  return { listening, supported, start, stop };
}

/* ════════════════════════════════════════════════════════ */
/*                     MAIN COMPONENT                       */
/* ════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [files,     setFiles]     = useState<AttachedFile[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null); // message id being streamed
  const [mood,      setMood]      = useState<WispMood>("mischief");
  const [focused,   setFocused]   = useState(false);
  const [showDown,  setShowDown]  = useState(false);

  const endRef      = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  /* voice */
  const voice = useVoice((t, final) => {
    setInput(t);
    if (final) setTimeout(() => send(t), 300);
  });

  /* scroll to bottom */
  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!streaming) scrollToBottom();
  }, [messages, loading, streaming, scrollToBottom]);

  /* scroll-down button visibility */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowDown(dist > 120);
    };
    el.addEventListener("scroll", check);
    return () => el.removeEventListener("scroll", check);
  }, []);

  /* auto-grow textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [input]);

  /* ── Send ── */
  async function send(text = input) {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      files: files.length ? [...files] : undefined,
      timestamp: new Date(),
    };

    setMessages((p) => [...p, userMsg]);
    setInput("");
    setFiles([]);
    setLoading(true);
    setMood("thinking");

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    const id = crypto.randomUUID();
    const wispMsg: Message = {
      id,
      role: "wisp",
      content: getResponse(trimmed),
      timestamp: new Date(),
      streaming: true,
    };

    setMessages((p) => [...p, wispMsg]);
    setLoading(false);
    setStreaming(id);
    setMood("happy");
  }

  const onStreamDone = useCallback((id: string) => {
    setStreaming(null);
    setMessages((p) => p.map((m) => m.id === id ? { ...m, streaming: false } : m));
    setTimeout(() => setMood("mischief"), 2200);
  }, []);

  /* ── Regenerate last wisp message ── */
  const regenerate = async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || loading || streaming) return;
    setMessages((p) => p.filter((m) => {
      const idx = p.indexOf(m);
      const lastWispIdx = p.map((x, i) => x.role === "wisp" ? i : -1).filter((i) => i >= 0).pop() ?? -1;
      return idx !== lastWispIdx;
    }));
    setLoading(true);
    setMood("thinking");
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 500));
    const id = crypto.randomUUID();
    setMessages((p) => [...p, {
      id, role: "wisp", content: getResponse(lastUser.content),
      timestamp: new Date(), streaming: true,
    }]);
    setLoading(false);
    setStreaming(id);
    setMood("happy");
  };

  /* ── Reaction ── */
  const react = (id: string, r: Reaction) => {
    setMessages((p) => p.map((m) => m.id === id ? { ...m, reaction: m.reaction === r ? null : r } : m));
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles((p) => [...p, ...Array.from(e.target.files ?? []).map((f) => ({
      id: crypto.randomUUID(), name: f.name, size: fmtBytes(f.size),
    }))]);
    e.target.value = "";
  };

  const clearChat = () => { setMessages([]); setStreaming(null); setLoading(false); setMood("mischief"); };
  const canSend = (input.trim().length > 0 || files.length > 0) && !loading && !streaming;
  const lastWispId = [...messages].reverse().find((m) => m.role === "wisp")?.id;

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#080b14", overflow: "hidden" }}>

      {/* ══ Top bar ══ */}
      <div
        className="flex items-center gap-3 px-5 flex-shrink-0"
        style={{ height: 58, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative" }}>
          <WispMascot size={30} mood={mood} />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ fontSize: 14, color: "#e4e4e7" }}>Wisp</span>
          <span style={{ fontSize: 11, color: "#3f3f46" }}>·</span>
          <span style={{ fontSize: 11, color: "#52525b" }}>DeFi Intelligence</span>
        </div>

        <div
          className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#22c55e" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Online</span>
        </div>

        {/* Clear conversation */}
        {messages.length > 0 && (
          <motion.button
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ color: "#3f3f46", fontSize: 11 }}
            whileHover={{ color: "#f87171", background: "rgba(248,113,113,0.07)" }}
            onClick={clearChat}
            title="Clear conversation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </motion.button>
        )}
        {messages.length === 0 && <span className="ml-auto font-mono" style={{ fontSize: 10, color: "#27272a" }}>Beta</span>}
      </div>

      {/* ══ Messages ══ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 relative" style={{ scrollbarWidth: "thin" }}>

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {showDown && (
            <motion.button
              className="absolute bottom-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)", color: "#71717a" }}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              whileHover={{ background: "#22263a", color: "#e4e4e7" }}
              onClick={scrollToBottom}
            >
              <ChevronDown size={15} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {messages.length === 0 && !loading ? (
          <motion.div
            className="flex flex-col items-center justify-center px-6 pb-4 text-center"
            style={{ minHeight: "100%" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={{ width: 100, height: 125, flexShrink: 0, position: "relative" }}>
              <WispMascot size={100} mood="mischief" quote="ask me anything 👀" />
            </div>

            <motion.h2
              className="font-extrabold tracking-tight"
              style={{ fontSize: 24, color: "#fafafa", marginTop: 12, marginBottom: 8 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              How can I help?
            </motion.h2>
            <motion.p
              style={{ fontSize: 14, color: "#52525b", maxWidth: 360, lineHeight: 1.75, marginBottom: 28 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22 }}
            >
              Ask me anything about your Solana DeFi portfolio — liquidation risks, APY optimization, what-if scenarios.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s.label}
                  className="text-left px-3.5 py-3 rounded-2xl"
                  style={{ background: "#0d1020", border: "1px solid rgba(255,255,255,0.06)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 + i * 0.07 }}
                  whileHover={{ background: "#0f1226", borderColor: "rgba(255,255,255,0.1)", y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => send(s.prompt)}
                >
                  <p style={{ fontWeight: 650, color: "#a1a1aa", fontSize: 11, marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: "#52525b", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.prompt}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

        ) : (
          /* ── Message list ── */
          <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto w-full space-y-7">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group"
                >
                  {msg.role === "user" ? (

                    /* ── User bubble ── */
                    <div className="flex flex-col items-end gap-1.5">
                      {msg.files && msg.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end max-w-[78%]">
                          {msg.files.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
                              <FileText size={11} strokeWidth={1.5} />
                              <span className="max-w-[140px] truncate">{f.name}</span>
                              <span style={{ color: "#3f3f46" }}>{f.size}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
                          style={{ background: "#16192e", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.07)" }}>
                          {msg.content}
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: "#27272a" }}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                  ) : (

                    /* ── Wisp message ── */
                    <div className="flex items-start gap-3.5">
                      <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative", marginTop: 2 }}>
                        <WispMascot size={30} mood="happy" />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>Wisp</span>
                          <span style={{ fontSize: 10, color: "#27272a" }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="text-sm leading-[1.8]" style={{ color: "#a1a1aa" }}>
                          {msg.streaming && streaming === msg.id ? (
                            <TypewriterText text={msg.content} onComplete={() => onStreamDone(msg.id)} />
                          ) : (
                            <Prose text={msg.content} />
                          )}
                        </div>

                        {/* Message actions — show after streaming done */}
                        {!msg.streaming && (
                          <motion.div
                            className="flex items-center gap-0.5 mt-2.5 -ml-1 opacity-0 group-hover:opacity-100"
                            style={{ transition: "opacity 0.15s" }}
                          >
                            <CopyBtn text={msg.content} />
                            <div className="w-px h-3 mx-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                            <motion.button
                              onClick={() => react(msg.id, "up")}
                              className="flex items-center justify-center w-7 h-7 rounded-lg"
                              style={{ color: msg.reaction === "up" ? "#22c55e" : "#3f3f46" }}
                              whileHover={{ color: "#22c55e", background: "rgba(34,197,94,0.08)" }}
                              whileTap={{ scale: 0.88 }}
                            >
                              <ThumbsUp size={11} />
                            </motion.button>
                            <motion.button
                              onClick={() => react(msg.id, "down")}
                              className="flex items-center justify-center w-7 h-7 rounded-lg"
                              style={{ color: msg.reaction === "down" ? "#f87171" : "#3f3f46" }}
                              whileHover={{ color: "#f87171", background: "rgba(248,113,113,0.08)" }}
                              whileTap={{ scale: 0.88 }}
                            >
                              <ThumbsDown size={11} />
                            </motion.button>
                            {/* Regenerate — only on last wisp message */}
                            {msg.id === lastWispId && !loading && !streaming && (
                              <>
                                <div className="w-px h-3 mx-1" style={{ background: "rgba(255,255,255,0.07)" }} />
                                <motion.button
                                  onClick={regenerate}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                  style={{ color: "#3f3f46", fontSize: 11 }}
                                  whileHover={{ color: "#a78bfa", background: "rgba(139,92,246,0.08)" }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <RotateCcw size={11} />
                                  <span>Retry</span>
                                </motion.button>
                              </>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  key="typing"
                  className="flex items-start gap-3.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ width: 30, height: 38, flexShrink: 0, position: "relative", marginTop: 2 }}>
                    <WispMascot size={30} mood="thinking" />
                  </div>
                  <div className="pt-2.5"><TypingDots /></div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ══ Voice listening banner ══ */}
      <AnimatePresence>
        {voice.listening && (
          <motion.div
            className="flex-shrink-0 flex items-center justify-center gap-3 py-2.5"
            style={{ background: "rgba(239,68,68,0.06)", borderTop: "1px solid rgba(239,68,68,0.12)" }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Waveform bars */}
            <div className="flex items-center gap-[3px]">
              {[0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 0.4, 0.75, 1].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ background: "#f87171" }}
                  animate={{ scaleY: [h * 0.4, h, h * 0.4] }}
                  transition={{ duration: 0.5 + i * 0.07, repeat: Infinity, ease: "easeInOut" }}
                  initial={{ height: 16 }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>Listening…</span>
            <motion.button
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}
              whileHover={{ background: "rgba(248,113,113,0.2)" }}
              onClick={voice.stop}
            >
              <Square size={10} />
              Stop
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Input area ══ */}
      <div
        className="flex-shrink-0 px-4 md:px-6 pb-5 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl transition-all duration-150"
            style={{
              background: "#0d1020",
              border: `1px solid ${focused ? "rgba(139,92,246,0.38)" : "rgba(255,255,255,0.08)"}`,
              boxShadow: focused ? "0 0 0 3px rgba(139,92,246,0.07)" : "none",
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            {/* File chips */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  className="px-4 pt-3 pb-1 flex flex-wrap gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {files.map((f) => (
                    <motion.div
                      key={f.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs"
                      style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", color: "#a1a1aa" }}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                    >
                      <FileText size={11} color="#a78bfa" strokeWidth={1.5} />
                      <span className="max-w-[130px] truncate">{f.name}</span>
                      <span style={{ color: "#52525b" }}>{f.size}</span>
                      <button
                        onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}
                        style={{ color: "#52525b" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#52525b")}
                      ><X size={10} /></button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea row */}
            <div className="flex items-end gap-2 px-4 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={voice.listening ? "Listening — speak now…" : "Ask Wisp anything about your portfolio…"}
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed placeholder-[#3f3f46]"
                style={{ color: "#e4e4e7", caretColor: "#a78bfa", minHeight: 24, maxHeight: 180, scrollbarWidth: "none" }}
              />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Attach */}
                <input ref={fileRef} type="file" multiple className="hidden" onChange={onFileChange} />
                <motion.button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center w-8 h-8 rounded-xl"
                  style={{ color: "#3f3f46", background: "rgba(0,0,0,0)" }}
                  whileHover={{ color: "#a1a1aa", background: "rgba(255,255,255,0.06)" }}
                  title="Attach file"
                >
                  <Paperclip size={15} strokeWidth={1.6} />
                </motion.button>

                {/* Voice */}
                {voice.supported && (
                  <motion.button
                    onClick={voice.listening ? voice.stop : voice.start}
                    className="flex items-center justify-center w-8 h-8 rounded-xl relative"
                    style={{
                      color: voice.listening ? "#f87171" : "#3f3f46",
                      background: voice.listening ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0)",
                    }}
                    whileHover={{
                      color: voice.listening ? "#f87171" : "#a1a1aa",
                      background: voice.listening ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                    }}
                    title={voice.listening ? "Stop listening" : "Voice input"}
                  >
                    {voice.listening && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{ border: "1px solid rgba(248,113,113,0.5)" }}
                        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}
                    {voice.listening ? <MicOff size={15} strokeWidth={1.8} /> : <Mic size={15} strokeWidth={1.6} />}
                  </motion.button>
                )}

                {/* Send */}
                <motion.button
                  onClick={() => send()}
                  disabled={!canSend}
                  className="flex items-center justify-center w-8 h-8 rounded-xl"
                  animate={{ background: canSend ? "#5b21b6" : "rgba(255,255,255,0.05)" }}
                  style={{ color: canSend ? "#ffffff" : "#3f3f46" }}
                  whileHover={canSend ? { background: "#6d28d9", scale: 1.06 } : {}}
                  whileTap={canSend ? { scale: 0.9 } : {}}
                  title="Send (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.4} />
                </motion.button>
              </div>
            </div>

            {/* Hints row */}
            <div className="px-4 pb-2.5 flex items-center justify-between">
              <span style={{ fontSize: 10, color: "#27272a" }}>
                Enter ↵ to send · Shift+Enter for newline
              </span>
              <AnimatePresence>
                {input.length > 0 && (
                  <motion.span
                    style={{ fontSize: 10, color: "#27272a" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    {input.length} chars
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center mt-2" style={{ fontSize: 10, color: "#1c1c2e" }}>
            Wisp may make mistakes. Always verify DeFi positions on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
