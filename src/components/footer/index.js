import { h, Component } from 'preact';
import { Link } from 'preact-router';
import style from './style.less';

export default class Footer extends Component {
	render(props) {
		return <footer class={"" + style.footer}>
				<div class="text-center pt-5 pb-3"><span class={style.copyright}>Copyright &copy; 2019</span></div>
			</footer>
	}
}
