module.exports = {
    "presets": [
        [
            "@babel/preset-env",
            {
                "useBuiltIns": "usage",
                "corejs": 2,
                "modules":false
            }
        ],
        '@vue/babel-preset-jsx',
    ],
    plugins:[
        [
            "import",
            {
                "libraryName": "element-ui",
                "libraryDirectory": "lib",
                "style": function(name){
                    return 'element-ui/lib/theme-chalk/'+name.split('/').pop()+'.css'
                }
            },
        ],
    ]
}