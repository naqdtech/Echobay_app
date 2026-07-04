"""Development seed data. NEVER run on the production site.

    bench --site <dev-site> execute nec_crm.demo.make_demo

Creates: a Kerala South territory tree, 3 reps (users + sales persons +
territory user permissions), 13 customers, 2 leads, ~6 weeks of
interactions with a deliberate "coasting on favourites" pattern for one
rep (so the Silence report has something to show), and a handful of ToDos.
Idempotent: existing records are left alone.
"""

import random

import frappe
from frappe.utils import add_days, add_to_date, get_datetime, nowdate

from nec_crm.install import setup_rep

REPS = [
    # (first_name, email, territory)
    ("Habeeb", "habeeb@nec.local", "Kochi Region"),
    ("Arshed", "arshed@nec.local", "Kozhikode Region"),
    ("Faisal", "faisal@nec.local", "Trivandrum Region"),
]

TERRITORY_TREE = {
    "Kerala South": {
        "Kochi Region": ["Kochi", "Ernakulam", "Aluva", "Thrissur"],
        "Kozhikode Region": ["Kozhikode", "Malappuram", "Kannur", "Palakkad", "Kasaragod"],
        "Trivandrum Region": ["Trivandrum", "Kollam", "Alappuzha", "Kottayam"],
    }
}

CUSTOMERS = [
    ("Rahim Traders", "Kochi", "Only pays after 25th. Owner: Rahim, brother Ashraf handles payments."),
    ("Zain Mobile World", "Kozhikode", "Prefers WhatsApp. Big mover of tempered glass."),
    ("Al Ameen Mobiles", "Malappuram", ""),
    ("Faisal Enterprises", "Thrissur", "Asks for credit — clear with Mumbai first."),
    ("SS Mobile Accessories", "Kannur", ""),
    ("Green Mobile Point", "Palakkad", ""),
    ("New Star Mobiles", "Kollam", "Best time to visit: after 11am."),
    ("Royal Communication", "Trivandrum", ""),
    ("Meera Mobiles", "Alappuzha", ""),
    ("Sky Communication", "Kottayam", ""),
    ("Millennium Mobile", "Kasaragod", ""),
    ("ABC Mobile Point", "Ernakulam", ""),
    ("Digital World", "Aluva", ""),
]

LEADS = [
    ("Star Cell Point", "Kochi", "Suhail"),
    ("Mobile Junction", "Kozhikode", "Anas"),
]

NOTES = [
    "Discussed new AirPods case stock. Wants price list for the next China shipment.",
    "Follow-up on pending order. Asked about cable combo offers.",
    "Visited shop. Displayed our tempered glass stand. Owner happy with sell-through.",
    "Payment reminder. Promised to clear dues by Friday.",
    "Shared catalogue on WhatsApp. Interested in 20W chargers.",
    "Quick call. No requirement this week, restocking after Vishu rush.",
    "Introduced new case designs. Took photos of shelf space.",
    "Asked about return policy for slow-moving colour variants.",
]


def make_demo():
    frappe.flags.in_import = True  # relax mandatory checks like Lead naming series quirks
    _territories()
    _reps()
    _customers()
    _leads()
    _interactions()
    _todos()
    frappe.db.commit()
    print("Demo data ready. Log in as habeeb@nec.local / nec@12345 (or arshed/faisal).")


def _territories():
    def ensure(name, parent, is_group):
        if frappe.db.exists("Territory", name):
            return
        frappe.get_doc(
            {
                "doctype": "Territory",
                "territory_name": name,
                "parent_territory": parent,
                "is_group": is_group,
            }
        ).insert(ignore_permissions=True)

    root = frappe.db.get_value("Territory", {"parent_territory": ["in", ["", None]]}) or "All Territories"
    for zone, regions in TERRITORY_TREE.items():
        ensure(zone, root, 1)
        for region, cities in regions.items():
            ensure(region, zone, 1)
            for city in cities:
                ensure(city, region, 0)


def _reps():
    parent_sp = "Sales Team"
    if not frappe.db.exists("Sales Person", parent_sp):
        frappe.get_doc(
            {"doctype": "Sales Person", "sales_person_name": parent_sp, "is_group": 1}
        ).insert(ignore_permissions=True)

    for first_name, email, territory in REPS:
        if not frappe.db.exists("User", email):
            user = frappe.get_doc(
                {
                    "doctype": "User",
                    "email": email,
                    "first_name": first_name,
                    "send_welcome_email": 0,
                    "new_password": "nec@12345",
                    "mobile_no": f"91{random.randint(7000000000, 9999999999)}",
                }
            )
            user.insert(ignore_permissions=True)

        if not frappe.db.exists("Sales Person", first_name):
            frappe.get_doc(
                {
                    "doctype": "Sales Person",
                    "sales_person_name": first_name,
                    "parent_sales_person": parent_sp,
                    "is_group": 0,
                    "user": email,
                }
            ).insert(ignore_permissions=True)

        frappe.db.set_value("Territory", territory, "territory_manager", first_name)
        setup_rep(email, territory, first_name)


