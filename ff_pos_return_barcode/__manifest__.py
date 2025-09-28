{
    'name': 'Pos Return Barcode',
    'version': '18.0.1.0.0',
    'category': 'Point of Sale',
    'summary': 'Module to show the barcode in pos receipt',
    'description': 'This module helps to add a barcode in pos receipt for return',
    'author': 'ForeFront Technologies',
    'company': 'ForeFront Technologies',
    'maintainer': 'ForeFront Technologies',
    'depends': ['base', 'point_of_sale'],
    'assets': {
        'point_of_sale._assets_pos': [
            'ff_pos_return_barcode/static/src/xml/pos_receipt.xml',
            'ff_pos_return_barcode/static/src/js/pos_receipt.js',
        ],
    },
    'images': ['static/description/banner.jpg'],
    'license': 'LGPL-3',
    'installable': True,
    'auto_install': False
}
