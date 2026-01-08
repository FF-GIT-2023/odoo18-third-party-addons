# -*- coding: utf-8 -*-
# © 2025 ehuerta _at_ ixer.mx
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl-3.0.html).

from odoo import models, fields, api


class ProductTmplMultiUomPrice(models.Model):
    _name = 'product.tmpl.multi.uom.price'
    _description = 'Product Template Multiple UoM Price'

    product_tmpl_id = fields.Many2one(
        'product.template',
        required=True,
        ondelete='cascade',
        readonly=True
    )

    category_id = fields.Many2one(
        related='product_tmpl_id.uom_id.category_id',
        readonly=True
    )

    uom_id = fields.Many2one(
        'uom.uom',
        required=True,
        domain="[('category_id', '=', category_id)]"
    )

    price = fields.Float(
        string='Price',
        required=True,
        digits='Product Price'
    )

    base_uom_qty = fields.Float(
        string='UoM Quantity',
        required=True,
        help="How many base units this UoM represents"
    )

    _sql_constraints = [
        (
            'product_tmpl_uom_uniq',
            'unique(product_tmpl_id, uom_id)',
            'Each UoM must be unique per product template'
        )
    ]


    def _sync_price_to_variants(self):
        VariantUom = self.env['product.multi.uom.price']

        for rec in self:
            for variant in rec.product_tmpl_id.product_variant_ids:
                line = VariantUom.search([
                    ('product_id', '=', variant.id),
                    ('uom_id', '=', rec.uom_id.id)
                ], limit=1)

                vals = {
                    'product_id': variant.id,
                    'uom_id': rec.uom_id.id,
                    'price': rec.price,
                    'base_uom_qty': rec.base_uom_qty,
                }

                if line:
                    line.write(vals)
                else:
                    VariantUom.create(vals)

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        records._sync_price_to_variants()
        return records

    def write(self, vals):
        res = super().write(vals)
        self._sync_price_to_variants()
        return res



class ProductMultiUomPrice(models.Model):
    _name = 'product.multi.uom.price'
    _inherit = ['pos.load.mixin']
    _description = 'Product Variant Multiple UoM Price'

    product_id = fields.Many2one(
        'product.product',
        required=True,
        ondelete='cascade',
        readonly=True
    )

    category_id = fields.Many2one(
        related='product_id.uom_id.category_id',
        readonly=True
    )

    uom_id = fields.Many2one(
        'uom.uom',
        required=True,
        domain="[('category_id', '=', category_id)]"
    )

    price = fields.Float(
        string='Price',
        required=True,
        digits='Product Price'
    )

    base_uom_qty = fields.Float(
        string='UoM Quantity',
        required=True
    )

    _sql_constraints = [
        (
            'product_variant_uom_uniq',
            'unique(product_id, uom_id)',
            'Each UoM must be unique per product variant'
        )
    ]


    def _load_pos_self_data_fields(self, config_id):
        return [
            'id',
            'product_id',
            'uom_id',
            'price',
            'base_uom_qty'
        ]
