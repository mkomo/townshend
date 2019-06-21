import { queryString } from 'lib/mkjs/util';

const LS_ACCESS_TOKEN = 'accessToken'
const OAUTH_CREDENTIALS = 'trusted-app:secret'

export default class Api {

	constructor(props) {
		this.apiBaseUrl = props.apiBaseUrl;
		this.oauthBaseUrl = props.oauthBaseUrl;
	}

	getAuth() {
		if(localStorage.getItem(LS_ACCESS_TOKEN)) {
			return JSON.parse(localStorage.getItem(LS_ACCESS_TOKEN));
		} else {
			return null;
		}
	}

	getToken() {
		let auth = this.getAuth();
		return (auth !== null && 'access_token' in auth) ? auth['access_token'] : null;
	}

	removeAuth() {
		localStorage.removeItem(LS_ACCESS_TOKEN)
	}

	saveAuth(auth) {
		localStorage.setItem(LS_ACCESS_TOKEN, JSON.stringify(auth));
	}

	oauthRequest(details) {
		//set up POST data necessitated by OAUTH2
		details['grant_type'] = 'password';
		let formBody = queryString(details);
		//log in request TODO
		return fetch(this.oauthBaseUrl + '/token', {
				 method: 'POST',
				 headers: {
						Authorization: 'Basic ' + btoa(OAUTH_CREDENTIALS),
						'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
				 },
				 body: formBody
		})
	}

	request(options, raw = false) {
		let headers = new Headers({
			'Content-Type': 'application/json',
		})
		let token = this.getToken();
		if (token) {
			headers.append('Authorization', 'Bearer ' + token)
		}

		const defaults = {headers: headers};
		options = Object.assign({}, defaults, options);

		//TODO unset token if the token is bad
		//TODO get all constants from api
		return fetch(this.apiBaseUrl + options.url, options)
		.then(response => {
			if(!response.ok) {
				return Promise.reject(response);
			} else {
				//always expect a 200 response to have a body
				if (response.status === 204) {
					return true;
				} else {
					return raw ? response : response.json().then(json => json);
				}
			}
		});
	}
}
