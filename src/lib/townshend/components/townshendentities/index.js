import { h, Component } from 'preact';
import { MkComponent, ArrayView } from 'lib/mkjs/mkcomponent';
import Login from 'lib/townshend/components/login';

const CHECK_USERNAME_TIMEOUT = 500;
const CONFIRM_PASSWORD_FAIL_TEXT = "'password' value is not equal to 'confirm password' value";
const PASSWORD_PLACEHOLDER = "at least 6 characters. case sensitive."; //TODO character count is variable. make this configurable.

class TownshendUser extends MkComponent {

	getName() {
		return 'user';
	}

	getEntityName() {
		return "TownshendUser"
	}

	fetch(idOrName) {
		if (isNaN(idOrName)) {
			return this.getApi().getByName(idOrName);
		} else {
			return this.getApi().get(idOrName);
		}
	}

	getDisplayName() {
		return 'User Account';
	}

	getViewUrl(item) {
		//TODO, make this url more special, since it's the user's url?
		return this.getUrlPrefix() + '/' + (item.username || item.id);
	}

	getEditUrl(item) {
		//TODO, make this url more special, since it's the user's url?
		return this.getUrlPrefix() + '/' + (item.username || item.id) + '?edit';
	}

	getUrlPrefix() {
		return '/users';
	}

	getItemName(entity = {}) {
		return entity.username;
	}

	userCan(action, subject) {
		//TODO define parameters for permissions
		//return action === 'get' || false;
		return {
			get: true,
			list: this.props.userIsAdmin,
			create: this.props.userIsAdmin
					|| this.props.allow.createAccountPublic
					|| (this.props.allow.createAccountWithInvite && (this.props.code || this.props.inviteId)),
			update: true, //TODO
			delete: false
		}[action]
	}

	getListFields(list) {
		let fields = super.getListFields(list);
		let orgComponent = new TownshendOrganization();
		return {
			username: fields.username,
			email: fields.email,
			dateCreated: fields.dateCreated,
			roles: {
				view: new ArrayView('roleName')
			},
			organizations: {
				view: new ArrayView((org)=><span><a href={orgComponent.getViewUrl(org)}>{org.name}</a>; </span>)
			}
		}
	}

	getCreateFields() {
		let fields = this.getEditableFields();
		return {
			username: fields.username,
			email: fields.email,
			password: fields.password,
			confirmPassword: {
				type: "string",
				placeholder: "must match password above",
				hideText: true
			},
			//TODO get invitation id and secret from query string
		}
	}

	validate(subject) {
		if (('confirmPassword' in subject) && subject.confirmPassword !== subject.password) {
			return {
				content: CONFIRM_PASSWORD_FAIL_TEXT,
				level: "danger"
			};
		}
	}

	prepareCreate(subject) {
		subject = Object.assign({}, subject);
		if (this.props.code || this.props.inviteId) {
			subject.invitation = {
				id: this.props.inviteId,
				code: this.props.code
			}
		}
		delete subject.confirmPassword;
		return subject
	}

	getEditableFields(subject) {
		let fields = {
			username: {
				type: "string",
				placeholder: ""
			},
			email: {
				type: "string",
				placeholder: ""
			},
			password: {
				type: "string",
				placeholder: PASSWORD_PLACEHOLDER,
				hideText: true
			}
			//TODO handle reset password here? If so, we need to fetch the query params for the reset secret
		}

		 if (this.props.userIsAdmin) {
			 fields.roles = {
				"type" : "array"
			 }
		 }
		 return fields;
	}

	getFieldComponent(fieldName, _, subject) {
		const fieldComponents = {
			roles: this._fieldReference(TownshendRole,{ nameFunc: item=>item.roleName })
		}
		return fieldComponents[fieldName];
	}

	validateUsername(event) {
		this.handleChange(event);
		if (this.timeout !== null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
		//TODO get this from form changes, not from props
		if (this.state.username === this.props.currentUser.username) {
			this.setState({
				usernameAvailable: null
			});
		} else {
			this.timeout = setTimeout(()=>{
				let username = this.state.username;
				if (username.length > 0) {
					this.getApi().checkUsernameAvailability(username).then(
						(result) => {
							this.setState({usernameAvailable: false})
						},
						(err) => {
							this.setState({usernameAvailable: true})
						}
					);
				} else {
					this.setState({
						usernameAvailable: null
					});
				}
			}, CHECK_USERNAME_TIMEOUT);
		}
	}

	getCreateFooter() {
		return this.props.userIsAdmin ? '' : <div class="mt-3">
			or&nbsp;<a href="/auth/login">log in to your account...</a>
		</div>
	}
}

class TownshendOrganization extends MkComponent {
	getName() {
		return "organization";
	}

	getEntityName() {
		return "TownshendOrganization"
	}

	getListFields(list) {
		return {
			name: {
				"type": "string"
			},
			organizationRoles: {
				view: new ArrayView('roleName')
			}
		}
	}

	getEditableFields() {
		return this.getCreateFields();
	}

