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

        this._connectScale();
        this.latestWeight = null;
    },

    willUnmount() {
        super.willUnmount();
        window.removeEventListener("keydown", this._boundKeyPressHandler);

        if (this.scaleSocket) {
            this.scaleSocket.close();
        }
    },

    _connectScale() {
        try {
            this.scaleSocket = new WebSocket("wss://localhost:8765");

            this.scaleSocket.onopen = () => {
                console.log("Connected to scale");
            };

            this.scaleSocket.onmessage = (event) => {
                const weight = parseFloat(event.data);

                if (!isNaN(weight)) {
                    this.latestWeight = weight;
                    console.log("Weight received:", weight);
                }
            };

            this.scaleSocket.onclose = () => {
                console.warn("Scale disconnected. Reconnecting...");
                setTimeout(() => this._connectScale(), 2000);
            };

            this.scaleSocket.onerror = (err) => {
                console.error("WebSocket error:", err);
            };

        } catch (error) {
            console.error("Connection error:", error);
        }
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

            if (!this.latestWeight) {
                this.dialog.add(AlertDialog, {
                    title: _t("Scale Not Ready"),
                    body: _t("No weight received from scale."),
                });
                return;
            }

            const weight = Number(parseFloat(this.latestWeight).toFixed(3));

            console.log("Applying weight:", weight);

            if (orderline) {
                orderline.set_quantity(weight);
            } else {
                this.dialog.add(AlertDialog, {
                    title: _t("Invalid Product"),
                    body: _t("This product is not configured for weighing."),
                });
            }
        }
    },
});