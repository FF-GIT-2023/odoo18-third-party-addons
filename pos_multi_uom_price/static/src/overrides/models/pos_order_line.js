import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { formatFloat, roundPrecision } from "@web/core/utils/numbers";

patch(PosOrderline.prototype, {
    setup() {
        super.setup(...arguments);

        this.product_uom_id = this.product_uom_id || this.product_id.uom_id;
        this.uom_base_qty = this.uom_base_qty || 1;

        const allLineToRefundUuids = this.models["pos.order"].reduce((acc, order) => {
            Object.assign(acc, order.uiState.lineToRefund);
            return acc;
        }, {});

        if (this.refunded_orderline_id?.uuid in allLineToRefundUuids) {
            this.product_uom_id = this.refunded_orderline_id.product_uom_id;
            this.uom_base_qty = this.refunded_orderline_id.uom_base_qty;
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
        return line;
    },

    export_as_JSON() {
        const json = super.export_as_JSON(...arguments);
        json.product_uom_id = this.product_uom_id?.id || null;
        json.uom_base_qty = this.uom_base_qty || 1;
        return json;
    },

    init_from_JSON(json) {
        super.init_from_JSON(...arguments);
        if (json.product_uom_id) {
            this.product_uom_id = this.pos.uoms_by_id[json.product_uom_id];
        }
        this.uom_base_qty = json.uom_base_qty || 1;
    },

    set_uom(uom_id) {
        this.product_uom_id = uom_id;
        this.setDirty();
    },
    get quantityStr() {
        let qtyStr = "";
        const unit = this.product_uom_id;

        if (unit) {
            if (unit.rounding) {
                const decimals = this.models["decimal.precision"].find(
                    (dp) => dp.name === "Product Unit of Measure"
                ).digits;
                qtyStr = formatFloat(this.qty, { digits: [69, decimals] });
            } else {
                qtyStr = this.qty.toFixed(0);
            }
        } else {
            qtyStr = "" + this.qty;
        }
        return qtyStr;
    },
    set_quantity(quantity, keep_price) {
        this.order_id.assert_editable();
        const quant =
            typeof quantity === "number"
                ? quantity
                : parseFloat("" + (quantity ? quantity : 0));

        const unit = this.product_uom_id;
        if (unit) {
            if (unit.rounding) {
                const decimals = this.models["decimal.precision"].find(
                    (dp) => dp.name === "Product Unit of Measure"
                ).digits;
                const rounding = Math.max(unit.rounding, Math.pow(10, -decimals));
                this.qty = roundPrecision(quant, rounding);
            } else {
                this.qty = roundPrecision(quant, 1);
            }
        } else {
            this.qty = quant;
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
    getDisplayData() {
        const vals = super.getDisplayData(...arguments);
        vals.unit = this.product_uom_id ? this.product_uom_id.name : "";
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
