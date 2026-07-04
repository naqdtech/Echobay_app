"""Interactions by Hour — anti-gaming histogram.

A rep logging their whole day in one 9pm batch shows up as a spike in a
single hour. Uses creation time (when it was logged), not the claimed
interaction time.
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})

    conditions = ["i.creation between %(from_date)s and concat(%(to_date)s, ' 23:59:59')"]
    values = {"from_date": filters.from_date, "to_date": filters.to_date}
    if filters.get("sales_person"):
        conditions.append("i.sales_person = %(sales_person)s")
        values["sales_person"] = filters.sales_person

    data = frappe.db.sql(
        f"""
        select
            i.sales_person,
            hour(i.creation) as hour_of_day,
            count(*) as logged,
            round(100 * count(*) / sum(count(*)) over (partition by i.sales_person), 1) as pct_of_rep_total
        from `tabInteraction` i
        where {" and ".join(conditions)}
        group by i.sales_person, hour(i.creation)
        order by i.sales_person, hour_of_day
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "sales_person", "label": "Sales person", "fieldtype": "Link", "options": "Sales Person", "width": 150},
        {"fieldname": "hour_of_day", "label": "Hour of day", "fieldtype": "Int", "width": 100},
        {"fieldname": "logged", "label": "Interactions logged", "fieldtype": "Int", "width": 150},
        {"fieldname": "pct_of_rep_total", "label": "% of rep total", "fieldtype": "Float", "width": 120},
    ]
    chart = _chart(data)
    return columns, data, None, chart


def _chart(data):
    hours = list(range(24))
    totals = {h: 0 for h in hours}
    for row in data:
        totals[row.hour_of_day] += row.logged
    return {
        "data": {
            "labels": [f"{h:02d}:00" for h in hours],
            "datasets": [{"name": "Logged", "values": [totals[h] for h in hours]}],
        },
        "type": "bar",
    }
