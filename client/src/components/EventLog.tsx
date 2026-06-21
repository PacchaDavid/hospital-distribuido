import { useEffect, useRef } from "react";
import { useStore } from "../store";

function eventColor(message: string): string {
  if (message.toLowerCase().includes("coordinador") || message.toLowerCase().includes("elección") || message.toLowerCase().includes("election")) {
    return "text-crimson-400";
  }
  if (message.toLowerCase().includes("mutex") || message.toLowerCase().includes("recurso")) {
    return "text-gold-400";
  }
  if (message.toLowerCase().includes("sync") || message.toLowerCase().includes("sincron")) {
    return "text-jade-400";
  }
  return "text-bone";
}

function EventLog() {
  const events = useStore((s) => s.events);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <section className="rounded-sm border border-white/5 bg-surface/30 px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-semibold text-bone">
          Eventos
        </h2>
        <span className="font-mono text-[10px] text-bone-muted">
          {events.length}
        </span>
      </div>

      <div className="h-48 overflow-y-auto scrollbar-thin space-y-1">
        {events.length === 0 && (
          <p className="font-display text-xs text-bone-muted/50 italic">
            No hay eventos aún...
          </p>
        )}

        {events.map((evt, i) => (
          <div
            key={i}
            className="flex gap-2.5 font-mono text-[11px] leading-relaxed animate-slide-in-right"
            style={{ animationDelay: "0ms" }}
          >
            <span className="text-bone-muted/40 shrink-0 whitespace-nowrap">
              {new Date(evt.timestamp).toLocaleTimeString("es-EC", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            <span className={eventColor(evt.message)}>
              {evt.message}
            </span>
          </div>
        ))}

        <div ref={endRef} />
      </div>
    </section>
  );
}

export default EventLog;
