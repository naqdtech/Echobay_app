/**
 * NEC CRM service layer.
 * Dashboard aggregates come from nec_crm.api.* whitelisted methods (one
 * round-trip per screen); document writes go through frappe.client.*.
 * Territory scoping is enforced server-side — nothing here filters by
 * territory because the server already refuses out-of-scope data.
 */

import apiClient from "./client";
import type {
    Client,
    HomeDashboard,
    Interaction,
    ManagerSnapshot,
    PartyType,
    Todo,
    WeekSummary,
} from "../types";

const j = (v: unknown) => JSON.stringify(v);

export function serverError(err: any, fallback: string): string {
    try {
        const d = err?.response?.data;
        if (d?._server_messages) {
            const parsed = JSON.parse(d._server_messages);
            const inner = JSON.parse(parsed[0]);
            const msg = (inner?.message || "").replace(/<[^>]+>/g, "");
            if (msg) return msg;
        }
        if (d?.exception) return String(d.exception).split(":").slice(-1)[0].trim();
        if (d?.message) return d.message;
    } catch { /* ignore */ }
    return fallback;
}

// ── auth ──────────────────────────────────────────────

export const authAPI = {
    login: async (usr: string, pwd: string) => {
        try {
            await apiClient.get("/api/method/frappe.auth.get_csrf_token");
        } catch { /* csrf primed via cookie */ }
        const res = await apiClient.post("/api/method/login", { usr, pwd });
        return {
            success: true,
            full_name: res.data?.full_name || "",
        };
    },

    getLoggedUser: async (): Promise<string | null> => {
        const res = await apiClient.get("/api/method/frappe.auth.get_logged_user");
        return res.data?.message || null;
    },

    logout: async () => {
        try {
            await apiClient.get("/api/method/logout");
        } catch { /* ignore */ }
    },
};

// ── nec_crm.api aggregates ────────────────────────────

const m = (name: string) => `/api/method/nec_crm.api.${name}`;

export const crmAPI = {
    getContext: async () => {
        const res = await apiClient.get(m("get_context"));
        return res.data?.message as {
            user: string;
            full_name: string;
            sales_person: string | null;
            territories: string[];
            is_manager: boolean;
        };
    },

    homeDashboard: async (): Promise<HomeDashboard> => {
        const res = await apiClient.get(m("home_dashboard"));
        return res.data?.message;
    },

    getClients: async (): Promise<Client[]> => {
        const res = await apiClient.get(m("get_clients"));
        const msg = res.data?.message || { customers: [], leads: [] };
        return [...(msg.leads || []), ...(msg.customers || [])];
    },

    getClientDetail: async (partyType: PartyType, party: string): Promise<Client> => {
        const res = await apiClient.get(m("get_client_detail"), {
            params: { party_type: partyType, party },
        });
        return res.data?.message;
    },

    getTimeline: async (partyType: PartyType, party: string, start = 0): Promise<Interaction[]> => {
        const res = await apiClient.get(m("get_timeline"), {
            params: { party_type: partyType, party, start, page_length: 20 },
        });
        return res.data?.message || [];
    },

    weekSummary: async (): Promise<WeekSummary> => {
        const res = await apiClient.get(m("week_summary"));
        return res.data?.message;
    },

    managerSnapshot: async (): Promise<ManagerSnapshot> => {
        const res = await apiClient.get(m("manager_snapshot"));
        return res.data?.message;
    },
};

// ── interactions ──────────────────────────────────────

export interface LogInteractionPayload {
    party_type: PartyType;
    party: string;
    channel: string;
    notes: string;
    contact_person?: string;
    direction?: string;
    duration_minutes?: number;
    sentiment?: string;
}

export const interactionAPI = {
    log: async (payload: LogInteractionPayload): Promise<string> => {
        const res = await apiClient.post("/api/method/frappe.client.insert", {
            doc: j({ doctype: "Interaction", ...payload }),
        });
        return res.data?.message?.name;
    },
};

// ── leads (new prospects) ─────────────────────────────

export const leadAPI = {
    create: async (payload: {
        company_name: string;
        first_name?: string;
        mobile_no?: string;
        territory?: string;
    }): Promise<{ name: string; lead_name: string }> => {
        const res = await apiClient.post("/api/method/frappe.client.insert", {
            doc: j({ doctype: "Lead", status: "Open", ...payload }),
        });
        return res.data?.message;
    },
};

// ── sticky notes ──────────────────────────────────────

export const notesAPI = {
    save: async (partyType: PartyType, party: string, notes: string) => {
        await apiClient.post("/api/method/frappe.client.set_value", {
            doctype: partyType,
            name: party,
            fieldname: "sales_notes",
            value: notes,
        });
    },
};

// ── query reports (in-app viewer) ─────────────────────

export interface ReportColumn {
    label: string;
    fieldname: string;
    fieldtype?: string;
    width?: number;
}

export interface ReportResult {
    columns: ReportColumn[];
    rows: Record<string, any>[];
}

export const reportAPI = {
    /** Run an ERPNext query report through the authenticated /api proxy. */
    run: async (reportName: string, filters: Record<string, any>): Promise<ReportResult> => {
        const res = await apiClient.get("/api/method/frappe.desk.query_report.run", {
            params: { report_name: reportName, filters: j(filters) },
        });
        const msg = res.data?.message || {};

        const columns: ReportColumn[] = (msg.columns || []).map((c: any) => {
            if (typeof c === "string") {
                // "Label:Fieldtype/Options:Width"
                const [label, type = "Data"] = c.split(":");
                return {
                    label,
                    fieldname: label.toLowerCase().replace(/\s+/g, "_"),
                    fieldtype: type.split("/")[0],
                };
            }
            return { label: c.label, fieldname: c.fieldname, fieldtype: c.fieldtype, width: c.width };
        });

        // rows come back as dicts (as_dict reports) or positional arrays
        const rows: Record<string, any>[] = (msg.result || [])
            .filter((r: any) => r != null)
            .map((r: any) =>
                Array.isArray(r)
                    ? Object.fromEntries(columns.map((c, i) => [c.fieldname, r[i]]))
                    : r
            );

        return { columns, rows };
    },
};

// ── tasks (Frappe ToDo — never a custom doctype) ──────

export const todoAPI = {
    list: async (user: string): Promise<Todo[]> => {
        const res = await apiClient.get("/api/resource/ToDo", {
            params: {
                fields: j([
                    "name", "description", "date", "priority", "status",
                    "reference_type", "reference_name", "assigned_by", "allocated_to",
                ]),
                filters: j([
                    ["allocated_to", "=", user],
                    ["status", "in", ["Open", "Closed"]],
                ]),
                order_by: "date asc",
                limit_page_length: 200,
            },
        });
        return res.data?.data || [];
    },

    setStatus: async (name: string, status: "Open" | "Closed") => {
        await apiClient.post("/api/method/frappe.client.set_value", {
            doctype: "ToDo",
            name,
            fieldname: "status",
            value: status,
        });
    },

    create: async (payload: {
        allocated_to: string;
        description: string;
        date?: string;
        priority?: string;
        reference_type?: string;
        reference_name?: string;
    }): Promise<string> => {
        const res = await apiClient.post("/api/method/frappe.client.insert", {
            doc: j({ doctype: "ToDo", status: "Open", ...payload }),
        });
        return res.data?.message?.name;
    },
};
