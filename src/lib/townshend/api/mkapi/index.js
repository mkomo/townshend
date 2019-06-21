import Api from '../';
import { queryString } from 'lib/mkjs/util';

export default class MkApi extends Api {

	constructor(props, basePath) {
		super(props);
		this.basePath = basePath;
	}

	_getBasePath() {
		return this.basePath;
	}

	get(id, params) {
		let qs = params ? '?' + queryString(params) : '';
		return this.request({
			 url: this._getBasePath() + "/" + id + qs,
			 method: 'GET'
		});
	}

	getRevision(id, revisionNumber) {
		return this.request({
			 url: this._getBasePath() + "/" + id + "/history/" + revisionNumber,
			 method: 'GET'
		});
	}

	listRevisions(id) {
		return this.request({
			 url: this._getBasePath() + "/" + id + "/history",
			 method: 'GET'
		}).then(revList=>{
			console.log('listRevisions', revList);
			return revList.map(rev=>rev.entity).reverse();
		});
	}

	list(params) {
		let qs = (params && Object.keys(params).length > 0) ? '?' + queryString(params) : '';
		return this.request({
			url: this._getBasePath() + qs,
			method: 'GET'
		});
	}

	create(item) {
		return this.request({
			url: this._getBasePath(),
			method: 'POST',
			body: JSON.stringify(item)
		});
	}

	update(item, id=null) {
		id = id || item.id;

		return this.request({
			 url: this._getBasePath() + "/" + id,
			 method: 'PATCH',
			 body: JSON.stringify(item)
		});
	}

	delete(item) {
		let id = item.id;
		return this.request({
			 url: this._getBasePath() + "/" + id,
			 method: 'DELETE'
		}, true);
	}
}
