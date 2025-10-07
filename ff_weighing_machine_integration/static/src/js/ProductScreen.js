/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";


patch(ProductScreen.prototype, {
    setup() {
        super.setup();
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

            const posDeviceIp = this.pos.config.pos_device_ip || "192.168.1.58";
            console.log("posDeviceIp", posDeviceIp);
            try {
                const response = await fetch(`http://${posDeviceIp}:5000/weight`);
                const data = await response.json();

                if (data.weight && orderline) {
                    orderline.set_quantity(parseFloat(data.weight));
                }
            } catch (err) {
                console.error("Error fetching weight:", err);
                this.dialog.add(AlertDialog, {
                    title: _t("Scale Connection Error"),
                    body: _t(`Unable to connect to scale at ${posDeviceIp}`),
                });
            }
        }
    },
});
