module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // WatermelonDB decorator support
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
