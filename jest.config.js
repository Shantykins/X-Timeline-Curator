export default {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jsdom)/)'
  ]
};