	getCreateFields() {
		let fields = {
			"name" : {
				"type" : "string"
			}
		};
		if (this.props.userIsAdmin) {
			fields.organizationRoles = {
				"type" : "array"
			}
			fields.users = {
				"type" : "array"
			}
		}
		return fields;
	}

	getFields(entity) {
		let fields = super.getFields(entity);
		delete fields.userOrder;
		delete fields.urlName; //TODO remove this from the schema, or actually use it. if removed from schema, this line can also be removed
		return fields;
	}

	getFieldComponent(fieldName, _, subject) {
		const fieldComponents = {
			organizationRoles: this._fieldReference(TownshendOrganizationRole,{ nameFunc: item=>item.roleName }),
			users: this._fieldReference(TownshendUser,{ nameFunc: item=>item.username })
		}
		return fieldComponents[fieldName];
	}
}

class TownshendOrganizationList extends MkComponent {
	getName() {
		return "organizationList";
	}

	getEntityName() {
		return "TownshendOrganizationList"
	}

	getFields(entity) {
		let fields = super.getFields(entity);
		delete fields.organizationOrder;
		return fields;
	}

	getFieldComponent(fieldName, _, subject) {
		const fieldComponents = {
			organizations: this._fieldReference(TownshendOrganization)
		}
		return fieldComponents[fieldName];
	}

}

class TownshendRole extends MkComponent {
	getName() {
		return "role";
	}

	getEntityName() {
		return "TownshendRoleUser"
	}

	getItemName(entity = {}) {
		return entity.roleName;
	}

	getCreateFields() {
		return {
			"roleName" : {
				"type" : "string"
			}
		}
	}
}

class TownshendOrganizationRole extends TownshendRole {
	getName() {
		return "organizationRole";
	}

	getEntityName() {
		return "TownshendRoleOrganization"
	}
	getCreateFields() {
		return {
			"roleName" : {
				"type" : "string"
			}
		}
	}
}

class Invitation extends MkComponent {

	getEntityName() {
		return "TownshendInvitation"
	}

	getCreateFields() {
		let fields = {
			"email" : {
				"type" : "string"
			}
		}
		if (this.props.userIsAdmin) {
			 fields.role = {
				"type" : "object"
			 }
			 fields.organization = {
				 "type" : "object"
			 }
		}
		return fields;
	}

	getListFields() {
		return {
			email: {},
			role: {
				valueFunc: role=>role ? role.roleName : role
			},
			organization: {
				valueFunc: org=>org ? org.name : org
			},
			inviter: {
				valueFunc: user=> user ? user.username : user
			},
			inviteDate: {},
			resultantUser: {
				valueFunc: user=> user ? user.username : user
			},
		}
	}

	getFieldComponent(fieldName, _, subject) {
		const fieldComponents = {
			role: this._fieldReference(TownshendRole,{ nameFunc: item=>item.roleName }),
			organization: this._fieldReference(TownshendOrganization,)
		}
		return fieldComponents[fieldName];
	}

	getListHeaderButtons(list) {
		if (this.userCan('create')) {
			return <div class="btn-group pull-right">
				<button class="btn btn-primary" onClick={()=>this.setState({creatingInModal: true})}>Create New</button>
				<a class="btn btn-info" href="/organizations">Create Organization for Invite</a>
			</div>
		}
	}

	prepareCreate(subject) {
		subject = Object.assign({}, subject);
		if (this.props.organizationId) {
			subject.organization = {
				id: parseInt(this.props.organizationId)
			}
		}
		return subject;
	}
}

class InvitationRequest extends MkComponent {

	getEntityName() {
		return "TownshendInvitationRequest"
	}

	getCreateFields() {
		let fields = {
			"email" : {
				"type" : "string"
			}
		}
		fields = Object.assign(fields, this.props.requestInviteFields || {});
		return fields
	}

	getListFields(list) {
		return {
			dateCreated: {},
			createdBy: {},
			id: {},
			email: {},
			serializedRequestFields: {
				valueFunc: (val)=>this.renderObjectFieldValue(JSON.parse(val))
			},
			organization: {},
			resultantInvitation: {}
		}
	}

	prepareCreate(subject) {
		console.log('prepareCreate', subject);
		let prepared = {
			email : subject.email
		}
		delete subject.email;
		prepared.serializedRequestFields = JSON.stringify(subject);
		return prepared;
	}

	getEditTitle(isUpdate, entity) {
		return isUpdate ? super.getEditTitle(isUpdate, entity) : 'Request an Invitation';
	}

	getActions(list) {
		let actions = {};
		if (this.props.userIsAdmin) {
			actions['approve'] = (item, index) => {
				return this.renderListButton('check', e=>{
					this.props.apis.invitation.create({
						invitationRequest: {
							id: item.id
						},
						email: item.email
					}).then(subject => {
						let inModal = this.state.creatingInModal;
						this.setState({
							isLoading: false,
							creating: false,
							creatingInModal: false,
							formError: null
						});
						this.fetchSubject();
					}).catch(error => {
						this.handleError(error);
					});
				});
			}
		}
		return actions;
	}

