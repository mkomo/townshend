import { h, Component } from 'preact';
import { Error } from '../..';
import { MkComponentBase } from '../base';
import { prettyKey } from '../../util';

import style from '../style.less';

function compare(a, b, objectA, objectB) { //TODO move this to util
	// TODO make this WAAAAAY more efficient
	a = typeof a === 'string' ? a : JSON.stringify(objectA);
	b = typeof b === 'string' ? b : JSON.stringify(objectB);
	return a.localeCompare(b);
}

class MkComponentListable extends MkComponentBase {

	constructor(props = {}) {
		super(props);

		this.state = Object.assign(this.state, {
			listing: this.isListing(props),
			showBareList: props.showBareList || false
		})

		this.renderList = this.renderList.bind(this);
	}

	isListing(props) {
		return 'listing' in props ? props.listing : false;
	}

	renderInternal() {
		if (!this.state.isLoading && this.state.listing) {
			let subject = this.props.subject || this.state.subject;
			if (this.state.showBareList) {
				return this.renderList(subject, {isEmbedded: true});
			} else {
				return this.renderListPage(subject);
			}
		} else {
			return super.renderInternal();
		}
	}

	renderListItemNumber(index, item, list) {
		if (this.isRevisionList()) {
			return list.length - index;
		} else {
			return index + 1;
		}
	}

	getActions(list) {
		let actions = {};
		return actions;
	}

	//TODO only action for history should be restore
	//TODO second row with colspan showing audit history
	renderActions(actions, item, index, {list, isEmbedded}) {
		actions = Object.assign({}, actions);
		//TODO move these to editable getActions
		if (this.userCan('update', item) && !isEmbedded && !this.isPrimative()) {
			actions['update'] = (obj) => {
				return this.renderListButton('pencil', null, this.getEditUrl(obj));
			}
		}
		if (this.userCan('delete', item) && (!isEmbedded || this.props.enableActions)) {
			actions['delete'] = (obj, index) => {
				return this.renderListButton('trash', e=>{
					console.log('Showing deletion confirm', obj, index, this.state.onDelete, this.isPrimative());
					if (this.isPrimative() || window.confirm("Are you sure you want to permanently delete this item?")) {
						this.submitDelete(obj, index);
					}
				});
			}
		}
		actions = Object.assign({}, this.getActions(list) || {}, actions);
		return Object.values(actions).map(action=>action(item, index, list))
	}

	renderList(list, {actions={}, headerAction, headerActionText, isEmbedded}) {
		let listFields = this._listFieldsInternal(list);
		let cols = Object.keys(listFields);
		let colHeader = (colName)=>{
			let colTitle = (colName in listFields && "title" in listFields[colName])
					? listFields[colName].title
					: prettyKey(colName);
			if (isEmbedded || !(colName in listFields)) {
				return colTitle;
			} else {
				return <a href="#" onClick={(e)=>{
					let sortOrder = (this.state.sortColumn === colName) ? !this.state.sortOrder : false;
					this.setState({
						subject: this.sortedDisplayList(list, colName, listFields[colName], sortOrder),
						sortColumn: colName,
						sortOrder: sortOrder
					})
					e.preventDefault();
				}}>{colTitle}</a>
			}
		}
		return <div class="table-responsive">
		<table class={["table", "table-hover", "mb-3", style.break_word, style.mk_list_table].join(' ') }>
			{ (!this.props.isSingle && list.length > 0) || (headerAction)
				? <thead>
						<tr>
							<th>{ headerAction
								? <button class="btn btn-secondary btn-sm" onClick={headerAction}>{headerActionText}</button>
								: colHeader('#') }
							</th>
							{cols.map(fieldName=><th>{(!this.props.isSingle && list.length > 0) ? colHeader(fieldName) : ''}</th>)}
							<th></th>
						</tr>
					</thead>
				: ''
			}
			<tbody>
				{list.map((item, index)=><tr>
					{ this.props.isSingle ? '' : <th scope="row">{this.renderListItemNumber(index, item, list)}</th> }
					{ cols.map((fieldName, i)=>
						<td>
							{ this.getCellValue(
									this.renderFieldValue(item ? item[fieldName] : null, item, fieldName, listFields[fieldName], {bare: true, index: index}),
									item, i, isEmbedded, actions
								) }
						</td>
					)}
					<td>
						{ this.renderActions(actions, item, index, {list, isEmbedded}) }
					</td>
				</tr>)}
			</tbody>
		</table>
		</div>
	}

