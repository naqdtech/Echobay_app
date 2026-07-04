/** Indian-locale money, date and relative-time helpers. */

/** ₹48,200 — always rounded, never decimals. */
export function inr(value: number | undefined | null): string {
    const n = Math.round(value ?? 0);
    return `₹${n.toLocaleString("en-IN")}`;
}

/** Compact badge form: ₹48k due. */
export function inrCompact(value: number): string {
    const n = Math.round(value);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, "")}cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
    return `₹${n}`;
}

export function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export function prettyDate(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso.replace(" ", "T"));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function prettyDateTime(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso.replace(" ", "T"));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
        ", " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** "Today" / "3d ago" / "Never" for the client list. */
export function daysAgoText(days: number | null | undefined): string {
    if (days === null || days === undefined) return "Never";
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
}

export function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

/** first word of a full name, for the greeting */
export function firstName(fullName: string): string {
    return (fullName || "").trim().split(/\s+/)[0] || "there";
}
