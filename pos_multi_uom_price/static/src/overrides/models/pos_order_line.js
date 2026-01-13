/** © 2025 ehuerta _at_ ixer.mx */

import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { formatFloat, roundPrecision } from "@web/core/utils/numbers";

patch(PosOrderline.prototype, {
    setup() {
        super.setup(...arguments);

        this.product_uom_id = this.product_uom_id || this.product_id.uom_id;
        this.uom_base_qty = this.uom_base_qty || 1;
        this._is_price_manually_set = this._is_price_manually_set || false;

        const allRefunds = this.models["pos.order"].reduce((acc, o) => {
            Object.assign(acc, o.uiState.lineToRefund);
            return acc;
        }, {});

        if (this.refunded_orderline_id?.uuid in allRefunds) {
            this.product_uom_id = this.refunded_orderline_id.product_uom_id;
            this.uom_base_qty = this.refunded_orderline_id.uom_base_qty;
            this._is_price_manually_set = true;
            this.price_type = "manual";
        }
    },

    can_be_merged_with(otherLine) {
        if (
            this.product_uom_id?.id !== otherLine.product_uom_id?.id ||
            this.uom_base_qty !== otherLine.uom_base_qty
        ) {
            return false;
        }
        return super.can_be_merged_with(otherLine);
    },

    clone() {
        const line = super.clone(...arguments);
        line.product_uom_id = this.product_uom_id;
        line.uom_base_qty = this.uom_base_qty;
        line._is_price_manually_set = this._is_price_manually_set;
        line.price_type = this.price_type;
        return line;
    },

    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        json.product_uom_id = this.product_uom_id?.id || null;
        json.uom_base_qty = this.uom_base_qty || 1;
        json.is_price_manually_set = this._is_price_manually_set || false;
        return json;
    },

    init_from_JSON(json) {
        super.init_from_JSON(...arguments);

        if (json.product_uom_id) {
            this.product_uom_id = this.pos.uoms_by_id[json.product_uom_id];
        }
        this.uom_base_qty = json.uom_base_qty || 1;
        this._is_price_manually_set = json.is_price_manually_set || false;

        if (this._is_price_manually_set) {
            this.price_type = "manual";
        }
    },

    set_uom(uom_id) {
        this.product_uom_id = uom_id;
        this.price_type = "manual";
        this._is_price_manually_set = true;
        this.setDirty();
    },

    set_quantity(quantity, keep_price) {
        this.order_id.assert_editable();
        const quant = typeof quantity === "number"
            ? quantity
            : parseFloat(quantity || 0);

        const unit = this.product_uom_id;
        if (unit?.rounding) {
            const decimals = this.models["decimal.precision"]
                .find(dp => dp.name === "Product Unit of Measure").digits;
            const rounding = Math.max(unit.rounding, Math.pow(10, -decimals));
            this.qty = roundPrecision(quant, rounding);
        } else {
            this.qty = roundPrecision(quant, 1);
        }

        if (
            !keep_price &&
            this.price_type === "original" &&
            !this._is_price_manually_set
        ) {
            this.set_unit_price(
                this.product_id.get_price(
                    this.order_id.pricelist_id,
                    this.get_quantity(),
                    this.get_price_extra()
                )
            );
        }

        this.setDirty();
        return true;
    },

    get quantityStr() {
        const unit = this.product_uom_id;
        if (!unit) return "" + this.qty;

        if (unit.rounding) {
            const decimals = this.models["decimal.precision"]
                .find(dp => dp.name === "Product Unit of Measure").digits;
            return formatFloat(this.qty, { digits: [69, decimals] });
        }
        return this.qty.toFixed(0);
    },

    getDisplayData() {
        const vals = super.getDisplayData(...arguments);
        vals.unit = this.product_uom_id?.name || "";
        return vals;
    },

    get_unit() {
        return this.product_uom_id;
    },

    is_pos_groupable() {
        return (
            this.product_uom_id?.is_pos_groupable &&
            !this.isPartOfCombo()
        );
    },
});
