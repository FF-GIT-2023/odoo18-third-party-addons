/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this._boundKeyPressHandler = this._onKeyPress.bind(this);
        window.addEventListener("keydown", this._boundKeyPressHandler);
    },

    willUnmount() {
        super.willUnmount();
        window.removeEventListener("keydown", this._boundKeyPressHandler);
    },

    async _onKeyPress(event) {
        if (event.key === "Tab") {
            event.preventDefault();

            const order = this.pos.get_order();
            const orderline = order.get_selected_orderline();

            if (!orderline) {
                this.dialog.add(AlertDialog, {
                    title: _t("Empty Order"),
                    body: _t("Please add a product first."),
                });
                return;
            }

            try {
                const weight = await this.orm.call(
                    "scale.value",
                    "get_latest_weight",
                    [],
                    {}
                );

                console.log("Weight from RPC:", weight);

                if (weight && orderline) {
                    orderline.set_quantity(Number(parseFloat(weight).toFixed(3)));
                }

            } catch (err) {
                console.error("RPC Error:", err);
                this.dialog.add(AlertDialog, {
                    title: _t("Scale Error"),
                    body: _t("Unable to fetch weight from server."),
                });
            }
        }
    },
});