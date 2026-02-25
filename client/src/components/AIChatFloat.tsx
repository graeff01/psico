import { useState, useRef, useEffect } from "react";
import { useSession } from "../lib/auth-client";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import {
  Brain,
  X,
  Send,
  Loader2,
  Trash2,
  Minimize2,
  Maximize2,
} from "lucide-react";

export function AIChatFloat() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => `chat-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: history, refetch: refetchHistory } =
    trpc.ai.getChatHistory.useQuery(
      { sessionId, limit: 50 },
      { enabled: isOpen && !!session }
    );

  const sendMessage = trpc.ai.chat.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
    onError: (err) => toast.error(err.message),
  });

  const clearHistory = trpc.ai.clearChatHistory.useMutation({
    onSuccess: () => {
      refetchHistory();
      toast.success("Histórico limpo");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-ai-chat", handler);
    return () => window.removeEventListener("open-ai-chat", handler);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!session) return null;

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMessage.isPending) return;

    sendMessage.mutate({
      message: trimmed,
      sessionId,
    });
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 flex items-center justify-center transition-all z-50 group"
        >
          <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-50 bg-white rounded-2xl shadow-2xl border border-border-light flex flex-col transition-all duration-200",
            isExpanded
              ? "inset-4 sm:inset-8"
              : "bottom-6 right-6 w-[380px] h-[520px] max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-text-primary">
                PsicoIA Chat
              </h3>
              <p className="text-[10px] text-text-muted">
                Assistente clínico inteligente
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => clearHistory.mutate({ sessionId })}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
                title="Limpar histórico"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(!history || history.length === 0) && (
              <div className="text-center py-8">
                <Brain className="w-10 h-10 text-primary-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-text-secondary">
                  Olá! Como posso ajudar?
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-[250px] mx-auto">
                  Pergunte sobre pacientes, análises clínicas, padrões de
                  comportamento ou peça insights.
                </p>
                <div className="mt-4 space-y-1.5">
                  {[
                    "Quais padrões você identifica nos meus pacientes?",
                    "Me dê um resumo geral do consultório",
                    "Quais técnicas usar para ansiedade?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setMessage(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="block w-full text-left px-3 py-2 rounded-lg bg-surface text-xs text-text-secondary hover:bg-primary-50 hover:text-primary-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history?.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-primary-600 text-white rounded-br-md"
                      : "bg-surface text-text-secondary rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}

            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border-light shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                rows={1}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 max-h-24"
                style={{ minHeight: "38px" }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] text-text-muted mt-1.5 text-center">
              Dados processados localmente. A IA não substitui julgamento
              clínico.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