	getCellValue(value, item, i, isEmbedded, actions) {
		if ((!this.props.noLinks) && i === 0 && (!isEmbedded || Object.keys(actions).length == 0)) {
			return <a class="pl-2 text-muted" href={this.getViewUrl(item)}>{value}</a>
		} else {
			return value;
		}
	}

	getListHeaderButtons(list) {
		return [];
	}

	isRevisionList() {
		return this.props.historySubjectId;
	}

	getListTitle() {
		return this.getDisplayName() + ' ' + (this.isRevisionList() ? 'history' : 'list');
	}

	renderListPage(list) {
		return <section>
			<div class="clearfix">
				<h1 class="pull-left">{this.getListTitle()}</h1>
				<div class="mb-2 clearfix">
					{ this.getListHeaderButtons(list) }
				</div>
			</div>
			{ this.renderList(list, {}) }
		</section>
	}

	renderListButton(icon, onClick, href=null) {
		let i = icon
			? <i class={"fa fa-" + icon} aria-hidden="true"></i>
			: <i class={"fa fa-arrow-down"} aria-hidden="true"></i>;
		if (!onClick && !href) {
			onClick = ()=>{alert('action not implemented')};
		}
		return <a class="btn btn-sm btn-action btn-link" style={ icon ? '' : "visibility: hidden"} onClick={onClick} href={href}>{i}</a>
	}

	getListParams() {
		return {};
	}

	fetchList(params=this.props.matches) {
		params = Object.assign({}, this.getListParams(), params);
		console.debug('fetching list', params);
		return this.getApi().list(params);
	}

	fetchRevisionHistoryList(id) {
		return this.getApi().listRevisions(id);
	}

	fetchSubject(later) {
		if (this.state.listing) {
			if (this.isRevisionList()) {
				return this.fetchSubjectInternal(this.fetchRevisionHistoryList(this.isRevisionList()), later);
			} else {
				return this.fetchSubjectInternal(this.fetchList(), later);
			}
		} else {
			return super.fetchSubject(later);
		}
	}

	_listFieldsInternal(list) {
		return this.isRevisionList() ? this.getRevListFields(list) : this.getListFields(list);
	}

	getRevListFields(list) {
		return {
			dateUpdated: {},
			updatedBy: {
				valueFunc: (a)=>(a && a.username)
			}
		}
	}

	getListFields(list) {
		let allFields = [].concat.apply([], //flatten
				list.map(item=>Object.keys(item))//get keys
			).filter((v, i, a) => a.indexOf(v) === i) //unique
		let fields = {};
		allFields.forEach(f=>{
			fields[f] = {}
		})
		return fields;
	}

	getComponentListProps(key, currentValue, isSingle) {
		return Object.assign({}, this.props, {
			subject: isSingle ? (currentValue ? [currentValue] : []) : currentValue || [],
			listing: true,
			isSingle: isSingle,//TODO handle isSingle
			showBareList: true,
		});
	}

	sortedDisplayList(list, fieldName, fieldSpec, sortOrder) { //TODO move this to util
		console.log('sortedDisplayList', fieldName, sortOrder);
		return list.sort((itemA, itemB)=> {
			let result;
			let a = this.renderFieldValue(itemA[fieldName], itemA, fieldName, fieldSpec, {bare: true, index: 0})
			let b = this.renderFieldValue(itemB[fieldName], itemB, fieldName, fieldSpec, {bare: true, index: 0})
			if (a && b) {
				result = compare(a, b, itemA[fieldName], itemB[fieldName]);
			} else if (!a) {
				result = 1;
			} else {
				result = -1;
			}
			return sortOrder ? -1 * result : result;
		});
	}
}

export {
	MkComponentListable
}
