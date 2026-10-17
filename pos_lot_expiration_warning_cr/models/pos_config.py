# -*- coding: utf-8 -*-
# Part of Odoo Module Developed by CandidRoot Solutions Pvt. Ltd.
# See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    lot_expiration_warning = fields.Boolean(
        string="Enable Lot Expiration Warning",
        default=True,
        help="Show a warning in POS when a selected lot or serial number is expired.",
    )

    def _load_pos_data_fields(self, config_id):
        fields = super()._load_pos_data_fields(config_id)
        if fields and "lot_expiration_warning" not in fields:
            fields.append("lot_expiration_warning")
        return fields
