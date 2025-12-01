{
    "name": "Product Expiry Report",
    "version": "18.0",
    "summary": "Generates a detailed Lot and Serial Number Expiry based on their expiry details.",
    "category": "Inventory/Inventory",
    "author": "Forefront Technologies",
    "depends": ["base", "stock"],
    "data": [
        "security/ir.model.access.csv",
        "report/product_batch_report_reports.xml",
        "report/product_batch_report_templates.xml",
        "wizard/product_expiry_report_wiz_views.xml",
    ],
    "license": "LGPL-3",
    "installable": True,
    "auto_install": False,
    "application": False,
}
