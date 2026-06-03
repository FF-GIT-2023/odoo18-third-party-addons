{
    "name": "Product Expiry Alert Notification",
    "version": "1.0",
    "category": "Inventory",
    "summary": "Auto alert mail before product expiry",
    "description": """
Automatically sends alert email to admin
when product lot expiry date is 3 months away.
""",
    "author": "Your Company",
    "depends": ["stock", "mail"],
    "data": [
        "security/ir.model.access.csv",
        "data/cron.xml",
    ],
    "installable": True,
    "application": False,
}
