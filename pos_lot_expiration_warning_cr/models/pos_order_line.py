# -*- coding: utf-8 -*-
# Part of Odoo Module Developed by CandidRoot Solutions Pvt. Ltd.
# See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    @api.model
    def get_existing_lots(self, company_id, product_id):
        lots = super().get_existing_lots(company_id, product_id)
        if not lots:
            return lots

        lot_records = self.env["stock.lot"].sudo().browse([lot["id"] for lot in lots]).exists()
        expiration_by_lot_id = {
            lot.id: lot.expiration_date
            for lot in lot_records
        }
        for lot in lots:
            expiration_date = expiration_by_lot_id.get(lot["id"])
            lot["expiration_date"] = self._format_lot_expiration_date(expiration_date)
        return lots

    @api.model
    def get_lot_expiration_warning_data(self, company_id, product_id, lot_names):
        if not lot_names:
            return []

        lots = self.env["stock.lot"].sudo().search([
            ("name", "in", lot_names),
            ("product_id", "=", product_id),
            "|",
            ("company_id", "=", False),
            ("company_id", "=", company_id),
        ])
        result = [
            {
                "id": lot.id,
                "name": lot.name,
                "expiration_date": self._format_lot_expiration_date(lot.expiration_date),
            }
            for lot in lots
        ]
        return result

    def _format_lot_expiration_date(self, expiration_date):
        if not expiration_date:
            return False
        return fields.Datetime.context_timestamp(self, expiration_date).isoformat()
