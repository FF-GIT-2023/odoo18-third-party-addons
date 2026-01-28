{
    'name': 'Backend Glassmorphism Theme',
    'summary': 'Glassmorphism-inspired backend look and feel',
    'category': 'Themes/Backend',
    'author': 'Hoang Minh Hieu',
    'version': '18.0.1.0.0',
    'license': 'LGPL-3',
    'depends': [
        'web',
    ],
    'data': [
    ],
    'assets': {
        'web.assets_backend': [
            (
                'before',
                'web/static/src/scss/primary_variables.scss',
                'web_theme_glassmorphism/static/src/scss/glass_variables.scss',
            ),
            'web_theme_glassmorphism/static/src/scss/glassmorphism.scss',
        ],
    },
    'images': ['static/description/main_screenshot.png'],
}
