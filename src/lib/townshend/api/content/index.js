import MkApi from '../mkapi';

export default class ContentApi extends MkApi {

	constructor(props) {
		super(props, '/content');
	}

	get(path) {
		return super.get('path' + path);
	}
}
