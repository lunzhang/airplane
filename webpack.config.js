const path = require('path');

module.exports = {
  entry: ['./src/index.js'],
  output: {
    filename: 'bundle.js',
    publicPath: '/docs/',
    path: path.resolve(__dirname, 'docs')
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-proposal-object-rest-spread']
            }
          },
          {
            loader: 'eslint-loader',
            options: {
              emitWarning: true
            }
          }
        ]
      }
    ]
  },
  devServer: {
    watchContentBase: true,
    inline: true,
    port: 8080
  }
};
