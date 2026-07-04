import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { crmAPI, notesAPI, serverError } from "../api/crm";
import { invalidateClients } from "../hooks/useClients";
import { inr, prettyDateTime, daysAgoText } from "../utils/format";
import type { Client, Interaction, PartyType } from "../types";

const CHANNEL_ICON: Record<string, string> = {
    Call: "ti-phone",
    WhatsApp: "ti-brand-whatsapp",
    "In-person": "ti-map-pin",
};

export default function ClientDetail() {
    const { partyType, id } = useParams<{ partyType: PartyType; id: string }>();
    const navigate = useNavigate();
    const party = decodeURIComponent(id || "");
    const pt = (partyType as PartyType) || "Customer";

    const [detail, setDetail] = useState<Client | null>(null);
    const [timeline, setTimeline] = useState<Interaction[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);
    const [done, setDone] = useState(false);

    const [notes, setNotes] = useState("");
    const [notesDirty, setNotesDirty] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const sentinel = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        crmAPI.getClientDetail(pt, party).then((d) => {
            setDetail(d);
            setNotes(d.sales_notes || "");
        }).catch((err) => {
            toast.error(serverError(err, "Could not open this client"));
            navigate("/clients", { replace: true });
        });
        loadPage(0, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [party, pt]);

    const loadPage = async (start: number, reset = false) => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const chunk = await crmAPI.getTimeline(pt, party, start);
            setTimeline((prev) => (reset ? chunk : [...prev, ...chunk]));
            if (chunk.length < 20) setDone(true);
        } finally {
            setLoadingMore(false);
        }
    };

    // infinite scroll
    useEffect(() => {
        if (done) return;
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !loadingMore) loadPage(timeline.length);
        });
        io.observe(el);
        return () => io.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeline.length, done, loadingMore]);

    const saveNotes = async () => {
        setSavingNotes(true);
        try {
            await notesAPI.save(pt, party, notes);
            setNotesDirty(false);
            invalidateClients();
            toast.success("Notes saved");
        } catch (err) {
            toast.error(serverError(err, "Could not save notes"));
        } finally {
            setSavingNotes(false);
        }
    };

    const logHref = `/log?party_type=${pt}&party=${encodeURIComponent(party)}`;
    const phone = detail?.mobile_no;

    return (
        <div className="max-w-md mx-auto px-5 pt-6 pb-8">
            <button className="text-muted text-[14px] mb-4 flex items-center gap-1" onClick={() => navigate(-1)}>
                <i className="ti ti-chevron-left text-[18px]" />
                Back
            </button>

            <header className="mb-5">
                <div className="flex items-start gap-2">
                    <h1 className="font-serif text-[28px] leading-tight flex-1">
                        {detail?.customer_name || party}
                    </h1>
                    {pt === "Lead" && <span className="pill bg-amber-soft text-amber mt-2">Prospect</span>}
                </div>
                <p className="text-[14px] text-muted mt-1">{detail?.territory || "—"}</p>
                <div className="flex items-center gap-4 mt-3">
                    {pt === "Customer" && (
                        <span className="text-[14px]">
                            <span className="text-muted">Outstanding </span>
                            <span className={`num ${(detail?.outstanding ?? 0) > 0 ? "text-danger" : "text-ink"}`}>
                                {inr(detail?.outstanding)}
                            </span>
                        </span>
                    )}
                    <span className="text-[14px] text-muted">
                        Last touch {daysAgoText(
                            detail?.last_interaction_date
                                ? Math.floor(
                                    (Date.now() - new Date(detail.last_interaction_date.replace(" ", "T")).getTime()) /
                                    86400000
                                )
                                : null
                        )}
                    </span>
                </div>
            </header>

            {/* quick actions */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
                <a
                    href={phone ? `tel:${phone}` : undefined}
                    className={`card py-3 flex flex-col items-center gap-1 ${phone ? "" : "opacity-40 pointer-events-none"}`}
                >
                    <i className="ti ti-phone text-[20px] text-accent" />
                    <span className="text-[12px]">Call</span>
                </a>
                <a
                    href={phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={`card py-3 flex flex-col items-center gap-1 ${phone ? "" : "opacity-40 pointer-events-none"}`}
                >
                    <i className="ti ti-brand-whatsapp text-[20px] text-accent" />
                    <span className="text-[12px]">WhatsApp</span>
                </a>
                <button className="card py-3 flex flex-col items-center gap-1" onClick={() => navigate(logHref)}>
                    <i className="ti ti-plus text-[20px] text-accent" />
                    <span className="text-[12px]">Log</span>
                </button>
            </div>

            {/* sticky notes */}
            <section className="mb-6">
                <h2 className="eyebrow mb-2">Sticky notes</h2>
                <div className="card p-3.5">
                    <textarea
                        className="w-full bg-transparent outline-none text-[14px] resize-none placeholder-faint"
                        rows={3}
                        placeholder="Payment habits, who to talk to, preferences…"
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value);
                            setNotesDirty(true);
                        }}
                    />
                    {notesDirty && (
                        <div className="flex justify-end pt-2">
                            <button
                                className="btn-ghost text-accent border-accent/30"
                                disabled={savingNotes}
                                onClick={saveNotes}
                            >
                                {savingNotes ? "Saving…" : "Save notes"}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* timeline */}
            <section>
                <h2 className="eyebrow mb-2">Timeline</h2>
                {timeline.length === 0 && done && (
                    <div className="card p-4 text-[14px] text-muted">
                        No interactions logged yet. Tap “Log interaction” below to start.
                    </div>
                )}
                <ol className="relative pl-6">
                    {timeline.map((it) => (
                        <li key={it.name} className="relative pb-5">
                            <span className="absolute -left-6 top-0.5 w-9 flex justify-center">
                                <i className={`ti ${CHANNEL_ICON[it.channel] || "ti-message"} text-[18px] text-accent`} />
                            </span>
                            <div className="border-l border-line pl-4 -ml-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] font-medium">{it.channel}</span>
                                    <span className="text-[12px] text-faint">
                                        {prettyDateTime(it.interaction_datetime)}
                                    </span>
                                </div>
                                <p className="text-[14px] mt-1 whitespace-pre-wrap">{it.notes}</p>
                                {(it.sentiment || it.duration_minutes) && (
                                    <p className="text-[12px] text-faint mt-1">
                                        {it.sentiment}
                                        {it.sentiment && it.duration_minutes ? " · " : ""}
                                        {it.duration_minutes ? `${it.duration_minutes} min` : ""}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
                <div ref={sentinel} />
                {loadingMore && <p className="text-center text-[13px] text-faint py-2">Loading…</p>}
            </section>

            <button
                className="btn-primary mt-4 flex items-center justify-center gap-2"
                onClick={() => navigate(logHref)}
            >
                <i className="ti ti-plus text-[18px]" />
                Log interaction
            </button>
        </div>
    );
}
