import { useEffect, useRef } from "react";
import { useStore } from "../store";

function EventLog() {
  const events = useStore((s) => s.events);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700">
      <h2 className="text-lg font-semibold mb-3">Eventos</h2>
      <div className="h-48 overflow-y-auto space-y-1 text-sm">
        {events.length === 0 && (
          <p className="text-gray-500 italic">No hay eventos aún...</p>
        )}
        {events.map((evt, i) => (
          <div key={i} className="flex gap-2 text-gray-300">
            <span className="text-gray-500 text-xs whitespace-nowrap">
              {new Date(evt.timestamp).toLocaleTimeString()}
            </span>
            <span>{evt.message}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

export default EventLog;
