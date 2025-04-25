const path = require("path");
const rollup = require("rollup");
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const vuePlugin = require("rollup-plugin-vue");
const { babel } = require("@rollup/plugin-babel");
const postcss = require("rollup-plugin-postcss");
const commonjs = require("@rollup/plugin-commonjs");
// const less = require('rollup-plugin-less');
const copy = require('rollup-plugin-copy');
const autoprefixer = require("autoprefixer");

function resolve(relativePath) {
  return path.resolve(__dirname, relativePath);
}

const entries = [
  {
    moduleDir:'module',
    libDir:'lib',
    entry:'./src/output/all.js'
  },
  {
    moduleDir:'module/AutoScrollTable',
    libDir:'lib/AutoScrollTable',
    entry:'./src/output/AutoScrollTable.js'
  },
  {
    moduleDir:'module/ClassicTable',
    libDir:'lib/ClassicTable',
    entry:'./src/output/ClassicTable.js'
  },
];

function getInputOptions(input) {
  return {
    external: (id, parentId, isResolved) => {
      // console.log(id, '|', parentId, '|', isResolved)
      // const externals=['@babel/runtime','lodash','core-js','vue-runtime-helpers']
      const externals=['@babel/runtime','lodash','core-js']
      if(externals.find(external=>id.includes(external))||/^vue$/.test(id)) return true
      return false
    },
    input:input.entry,
    plugins: [
      copy({
        targets: [
          { src: 'src/assets', dest: input.moduleDir },
          { src: 'src/style.less', dest: input.moduleDir },
          { src: 'src/assets', dest: input.libDir },
          { src: 'src/style.less', dest: input.libDir },
        ]
      }),
      // 顺序很重要！！！！！
      nodeResolve({
        extensions: [".mjs", ".js", ".json", ".node", ".vue"],
      }),
      // 解析vue sfc
      vuePlugin({ target: "browser", css: false }),
      // 处理style部分的代码
      postcss({
        extract: true,
        // extract: resolve("pkg/style.css"),
        extensions: [".css", ".scss", ".less"],
        plugins: [autoprefixer],
      }),
      // 处理剩余js代码
      babel({
        babelHelpers: "runtime",
        extensions: [".vue", ".js"],
        exclude: "node_modules/**",
      }),
      // 处理esm模块类型下的commonjs类型模块（按需加载依赖的插件会混合使用import(css)和require(js)）
      commonjs({ transformMixedEsModules: true }),
    ],
  };
}
const getEsmOutputOptions = (input)=>({
  dir: resolve(input.moduleDir),
  entryFileNames: "index.[format].js",
  chunkFileNames: "index.[format].js",
  sourcemap: true,
  format: "es",
});

const getLibOutputOptions = (input)=>({
  // 统一输出一个命名空间，增强npm包的扩展性，module.exports=fn1 -> not good，module.exports={fn1} -> good,
  exports:'named', 
  dir: resolve(input.libDir),
  entryFileNames: "index.[format].js",
  chunkFileNames: "index.[format].js",
  sourcemap: true,
  format: "cjs",
});

async function build() {
  for (let i = 0; i < entries.length; i++) {
    const input = entries[i];
    // const absolutePath = resolve(entry);
    const bundle = await rollup.rollup(getInputOptions(input));
    await bundle.write(getEsmOutputOptions(input));
    await bundle.write(getLibOutputOptions(input));
    await bundle.close();
  }
}

build();
