module.exports = {
  // ...existing code...
  
  module: {
    rules: [
      // ...existing code...
    ],
  },
  
  ignoreWarnings: [
    // Ignore source-map warnings from react-datepicker
    { message: /Failed to parse source map from.*react-datepicker/ },
    // Ignore source-map warnings from html5-qrcode
    { message: /Failed to parse source map from.*html5-qrcode/ },
  ],
  
  // ...existing code...
};
