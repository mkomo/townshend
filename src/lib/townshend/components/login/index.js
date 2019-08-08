import { h, Component } from 'preact';
import { Link } from 'preact-router';
import { Button, Form, FormGroup, Label, Input, FormText } from 'reactstrap';
import style from './style.less';
import { InputComponent, Banner } from 'lib/mkjs';

export default class Login extends InputComponent {

	constructor(props) {
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);

    this.state = {
      username: "",
      password: "",
			remember: true,
			formError: null
    };
	}

	handleSubmit(e) {
		e.preventDefault();
		console.log("submitting login", this.props, this.state)
		this.props.apis.user.login(this.state).then(response => {
			this.setState({
				formError: null
			});
			this.callOnLogin();
		}).catch(error => {
			this.handleError(error);
		});
	}

	componentWillReceiveProps(props) {
		if (props.currentUser && !this.props.currentUser) {
			this.callOnLogin('You are already logged in.');
		}
	}

	callOnLogin(message) {
		this.props.onLogin(this.props.return, message);
	}

	loginTitle() {
		return 'Log In';
	}

	loginButtonText() {
		return 'Log In'
	}

	render() {
		return (
			<div class="row">
				<div class="col col-md-6 mx-auto">
					<form class={style.full_page_form} method="POST" onsubmit={this.handleSubmit}>
						{this.state.formError ? <Banner content='Login attempt failed.' level="danger" closeable={false} /> : ''}
						<h1>{this.loginTitle()}</h1>
						<FormGroup>
							<Input name="username" placeholder="username or email" value={this.state.username} onchange={this.handleChange} />
						</FormGroup>
						<FormGroup>
							<Input type="password" name="password" placeholder="password" value={this.state.password} onchange={this.handleChange} />
						</FormGroup>
						<FormGroup check>
							<Label for="remember" check>
								<Input type="checkbox" name="remember" checked={this.state.remember}/>{' '}
								remember me
							</Label>
						</FormGroup>
						<div class="mt-3">
							<input class="btn btn-mkjs-primary" type="submit" value={this.loginButtonText()} />
							&nbsp;
							{
								this.props.hideForgot
								? ''
								: <a class="btn btn-link" href="/auth/forgot-login">forgot login?</a>
							}

						</div>
						{
							this.props.hideCreate
							? ''
							: <div class="mt-3">
									or&nbsp;<Link href="/auth/create-account" className="link">create a new account...</Link>
								</div>
						}

					</form>
				</div>
			</div>
		);
	}
}
