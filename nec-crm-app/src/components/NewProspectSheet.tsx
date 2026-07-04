import React, { useState } from "react";
import toast from "react-hot-toast";
import Sheet from "./Sheet";
import { leadAPI, serverError } from "../api/crm";
import { useAuth } from "../context/AuthContext";
import { addClientToCache } from "../hooks/useClients";
import type { Client } from "../types";

/** Creates a Frappe Lead. Opened from Clients or from the Log flow —
 * in the latter case the new prospect auto-attaches to the draft. */
export default function NewProspectSheet({
    open,
    onClose,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated?: (client: Client) => void;
}) {
    const { territories } = useAuth();
    const [shopName, setShopName] = useState("");
    const [contact, setContact] = useState("");
    const [phone, setPhone] = useState("");
    const [area, setArea] = useState("");
    const [saving, setSaving] = useState(false);

    const canSave = shopName.trim().length > 1;

    const reset = () => {
        setShopName("");
        setContact("");
        setPhone("");
        setArea("");
    };

    const save = async () => {
        if (!canSave || saving) return;
        setSaving(true);
        try {
            const created = await leadAPI.create({
                company_name: shopName.trim(),
                first_name: contact.trim() || undefined,
                mobile_no: phone.trim() || undefined,
                territory: area.trim() || undefined,
            });
            const client: Client = {
                name: created.name,
                party_type: "Lead",
                customer_name: shopName.trim(),
                territory: area.trim() || undefined,
                mobile_no: phone.trim() || undefined,
                status: "Open",
                days_since_last_interaction: null,
                outstanding: 0,
            };
            addClientToCache(client);
            toast.success("Prospect added");
            reset();
            onCreated?.(client);
            onClose();
        } catch (err) {
            toast.error(serverError(err, "Could not add prospect"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onClose={onClose} title="New prospect">
            <div className="space-y-4">
                <div>
                    <label className="block text-[13px] text-muted mb-1.5">Shop name</label>
                    <input
                        className="input-field"
                        placeholder="Star Cell Point"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-[13px] text-muted mb-1.5">Contact person</label>
                    <input
                        className="input-field"
                        placeholder="Owner or manager name"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[13px] text-muted mb-1.5">Phone</label>
                    <input
                        className="input-field"
                        placeholder="98470 00000"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-[13px] text-muted mb-1.5">Area</label>
                    {territories.length > 1 ? (
                        <select className="input-field" value={area} onChange={(e) => setArea(e.target.value)}>
                            <option value="">Select area</option>
                            {territories.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            className="input-field"
                            placeholder="Kochi"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                        />
                    )}
                </div>
                <button className="btn-primary" disabled={!canSave || saving} onClick={save}>
                    {saving ? "Adding…" : "Add prospect"}
                </button>
            </div>
        </Sheet>
    );
}
