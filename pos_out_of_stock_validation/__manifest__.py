{
    "name": "POS Out of Stock Validation",
    "version": "18.0.1.0.0",
    "category": "Point of Sale",
    "summary": "Prevent selling products with zero stock in POS",

    "depends": [
        "point_of_sale",
        "stock",
    ],

    "data": [
        # "views/pos_assets.xml",
    ],

    "assets": {
        "point_of_sale._assets_pos": [
            "pos_out_of_stock_validation/static/src/js/pos_stock_validation.js",
        ],
    },

    "installable": True,
    "application": False,
    "license": "LGPL-3",
}