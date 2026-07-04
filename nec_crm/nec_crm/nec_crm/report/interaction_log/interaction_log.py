"""Interaction Log — the live replacement for the weekly Excel report.

Script Report only so blank optional filters don't break the SQL; the
query below is the whole report.
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})

    conditions = ["i.interaction_datetime between %(from_date)s and concat(%(to_date)s, ' 23:59:59')"]
    values = {"from_date": filters.from_date, "to_date": filters.to_date}

    for key in ("sales_person", "territory", "channel"):
        if filters.get(key):
            conditions.append(f"i.{key} = %({key})s")
            values[key] = filters.get(key)
    if filters.get("party"):
        conditions.append("(i.party like %(party)s or i.party_name like %(party)s)")
        values["party"] = f"%{filters.party}%"

    data = frappe.db.sql(
        f"""
        select
            i.name, i.interaction_datetime, i.sales_person, i.territory,
            i.channel, i.party_type, i.party, i.party_name, i.contact_person,
            i.direction, i.duration_minutes, i.sentiment, i.notes, i.creation
        from `tabInteraction` i
        where {" and ".join(conditions)}
        order by i.interaction_datetime desc
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "name", "label": "ID", "fieldtype": "Link", "options": "Interaction", "width": 130},
        {"fieldname": "interaction_datetime", "label": "When", "fieldtype": "Datetime", "width": 150},
        {"fieldname": "sales_person", "label": "Sales person", "fieldtype": "Link", "options": "Sales Person", "width": 130},
        {"fieldname": "territory", "label": "Territory", "fieldtype": "Link", "options": "Territory", "width": 110},
        {"fieldname": "channel", "label": "Channel", "fieldtype": "Data", "width": 90},
        {"fieldname": "party_type", "label": "Party type", "fieldtype": "Data", "width": 90},
        {"fieldname": "party", "label": "Party", "fieldtype": "Dynamic Link", "options": "party_type", "width": 140},
        {"fieldname": "party_name", "label": "Party name", "fieldtype": "Data", "width": 160},
        {"fieldname": "contact_person", "label": "Contact", "fieldtype": "Data", "width": 110},
        {"fieldname": "direction", "label": "Direction", "fieldtype": "Data", "width": 90},
        {"fieldname": "duration_minutes", "label": "Minutes", "fieldtype": "Int", "width": 80},
        {"fieldname": "sentiment", "label": "Sentiment", "fieldtype": "Data", "width": 100},
        {"fieldname": "notes", "label": "Notes", "fieldtype": "Data", "width": 300},
        {"fieldname": "creation", "label": "Logged at", "fieldtype": "Datetime", "width": 150},
    ]
    return columns, data
