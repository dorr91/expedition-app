declare var require: any;
declare var module: any;

import * as React from 'react'
import * as ReactDOM from 'react-dom'
import theme from './Theme'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import {authSettings} from './Constants'
import {toPrevious} from './actions/Card'
import {loadBraintreeToken} from './actions/Checkout'
import {silentLogin} from './actions/User'
import {getStore} from './Store'
import {getWindow, getGapi, getGA, getDevicePlatform, getDocument, setGA} from './Globals'

const injectTapEventPlugin = require('react-tap-event-plugin');

function setupTapEvents() {
  try {
    injectTapEventPlugin();
  } catch (e) {
    console.log('Already injected tap event plugin');
  }
}

export function logEvent(name: string, args: any): void {
  console.log('Event log: ' + name, args);
  getWindow().FirebasePlugin.logEvent(name, args);
  const ga = getGA();
  if (ga) {
    const event: any = {
      hitType: 'event',
      eventCategory: 'log',
      eventAction: name,
    };
    if (typeof args === 'string') {
      event.eventLabel = args;
    }
    if (typeof args === 'number') {
      event.eventValue = args;
    }
    ga('send', event);
  }
}

function setupDevice() {
  const window = getWindow();

  // Apply class-specific styling
  const platform = getDevicePlatform();
  document.body.className += ' ' + platform;

  if (platform === 'android') {

    // Hide system UI and keep it hidden (Android 4.4+ only)
    window.AndroidFullScreen.immersiveMode(() => {
      console.log('Immersive mode enabled');
    }, () => {
      console.log('Immersive mode failed');
    });

    // DOM ready
    $(() => {
      // patch for Android browser not properly scrolling to input when keyboard appears
      $('body').on('focusin', 'input, textarea', (event) => {
        if (navigator.userAgent.indexOf('Android') !== -1) {
          var scroll = $(this).offset().top;
          $('.base_card').scrollTop(scroll);
        }
      });
    });
  }

  getDocument().addEventListener('backbutton', () => {
    getStore().dispatch(toPrevious());
  }, false);

  window.plugins.insomnia.keepAwake(); // keep screen on while app is open

  // silent login here triggers for cordova plugin, if gapi is loaded
  const gapi = getGapi();
  if (!gapi) {
    return;
  }
  getStore().dispatch(silentLogin(() => {
    // TODO have silentLogin return if successful or not, since will vary btwn cordova and web
    console.log('Silent login: ', gapi.auth2.getAuthInstance().isSignedIn);
  }));
}

function setupGoogleAPIs() {
  const gapi = getGapi();
  if (!gapi) {
    return;
  }

  gapi.load('client:auth2', () => {
    gapi.client.setApiKey(authSettings.apiKey);
    gapi.auth2.init({
      client_id: authSettings.clientId,
      scope: authSettings.scopes,
      cookie_policy: 'none',
    }).then(() => {
      // silent login here triggers for web
      getStore().dispatch(silentLogin(() => {
        // TODO have silentLogin return if successful or not, since will vary btwn cordova and web
        console.log('Silent login: ', gapi.auth2.getAuthInstance().isSignedIn);
      }));
    });
  });
}

function setupEventLogging() {
  const window = getWindow();
  if (window.FirebasePlugin) { // Load Firebase - only works on cordova apps
    window.FirebasePlugin.onTokenRefresh((token: string) => {
      // TODO save this server-side and use it to push notifications to this device
    }, (error: string) => {
      console.error(error);
    });
  } else {
    window.FirebasePlugin = {
      logEvent: (name: string, args: any) => { console.log(name, args); },
    };
  }
}

function render() {
  // Require is done INSIDE this function to reload app changes.
  var Main = require('./components/base/Main').default;
  var base = getDocument().getElementById('react-app');
  ReactDOM.unmountComponentAtNode(base);
  ReactDOM.render(
    <MuiThemeProvider muiTheme={getMuiTheme(theme)}>
      <Main/>
    </MuiThemeProvider>,
    base
  );
}

function setupHotReload() {
  if (module.hot) {
    module.hot.accept();
    module.hot.accept('./components/base/Main', () => {
      setTimeout(() => {render();});
    });
  }
}

declare var ga: any;
function setupGoogleAnalytics() {
  const window = getWindow();
  const document = getDocument();
  // Don't enable Google Analytics if we're dev'ing locally
  if (window.location.hostname === 'localhost') {
    return;
  }

  (function(i: any,s: any,o: any,g: any,r: any,a: any,m: any){
    i['GoogleAnalyticsObject']=r;
    i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)
    },
    i[r].l=1*(new Date() as any);
    a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];
    a.async=1;
    a.src=g;
    m.parentNode.insertBefore(a,m);
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga',null, null);

  if (typeof ga === 'undefined') {
    console.log('Could not load GA');
    return;
  }
  setGA(ga);
  ga('create', 'UA-47408800-9', 'auto');
  ga('send', 'pageview');
  console.log('google analytics set up');
}

export function init() {
  // TODO: remove these and have everyone use getPlatform()/getVersion().
  const window = getWindow();
  window.platform = 'web';

  getDocument().addEventListener('deviceready', () => {
    setupDevice();
  }, false);

  setupTapEvents();
  setupGoogleAPIs();
  setupEventLogging();
  setupHotReload();
  setupGoogleAnalytics();
  getStore().dispatch(loadBraintreeToken());

  render();
}

// doInit is defined in index.html, but not in tests.
// This lets us setup the environment before initializing, or not init at all.
declare var doInit: boolean;
if (typeof doInit !== 'undefined') {
  init();
}
