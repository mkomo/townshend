import { h, render } from 'preact';

//load bootstrap first so that all other css overrides it.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css'
import 'style';

let root;
function init() {
	let App = require('./components/app').default;
	root = render(<App/>, document.body, root);
}

// register ServiceWorker via OfflinePlugin, for prod only:
if (process.env.NODE_ENV==='production') {
	require('./pwa');
}

// in development, set up HMR:
if (module.hot) {
	//require('preact/devtools');   // turn this on if you want to enable React DevTools!
	module.hot.accept('./components/app', () => requestAnimationFrame(init) );
}

init();
