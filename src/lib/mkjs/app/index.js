import { h, Component } from 'preact';
import { route } from 'preact-router';

import Login from 'lib/townshend/components/login';
import {
	TownshendUser,
	TownshendOrganization,
	TownshendRole,
	TownshendOrganizationRole,
	TownshendOrganizationList,
	Invitation,
	InvitationRequest,
	ForgotLogin,
	ResetPassword,
	AcceptInvitation
}
	from 'lib/townshend/components/townshendentities';
import ContentItem from 'lib/mkjs/contentitem';

import MkApi from 'lib/townshend/api/mkapi';

import UserApi from 'lib/townshend/api/user';
import ContentApi from 'lib/townshend/api/content';

class JoinRedirect extends Component {
	render() {
		//if a success method is defined, use that. otherwise use route
		let func = this.props.success
			? (path, message)=> this.props.success(message, path)
			: route;
		//TODO bugfix: "join now!" banner is persisting even when navigating away
		//TODO use window.location.replace or equivalent so that back button works from join target
		if (this.props.isLoading) {
			return 'loading...';
		} else if (this.props.isAuthenticated) {
			func('/', "You are already logged in. To create a new account, please log out and try again.");
		} else if (this.props.allow.createAccountPublic) {
			func("/auth/create-account", "join now!");
		} else if (this.props.allow.requestInvite) {
			func("/auth/request-invite", "request to join!");
		} else {
			//TODO make this action configurable
			return 'not currently public';
		}
	}
}

export default class MkApp extends Component {
	constructor(props, apis = {}, entities = {}) {
		super(props);

		this.state = {
			currentUser: null,
			isAuthenticated: false,
			isLoadingUser: true,
			isLoadingConfig: true,
			banner: {
				visible: false
			}
		}

		//api key, path on server
		this.apis = Object.assign({}, apis, {
			user         : new UserApi(props),
			role         : new MkApi(props, '/roles'),
			organization : new MkApi(props, '/organizations'),
			organizationRole : new MkApi(props, '/organization-roles'),
			organizationList : new MkApi(props, '/organization-lists'),
			forgotLogin  : new MkApi(props, '/forgotten-logins'),
			resetPassword : new MkApi(props, '/forgotten-logins/reset'),
			invitation   : new MkApi(props, '/invitations'),
			invitationRequest : new MkApi(props, '/invitation-requests'),

			contentItem  : new ContentApi(props)
		});

		//path on frontend,  component to load
		this.entities = Object.assign({}, {
			"users": TownshendUser,
			"roles": TownshendRole,
			"organizations": TownshendOrganization,
			"organization-roles": TownshendOrganizationRole,
			"organization-lists": TownshendOrganizationList,
			"forgotten-logins": ForgotLogin,
			"invitations": Invitation,
			"invitation-requests": InvitationRequest,
			"content-items": ContentItem,
		}, entities);

		this.entityInstances = this.getEntities(this.routeProps());
		this.onCreateAccount = this.onCreateAccount.bind(this);
		this.onLogout = this.onLogout.bind(this);
		this.onLogin = this.onLogin.bind(this);
		this.loadCurrentUser = this.loadCurrentUser.bind(this);
		this.handleRoute = this.handleRoute.bind(this);
		this.success = this.success.bind(this);
		this.userIsAdmin = this.userIsAdmin.bind(this);
  }

	componentWillMount() {
		this.loadCurrentUser();
		new MkApi(this.props, '/config').list().then(resp=>{
			console.log('loaded config', resp);
			this.setState({
				config: resp,
				isLoadingConfig: false
			});
		})
	}

	onCreateAccount(subject, item, path="/") {
		console.log("onCreateAccount: submitting login", subject, item)
		this.apis.user.login(item).then(response => {
			this.setState({
				formError: null
			})
			this.onLogin(path);
		}).catch(error => {
			this.handleError(error);
		});
	}

	onLogin(path="/", message='You are now logged in.', fallbackPath) {
		if (this.state.isLoadingUser) {
			console.debug('already loading user. do nothing');
		} else {
			this.loadCurrentUser(()=>this.success(message, path, fallbackPath))
		}
	}

	onLogout() {
		this.setState({
			currentUser: null,
			isAuthenticated: false
		});

		this.success('You are now logged out.', '/');
	}

	loadCurrentUser(callback) {
		if (this.apis.user.isLoggedIn()) {
			console.debug('loadCurrentUser start', this.apis.user.isLoggedIn(), this.apis.user.getUserId())
			this.setState({
				isLoadingUser: true
			});
			this.apis.user.getUser().then(json => {
				console.debug("loadCurrentUser success", this.state, json);
				this.setState({
					currentUser: json,
					isAuthenticated: true,
					isLoadingUser: false
				});
				if (callback) {
					callback(this.state);
				}
			}).catch(error => {
				console.error("loadCurrentUser error", error);
				this.setState({
					isLoadingUser: false,
					currentUser: null,
					isAuthenticated: false
				});
			});
		} else {
			this.setState({
				isLoadingUser: false,
				currentUser: null,
				isAuthenticated: false
			});
		}
	}

