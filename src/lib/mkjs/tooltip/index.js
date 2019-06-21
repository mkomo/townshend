import { h, Component } from 'preact';
import style from './style.less';

export default class Tooltip extends Component {
	constructor(props = {}) {
		super(props);
		this.state = {
			position: props.position || 'bottom',
		};
	}

	render() {
		return (
			<div class={style.tooltip + (this.props.className ? ' ' + this.props.className : '')}>
				{this.props.children}
				<span class={style.tooltiptext + ' ' + style['tooltiptext_' + this.state.position]}>
					{this.props.text}
				</span>
			</div>
		);
	}

}
