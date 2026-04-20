import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const API = "http://localhost:8080/api";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [active, setActive] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncQueue, setSyncQueue] = useState([]);
  const [device, setDevice] = useState("");

  // ---------------- DEVICE ----------------
  useEffect(() => {
    let d = sessionStorage.getItem("device");
    if (!d) {
      d = "Device-" + Math.random().toString(36).slice(2, 6);
      sessionStorage.setItem("device", d);
    }
    setDevice(d);
  }, []);

  // ---------------- LOAD NOTES ----------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("notes")) || [];
    setNotes(stored);
    if (stored.length) setActive(stored[0].id);
  }, []);

  // ---------------- OFFLINE DETECTION ----------------
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ---------------- SAVE ----------------
  const saveLocal = (data) => {
  const normalized = data.map((n) => ({
    ...n,
    status: n.status || "SYNCED",
  }));

  setNotes(normalized);
  localStorage.setItem("notes", JSON.stringify(normalized));
};

  // ---------------- ADD NOTE ----------------
  const addNote = () => {
    const newNote = {
      id: Date.now().toString(),
      content: "New Note",
      lastUpdated: Date.now(),
      status: "PENDING",
      history: [],
    };

    const updated = [newNote, ...notes];
    saveLocal(updated);
    setActive(newNote.id);

    setSyncQueue((q) => [
      ...q,
      { type: "CREATE", note: newNote, status: "PENDING" },
    ]);
  };

  // ---------------- UPDATE NOTE ----------------
  const updateNote = (value) => {
    const updated = notes.map((n) =>
      n.id === active
        ? {
            ...n,
            content: value,
            lastUpdated: Date.now(),
            status: "PENDING",
            history: [...(n.history || []), n.content],
          }
        : n
    );

    saveLocal(updated);

    setSyncQueue((q) => [
      ...q.filter((x) => x.noteId !== active),
      {
        type: "UPDATE",
        noteId: active,
        value,
        status: "PENDING",
      },
    ]);
  };

  // ---------------- SYNC ENGINE (FIXED) ----------------
  const sync = async () => {
  if (!navigator.onLine || syncQueue.length === 0) return;

  const queueSnapshot = [...syncQueue];

  setSyncQueue((q) =>
    q.map((x) => ({ ...x, status: "SYNCING" }))
  );

  try {
    const res = await fetch(`${API}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queueSnapshot),
    });

    const data = await res.json();

    let updated = [...notes];

    const affectedIds = queueSnapshot
      .map((q) => q.noteId || q.note?.id)
      .filter(Boolean);

    data.forEach((item) => {
      const serverNote = item?.note || item?.server || item?.client;

      if (serverNote) {
        updated = updated.map((n) =>
          affectedIds.includes(n.id)
            ? {
                ...n,
                content: serverNote.content,
                lastUpdated: serverNote.lastUpdated || Date.now(),
                status: "SYNCED",
              }
            : n
        );
      }
    });

    // 🔥 IMPORTANT: force sync status cleanup
    const finalNotes = updated.map((n) => ({
      ...n,
      status: "SYNCED",
    }));

    saveLocal(finalNotes);
    setSyncQueue([]);
  } catch (e) {
    console.log("sync failed", e);
  }
};

  // ---------------- AUTO SYNC ----------------
  useEffect(() => {
    if (!offline) {
      const interval = setInterval(() => {
        if (syncQueue.length > 0) sync();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [offline, syncQueue]);

  // ---------------- AUTO SYNC ON ONLINE ----------------
  useEffect(() => {
    const on = () => {
      setOffline(false);
      if (syncQueue.length > 0) sync();
    };

    const off = () => setOffline(true);

    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [syncQueue]);

  const activeNote = notes.find((n) => n.id === active);

  // ---------------- STATUS ----------------
  const getStatus = (noteId) => {
  if (syncQueue.some((q) => (q.noteId || q.note?.id) === noteId)) {
    return "SYNCING";
  }

  const note = notes.find((n) => n.id === noteId);
  if (!note) return "PENDING";

  return note.status === "SYNCED" ? "SYNCED" : "PENDING";
};

// ---------------- STATUS UI HELPERS ----------------
const statusIcon = (s) => {
  if (s === "SYNCING") return "🔵⏳";
  if (s === "SYNCED") return "🟢✔";
  return "🟡";
};

const statusColor = (s) => {
  if (s === "SYNCING") return "text-blue-400";
  if (s === "SYNCED") return "text-green-400";
  return "text-yellow-400";
};

  return (
    <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col">

      {/* TOP BAR */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-white/10 backdrop-blur bg-black/50">
        <div className="font-bold">SyncForge Notes</div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">{device}</span>

          <span className={`h-2.5 w-2.5 rounded-full ${offline ? "bg-red-500" : "bg-green-500"} animate-pulse`} />

          <span className={offline ? "text-red-400" : "text-green-400"}>
            {offline ? "Offline" : "Online"}
          </span>

          <button onClick={sync} className="bg-purple-600 px-3 py-1 rounded-lg">
            Sync
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1">

        {/* SIDEBAR */}
        <div className="w-1/4 border-r border-white/10 p-3 flex flex-col">
          <button
            onClick={addNote}
            className="bg-green-600 py-2 rounded-lg mb-3 hover:bg-green-500 transition"
          >
            + New Note
          </button>

          <div className="flex flex-col gap-2 overflow-y-auto">
            {notes.map((n) => {
              const st = getStatus(n.id);

              return (
                <div
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`p-3 rounded-xl cursor-pointer transition ${
                    active === n.id
                      ? "bg-white/15"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="truncate font-medium">{n.content}</div>

                  <div className={`text-xs flex items-center gap-1 ${statusColor(st)}`}>
                    <span>{statusIcon(st)}</span>
                    <span>{st.toLowerCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* EDITOR */}
        <div className="flex-1 p-5">
          {activeNote ? (
            <textarea
              className="w-full h-full bg-transparent outline-none text-lg leading-relaxed"
              value={activeNote.content}
              onChange={(e) => updateNote(e.target.value)}
              placeholder="Start writing..."
            />
          ) : (
            <div className="text-gray-500">Select a note</div>
          )}
        </div>

        {/* INSIGHTS */}
        <div className="w-1/4 border-l border-white/10 p-4 text-xs">
          <div className="text-gray-400 mb-2">System</div>

          <div className="space-y-2">
            <div className="bg-white/5 p-2 rounded">
              Notes: {notes.length}
            </div>

            <div className="bg-white/5 p-2 rounded text-yellow-400">
              Queue: {syncQueue.length}
            </div>

            <div className="bg-white/5 p-2 rounded text-green-400">
              Synced: {notes.filter(n => getStatus(n.id) === "SYNCED").length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}