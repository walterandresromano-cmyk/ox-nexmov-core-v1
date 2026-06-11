import { useEffect, useRef, useState } from "react";
import {
  getTicketMessages,
  sendTicketMessage,
  subscribeToTicketMessages,
} from "../services/ticketMessages.service.js";

const SUPPORT_ROLES = new Set(["admin", "support", "soporte"]);

function norm(role) {
  return String(role || "").toLowerCase().trim();
}

function isSupport(role) {
  return SUPPORT_ROLES.has(norm(role));
}

function fmtTime(dateValue) {
  if (!dateValue) return "";
  return new Intl.DateTimeFormat("es-AR", {
    hour:   "2-digit",
    minute: "2-digit",
    day:    "numeric",
    month:  "short",
  }).format(new Date(dateValue));
}

function Bubble({ message, myId }) {
  const mine = message.sender_id === myId;
  const support = isSupport(message.sender_role);

  return (
    <div className={`tc-bubble-wrap ${mine ? "tc-bubble-wrap--mine" : "tc-bubble-wrap--theirs"}`}>
      {!mine && (
        <span className="tc-bubble-sender">
          {message.sender_name || (support ? "Soporte oX" : "Dealer")}
        </span>
      )}
      <div className={`tc-bubble ${support && !mine ? "tc-bubble--support" : ""} ${mine ? "tc-bubble--mine" : ""}`}>
        <p>{message.content}</p>
      </div>
      <span className="tc-bubble-time">{fmtTime(message.created_at)}</span>
    </div>
  );
}

export default function TicketChat({ ticketId, initialMessage, authProfile }) {
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState("");
  const [myId,      setMyId]      = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Resolve current user id once
  useEffect(() => {
    import("../lib/supabaseClient.js").then(({ supabase, isSupabaseConfigured }) => {
      if (!isSupabaseConfigured || !supabase) return;
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setMyId(data.user.id);
      });
    });
  }, []);

  // Load existing messages
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTicketMessages(ticketId).then(({ messages: rows }) => {
      if (!cancelled) {
        setMessages(rows);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [ticketId]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToTicketMessages(ticketId, (newMsg) => {
      setMessages((prev) => {
        // avoid duplicates (optimistic insert may already be there)
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return unsub;
  }, [ticketId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError("");

    const senderRole = norm(authProfile?.role) || "dealer";
    const senderName = authProfile?.commercialName || authProfile?.name || authProfile?.email || null;

    // Optimistic insert
    const optimistic = {
      id:          `opt-${Date.now()}`,
      ticket_id:   ticketId,
      sender_id:   myId,
      sender_role: senderRole,
      sender_name: senderName,
      content:     trimmed,
      created_at:  new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    textareaRef.current?.focus();

    const { message, error } = await sendTicketMessage({
      ticketId,
      content:     trimmed,
      senderRole,
      senderName,
    });

    if (error) {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setText(trimmed);
      setSendError(error.message || "No se pudo enviar el mensaje.");
    } else if (message) {
      // Replace optimistic with real row
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? message : m))
      );
    }

    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="tc-root">
      <h3 className="tc-title">Conversación</h3>

      <div className="tc-messages">
        {/* Original ticket message as first bubble */}
        {initialMessage && (
          <div className="tc-initial">
            <p className="tc-initial__label">Mensaje inicial del ticket</p>
            <p className="tc-initial__text">{initialMessage}</p>
          </div>
        )}

        {loading && (
          <p className="tc-loading">Cargando mensajes...</p>
        )}

        {!loading && messages.length === 0 && !initialMessage && (
          <p className="tc-empty">Todavía no hay mensajes. Iniciá la conversación.</p>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} message={m} myId={myId} />
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="tc-input-row">
        <textarea
          ref={textareaRef}
          className="tc-textarea"
          rows={3}
          placeholder="Escribí tu mensaje… (Ctrl+Enter para enviar)"
          value={text}
          onChange={(e) => { setText(e.target.value); setSendError(""); }}
          onKeyDown={handleKeyDown}
          disabled={sending}
          maxLength={2000}
        />
        <div className="tc-input-actions">
          {sendError && <small className="tc-send-error">{sendError}</small>}
          <span className="tc-char-count">{text.length}/2000</span>
          <button
            type="button"
            className="primary-action tc-send-btn"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
