import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { todoAPI, serverError } from "../api/crm";
import { useAuth } from "../context/AuthContext";
import { prettyDate, todayISO } from "../utils/format";
import type { Todo } from "../types";

type Group = "Overdue" | "Due today" | "Upcoming" | "Completed";

export default function Tasks() {
    const { email } = useAuth();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        todoAPI
            .list(email)
            .then(setTodos)
            .catch((err) => toast.error(serverError(err, "Could not load tasks")))
            .finally(() => setLoading(false));
    }, [email]);

    const groups = useMemo(() => {
        const today = todayISO();
        const g: Record<Group, Todo[]> = {
            Overdue: [],
            "Due today": [],
            Upcoming: [],
            Completed: [],
        };
        for (const t of todos) {
            if (t.status === "Closed") g.Completed.push(t);
            else if (!t.date) g.Upcoming.push(t);
            else if (t.date < today) g.Overdue.push(t);
            else if (t.date === today) g["Due today"].push(t);
            else g.Upcoming.push(t);
        }
        return g;
    }, [todos]);

    const toggle = async (t: Todo) => {
        const next = t.status === "Closed" ? "Open" : "Closed";
        setTodos((prev) => prev.map((x) => (x.name === t.name ? { ...x, status: next } : x)));
        try {
            await todoAPI.setStatus(t.name, next);
        } catch (err) {
            setTodos((prev) => prev.map((x) => (x.name === t.name ? { ...x, status: t.status } : x)));
            toast.error(serverError(err, "Could not update task"));
        }
    };

    const order: Group[] = ["Overdue", "Due today", "Upcoming", "Completed"];

    return (
        <div className="max-w-md mx-auto px-5 pt-8">
            <header className="mb-5">
                <p className="eyebrow mb-1">Your list</p>
                <h1 className="font-serif text-[30px] leading-tight">Tasks</h1>
            </header>

            {loading && <p className="text-muted text-[14px] py-6 text-center">Loading tasks…</p>}
            {!loading && todos.length === 0 && (
                <div className="card p-5 text-[14px] text-muted text-center">
                    No tasks yet. Add a follow-up when you log an interaction.
                </div>
            )}

            {order.map((group) => {
                const items = groups[group];
                if (items.length === 0) return null;
                return (
                    <section key={group} className="mb-6">
                        <h2
                            className={`eyebrow mb-2 ${group === "Overdue" ? "text-danger" : ""}`}
                        >
                            {group} · {items.length}
                        </h2>
                        <div className="card divide-y divide-line">
                            {items.map((t) => (
                                <div key={t.name} className="flex items-start gap-3 px-4 py-3">
                                    <button
                                        onClick={() => toggle(t)}
                                        className="pt-0.5 shrink-0"
                                        aria-label={t.status === "Closed" ? "Mark open" : "Mark done"}
                                    >
                                        <i
                                            className={`ti text-[20px] ${t.status === "Closed"
                                                ? "ti-circle-check-filled text-accent"
                                                : "ti-circle text-faint"
                                                }`}
                                        />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`text-[14px] ${t.status === "Closed" ? "line-through text-faint" : ""
                                                }`}
                                            dangerouslySetInnerHTML={{ __html: stripToText(t.description) }}
                                        />
                                        <div className="flex items-center gap-2 mt-1">
                                            {t.date && (
                                                <span className="text-[12px] text-muted">{prettyDate(t.date)}</span>
                                            )}
                                            {isManagerAssigned(t, email) && (
                                                <span className="pill bg-accent-soft text-accent">By manager</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

function stripToText(html: string): string {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || tmp.innerText || "").replace(/</g, "&lt;");
}

function isManagerAssigned(t: Todo, self: string): boolean {
    return !!t.assigned_by && t.assigned_by !== self && t.assigned_by !== t.allocated_to;
}
