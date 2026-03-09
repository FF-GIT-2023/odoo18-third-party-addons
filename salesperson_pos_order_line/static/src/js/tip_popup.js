/** @odoo-module **/

import { Dialog } from "@web/core/dialog/dialog";
import { Component, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";

export class TipPopup extends Component {
    static template = "salesperson_pos_order_line.TipPopup";
    static components = { Dialog };

    setup() {
        this.pos = usePos();
        const order = this.props.order;
        const lines = order.get_orderlines();
        const services = [];
        for (const line of lines) {
            services.push({
                line: line,
                product: line?.product_id.display_name || "",
                salesperson: line?.salesperson || "",
                user_id: line?.user_id || "",
                amount: "",
            });
        }
        this.state = useState({
            services: services,
        });
    }

    confirm() {
        const tips = this.state.services
            .filter((s) => s.amount && parseFloat(s.amount) > 0)
            .map((s) => ({
                line: s.line,
                amount: parseFloat(s.amount),
                salesperson: s.salesperson,
                user_id: s.user_id
            }));

        this.props.getPayload(tips);
        this.props.close();
    }
    cancel() {
        this.props.close();
    }
}