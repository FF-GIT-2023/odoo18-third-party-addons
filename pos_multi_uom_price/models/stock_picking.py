# -*- coding: utf-8 -*-
# © 2025 ehuerta _at_ ixer.mx
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl-3.0.html).

import logging

from odoo import models, fields, api, _
from itertools import groupby
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

class StockMove(models.Model):
    _inherit = 'stock.move'

    def _add_mls_related_to_order(self, related_order_lines, are_qties_done=True):
        lines_data = self._prepare_lines_data_dict(related_order_lines)
        moves_to_assign = self.filtered(lambda m: m.product_id.id not in lines_data or m.product_id.tracking == 'none'
                                                  or (not m.picking_type_id.use_existing_lots and not m.picking_type_id.use_create_lots))

        uoms_with_issues = set()
        for move in moves_to_assign.filtered(lambda m: m.product_uom_qty and m.product_uom != m.product_id.uom_id):
            converted_qty = move.product_uom._compute_quantity(
                move.product_uom_qty,
                move.product_id.uom_id,
                rounding_method='HALF-UP'
            )
            if not converted_qty:
                uoms_with_issues.add(
                    (move.product_uom.name, move.product_id.uom_id.name)
                )

        if uoms_with_issues:
            error_message_lines = [
                _("Conversion Error: The following unit of measure conversions result in a zero quantity due to rounding:")
            ]
            for uom_from, uom_to in uoms_with_issues:
                error_message_lines.append(_(' - From "%(uom_from)s" to "%(uom_to)s"', uom_from=uom_from, uom_to=uom_to))

            error_message_lines.append(
                _("\nThis issue occurs because the quantity becomes zero after rounding during the conversion. "
                "To fix this, adjust the conversion factors or rounding method to ensure that even the smallest quantity in the original unit "
                "does not round down to zero in the target unit.")
            )

            raise UserError('\n'.join(error_message_lines))

        for move in moves_to_assign:
            move.quantity = move.product_uom_qty
        moves_remaining = self - moves_to_assign
        existing_lots = moves_remaining._create_production_lots_for_pos_order(related_order_lines)
        move_lines_to_create = []
        mls_qties = []
        if are_qties_done:
            for move in moves_remaining:
                move.move_line_ids.unlink()
                for line in lines_data[move.product_id.id]['order_lines']:
                    sum_of_lots = 0
                    for lot in line.pack_lot_ids.filtered(lambda l: l.lot_name):
                        if line.product_id.tracking == 'serial':
                            qty = 1
                        else:
                            qty =  line.qty * abs(line.uom_base_qty) if line.uom_base_qty else line.qty
                        ml_vals = dict(move._prepare_move_line_vals(qty))
                        if existing_lots:
                            existing_lot = existing_lots.filtered_domain([('product_id', '=', line.product_id.id), ('name', '=', lot.lot_name)])
                            quant = self.env['stock.quant']
                            if existing_lot:
                                quant = self.env['stock.quant'].search(
                                    [('lot_id', '=', existing_lot.id), ('quantity', '>', '0.0'), ('location_id', 'child_of', move.location_id.id)],
                                    order='id desc',
                                    limit=1
                                )
                                if quant:
                                    ml_vals.update({
                                        'quant_id': quant.id,
                                    })
                                else:
                                    ml_vals.update({
                                        'lot_name': existing_lot.name,
                                        'lot_id': existing_lot.id,
                                    })
                        else:
                            ml_vals.update({'lot_name': lot.lot_name})
                        move_lines_to_create.append(ml_vals)
                        mls_qties.append(qty)
                        sum_of_lots += qty
            self.env['stock.move.line'].create(move_lines_to_create)
        else:
            for move in moves_remaining:
                for line in lines_data[move.product_id.id]['order_lines']:
                    for lot in line.pack_lot_ids.filtered(lambda l: l.lot_name):
                        if line.product_id.tracking == 'serial':
                            qty = 1
                        else:
                            qty = line.qty * abs(line.uom_base_qty) if line.uom_base_qty else line.qty
                        if existing_lots:
                            existing_lot = existing_lots.filtered_domain([('product_id', '=', line.product_id.id), ('name', '=', lot.lot_name)])
                            if existing_lot:
                                move._update_reserved_quantity(qty, move.location_id, lot_id=existing_lot)
                                continue


class StockPicking(models.Model):
    _inherit='stock.picking'

    def _prepare_stock_move_vals(self, first_line, order_lines):
        res = super()._prepare_stock_move_vals(first_line, order_lines)

        base_uom = order_lines.product_uom_id.id
        qty = sum(order_lines.mapped('qty'))

        res.update({
            'product_uom': base_uom,
            'product_uom_qty': qty,
        })
        return res

    def _create_move_from_pos_order_lines(self, lines):
        self.ensure_one()
        lines_by_product = groupby(sorted(lines, key=lambda l: (l.product_id.id,l.product_uom_id.id)), key=lambda l: (l.product_id.id,l.product_uom_id.id))
        move_vals = []
        for dummy, olines in lines_by_product:
            order_lines = self.env['pos.order.line'].concat(*olines)
            move_vals.append(self._prepare_stock_move_vals(order_lines[0], order_lines))
        moves = self.env['stock.move'].create(move_vals)
        confirmed_moves = moves._action_confirm()
        confirmed_moves._add_mls_related_to_order(lines, are_qties_done=True)
        confirmed_moves.picked = True
        self._link_owner_on_return_picking(lines)