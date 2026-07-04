app_name = "nec_crm"
app_title = "NEC CRM"
app_publisher = "NAQD"
app_description = "Field interaction and task tracking for NEC sales reps (Stage 1)"
app_email = "naqdtech@gmail.com"
app_license = "MIT"

# Custom fields on Customer / Lead / Sales Person are created idempotently
# on install and on every migrate (see install.py).
after_install = "nec_crm.install.after_install"
after_migrate = "nec_crm.install.after_migrate"

scheduler_events = {
    # Nightly: recompute Customer.days_since_last_interaction for the whole
    # customer master so the Silence report and client list are cheap reads.
    "daily": [
        "nec_crm.tasks.recompute_customer_silence",
    ],
    "cron": {
        # 08:30 server time: WhatsApp each rep their due/overdue tasks
        # via the existing Evolution API integration (evo.naqd.in).
        "30 8 * * *": [
            "nec_crm.tasks.send_task_reminders",
        ],
    },
}
