import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { CONSULTATION_STATUS } from "../lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Loader2,
  User,
} from "lucide-react";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h - 20h

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    hour: number;
  } | null>(null);

  // Get week start (Monday)
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: view === "week" ? 7 : 1 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(
        d.getDate() + (view === "week" ? i : currentDate.getDay() - 1)
      );
      return d;
    });
  }, [weekStart, view, currentDate]);

  const startDate = weekDays[0].toISOString().split("T")[0];
  const endDate = new Date(
    weekDays[weekDays.length - 1].getTime() + 86400000
  )
    .toISOString()
    .split("T")[0];

  const { data, isLoading } = trpc.consultations.list.useQuery({
    startDate,
    endDate,
    limit: 50,
    page: 1,
  });

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (view === "week" ? 7 * dir : dir));
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getConsultationsForSlot = (date: Date, hour: number) => {
    if (!data?.consultations) return [];
    return data.consultations.filter((c) => {
      const cDate = new Date(c.date);
      return (
        cDate.toDateString() === date.toDateString() &&
        cDate.getHours() === hour
      );
    });
  };

  const isToday = (date: Date) =>
    date.toDateString() === new Date().toDateString();

  const formatDayHeader = (d: Date) => {
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    return {
      name: dayNames[d.getDay()],
      num: d.getDate(),
    };
  };

  const monthYear = currentDate.toLocaleString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary capitalize">
            {monthYear}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-border-light text-xs font-medium text-text-secondary hover:bg-surface-hover"
          >
            Hoje
          </button>
          <div className="flex rounded-lg border border-border-light overflow-hidden">
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === "day"
                  ? "bg-primary-600 text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium ${
                view === "week"
                  ? "bg-primary-600 text-white"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              Semana
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-border-light overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="w-16 p-2 text-xs text-text-muted border-b border-r border-border-light" />
                  {weekDays.map((day) => {
                    const { name, num } = formatDayHeader(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-2 border-b border-border-light text-center ${
                          isToday(day) ? "bg-primary-50" : ""
                        }`}
                      >
                        <span className="text-[10px] text-text-muted uppercase block">
                          {name}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            isToday(day)
                              ? "text-primary-600"
                              : "text-text-primary"
                          }`}
                        >
                          {num}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour}>
                    <td className="p-1 text-[10px] text-text-muted text-right pr-2 border-r border-border-light align-top">
                      {`${hour.toString().padStart(2, "0")}:00`}
                    </td>
                    {weekDays.map((day) => {
                      const slots = getConsultationsForSlot(day, hour);
                      return (
                        <td
                          key={`${day.toISOString()}-${hour}`}
                          className={`border-b border-border-light p-0.5 h-14 align-top cursor-pointer hover:bg-primary-50/30 transition-colors ${
                            isToday(day) ? "bg-primary-50/20" : ""
                          }`}
                          onClick={() => {
                            const slotDate = new Date(day);
                            slotDate.setHours(hour, 0, 0, 0);
                            setSelectedSlot({ date: slotDate, hour });
                            setShowNewModal(true);
                          }}
                        >
                          {slots.map((c) => (
                            <Link
                              key={c.id}
                              to={`/consultations/${c.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={`block mx-0.5 mb-0.5 px-1.5 py-1 rounded text-[10px] font-medium leading-tight truncate ${
                                c.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : c.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : c.status === "cancelled"
                                      ? "bg-red-100 text-red-800 line-through"
                                      : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              <span className="flex items-center gap-0.5">
                                <User className="w-2.5 h-2.5" />
                                {c.patientName}
                              </span>
                            </Link>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewModal && selectedSlot && (
        <NewAppointmentModal
          date={selectedSlot.date}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}

function NewAppointmentModal({
  date,
  onClose,
}: {
  date: Date;
  onClose: () => void;
}) {
  const [patientId, setPatientId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    date.toISOString().slice(0, 16)
  );

  const { data: patients } = trpc.patients.list.useQuery({ limit: 100 });
  const utils = trpc.useUtils();

  const create = trpc.consultations.create.useMutation({
    onSuccess: () => {
      utils.consultations.list.invalidate();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    create.mutate({
      patientId,
      date: new Date(selectedDate).toISOString(),
      notes: notes || undefined,
      status: "scheduled",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 animate-slide-up">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Nova Consulta
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Paciente
            </label>
            <select
              value={patientId ?? ""}
              onChange={(e) => setPatientId(Number(e.target.value))}
              required
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">Selecionar paciente...</option>
              {patients?.patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Data e Hora
            </label>
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Observacoes (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border-light bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
              placeholder="Anotacoes sobre a consulta..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border-light text-sm font-medium text-text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!patientId || create.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {create.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
