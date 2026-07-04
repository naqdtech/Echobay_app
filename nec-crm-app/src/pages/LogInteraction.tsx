import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import ClientPicker from "../components/ClientPicker";
import { interactionAPI, todoAPI, serverError } from "../api/crm";
import { invalidateClients, useClients } from "../hooks/useClients";
import { useAuth } from "../context/AuthContext";
import { todayISO } from "../utils/format";
import type { Channel, Client, PartyType } from "../types";

const CHANNELS: { key: Channel; icon: string; label: string }[] = [
    { key: "Call", icon: "ti-phone", label: "Call" },
    { key: "WhatsApp", icon: "ti-brand-whatsapp", label: "WhatsApp" },
    { key: "In-person", icon: "ti-map-pin", label: "Visit" },
];

const SENTIMENTS = ["Positive", "Neutral", "Negative", "No Response"];

/**
 * Reimagined log flow: pick channel with one tap, choose the client, write a
 * note, optionally add a follow-up task — all on one calm screen. Save stays
 * disabled until channel + client + notes are all present, then commits
 * optimistically and drops you back where you came from.
 */
export default function LogInteraction() {
    const navigate = useNavigate();
    const { email } = useAuth();
    const { clients } = useClients();
    const [params] = useSearchParams();

    const [channel, setChannel] = useState<Channel | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [sentiment, setSentiment] = useState("");
    const [saving, setSaving] = useState(false);

    // follow-up task
    const [taskOpen, setTaskOpen] = useState(false);
    const [taskDesc, setTaskDesc] = useState("");
    const [taskDate, setTaskDate] = useState(todayISO());

    // preselect party from ClientDetail deep link
    useEffect(() => {
        const pt = params.get("party_type") as PartyType | null;
        const p = params.get("party");
        if (pt && p && !client) {
            const found = clients.find((c) => c.party_type === pt && c.name === p);
            if (found) setClient(found);
            else setClient({ name: p, party_type: pt, customer_name: p, outstanding: 0, days_since_last_interaction: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params, clients]);

    const canSave = useMemo(
        () => !!channel && !!client && notes.trim().length > 0 && !saving,
        [channel, client, notes, saving]
    );

    const save = async () => {
        if (!canSave || !channel || !client) return;
        setSaving(true);
        // optimistic: toast + navigate immediately, fire request in background
        toast.success("Interaction logged");
        const backTo = client.party_type && client.name
            ? `/clients/${client.party_type}/${encodeURIComponent(client.name)}`
            : "/";

        try {
            await interactionAPI.log({
                party_type: client.party_type,
                party: client.name,
                channel,
                notes: notes.trim(),
                sentiment: sentiment || undefined,
            });

            if (taskOpen && taskDesc.trim()) {
                await todoAPI.create({
                    allocated_to: email,
                    description: taskDesc.trim(),
                    date: taskDate,
                    priority: "Medium",
                    reference_type: client.party_type,
                    reference_name: client.name,
                });
            }
            invalidateClients();
            navigate(backTo, { replace: true });
        } catch (err) {
            // roll the toast back — the write did not land
            toast.error(serverError(err, "Could not save. Try again."));
            setSaving(false);
        }
    };

    return (
        <div className="max-w-md mx-auto px-5 pt-6 pb-8 min-h-screen flex flex-col">
            <header className="flex items-center justify-between mb-6">
                <button className="text-muted text-[14px] flex items-center gap-1" onClick={() => navigate(-1)}>
                    <i className="ti ti-chevron-left text-[18px]" />
                    Back
                </button>
                <h1 className="font-serif text-[22px]">Log interaction</h1>
                <span className="w-12" />
            </header>

            {/* 1. channel */}
            <p className="eyebrow mb-2">How did you reach them</p>
            <div className="grid grid-cols-3 gap-2.5 mb-6">
                {CHANNELS.map((c) => {
                    const active = channel === c.key;
                    return (
                        <button
                            key={c.key}
                            onClick={() => setChannel(c.key)}
                            className={`rounded-2xl border py-4 flex flex-col items-center gap-1.5 transition-colors ${active
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-line bg-card text-ink"
                                }`}
                        >
                            <i className={`ti ${c.icon} text-[24px]`} />
                            <span className="text-[13px]">{c.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 2. client */}
            <p className="eyebrow mb-2">Which client</p>
            <button
                onClick={() => setPickerOpen(true)}
                className="card w-full px-4 py-3.5 flex items-center justify-between mb-6"
            >
                {client ? (
                    <span className="min-w-0 text-left">
                        <span className="block text-[15px] truncate">
                            {client.customer_name}
                            {client.party_type === "Lead" && (
                                <span className="pill bg-amber-soft text-amber ml-2">Prospect</span>
                            )}
                        </span>
                        <span className="block text-[13px] text-muted truncate">{client.territory || "—"}</span>
                    </span>
                ) : (
                    <span className="text-[15px] text-faint">Select a client or prospect</span>
                )}
                <i className="ti ti-chevron-right text-[18px] text-faint shrink-0 ml-2" />
            </button>

            {/* 3. notes */}
            <p className="eyebrow mb-2">Notes</p>
            <textarea
                className="input-field mb-4 resize-none"
                rows={4}
                placeholder="What did you discuss? Any commitment or next step?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
            />

            {/* sentiment (optional) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
                {SENTIMENTS.map((s) => (
                    <button
                        key={s}
                        onClick={() => setSentiment(sentiment === s ? "" : s)}
                        className={`pill border whitespace-nowrap px-3 py-1.5 ${sentiment === s
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-line text-muted"
                            }`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* follow-up task (collapsible) */}
            <div className="card mb-6">
                <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setTaskOpen((v) => !v)}
                >
                    <span className="text-[14px] flex items-center gap-2">
                        <i className="ti ti-flag text-[18px] text-muted" />
                        Add follow-up task
                    </span>
                    <i className={`ti ${taskOpen ? "ti-chevron-up" : "ti-chevron-down"} text-[18px] text-faint`} />
                </button>
                {taskOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-line pt-3">
                        <input
                            className="input-field"
                            placeholder="e.g. Call back about charger stock"
                            value={taskDesc}
                            onChange={(e) => setTaskDesc(e.target.value)}
                        />
                        <div>
                            <label className="block text-[13px] text-muted mb-1.5">Due date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={taskDate}
                                onChange={(e) => setTaskDate(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-auto">
                <button className="btn-primary" disabled={!canSave} onClick={save}>
                    {saving ? "Saving…" : "Save interaction"}
                </button>
            </div>

            <ClientPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onPick={(c) => {
                    setClient(c);
                    setPickerOpen(false);
                }}
            />
        </div>
    );
}
