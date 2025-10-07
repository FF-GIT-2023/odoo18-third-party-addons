{
    "name": "Weighing Machine Integration",
    "version": "18.0.1.0.0",
    "summary": "Weighing Machine Integration",
    "category": "POS",
    "author": "ForeFront Technologies",
    "depends": ["base","point_of_sale"],
    "data": ["views/pos_config_views.xml"],
    "assets": {
        "point_of_sale._assets_pos":[
            "ff_weighing_machine_integration/static/src/js/*",
        ],
    },
    "license": "LGPL-3",
    "images": [],
    "installable": True,
    "auto_install": False,
    "application": True,
}
