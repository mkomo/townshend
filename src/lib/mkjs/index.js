import { h, Component } from 'preact';

import style from './style.less';

class InputComponent extends Component {
	constructor(props, formName = null) {
		super(props);
		if (formName !== null) {
			this.formName = formName;
		}
		this.handleChange = this.handleChange.bind(this);
		this.handleChangeFile = this.handleChangeFile.bind(this);
		this.handleChangeMultiCheck = this.handleChangeMultiCheck.bind(this);
	}

	handleChangeFile(event) {
		let input = event.target;
		let file = input.files.length > 0 ? input.files[0] : null;
		if (file) {
			let reader = new FileReader();

			reader.onload = () => {
				let mkfile = {
					fileName: file.name,
					fileType: file.type,
					fileSize: file.size,
					encodedFile: reader.result
				}
				this._handleChangeInternal(event, mkfile);
			};
			reader.readAsDataURL(file);
		} else {
			this._handleChangeInternal(event, null);
		}
	}

	handleChangeMultiCheck(event) {
		// let key = event.target.name;
		let value = event.target.value;
		if (event.target.checked) {
			return this._handleChangeInternal(event, value, (oldVal, newVal)=>{
				if (!oldVal) {
					oldVal = [];
				}
				oldVal.push(newVal);
				return oldVal
			})
		} else {
			//remove item from array
			return this._handleChangeInternal(event, value, (oldVal, newVal)=>{
				if (!oldVal) {
					return []
				} else  if (!oldVal.includes(newVal)) {
					console.error("array doesn't contain the item being removed", oldVal, newVal);
					return oldVal;
				}
				return oldVal.filter(v=>v!=newVal)
			});
		}
	}

	handleChange(event, values = null) {
		if (event.target.type === 'checkbox') {
			return this._handleChangeInternal(event, event.target.checked);
		} else if (values) {
			return this._handleChangeInternal(event, values[event.target.value])
		} else {
			return this._handleChangeInternal(event, event.target.value);
		}
	}

	_handleChangeInternal(event, value, updateFunction=(oldVal, newVal)=>newVal) {
		if (value === this.getNullSelectValue()) {
			value = null;
		}
		let key = event.target.name;
		if (this.formName) {
			let form  = this.state[this.formName] || {};
			form[key] = updateFunction(form[key], value);
			this.setState({
				[this.formName]: form
			})

			// TODO create a means to prevent navigating away from a changed form. Should handle closing window, clicking any link, clicking cancel.
			// if (this.shouldConfirmClose && this.shouldConfirmClose()) {
			// 	// Enable navigation prompt
			// 	console.log('add beforeUnload', window);
			// 	window.addEventListener('beforeunload', function (e) {
			// 		console.log('!!!!!!beforeUnload event', e)
			// 		// Cancel the event
			// 		e.preventDefault();
			// 		// Chrome requires returnValue to be set
			// 		e.returnValue = '';
			// 		return "";
			// 	});
			// }
		} else {
			this.setState({
				[key]: value
			})
		}
	}

	getNullSelectValue() {
		return '@@MkComponent_NULL@@';
	}

	handleError(response) {
		response.text().then(responseText=>{
			let responseObject;
			try {
				responseObject = JSON.parse(responseText);
			} catch (e) {}
			console.error('error response', response, responseText, responseObject)
			this.setState({
				isLoading: false,
				formError: new ErrorResponse(response, responseText, responseObject)
			})
			//TODO scroll to top of form instead of top of page
			window.scrollTo(0, 0);
		})
	}
}

class ErrorResponse {
	constructor(response, responseText, responseObject) {
		this.response = response;
		this.responseText = responseText;
		this.responseObject = responseObject;
	}
}

class Banner extends Component {
	constructor(props) {
		super(props);
		this.massageProps(props);
		this.state = {
			visible: (props.content || props.children) && ( 'visible' in props ? props.visible : true ),
			closeable: 'closeable' in props ? props.closeable : true,
			durable: 'durable' in props ? props.durable : false,
			level: props.level,
			dismissed: props.dismissed,
			content: props.content || '',
			onDismiss: props.onDismiss || (()=>this.setState({dismissed: true})),
			fullWidth: props.fullWidth || false
		}
	}

