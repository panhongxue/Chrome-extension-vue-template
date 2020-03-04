const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CrxPlugin = require('webpack-crx')
const path = require('path')
const pkg = require('./package.json')


const PATH = {
  output: path.resolve('dist'),
  build: path.resolve('build')
}

// Generate pages object
const pagesObj = {}
const chromeExtPages = ["popup", "options"]

chromeExtPages.forEach(name => {
  pagesObj[name] = {
    entry: `src/${name}/index.js`,
    template: `src/${name}/index.html`,
    filename: `${name}.html`
  }
})

// 生成manifest文件
const manifest = {
  from: 'src/manifest.json',
  to: 'manifest.json',
  transform(content) {
    if (process.env.NODE_ENV === "production") {
      return content
    }

    // 开发环境，注入插件刷新hot-reload.js
    let manifest = JSON.parse(content.toString())
    if (manifest.background && manifest.background.scripts) {
      manifest.background.scripts.unshift('hot-reload.js')
    }

    return JSON.stringify(manifest)
  }
}

const copyImgs = {
  from: 'src/img/',
  to: `img/`
}

const plugins = [
  new CopyWebpackPlugin([manifest, copyImgs])
]

// 开发环境将热加载文件复制到output文件夹
if (process.env.NODE_ENV !== 'production') {
  plugins.push(
    new CopyWebpackPlugin([{
      from: 'src/utils/hot-reload.js',
      to: PATH.output
    }])
  )
}

// 生产环境或debug模式打包output为crx
const debugMode = process.argv[5] === 'debug'
if (process.env.NODE_ENV === 'production' || debugMode) {
  // debug模式不清理crx目录
  if (!debugMode) {
    plugins.push(
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [PATH.build]
      })
    )
  }
  plugins.push(
    new CrxPlugin({
      // key: path.resolve('key.pem'),
      src: PATH.output,
      dest: PATH.build,
      name: pkg.name + (debugMode ? '.debug' : '')
    })
  )
}

module.exports = {
  pages: pagesObj,
  // 生产环境是否生成 sourceMap 文件
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
    // 关闭chunk-vendors
    config.optimization.splitChunks(false)

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
}