	routes() {
		let props = this.routeProps();
		let routes = [];
		routes = routes.concat(this.authRoutes(props));
		Object.keys(this.entities).forEach(path=>{
			let C = this.entities[path];
			let pathProps = Object.assign({}, props, {
				path: "/" + path,
				listing: true
			});
			routes.push(h(C, pathProps))
			delete pathProps.listing
			pathProps.path += "/:id"
			routes.push(h(C, pathProps))
		})
		return routes;
	}



	authRoutes(props) {
		return [
			<Login         {...props} path="/auth/login" hideCreate={!props.allow.createAccountPublic}
				onLogin={this.onLogin} />,
			<ForgotLogin   {...props} path="/auth/forgot-login" creating
				onCreate={()=>this.success('We have sent a password update email to your address on record! Please allow a moment for delivery.', '/')} />,
			<ResetPassword   {...props} path="/auth/reset-password" creating
				onCreate={()=>this.success('Password update successful! Enter your new credentials below to log in.', '/auth/login')} />,
			<InvitationRequest {...props} path="/auth/request-invite" creating
				onCreate={()=>this.success('Your invitation request has been submitted!', '/')} requestInviteFields={this.props.requestInviteFields || {}}/>,
			<TownshendUser {...props} path="/auth/my-account" editing id={this.apis.user.getUserId()}
				onUpdate={()=>{this.loadCurrentUser(()=>this.success('Account successfully updated.', '/'))}} />,
			<TownshendUser {...props} path="/auth/create-account" creating
				onCreate={this.onCreateAccount}/>,
			<AcceptInvitation {...props} path="/auth/accept-invite"
				onLogin={()=>this.onLogin(null)}
				onCreate={this.onCreateAccount}
				onAccept={()=>{this.loadCurrentUser(()=>this.success('You have accepted the invitation.', '/'))}} />,
			<Invitation {...props} creating path="/organizations/:organizationId/invite"
				onCreate={(subject)=>{this.loadCurrentUser(()=>this.success('Invitation sent.', '/organizations/' + subject.organization.id))}} />,
			<JoinRedirect {...props} success={this.success} path="/join" />
		]

	}

	routeProps() {
		let props = {
			apis: this.apis,
			allow: this.state.config ? this.state.config.accountConfiguration : {},
			currentUser: this.state.currentUser,
			//TODO replace this with general loading component
			isLoading: this.state.isLoadingUser || this.state.isLoadingConfig,
			isAuthenticated: this.state.isAuthenticated,
			config: this.state.config, //config from api
			userIsAdmin: this.userIsAdmin(this.state.currentUser)
		}
		props.entities = this.entityInstances;
		return props;
	}

	getEntities(props) {
		let entities = {};
		props = Object.assign({noFetch: true}, props);
		Object.keys(this.entities).forEach(path=>{
			let E = this.entities[path]
			let instance = new E(props);
			entities[instance.getEntityName()] = instance;
		})
		return entities;
	}

	userIsAdmin(user) {
		return user && user.roles && user.roles.filter(r=>r.roleName === "ADMIN").length > 0
	}

	success(message, path, fallbackPath="/") {
		if (path) {
			console.debug('success routing to', path);
			try {
				route(path)
			} catch (e) {
				console.error(e);
				route(fallbackPath)
			}
		}
		if (message) {
			console.log('success setting banner to', message, this.state.banner);
			this.setState({
				banner: {
					content: message,
					visible: true,
					fullWidth: true,
					dismissed: false
				}
			})
		}
	}

	/** Gets fired when the route changes.
	 *	@param {Object} event		"change" event from [preact-router](http://git.io/preact-router)
	 *	@param {string} event.url	The newly routed URL
	 */
	handleRoute(e){
		console.debug('App.handleRoute', this.state.currentUrl, e);
		let banner = this.state.banner;
		if (this.state.currentUrl !== e.url) {
			//when routing, return to top of page
			window.scrollTo(0, 0);
		}
		this.setState({
			currentUrl : e.url,
		});

		document.title = this.getTitle(e.url, e);
		if (!(banner && banner.durable)) {
			console.log('trying to dismiss banner', this.state.banner);
			banner.dismissed = true;
			this.setState({banner});
		}
	}

	getTitle(url, changeEvent) {
		let permanentTitle = this.getPermanentTitle();
		let pageTitle = this.getPageTitle(url, changeEvent);
		if (permanentTitle) {
			let permanentTitleFirst = this.showPermanentTitleFirst();
			let permanentTitleSeparator = this.getPermanentTitleSeparator();
			if (permanentTitleFirst) {
				pageTitle = permanentTitle +
					(pageTitle && pageTitle.length > 0
						? permanentTitleSeparator + pageTitle
						: ''
					);
			} else {
				pageTitle = (pageTitle && pageTitle.length > 0
						? permanentTitleSeparator + pageTitle
						: ''
					) + permanentTitle;
			}
		}
		return pageTitle;
	}

	getPermanentTitle() {
	}

	getPageTitle(url, changeEvent) {
		return url.substr(1);
	}

	showPermanentTitleFirst() {
		return true;
	}

	getPermanentTitleSeparator() {
		return ' - '
	}

}