	massageProps(props) {
		props.level = 'level' in props ? props.level : 'success';
		if ('formError' in props) {
			props.level = 'warning';
			let formError = props.formError;
			if (typeof formError !== 'object') {
				// form error is a string or primative
				props.content =  formError;
			} else if (formError.constructor === ErrorResponse) {
				props.level = 'danger';
				console.error('!!!!ErrorResponse', formError);
				if (formError.responseObject) {
					props.content = messageForErrorResponseObject(formError.responseObject)
				} else if (formError.responseText && formError.responseText.length > 0) {
					props.content = formError.responseText;
				} else {
					props.content = messageForErrorResponse(formError.response);
				}
			} else {
				Object.assign(props, formError);
			}
		}
	}

	componentWillReceiveProps(props) {
		this.constructor(props);
	}

	render() {
		console.debug(this.constructor.name, 'render', this.state);
		let classes = ['alert','alert-dismissible', 'fade', 'show',
			style.banner, 'alert-' + this.state.level];
		if (this.state.fullWidth) {
			classes.push(style.banner_full_width)
			classes.push("mb-2");
			classes.push("mt-n2")
		}
		if (this.state.dismissed) {
			classes.push(style.banner_hidden);
		}
		return ( this.state.visible
			? <div class={classes.join(' ')} role="alert">
					{ this.state.closeable
						? <button type="button" onClick={(e)=>{this.state.onDismiss(); return false;}}
								class="close" data-dismiss="alert" aria-label="Close">
							<span aria-hidden="true">&times;</span>
						</button>
						: ''
					}
					{this.state.content}
					{this.props.children}
				</div>
			: ''
		)
	}
}

class Loading extends Component {

	render() {
		let message = this.props.message || 'loading...';
		return <div class={style.loader}>
			<div class={style.icon}></div>
			<div class={style.message}>{message}</div>
		</div>
	}
}

class LoadingInline extends Component {
	render() {
		let message = this.props.message || null;
		return <div class={style.loading_inline}>
			<div class={style.loading_spinner}></div>
			{ message ? <span>{message}</span> : ''}
		</div>
	}
}

class Error extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		let message = 'an unknown error occurred';
		let error = this.props.error;
		if (this.props.message) {
			message = this.props.message;
		} else if (error && error.status) {
			message = messageForErrorResponse(error)
		} else if (error && error.message) {
			message = error.message;
		} else {
			console.error('an unknown error occurred', this.props)
		}
		return <div class={style.error}>
			<div class={style.icon}></div>
			<div class={style.message}>{message}</div>
		</div>
	}
}
function messageForErrorResponseObject(obj) {
	if (obj.message) {
		return obj.message;
	} else {
		let messages = [].concat(obj.generalErrors || []).map(m=><li>{m}</li>)
		if (obj.fieldErrors) {
			Object.keys(obj.fieldErrors).forEach(field=>messages.push(<li>
					<b class="pr-1">{field}</b>
					{obj.fieldErrors[field]}
				</li>
			));
		}
		return <ul class="list-unstyled mb-0">
			{messages}
		</ul>
	}
}

function messageForErrorResponse(errorResponse) {
	let status = errorResponse.status;
	if (status === 404) {
		return 'Not Found.';
	} else if (status === 403) {
		return 'Forbidden.';
	} else if (status === 401) {
		let location = window.location.pathname + window.location.search + window.location.hash;
		return <span>You must <a href={"/auth/login?return=" + location}>log in</a> to see this page.</span>;
	} else if (status === 400) {
		return 'Invalid form submission.';
	} else {
		return 'The server returned an error response with status ' +
				status + '. Please contact administrator for help.'
	}
}

export {
	InputComponent,
	Banner,
	Loading,
	LoadingInline,
	Error
}
