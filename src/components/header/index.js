import { h, Component } from 'preact';
import { Link } from 'preact-router';
import { LoadingInline } from 'lib/mkjs';
import { TOWNSHEND_LINKS } from 'lib/townshend/components/townshendentities';
import {
	Navbar,
	NavbarToggler,
	NavbarBrand,
	Nav,
	NavItem,
	NavLink,
	Dropdown,
	DropdownToggle,
	DropdownMenu,
	DropdownItem } from 'reactstrap';
import style from './style.less';

export default class Header extends Component {
	constructor(props) {
		super(props);

		this.toggle = this.toggle.bind(this);
		this.handleLogout = this.handleLogout.bind(this);

		this.state = {};
		this.componentWillReceiveProps(props);
	}

	componentWillReceiveProps(nextProps, nextState) {
		this.setState({
			usermenu: false,
			hamburger: false,
		});
	}

	toggle(key) {
		this.setState({
			[key]: !this.state[key]
		});
	}

	handleLogout() {
		this.props.apis.user.logout()
		.then(response => {
			this.props.onLogout();
		}).catch(error => {
			console.error('error logging in. TODO show error',error);
		});
	}

	getDropdownItems() {
		if (this.props.isAuthenticated) {
			//TODO get admin or non-admin
			let items = [
				<DropdownItem>
					{this.props.currentUser.username}
				</DropdownItem>
			];
			if (this.props.userIsAdmin) {
				items = items.concat([
					<DropdownItem divider />,
					TOWNSHEND_LINKS.map(l=><DropdownItem tag="a" href={ "/" + l.path }>
						{l.name}
					</DropdownItem>),
				]);
			}
			items = items.concat([
				<DropdownItem divider />,
				<DropdownItem tag="a" href="/auth/my-account" >
					my account
				</DropdownItem>,
				<DropdownItem onClick={this.handleLogout}>
					log out
				</DropdownItem>
			])
			return items;
		} else {
			return []
		}
	}

	getNavItems() {

	}

	getUserNav() {
		let classes = [style.nav_dropdown, style.narrow_include, style.vcenter, "mx-2", "mr-lg-5"].join(' ');
		if (this.props.isAuthenticated) {
			let ddItems = this.getDropdownItems();
			return <Dropdown nav inNavbar className={classes} isOpen={this.state.usermenu} toggle={()=>this.toggle('usermenu')}>
				<DropdownToggle nav>
					<i class="fa fa-bars" aria-hidden="true"></i>{/*TODO add headshot*/}
				</DropdownToggle>
				<div tabindex="-1" role="menu" aria-hidden="true" class={"dropdown-menu dropdown-menu-right" + (this.state.usermenu ? " show" : "")}>
					{ ddItems }
				</div>
			</Dropdown>
		} else if (this.props.isLoading) {
			return <NavItem className={classes}><Link className="nav-link"><LoadingInline /></Link></NavItem>
		} else {
			return <NavItem className={classes}>
				<div class="btn-group">
					<Link href="/auth/login" className="btn btn-sm btn-mkjs-primary">log in</Link>
					<Link href="/join" className="btn btn-sm btn-mkjs-primary">join</Link>
				</div>
			</NavItem>
		}
	}

	render(props) {
		return (
			<div class={style.nav_container}>
				<Navbar dark expand="xs" className="text-nowrap">
					<Nav className={ "ml-auto" } navbar>
						{ this.getUserNav() }
					</Nav>
					<div class={style.left_menu + " ml-2 ml-lg-5"}>
						<a href={"/"}>
							Starter
						</a>
					</div>
				</Navbar>
			</div>
		);
	}
}
