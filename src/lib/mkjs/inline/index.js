import { h, Component } from 'preact';
import style from './style.less';

//TODO actually implement this stuff
export default class InlineInput extends Component {

	/*
	TODO
	handle escape press
	optional draw edit button
	mutually cancel if more than one is open?
	 */

	constructor(props) {
		super(props);
		this.state = {
			placeholder: '(empty)',
			showAlways: false,
			inEdit: false
		};
		this.stateFromProps(props);
		this.setEditState = this.setEditState.bind(this);
		this.handleChange = this.handleChange.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.handleKeyUp = this.handleKeyUp.bind(this);
	}
	stateFromProps(props){
		var newState = {};
		if ('value' in props) newState['value'] = props['value'];
		if ('propName' in props) newState['propName'] = props['propName'];
		if ('onChange' in props) newState['onChange'] = props['onChange'];
		if ('validate' in props) newState['validate'] = props['validate'];
		if ('type' in props) newState['type'] = props['type'];
		if ('width' in props) newState['width'] = props['width'];
		if ('placeholder' in props) newState['placeholder'] = props['placeholder'];
		if ('showAlways' in props) newState['showAlways'] = props['showAlways'];
		if ('disabled' in props) newState['disabled'] = props['disabled'];

		this.setState(newState);
	}
	componentDidUpdate(){
		if (this.state.inEdit) {
			this.textInput.focus();
		}
	}
	componentWillReceiveProps(nextProps) {
		this.stateFromProps(nextProps);
	}
	setEditState(event) {
		event.preventDefault();
		event.stopPropagation();
		this.setState({inEdit : true, tempValue : this.state.value});
	}
	handleKeyUp(e) {
		if (e.keyCode == 27) { // escape key maps to keycode `27`
			this.setState({inEdit : false, tempValue : null});
		}
	}
	handleChange(e) {
		this.setState({tempValue : e.target.value});
	}
	handleSubmit(e) {
		e.preventDefault();
		e.stopPropagation();
		if (this.state.inEdit) {
			var newValue = this.state.tempValue;
			var oldValue = this.state.value;
			this.setState({inEdit : false, value : newValue, tempValue: null});
			if (newValue != oldValue) {
				if (this.state.propName != null) {
					let updateObj = {};
					updateObj[this.state.propName] = this.state.value;
					this.state.onChange(updateObj);
				} else {
					this.state.onChange(this.state.value);
				}
			}
		}
	}

	valueStyle() {
		return this.state.value ? '' : 'font-style: italic; opacity: 0.5';
	}

	valueWithPlaceholder() {
		return this.state.value
				? (this.props.password ? this.state.value.replace(/./g, '*') : this.state.value)
				: this.state.placeholder;
	}

	render() {
		return this.state.inEdit
				? this.renderInput()
				: this.renderValue()
	}

	renderValue() {
		var iconClass = style.text_action + ' ' + style.text_action_button;
		iconClass += (this.state.showAlways) ? (" " + style.text_action_show) : "";
		return (
			<span class={style.editable}>
				<span style={this.valueStyle()}>
					{this.valueWithPlaceholder()}
				</span>
				{ !this.state.disabled
					? <button class={iconClass} onClick={this.setEditState}><i class="fa fa-pencil" aria-hidden="true"></i></button>
					: ''
				}
			</span>
		);
	}
//
	renderInput() {
		return (
			<form class={style.input_form} onSubmit={this.handleSubmit}>
				<input class={style.input} type={ this.state.type }
					ref={(input) => { this.textInput = input; }}
					value={this.state.tempValue}
					onInput={this.handleChange}
					onBlur={this.handleSubmit}
					onKeyUp={this.handleKeyUp}

					style={this.state.width != null ? 'width:' + this.state.width : ''}
				/>
			</form>
		);
	}
}
