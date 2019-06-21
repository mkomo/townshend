function queryString(obj) {
	let params = [];
	for (let property in obj) {
		let encodedKey = encodeURIComponent(property);
		let encodedValue = encodeURIComponent(obj[property]);
		params.push(encodedKey + "=" + encodedValue);
	}
	return params.join("&");
}

function prettyKey(key) {
	return camelKey(key)
		.replace(/([A-Z])/g, ' $1')// insert a space before all caps
		.replace(/^./, function(str){ return str.toUpperCase(); })// uppercase the first character
}

function urlKey(key) {
	return camelKey(key)
		.replace(/([A-Z])/g, '-$1').replace(/^-/, '')// make camelCase dash-case
		.toLowerCase()// lower case the whole key
}

function camelKeyCaps(key) {
	return camelKey(key)
		.replace(/^./, function(str){ return str.toUpperCase(); })
}

function camelKey(key) {
	return key
		.replace(/^./, function(str){ return str.toLowerCase(); })
		.replace(/[\-_]([a-zA-Z])/g, '$1'.toUpperCase())// make dash-case and underscore_case camelCase
}

function deepEqual(a, b) {
	if (a === null || typeof a !== 'object') {
		return a === b;
	} else if (Array.isArray(a)) {
		return Array.isArray(b) && a.length === b.length && a.every((elt, i)=>(deepEqual(elt, b[i])));
	} else {
		if (typeof b !== 'object' || Array.isArray(b) || Object.keys(a).length !== Object.keys(b).length) {
			return false;
		}
		return Object.keys(a).every(key=> {
			return (key in b) && deepEqual(a[key], b[key]);
		})
	}
}

function deepCopy(item) {
	if (typeof item === 'function') {
			return null;
	} else if (item === null || typeof item !== 'object') {
		return item;
	} else if (Array.isArray(item)) {
		let copy = [];
		item.forEach(elt=>{
			copy.push(deepCopy(elt))
		})
		return copy;
	} else {
		//object
		let copy = {};
		for (let elt in item) {
			copy[elt] = deepCopy(item[elt])
		}
		return copy;
	}
}

//TODO move to util class
function findUpdates(subject, original = {}) {
	let changes = {};
	for (let key in original) {
		if (!deepEqual(original[key], subject[key]) && typeof subject[key] !== 'undefined') {
			changes[key] = subject[key]
		}
	}
	return changes
}

function _padDate(num) {
	var norm = Math.floor(Math.abs(num));
	return (norm < 10 ? '0' : '') + norm;
}

function _coerseDate(date) {
	return (typeof date === 'object' && date.constructor === Date)
		? date
		: (typeof date === 'string' ? new Date(Date.parse(date)) : new Date(date));
}

function prettyDate(date) {
	date = _coerseDate(date);
	return date.getFullYear() +
			'-' + _padDate(date.getMonth() + 1) +
			'-' + _padDate(date.getDate());
}
function prettyDateTime(date, includeTimezone = false) {
	date = _coerseDate(date);
	return prettyDate(date) +
			' ' + date.toTimeString().substring(0,includeTimezone ? 17 : 8);
}
export {
	queryString,
	prettyKey,
	urlKey,
	camelKey,
	camelKeyCaps,
	deepEqual,
	deepCopy,
	findUpdates,
	prettyDate,
	prettyDateTime,
}
