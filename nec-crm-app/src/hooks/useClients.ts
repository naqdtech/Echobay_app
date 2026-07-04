/**
 * Shared, module-cached client list (Customers + Leads, territory-scoped by
 * the server). One fetch feeds the Clients screen, the picker in Log
 * interaction, and the New Prospect flow. Search stays client-side per spec.
 */

import { useCallback, useEffect, useState } from "react";
import { crmAPI } from "../api/crm";
import type { Client } from "../types";

let cache: Client[] | null = null;
let inflight: Promise<Client[]> | null = null;

async function fetchClients(force = false): Promise<Client[]> {
    if (cache && !force) return cache;
    if (!inflight) {
        inflight = crmAPI
            .getClients()
            .then((list) => {
                cache = list;
                return list;
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

export function invalidateClients() {
    cache = null;
}

/** Optimistically prepend a just-created Lead so it shows without a refetch. */
export function addClientToCache(client: Client) {
    if (cache) cache = [client, ...cache];
}

export function useClients() {
    const [clients, setClients] = useState<Client[]>(cache || []);
    const [loading, setLoading] = useState(!cache);

    const load = useCallback(async (force = false) => {
        setLoading(!cache || force);
        try {
            setClients(await fetchClients(force));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { clients, loading, reload: () => load(true) };
}

/** Leads first, then by days-since-last-touch ascending (spec sort). */
export function sortClients(list: Client[]): Client[] {
    return [...list].sort((a, b) => {
        if (a.party_type !== b.party_type) return a.party_type === "Lead" ? -1 : 1;
        const da = a.days_since_last_interaction;
        const db = b.days_since_last_interaction;
        if (da == null && db == null) return a.customer_name.localeCompare(b.customer_name);
        if (da == null) return 1; // never-touched at the end of the ascending list
        if (db == null) return -1;
        return da - db;
    });
}
