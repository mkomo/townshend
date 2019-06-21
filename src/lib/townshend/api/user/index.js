import MkApi from '../mkapi';

export default class UserApi extends MkApi {

	constructor(props) {
		super(props, "/users");
	}

	logout() {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				this.removeAuth();
				//TODO add any server calls
				resolve({});
			}, 300);
		});
	}

	login(details) {
		return this.oauthRequest(details).then(response => {
			if (response.status !== 200) {
				throw response;
			} else {
				//convert to json
				return response.json();
			}
		}).then(json => {
			//TODO handle remember===false differently (localStorage vs sessionStorage?)
			this.saveAuth(json);
		});
	}

	checkUsernameAvailability(username) {
		return this.request({
			 url: "/users?username=" + username,
			 method: 'HEAD'
		}, true);
	}

	getUser() {
		//TODO listen to changes to localStorage
		let id = this.getUserId();
		if (id === null) {
			return null;
		} else {
			return this.get(id)
			.then(response=>response)
			.catch(error => {
				if (error && error.constructor && error.constructor.name === 'TypeError'
						&& error.message === 'Failed to fetch') {
					console.error('api call failed:', error)
				} else {
					console.error('auth failure', error, typeof error)
					//TODO figure out specific cases in which auth should be removed
					this.removeAuth();
				}
				throw error;
			})
		}
		return id === null ? null : this.get(id);
	}

	getUserId() {
		let auth = this.getAuth();
		return (auth !== null && 'sub' in auth) ? auth['sub'] : null;
	}

	isLoggedIn() {
		return this.getUserId() !== null;
	}

	getByName(name) {
		return this.get('name/' + name);
	}

	update(item, id=this.getUserId()) {
		return super.update(item, id);
	}

	delete(item) {
		console.error('DELETE not implimented for user');
	}

	acceptInvitation(user, inviteId, code) {
		return this.request({
			url: this._getBasePath() + "/" + user.id + "/invitation",
			method: 'POST',
			body: JSON.stringify({
				id: inviteId,
				code: code
			})
		});
	}
}
