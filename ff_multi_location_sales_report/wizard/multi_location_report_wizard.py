from datetime import datetime, time

import pytz
from odoo import _, api, fields, models
from odoo.exceptions import UserError


class MultiLocationSalesReport(models.TransientModel):
    _name = "multi.location.report"
    _description = "Multi Location Sales Report"

    company_ids = fields.Many2many("res.company", string="Select Location")
    start_date = fields.Date(default=fields.Date.today)
    end_date = fields.Date(default=fields.Date.today)
    all_location = fields.Boolean(string="All Location", default=False)

    @api.onchange("all_location")
    def _onchange_all_location(self):
        if self.all_location:
            self.company_ids = self.env["res.company"].search([])
        else:
            self.company_ids = [(6, 0, [self.env.company.id])]

    def get_employee_attendance(self, employee, start_date, end_date):
        attendance_records = self.env["hr.attendance"].search(
            [
                ("employee_id", "=", employee.id),
                ("employee_id.is_super_user", "=", False),
                ("check_in", ">=", start_date),
                ("check_in", "<=", end_date),
            ]
        )

        hours_list = [record.worked_hours for record in attendance_records]
        return sum(hours_list)

    def get_report(self):
        title = "Multi-Location Sales Report"
        data = {}
        grand_totals = {}
        symbol = self.env.user.currency_id.symbol
        domain = []

        company_ids = self.company_ids.ids
        employees = self.env["hr.employee"].search([("company_id", "in", company_ids)])
        company_work_hours = {company.id: 0 for company in self.company_ids}

        user_tz = pytz.timezone(self.env.user.tz or "UTC")
        local_start_datetime = user_tz.localize(
            datetime.combine(fields.Date.from_string(self.start_date), time.min)
        )
        local_end_datetime = user_tz.localize(
            datetime.combine(fields.Date.from_string(self.end_date), time.max)
        )
        date_from = local_start_datetime.astimezone(pytz.UTC).replace(tzinfo=None)
        date_to = local_end_datetime.astimezone(pytz.UTC).replace(tzinfo=None)
        for employee in employees:
            total_worked_hours = self.get_employee_attendance(
                employee, local_start_datetime, local_end_datetime
            )
            company_work_hours[employee.company_id.id] += total_worked_hours

        for company_id, total_worked_hours in company_work_hours.items():
            hours = int(total_worked_hours)
            minutes = int((total_worked_hours - hours) * 60)
            company_work_hours[company_id] = f"{hours}.{minutes}"

        if self.company_ids:
            domain = [("company_id", "in", company_ids)]
        domain += [
            ("date", ">=", date_from),
            ("date", "<=", date_to),
        ]
        pos_order_lines = self.env["report.pos.order"].search(domain)

        tip_template_id = self.env["product.template"].search(
            [("report_bool", "=", "tip")], limit=1
        )

        discount_template_id = self.env["product.template"].search(
            [("report_bool", "=", "discount")], limit=1
        )
        product_category_ids = self.env["product.category"].search(
            [("report_category_bool", "=", True)]
        )

        service_category_ids = self.env["product.category"].search(
            [("is_service", "=", True)]
        )
        category_products_ids = self.env["product.category"].search(
            [("report_category", "=", "product")]
        )

        category_rent_id = self.env["product.category"].search(
            [("report_category", "=", "rent")], limit=1
        )

        category_gift_card_id = self.env["product.category"].search(
            [("report_category", "=", "gift_cards")], limit=1
        )

        category_service_deposit_id = self.env["product.category"].search(
            [("report_category", "=", "service_deposit")], limit=1
        )

        all_categories = set()
        rent_categ_name = category_rent_id.name
        for company in self.company_ids:
            company_data = {"no_of_customers": 0}
            company_pos_order_lines = pos_order_lines.filtered(
                lambda line: line.company_id == company
            )

            cancelled = len(
                company_pos_order_lines.filtered(
                    lambda line: line.order_id.state == "cancel"
                )
            )

            total_tip = -abs(
                sum(
                    company_pos_order_lines.filtered(
                        lambda s: s.product_id.product_tmpl_id.id == tip_template_id.id
                    ).mapped("price_total")
                )
            )

            total_rent = -abs(
                sum(
                    company_pos_order_lines.filtered(
                        lambda s: s.product_categ_id.id == category_rent_id.id
                    ).mapped("price_total")
                )
            )

            total_gift_card = -abs(
                sum(
                    company_pos_order_lines.filtered(
                        lambda s: s.product_categ_id.id == category_gift_card_id.id
                    ).mapped("price_total")
                )
            )

            total_service_deposit = -abs(round(
                sum(
                    company_pos_order_lines.filtered(
                        lambda s: s.product_categ_id.id
                        == category_service_deposit_id.id
                    ).mapped("price_total")
                ),
                2,
            ))

            total_global_disc = round(
                sum(
                    company_pos_order_lines.filtered(
                        lambda s: s.product_id.product_tmpl_id.id
                        == discount_template_id.id
                    ).mapped("price_total")
                ),
                2,
            )
            total_price = abs(sum(company_pos_order_lines.mapped("price_total")))
            product_wi_tax = sum(
                company_pos_order_lines.filtered(
                    lambda s: s.product_id.categ_id.id in category_products_ids.ids
                ).mapped("price_total")
            )
            total_tax_amount = sum(
                company_pos_order_lines.order_id.mapped("amount_tax")
            )
            line_count = len(company_pos_order_lines)
            company_pos_order_ids = len(company_pos_order_lines.mapped("order_id"))
            total_discount = sum(company_pos_order_lines.mapped("total_discount"))
            company_data["no_of_customers"] = company_pos_order_ids
            company_data["line_count"] = line_count
            company_data["cancelled"] = cancelled
            company_data["worked_hours"] = company_work_hours[company.id]
            company_data["total_tip"] = abs(total_tip)
            company_data["total_discount"] = total_discount + abs(total_global_disc)
            company_data["product_wi_tax"] = product_wi_tax
            company_data["total_tax_amount"] = round(total_tax_amount, 2)
            company_data["total_rent"] = 0
            total_sales = (
                total_price
                + total_rent
                + total_gift_card
                + total_service_deposit
                + total_tip
                + -abs(total_tax_amount)
                + -abs(total_discount)
                + -abs(total_global_disc)
            )
            total_service = 0.0
            product_sales = 0.0
            for pos_line in company_pos_order_lines:
                product_categ_id = pos_line.product_id.categ_id
                category_name = product_categ_id.name
                amount = pos_line.price_total
                if product_categ_id.id in product_category_ids.ids:
                    if category_name != rent_categ_name:
                        all_categories.add(category_name)
                if product_categ_id:
                    if product_categ_id.id in service_category_ids.ids:
                        total_service += amount
                    if product_categ_id.id in category_products_ids.ids:
                        product_sales += amount
                    if category_name == rent_categ_name:
                        company_data["total_rent"] += amount
                    else:
                        if category_name not in company_data:
                            company_data[category_name] = {
                                "amount": amount,
                            }
                        else:
                            company_data[category_name]["amount"] += amount

                    if category_name not in grand_totals:
                        grand_totals[category_name] = 0.0
                    grand_totals[category_name] += amount
            company_data["total_service"] = total_service
            company_data["product_sales"] = product_sales
            company_data["total_price"] = total_price
            company_data["total_sales"] = total_sales
            worked_hours_float = float(company_data["worked_hours"])
            company_data["total_php"] = round(
                (total_service + product_sales) / worked_hours_float
                if worked_hours_float
                else 0.00,
                2,
            )
            data[company.name] = company_data
        if not pos_order_lines:
            raise UserError(_("No Records Found....!!!"))

        all_categories = sorted(all_categories)
        return self.env.ref(
            "ff_multi_location_sales_report.multi_location_sales_report_id"
        ).report_action(
            self,
            data={
                "title": title,
                "start_date": self.start_date.strftime('%d-%m-%Y'),
                "end_date": self.end_date.strftime('%d-%m-%Y'),
                "symbol": symbol,
                "data": data,
                "categories": all_categories,
                "grand_totals": grand_totals,
            },
        )
