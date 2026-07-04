"""Backdated Interactions — anti-gaming audit.

Interactions logged long after they supposedly happened
(creation - interaction_datetime above the threshold).
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})
    values = {
        "from_date": filters.from_date,
        "to_date": filters.to_date,
        "min_hours": int(filters.get("min_hours_late") or 24),
    }

    data = frappe.db.sql(
        """
        select
            i.name, i.sales_person, i.territory, i.channel,
            i.party_type, i.party, i.party_name,
            i.interaction_datetime, i.creation,
            round(timestampdiff(minute, i.interaction_datetime, i.creation) / 60.0, 1) as hours_late
        from `tabInteraction` i
        where i.creation between %(from_date)s and concat(%(to_date)s, ' 23:59:59')
          and timestampdiff(minute, i.interaction_datetime, i.creation) >= %(min_hours)s * 60
        order by hours_late desc
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "name", "label": "ID", "fieldtype": "Link", "options": "Interaction", "width": 130},
        {"fieldname": "sales_person", "label": "Sales person", "fieldtype": "Link", "options": "Sales Person", "width": 130},
        {"fieldname": "territory", "label": "Territory", "fieldtype": "Link", "options": "Territory", "width": 110},
        {"fieldname": "channel", "label": "Channel", "fieldtype": "Data", "width": 90},
        {"fieldname": "party_name", "label": "Party", "fieldtype": "Data", "width": 160},
        {"fieldname": "interaction_datetime", "label": "Claimed time", "fieldtype": "Datetime", "width": 150},
        {"fieldname": "creation", "label": "Actually logged", "fieldtype": "Datetime", "width": 150},
        {"fieldname": "hours_late", "label": "Hours late", "fieldtype": "Float", "width": 100},
    ]
    return columns, data
