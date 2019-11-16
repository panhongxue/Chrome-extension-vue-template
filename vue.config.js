const CopyWebpackPlugin = require("copy-webpack-plugin")
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CrxPlugin = require('webpack-crx')
const path = require("path")

const PATH = {
  output: path.resolve('dist'),
  build: path.resolve('build')
}

// Generate pages object
const pagesObj = {};
const chromeName = ["popup", "options"];

chromeName.forEach(name => {
  pagesObj[name] = {
    entry: `src/${name}/index.js`,
    template: `src/${name}/index.html`,
    filename: `${name}.html`
  };
});

// 生成manifest文件
const manifest = process.env.NODE_ENV === "production" ? {
  from: 'src/manifest.prod.json',
  to: 'manifest.json'
} : {
  from: 'src/manifest.dev.json',
  to: 'manifest.json'
}

const copyImgs = {
  from: 'src/img/',
  to: `img/`
}

const plugins = [
  CopyWebpackPlugin([manifest, copyImgs])
]

// 开发环境将热加载文件复制到output文件夹
if (process.env.NODE_ENV !== 'production') {
  plugins.push(
    CopyWebpackPlugin([{
      from: 'src/utils/hot-reload.js',
      to: PATH.output
    }])
  )
}

// 生产环境打包output为crx
if (process.env.NODE_ENV === 'production') {
  plugins.push(
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [PATH.build]
    })
  )
  plugins.push(
    new CrxPlugin({
      key: path.resolve('key.pem'),
      src: PATH.output,
      dest: PATH.build,
      name: 'fulllink-tester'
    })
  )
}

module.exports = {
  pages: pagesObj,
  // // 生产环境是否生成 sourceMap 文件
  productionSourceMap: false,

  configureWebpack: {
    entry: {
      'content': './src/content/index.js'
    },
    output: {
      filename: 'js/[name].js'
    },
    plugins: plugins,
  },
  css: {
    extract: {
      filename: 'css/[name].css'
      // chunkFilename: 'css/[name].css'
    }
  },

  chainWebpack: config => {
    // 处理字体文件名，去除hash值
    const fontsRule = config.module.rule('fonts')

    // 清除已有的所有 loader。
    // 如果你不这样做，接下来的 loader 会附加在该规则现有的 loader 之后。
    fontsRule.uses.clear()
    fontsRule.test(/\.(woff2?|eot|ttf|otf)(\?.*)?$/i)
      .use('url')
      .loader('url-loader')
      .options({
        limit: 1000,
        name: 'fonts/[name].[ext]'
      })

    // 查看打包组件大小情况
    if (process.env.npm_config_report) {
      config
        .plugin('webpack-bundle-analyzer')
        .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin)
    }
  }
};