def _region_of(city: str) -> str:
    for regions in TERRITORY_TREE.values():
        for region, cities in regions.items():
            if city in cities:
                return region
    return city


def _default_customer_group():
    """A non-group Customer Group — ERPNext rejects group nodes on a Customer."""
    default = frappe.db.get_single_value("Selling Settings", "customer_group")
    if default and not frappe.db.get_value("Customer Group", default, "is_group"):
        return default
    leaf = frappe.db.get_value("Customer Group", {"is_group": 0}, "name")
    if leaf:
        return leaf
    parent = frappe.db.get_value("Customer Group", {"is_group": 1}, "name") or "All Customer Groups"
    return frappe.get_doc(
        {
            "doctype": "Customer Group",
            "customer_group_name": "Retail Shops",
            "parent_customer_group": parent,
            "is_group": 0,
        }
    ).insert(ignore_permissions=True).name


def _customers():
    customer_group = _default_customer_group()
    for name, city, notes in CUSTOMERS:
        if frappe.db.exists("Customer", {"customer_name": name}):
            continue
        frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": name,
                "customer_type": "Company",
                "customer_group": customer_group,
                "territory": city,
                "sales_notes": notes,
            }
        ).insert(ignore_permissions=True)


def _leads():
    for company, city, contact in LEADS:
        if frappe.db.exists("Lead", {"company_name": company}):
            continue
        rep_user = _rep_user_for_city(city)
        lead = frappe.get_doc(
            {
                "doctype": "Lead",
                "first_name": contact,
                "company_name": company,
                "territory": city,
                "status": "Open",
            }
        )
        lead.insert(ignore_permissions=True)
        if rep_user:
            frappe.db.set_value("Lead", lead.name, "owner", rep_user, update_modified=False)


def _rep_user_for_city(city: str):
    region = _region_of(city)
    for _, email, territory in REPS:
        if territory == region:
            return email
    return None


def _interactions():
    if frappe.db.count("Interaction") > 0:
        return

    customers = frappe.get_all(
        "Customer", filters={"disabled": 0}, fields=["name", "customer_name", "territory"]
    )
    channels = ["Call", "WhatsApp", "In-person"]

    for cust in customers:
        region = _region_of(cust.territory)
        rep = next((r[0] for r in REPS if r[2] == region), None)
        rep_user = next((r[1] for r in REPS if r[2] == region), None)
        if not rep:
            continue

        # Habeeb "coasts on favourites": his first 2 customers get lots of
        # touches, the rest go silent — feeds the Silence report demo.
        favourite = rep == "Habeeb" and cust.customer_name in ("Rahim Traders", "Zain Mobile World")
        neglected = rep == "Habeeb" and not favourite
        touches = random.randint(8, 14) if favourite else (random.randint(0, 1) if neglected else random.randint(2, 6))
        max_age_days = 10 if favourite else (45 if neglected else 30)

        for _ in range(touches):
            days_ago = random.randint(0 if favourite else 3, max_age_days)
            dt = add_to_date(
                get_datetime(f"{add_days(nowdate(), -days_ago)} 10:00:00"),
                hours=random.randint(0, 9),
                minutes=random.randint(0, 59),
            )
            doc = frappe.get_doc(
                {
                    "doctype": "Interaction",
                    "sales_person": rep,
                    "territory": cust.territory,
                    "party_type": "Customer",
                    "party": cust.name,
                    "channel": random.choice(channels),
                    "notes": random.choice(NOTES),
                    "interaction_datetime": dt,
                    "sentiment": random.choice(["Positive", "Neutral", "Neutral", "", ""]),
                }
            )
            doc.flags.ignore_permissions = True
            doc.insert()
            # make creation/audit trail realistic (insert stamps "now")
            frappe.db.set_value(
                "Interaction", doc.name, "creation",
                add_to_date(dt, minutes=random.randint(2, 240)),
                update_modified=False,
            )
            frappe.db.set_value("Interaction", doc.name, "owner", rep_user, update_modified=False)


def _todos():
    if frappe.db.count("ToDo", {"description": ["like", "%NEC demo%"]}) > 0:
        return
    samples = [
        ("Collect payment from Rahim Traders (NEC demo)", -2, "High"),
        ("Drop new catalogue at Zain Mobile World (NEC demo)", 0, "Medium"),
        ("Visit Al Ameen Mobiles — new case designs (NEC demo)", 0, "Medium"),
        ("Call Star Cell Point about first order (NEC demo)", 2, "High"),
        ("Check shelf display at Green Mobile Point (NEC demo)", 5, "Low"),
    ]
    manager = "Administrator"
    for i, (desc, offset, priority) in enumerate(samples):
        rep_user = REPS[i % len(REPS)][1]
        frappe.get_doc(
            {
                "doctype": "ToDo",
                "allocated_to": rep_user,
                "assigned_by": manager if i % 2 == 0 else rep_user,
                "description": desc,
                "date": add_days(nowdate(), offset),
                "priority": priority,
                "status": "Open",
            }
        ).insert(ignore_permissions=True)
