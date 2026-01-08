/** @odoo-module */
import {PosOrder} from "@point_of_sale/app/models/pos_order";
import {patch} from "@web/core/utils/patch";
patch(PosOrder.prototype, {
  export_for_printing() {
    const result = super.export_for_printing(...arguments);
    if (this.get_partner()) {
      result.headerData.partner = this.get_partner();
    }
    return result;
  },
});
