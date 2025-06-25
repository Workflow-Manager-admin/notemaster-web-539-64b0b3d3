import React, { useState, useEffect } from "react";
import "./App.css";
import { createClient } from "@supabase/supabase-js";

// Supabase config
const SUPABASE_URL = "https://uwyapabfhuztzmjfsvif.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eWFwYWJmaHV6dHptamZzdmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3ODcyMjksImV4cCI6MjA2NTM2MzIyOX0.tehSk7Aks6iWBO7w269DcPTw7gOX4G5NJR2_GIq_QVc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE = "notes";

// PUBLIC_INTERFACE
function App() {
  // UI state
  const [theme, setTheme] = useState("light");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState({ id: null, title: "", content: "" });
  const [search, setSearch] = useState("");
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [error, setError] = useState("");

  // Apply theme to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line
  }, []);

  // Search effect
  useEffect(() => {
    const s = search.trim().toLowerCase();
    setFilteredNotes(
      s
        ? notes.filter(
            (n) =>
              n.title.toLowerCase().includes(s) ||
              n.content.toLowerCase().includes(s)
          )
        : notes
    );
  }, [search, notes]);

  // PUBLIC_INTERFACE
  const fetchNotes = async () => {
    setLoading(true);
    setError("");
    try {
      let { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      setError("Failed to fetch notes.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  const handleSave = async (e) => {
    e.preventDefault();
    const { id, title, content } = noteInput;
    if (!title.trim() && !content.trim()) {
      setError("Cannot save empty note.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (id) {
        // Edit
        const { error, data } = await supabase
          .from(TABLE)
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select();
        if (error) throw error;
        setNotes((arr) =>
          arr.map((n) => (n.id === id ? { ...n, title, content, updated_at: new Date().toISOString() } : n))
        );
      } else {
        // Add new
        const { error, data } = await supabase
          .from(TABLE)
          .insert({ title, content })
          .select();
        if (error) throw error;
        setNotes((prev) => [data[0], ...prev]);
      }
      handleCloseModal();
    } catch (err) {
      setError("Failed to save note.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  const handleDelete = async (id) => {
    setLoading(true);
    setError("");
    try {
      let { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
      setNotes((arr) => arr.filter((n) => n.id !== id));
    } catch (err) {
      setError("Failed to delete note.");
    }
    setLoading(false);
  };

  // PUBLIC_INTERFACE
  const openModal = (note = { id: null, title: "", content: "" }) => {
    setNoteInput(note);
    setModalOpen(true);
    setError("");
  };

  // PUBLIC_INTERFACE
  const handleCloseModal = () => {
    setNoteInput({ id: null, title: "", content: "" });
    setModalOpen(false);
    setError("");
  };

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Render
  return (
    <div className="App" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <header className="notes-header" style={{
        background: "var(--bg-secondary)",
        padding: "2rem 1.5rem 1.5rem 1.5rem",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: "0 2px 8px 0 rgba(64,64,64,0.03)",
        display: "flex", flexDirection: "column", alignItems: "center",
        position: "relative"
      }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          style={{ position: "absolute", right: 30, top: 30 }}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <h1
          style={{
            margin: "0 0 0.5rem 0",
            color: "var(--text-primary)",
            fontSize: "2.2rem",
            letterSpacing: "0.03em",
            fontWeight: 600,
            userSelect: "none",
          }}
        >
          notemaster
        </h1>
        <span style={{
          marginBottom: 10,
          color: "var(--text-secondary)",
          fontSize: 16,
          letterSpacing: "0.03em",
          userSelect: "none",
        }}>
          Lightweight Notes App
        </span>
        <input
          value={search}
          disabled={loading}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          aria-label="Search notes"
          style={{
            width: 270, maxWidth: "100%", padding: "9px 13px", borderRadius: 7,
            border: "1px solid var(--border-color)", outline: 0,
            fontSize: 15, marginTop: 10, background: "var(--bg-primary)",
            color: "var(--text-primary)", transition: "border 0.3s",
            boxShadow: "none"
          }}
        />
      </header>

      <main style={{ margin: "1.5rem auto", maxWidth: 730, width: "96%" }}>
        {loading && (
          <div style={{ margin: "2.3rem 0 2.8rem 0", textAlign: "center", color: "#1976d2" }}>
            Loading...
          </div>
        )}

        {error && (
          <div style={{
            background: "#fff3cd", color: "#856404", border: "1px solid #ffeeba",
            padding: "12px", borderRadius: 7, marginBottom: 16, fontSize: 15
          }}>
            {error}
          </div>
        )}

        {!loading && filteredNotes.length === 0 && (
          <div style={{ color: "#bdbdbd", padding: "2.8rem 0", textAlign: "center", fontSize: 18 }}>
            No notes found.
          </div>
        )}

        <div className="notes-list" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: "1.2rem", marginTop: 8
        }}>
          {filteredNotes.map((note) => (
            <div key={note.id}
              className="note-card"
              style={{
                background: "var(--bg-secondary)",
                boxShadow: "0 2px 10px 0 rgba(64,64,64,0.04)",
                borderRadius: "12px",
                padding: "1.25rem 1.1rem 1.25rem 1.1rem",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                minHeight: 110
              }}
              tabIndex={0}
              aria-label={note.title || note.content || "Note"}
            >
              <h3
                style={{
                  fontSize: "1.18rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--text-primary)",
                  marginBottom: note.content ? 4 : 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                title={note.title}
              >
                {note.title || <span style={{ color: "#999" }}>[No title]</span>}
              </h3>
              <div style={{
                fontSize: 15,
                color: "var(--text-primary)",
                marginBottom: 12,
                flex: 1,
                marginTop: 2,
                whiteSpace: "pre-wrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minHeight: 26
              }}>
                {note.content || <span style={{ color: "#bbb" }}>[No content]</span>}
              </div>
              <div style={{ fontSize: 12, color: "#90a4ae", marginBottom: 8, marginTop: "auto" }}>
                {note.updated_at
                  ? "Modified " + timeAgo(note.updated_at)
                  : ""}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "flex-end"
                }}
              >
                <button
                  style={buttonStyle("secondary")}
                  onClick={() => openModal(note)}
                  aria-label="Edit note"
                  tabIndex={0}
                >
                  Edit
                </button>
                <button
                  style={buttonStyle("danger")}
                  onClick={() =>
                    window.confirm("Delete this note?") && handleDelete(note.id)
                  }
                  aria-label="Delete note"
                  tabIndex={0}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button
        className="add-fab"
        style={{
          position: "fixed",
          zIndex: 40,
          right: 36,
          bottom: 36,
          width: 58,
          height: 58,
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          fontSize: "2.1rem",
          fontWeight: 700,
          boxShadow: "0 3px 13px rgba(25, 118, 210, 0.19)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onClick={() => openModal()}
        aria-label="Add note"
        tabIndex={0}
        title="Add note"
      >
        +
      </button>

      {modalOpen && (
        <Modal onClose={handleCloseModal}>
          <form
            className="notes-modal-form"
            onSubmit={handleSave}
            aria-label={noteInput.id ? "Edit note" : "Add note"}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              minWidth: 270,
              maxWidth: 340,
            }}
          >
            <h2 style={{
              margin: "0 0 0.3rem 0",
              fontWeight: 600,
              fontSize: "1.2rem",
              letterSpacing: "0.02em"
            }}>
              {noteInput.id ? "Edit Note" : "Add Note"}
            </h2>
            <input
              autoFocus
              maxLength={100}
              aria-label="Note title"
              style={{
                padding: "9px",
                borderRadius: 7,
                border: "1px solid var(--border-color)",
                fontSize: 15,
                fontWeight: 500,
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: 0,
                marginBottom: 0
              }}
              required={false}
              placeholder="Title"
              value={noteInput.title}
              onChange={e =>
                setNoteInput((ni) => ({ ...ni, title: e.target.value }))
              }
            />
            <textarea
              style={{
                padding: "9px",
                borderRadius: 7,
                border: "1px solid var(--border-color)",
                fontSize: 15,
                minHeight: 60,
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                outline: 0,
                marginBottom: 8,
                resize: "vertical"
              }}
              maxLength={1000}
              required={false}
              placeholder="Content"
              value={noteInput.content}
              onChange={e =>
                setNoteInput((ni) => ({ ...ni, content: e.target.value }))
              }
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 7 }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={buttonStyle("secondary")}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading || (!noteInput.title.trim() && !noteInput.content.trim())}
                style={buttonStyle("primary")}
              >
                {noteInput.id ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <footer style={{
        background: "transparent",
        textAlign: "center",
        color: "#b0b0b0",
        fontSize: 14,
        padding: "2.5rem 0 1rem 0",
        marginTop: 44
      }}>
        <span>
          &copy; {new Date().getFullYear()} notemaster
        </span>
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
function Modal({ children, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.23)", display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose} aria-modal="true" role="dialog">
      <div style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        borderRadius: 9,
        padding: "2.2rem 2rem 2rem 2rem",
        boxShadow: "0 6px 32px 0 rgba(30,40,50,0.18)",
        minWidth: 220,
        maxWidth: "92%",
        position: "relative"
      }} onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: "absolute",
            top: 11,
            right: 11,
            background: "none",
            color: "var(--text-primary)",
            border: "none",
            fontSize: "1.4rem",
            cursor: "pointer",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

// Returns time ago like '2d', '3h', etc.
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (isNaN(diff)) return "";
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff/60) + "m ago";
  if (diff < 86400) return Math.floor(diff/3600) + "h ago";
  if (diff < 2592000) return Math.floor(diff/86400) + "d ago";
  return date.toLocaleDateString();
}

function buttonStyle(variant) {
  switch (variant) {
    case "primary":
      return {
        background: "#1976d2",
        color: "#fff",
        border: "none",
        borderRadius: 7,
        padding: "9px 20px",
        fontWeight: 600,
        letterSpacing: "0.01em",
        cursor: "pointer",
        fontSize: 15,
        transition: "background 0.2s"
      };
    case "secondary":
      return {
        background: "var(--border-color)",
        color: "#1976d2",
        border: "none",
        borderRadius: 7,
        padding: "9px 16px",
        fontWeight: 600,
        letterSpacing: "0.01em",
        cursor: "pointer",
        fontSize: 15,
        transition: "background 0.2s"
      };
    case "danger":
      return {
        background: "#faf6f6",
        color: "#bb2337",
        border: "none",
        borderRadius: 7,
        padding: "9px 16px",
        fontWeight: 600,
        letterSpacing: "0.01em",
        cursor: "pointer",
        fontSize: 15,
        transition: "background 0.2s"
      };
    default:
      return {};
  }
}

export default App;
