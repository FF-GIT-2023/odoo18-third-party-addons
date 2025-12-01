from datetime import datetime, timedelta

from odoo import _, fields, models
from odoo.exceptions import UserError


class StockMovesReportWizard(models.TransientModel):
    _name = "product.expiry.report.wiz"
    _description = "Product Expiry Report Wizard"

    tracking_wise = fields.Selection(
        [
            ("tracking_wise", "Lot/Serial Wise"),
            ("product_wise", "Product Wise"),
            ("location_wise", "Location Wise"),
        ],
        string="Tracking",
        default="tracking_wise",
        required=True,
    )

    product_categ_ids = fields.Many2many(
        "product.category", string="Product Categories"
    )

    start_date = fields.Date(string="Start Date", default=fields.Date.today)
    end_date = fields.Date(string="End Date", default=fields.Date.today)

    expiry_days = fields.Integer("Within")

    expiry_type = fields.Selection(
        [("expired", "Expired"), ("expire", "Going to Expire")],
        string="Tracking Type",
        required=True,
    )

    company_ids = fields.Many2many(
        "res.company", string="Branches", default=lambda self: self.env.company
    )
    location_id = fields.Many2one(
        "stock.location", string="Location", check_company=True
    )
    # company_id = fields.Many2one(
    #     "res.company", string="Company", default=lambda self: self.env.company
    # )

    def generate_pdf_expiry_report(self):

        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise UserError(_("Start Date cannot be greater than End Date."))

        if self.expiry_days and self.expiry_days < 0:
            raise UserError(_("Please enter a non-negative number."))

        today_datetime = datetime.today()
        today_str = today_datetime.strftime("%Y-%m-%d %H:%M:%S")
        today_date = today_datetime.date()

        domain = []

        if self.product_categ_ids:
            domain.append(("product_id.categ_id", "in", self.product_categ_ids.ids))

        if self.start_date:
            domain.append(("expiration_date", ">=", self.start_date))

        if self.end_date:
            domain.append(("expiration_date", "<=", self.end_date))

        if self.location_id:
            lot_ids = (
                self.env["stock.quant"]
                .search([("location_id", "child_of", self.location_id.id)])
                .mapped("lot_id")
            )
            domain.append(("id", "in", lot_ids.ids))

        batch_data = self.env["stock.lot"].search(domain)

        if self.expiry_type == "expired":
            batch_data = batch_data.filtered(
                lambda l: str(l.expiration_date) <= today_str
            )
        else:
            batch_data = batch_data.filtered(
                lambda l: str(l.expiration_date) >= today_str
            )

        date_within = ""
        if self.expiry_days:
            if self.expiry_days:
                if self.expiry_type == "expired":
                    date_within = (
                        today_datetime - timedelta(days=int(self.expiry_days))
                    ).strftime("%d/%m/%Y %H:%M:%S")
                    batch_data = batch_data.filtered(
                        lambda l: str(date_within)
                        <= str(l.expiration_date)
                        <= str(today_str)
                    )
                else:
                    date_within = (
                        today_datetime + timedelta(days=int(self.expiry_days))
                    ).strftime("%d/%m/%Y %H:%M:%S")
                    batch_data = batch_data.filtered(
                        lambda l: str(today_str)
                        <= str(l.expiration_date)
                        <= str(date_within)
                    )

        batch_data = batch_data.filtered(lambda l: l.expiration_date)

        values = []
        heading = []

        for line in batch_data:
            expiry_date_str = (
                line.expiration_date.strftime("%d/%m/%Y")
                if line.expiration_date
                else ""
            )

            if line.product_qty == 0:
                expiry_days_value = "Nil"
            else:
                days_diff = (line.expiration_date.date() - today_date).days
                expiry_days_value = (
                    f"-{abs(days_diff)} Days"
                    if self.expiry_type == "expired"
                    else f"{abs(days_diff)} Days"
                )

            location_name = line.quant_ids[0].location_id.name if line.quant_ids else ""

            values.append(
                {
                    "lot_name": line.name,
                    "product": line.product_id.name,
                    "product_qty": line.product_qty,
                    "expiry_date": expiry_date_str,
                    "expiry_days": expiry_days_value,
                    "location": location_name,
                }
            )

            if self.tracking_wise == "product_wise":
                heading.append({"product": line.product_id.name})
            elif self.tracking_wise == "location_wise":
                heading.append({"location": location_name})

        heading = [i for n, i in enumerate(heading) if i not in heading[n + 1 :]]

        data_dict = {
            "values": values,
            "heading": heading,
            "view_type": self.tracking_wise,
            "expiry_type": self.expiry_type,
            "tracking_wise": self.tracking_wise,
            "today": today_str.split(" ")[0],
            "date_within": str(date_within).split(" ")[0] if date_within else "",
            "expiry_days": self.expiry_days,
            "start_date": self.start_date.strftime("%d/%m/%Y")
            if self.start_date
            else "",
            "end_date": self.end_date.strftime("%d/%m/%Y") if self.end_date else "",
            "categories": ", ".join(self.product_categ_ids.mapped("name")),
        }

        return self.env.ref(
            "ff_expiry_report.product_batch_report_action_report"
        ).report_action(self, data=data_dict)
