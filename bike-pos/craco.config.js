module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        { message: /Failed to parse source map from.*react-datepicker/ },
        { message: /Failed to parse source map from.*html5-qrcode/ },
      ];
      return webpackConfig;
    },
  },
};
