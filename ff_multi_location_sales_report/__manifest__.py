{
    "name": "Multi-Location Sales Report",
    "version": "18.0.1.0.0",
    "summary": "Multi-Location Sales Report",
    "category": "Point Of Sale",
    "author": "ForeFront Technologies",
    "depends": [
        "base",
        "point_of_sale",
        "product",
        "hr",
        "hr_attendance"
    ],
    "data": [
        # "security/record_access.xml",
        "security/ir.model.access.csv",
        "report/multi_location_report.xml",
        "wizard/multi_location_report_wizard.xml",
        "views/product_template.xml",
        "views/product_category.xml",
        "views/hr_employee.xml",
    ],
    "license": "LGPL-3",
    "installable": True,
    "auto_install": False,
    "application": False,
}