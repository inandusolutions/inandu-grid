// Karma configuration file, see link for more information
// https://karma-runner.github.io/6.4/config/configuration-file.html
//
// Wired in via angular.json's grid-app "test" architect target (`options.karmaConfig`) so we can
// register launchers Angular's built-in karma config (@angular/build/src/builders/karma/karma-config.js)
// doesn't know about — it only loads karma-chrome-launcher. `browsers` below stays the existing
// single-Chrome default so `npm test` behaves exactly as before; pass `--browsers=...` on the CLI
// to run against Firefox/Safari instead (see CONTRIBUTING.md).

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-safari-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    client: {
      jasmine: {},
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/grid-app'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    // 'ChromeHeadlessCI' is 'ChromeHeadless' + '--no-sandbox' for CI runners (GitHub Actions'
    // ubuntu images can't use Chrome's sandbox); opt in with `--browsers=ChromeHeadlessCI`.
    // Local `npm test` is unaffected — it still uses the plain 'ChromeHeadless' default.
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu'],
      },
    },
    // Firefox has no default here (needs karma-firefox-launcher's own 'FirefoxHeadless'/'Firefox'
    // launcher, pass explicitly via --browsers) and Safari has no headless mode at all (Apple
    // doesn't offer one) and only runs on an actual macOS machine with "Allow Remote Automation"
    // enabled in Safari's Develop menu — see CONTRIBUTING.md for how to opt into either.
    browsers: ['ChromeHeadless'],
    restartOnFileChange: true,
  });
};
