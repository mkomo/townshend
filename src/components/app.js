import { h, Component } from 'preact';
import { Router } from 'preact-router';

import { Banner } from 'lib/mkjs';
import MkApp from 'lib/mkjs/app';

import Header from 'components/header';
import { Home } from 'components/pages';
import Footer from 'components/footer';


import MkApi from 'lib/townshend/api/mkapi';
//TODO add sample custom api(s)

//TODO add sample entity/ies

import ContentItem from 'lib/mkjs/contentitem';

export default class App extends MkApp {

	constructor(props) {
		//TODO determine the best place to inject this
		let baseUrl = (process.env.NODE_ENV==='production') ? 'https://example.com' : "http://localhost:8080"
		let apiBaseUrl = baseUrl + "/api";
		let oauthBaseUrl = baseUrl + "/oauth";

		props = Object.assign(props, {
			requestInviteFields: {
				"name" : {
					"type" : "string"
				},
				"source" : {
					"type" : "string",
					"title": "How did you find us?",
					"enum" : ["Friend or Family", "Advertisement", "Other"]
				},
				"otherSource" : {
					"type" : "string",
					"title": "Please Specify",
					"if" : {
						"source": {
							"enum": ["Other"]
						}
					}
				},
			}
		}, {
			apiBaseUrl,
			oauthBaseUrl
		})
		console.log('App.constructor', props);
		super(props, {
			//TODO content item
			//attachment   : new AttachmentApi(props),
		}, {
			//TODO content item
			//"attachments": Attachment,
		});
		this.onLogin = this.onLogin.bind(this);
	}

	getPermanentTitle() {
		return 'Townshend Starter';
	}

	onLogin(path) {
		super.onLogin(path);
	}

	render() {
		let props = this.routeProps();
		//TODO create an object that maps from the classname to a function mapping an instance to the canonical path
		//and add that object to props
		let routes = this.routes();

		return (
			<div id="app">
				<Header {...props} onLogout={this.onLogout} currentUrl={this.state.currentUrl}/>
				<div class="app-content-container">
				<div class="container-fluid app-content pb-4">
					<Banner {...this.state.banner}/>
					<Router onChange={this.handleRoute}>
						<Home {...props} path="/" />
						{routes}
						<ContentItem {...props} default />
					</Router>
				</div>
				</div>
				<Footer {...props} />
			</div>
		);
	}
}
