import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";

patch(OrderReceipt.prototype, {

    get receiptBarcodeId() {
        return "barcode-" + this.props.data.name.replace(/\s+/g, "-");
    },

    get receiptBarcode(){
        const order = this.props.data;
        const barcode_val = order.name;
        const canvasId = `barcode-${order.name.replace(/\s+/g, "-")}`;
        const canvas = document.getElementById(canvasId);

        if (canvas && window.JsBarcode) {
            JsBarcode(canvas, barcode_val, {
                format: "CODE128",
                displayValue: true,
                height: 40,
                width: 1.2,
                margin: 5,
                fontSize: 12,
            });
        }
        return true;
    }
});