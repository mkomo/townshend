import { h } from 'preact';
import { MkComponentEditable, MkComponentPrimative } from './editable'

import style from './style.less';

class MkComponent extends MkComponentEditable {
}

class ArrayView {
	constructor(mapper, reducer, initialValue='') {
		if (typeof mapper === 'string') {
			this.mapper = (o)=>o[mapper];
		} else if (typeof mapper === 'function') {
			this.mapper = mapper;
		} else if (mapper == null) {
			this.mapper = o=>o;
		} else {
			this.mapper = o=>mapper;//mapper is some constant
		}

		if (typeof reducer === 'function') {
			this.reducer = reducer;
		} else {
			let separator;
			if (typeof reducer === 'string') {
				separator = reducer;
			} else {
				separator = '; ';
			}
			this.reducer = (accumulator, currentValue, i) => accumulator + (i !== 0 ? separator : '') + currentValue;
		}

		this.initialValue = initialValue;
	}

	render(value) {
		if (!value) {
			return '';
		} else if (Array.isArray(value)) {
			let mappedValues = value.map(this.mapper);
			if (mappedValues.length > 0 && typeof mappedValues[0] === 'object' && mappedValues[0].constructor.name === 'VNode') {
				return mappedValues;
			} else if (mappedValues.length === 0) {
				return <span class="text-muted font-italic">empty</span>
			} else {
				return mappedValues.reduce(this.reducer, this.initialValue);
			}
		} else {
			return 'error: value is not an array'
		}
	}
}

export {
	MkComponent,
	MkComponentPrimative,
	ArrayView,
}