	getEditButtonText(isUpdate) {
		return isUpdate ? 'Update' : 'Send Request!';
	}
}

class ForgotLogin extends MkComponent {

	getEntityName() {
		return "TownshendForgotLogin"
	}

	getCreateFields() {
		return {
			"emailOrUsername" : {
				"type" : "string"
			}
		}
	}

	getEditTitle(isUpdate, entity) {
		return isUpdate ? super.getEditTitle(isUpdate, entity) : 'Forgot Login';
	}

	getEditButtonText(isUpdate) {
		return "Request Password Reset";
	}
}

class ResetPassword extends MkComponent {
	getCreateFields() {
		return {
			newPassword: {
				type: "string",
				placeholder: PASSWORD_PLACEHOLDER,
				hideText: true
			},
			retypeNewPassword: {
				type: "string",
				hideText: true
			}
		}
	}

	getEditTitle(isUpdate, entity) {
		return 'Reset Password';
	}

	getEditButtonText(isUpdate) {
		return "Submit";
	}

	validate(subject) {
		if (('retypeNewPassword' in subject) && subject.retypeNewPassword !== subject.newPassword) {
			return {
				content: CONFIRM_PASSWORD_FAIL_TEXT,
				level: "danger"
			};
		}
	}

	prepareCreate(subject) {
		return {
			password : subject.newPassword,
			id : parseInt(this.props.resetId),
			code : this.props.code
		}
	}
}

class AcceptInvitation extends Invitation {

	getName () {
		return 'invitation';
	}

	fetch(id) {
		return this.getApi().get(id, {
			code: this.props.code
		});
	}

	getSubjectIdPropKey() {
		return 'inviteId';
	}

	//TODO handle error better: the current message is just 'Invalid form submission.'
	renderView(subject) {
		let message, form;
		if (this.props.currentUser) {
			if (subject.role || subject.organization) {
				if (this.props.currentUser.organizations.map(org=>org.id).includes(subject.organization.id)) {
					message = <FatHeader content="You are already a member of this group." />
				} else {
					let content = subject.organization
							? "Join " + subject.organization.name + "."
							: "Add role " + subject.role.roleName + " to your account.";
					let joinAction = () => {
						this.props.apis.user.acceptInvitation(this.props.currentUser, this.props.inviteId, this.props.code).then(()=>{
							this.props.onAccept();
						})
					}
					message = <FatHeader content={content} />;
					form = <button type="button" class="btn btn-lg btn-success m-5" onClick={joinAction}>accept invitation and join</button>;
				}
			} else {
				message = <FatHeader content="You are already logged in." />
			}
		} else {
			let join = subject.organization ? " join " + subject.organization.name + " on" : ''
			message = <FatHeader content={`Accept invitation to${join} the platform...`} />
			form = <div>
				<CreateUserAndAcceptInvite {...this.props} creating hideCancel />
				<LoginAndAcceptInvite {...this.props} hideCreate hideForgot />
			</div>
		}
		return <div>
			{message}
			{form}
		</div>
	}
}

class FatHeader extends Component {
	render() {
		return <div>
			<div class="row mt-n2 mb-3 py-5 px-5 bg-info text-white">
				<h1>{this.props.content}</h1>
			</div>
		</div>
	}
}

class CreateUserAndAcceptInvite extends TownshendUser {
	getCreateFooter() {
		return '';
	}
	getEditButtonText() {
		return 'Create Account and Accept Invitation'
	}
	render() {
		return <div class="row">
				<div class="col col-md-6 mx-auto">
					{ super.render() }
					<hr class="mt-5" />
				</div>
			</div>
	}
}

class LoginAndAcceptInvite extends Login {

	loginTitle() {
		return '...or Log In';
	}
}

const TOWNSHEND_LINKS = [
	{
		path: 'users',
		name: 'users',
		description: 'List/search all users'
	},
	{
		path: 'roles',
		name: 'user roles',
		description: 'Different roles and features that a user can have.'
	},
	{
		path: 'organizations',
		name: 'organizations',
		description: 'List/search all organizations'
	},
	{
		path: 'organization-lists',
		name: 'organization lists',
		description: 'Arbitrary sorted lists of organizations.'
	},
	{
		path: 'organization-roles',
		name: 'organization roles',
		description: 'Different roles and features that a organization can have.'
	},
	{
		path: 'forgotten-logins',
		name: 'forgotten logins',
		description: 'A record of all times users have requested to reset their password.'
	},
	{
		path: 'invitation-requests',
		name: 'invitation requests',
		description: 'Individuals who have requested an invite to the portal'
	},
	{
		path: 'invitations',
		name: 'invitations',
		description: 'All invitations that have been sent to people to join the portal'
	}
]

export {
	TownshendUser,
	TownshendOrganization,
	TownshendOrganizationRole,
	TownshendOrganizationList,
	TownshendRole,
	Invitation,
	InvitationRequest,
	ForgotLogin,
	ResetPassword,
	AcceptInvitation,
	TOWNSHEND_LINKS
}
