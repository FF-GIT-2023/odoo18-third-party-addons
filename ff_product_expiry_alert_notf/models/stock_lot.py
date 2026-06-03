from datetime import datetime, timedelta

from odoo import api, models


class StockLot(models.Model):
    _inherit = "stock.lot"

    @api.onchange("expiration_date")
    def _onchange_expiration_date_set_alert_date(self):

        for rec in self:
            if rec.expiration_date:
                rec.alert_date = rec.expiration_date - timedelta(days=90)
            else:
                rec.alert_date = False

    def expiry_alert_mail_send(self):
        today = datetime.today()
        alert_date = today + timedelta(days=90)

        lots = self.search(
            [
                ("expiration_date", "!=", False),
                (
                    "expiration_date",
                    ">=",
                    alert_date.replace(hour=0, minute=0, second=0, microsecond=0),
                ),
                (
                    "expiration_date",
                    "<",
                    alert_date.replace(hour=0, minute=0, second=0, microsecond=0)
                    + timedelta(days=1),
                ),
                ("product_qty", ">", 0),
            ]
        )

        if not lots:
            return

        admin_user = self.env.ref("base.user_admin")

        product_lines = ""
        for lot in lots:
            product_lines += (
                "<p>"
                "<b>Product:</b> {}<br/>"
                "<b>Lot Number:</b> {}<br/>"
                "<b>Expiry Date:</b> {}"
                "</p><hr/>"
            ).format(
                lot.product_id.display_name,
                lot.name,
                lot.expiration_date.strftime("%d-%m-%Y"),
            )

        subject = "PRODUCT EXPIRY ALERT"

        body = (
            "<p>Dear {}<br/><br/>"
            "The following products are going to expire within <b>90 days</b>:</p>"
            "{}"
            "<br/>Kindly take necessary action.<br/><br/>"
            "Regards,<br/>"
            "Odoo System</p>"
        ).format(admin_user.name, product_lines)

        mail_values = {
            "subject": subject,
            "body_html": body,
            "email_to": admin_user.partner_id.email,
        }

        self.env["mail.mail"].sudo().create(mail_values).send()

    def expired_product_remove(self):
        for rec in self.search([]):
            if (rec.expiration_date.date() <= datetime.today().date()) and (rec.product_qty > 0):
                scrap_values = {
                    'product_id': rec.product_id.id,
                    'scrap_qty': rec.product_qty,
                    'lot_id': rec.id
                }
                scrap_obj = self.env['stock.scrap'].create([scrap_values])
                scrap_obj.action_validate()

