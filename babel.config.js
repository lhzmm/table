module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3,
        modules: false,
      },
    ],
    '@vue/babel-preset-jsx',
  ],
  plugins: [
    // [
    //     "import",
    //     {
    //         "libraryName": "element-ui",
    //         "libraryDirectory": "lib",
    //         "style": function(name){
    //             return 'element-ui/lib/theme-chalk/'+name.split('/').pop()+'.css'
    //         }
    //     },
    // ],
    [
      "@babel/plugin-transform-runtime",
      {
        // https://github.com/babel/babel/issues/10261#issue-472059280
        // https://github.com/babel/babel/issues/10261#issuecomment-514687857
        version: "^7.16.7",
      },
    ],
  ],
};
