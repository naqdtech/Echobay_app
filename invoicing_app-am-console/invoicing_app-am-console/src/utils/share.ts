import toast from "react-hot-toast";
import { printAPI, whatsappAPI, clientAPI } from "../api/erp";

/**
 * Share a document's PDF via the Web Share API, falling back to a download +
 * WhatsApp text intent. Works for any printable ERPNext doctype.
 */
export async function sharePdf(doctype: string, name: string, caption: string, format?: string): Promise<void> {
    try {
        const blob = await printAPI.getPdf(doctype, name, format);
        const file = new File([blob], `${name.replace(/\//g, "-")}.pdf`, { type: "application/pdf" });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ title: name, text: caption, files: [file] });
                return;
            } catch (e: any) {
                if (e?.name === "AbortError") return;
            }
        }
        // Fallback: download + open WhatsApp text intent
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast("PDF downloaded — attach it in WhatsApp");
        window.open(`whatsapp://send?text=${encodeURIComponent(caption)}`, "_blank");
    } catch {
        toast.error(`Could not generate ${doctype} PDF`);
    }
}

/**
 * Send a document via ERPNext WhatsApp Evo (server-side) to the client's
 * WhatsApp Group ID (preferred) or mobile number. Attaches the doc's PDF.
 */
export async function sendViaEvo(
    doctype: string,
    name: string,
    customer: string,
    message: string,
    printFormat?: string,
): Promise<void> {
    const t = toast.loading("Sending via WhatsApp…");
    try {
        const cust = await clientAPI.get(customer);
        const to = cust?.custom_whatsapp_group_id || cust?.mobile_no;
        if (!to) {
            toast.error("No WhatsApp number / group set for this client", { id: t });
            return;
        }
        const res = await whatsappAPI.send({
            to, message, doctype, name,
            print_format: printFormat,
            attach_type: "PDF",
        });
        if (res.success) toast.success("Sent via WhatsApp", { id: t });
        else toast.error(res.message || "WhatsApp send failed", { id: t });
    } catch {
        toast.error("WhatsApp send failed", { id: t });
    }
}

/** Share plain text via WhatsApp. */
export function shareText(text: string): void {
    if (navigator.share) {
        navigator.share({ text }).catch(() => {
            window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, "_blank");
        });
    } else {
        window.open(`whatsapp://send?text=${encodeURIComponent(text)}`, "_blank");
    }
}
