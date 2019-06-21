import { h, Component } from 'preact';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { InputComponent, Loading, Error, Banner } from '../..';
import { prettyKey, urlKey, camelKey, camelKeyCaps, deepCopy, prettyDateTime } from '../../util';
import style from '../style.less';

const UPDATE_FORM = '_formFieldsToSubmit';
const SCHEMA_KEY = "@schema";

class MkComponentBase extends InputComponent {

	constructor(props = {}) {
		super(props, UPDATE_FORM);
		this.state = {
			subjectId: props[this.getSubjectIdPropKey()],
			subject: props.subject || null,
			error: null,
			isLoading: props.isLoading || false
		}
	}

	getSubjectIdPropKey() {
		return 'id';
	}

	getName() {
		return camelKey(this.constructor.name);
	}

	getEntityName() {
		return camelKeyCaps(this.getName());
	}

	getDisplayName(entity) {
		return prettyKey(this.getName());
	}

	getItemName(entity = {}) {
		console.log('getItemName', this, entity);
		if (entity.name) {
			return entity.name
		} else if (entity.id) {
			return this.getDisplayName(entity) + ` (id: ${entity.id})`
		} else {
			return this.getDisplayName(entity) + " entity";
		}
	}

	getBasePath() {
		return "/" + urlKey(this.getName()) + "s"
	}

	getViewUrl(item=this.state.subject) {
		return this.getBasePath() + "/" + item.id;
	}

	getApi() {
		return this.props.apis[this.getName()];
	}

	fetch(id) {
		if (this.props.revisionNumber) {
			return this.getApi().getRevision(id, this.props.revisionNumber);
		} else {
			return this.getApi().get(id);
		}
	}

	fetchSubject(later) {
		return this.fetchSubjectInternal(this.fetch(this.state.subjectId), later);
	}

	fetchSubjectInternal(fetching, later) {
		fetching.then(subject => {
			this.setState({
				subject: subject,
				isLoading: false,
				error: null,
				[UPDATE_FORM]: null //TODO get this out of here and into edit
			})
			if (later) {
				later(subject);
			}
		}).catch(error => {
			this.setState({
				error: error,
				isLoading: false
			})
		});
	}

	userCan(action) {
		return true;
	}


	_readFieldSpec(fieldSpec, key) {
		if (typeof fieldSpec === 'function') {
			fieldSpec = {
				type: fieldSpec.name.toLowerCase()
			}
		} else if (typeof fieldSpec !== 'object') {
			console.error('fieldSpec not an expected type', key, typeof fieldSpec, fieldSpec);
		} else if (!('type' in fieldSpec)) {
			console.error('fieldSpec does not have type.', key, fieldSpec);
		}
		return fieldSpec;
	}

	getFields(subject = {}) {
		let fields;
		if (this.props.config &&
				this.props.config.entitySchemata[this.getEntityName()] &&
				this.props.config.entitySchemata[this.getEntityName()].properties) {
			let schema =  this.props.config.entitySchemata[this.getEntityName()].properties;
			fields = schema;
		} else {
			fields = {};
			Object.keys(subject).forEach(key=>{
				fields[key] = {};	//TODO define this based on subject[key] value
			});
		}
		return deepCopy(fields);
	}

	getComponentListProps() {
		return {};
	}

	getFieldComponent(fieldName, entity, subject) {
	}

	renderFieldValue(value, subject, key, fieldSpec={}, opts={}) {
		if ('$value' in fieldSpec) {
			value = fieldSpec['$value'];
		}
		console.debug('renderFieldValue', key, value, subject, fieldSpec, opts);
		let bare = opts.bare;

		if ('view' in fieldSpec) {
			value = fieldSpec.view.render(value);
		} else if ('valueFunc' in fieldSpec) {
			value = fieldSpec.valueFunc(value, subject);
		} else {
			if (typeof value === 'boolean') {
				let clazz = value ? 'fa-check-square-o' : 'fa-square-o';
				value = <div class="d-inline-block ml-n3 mx-2">
					<i class={"fa " + clazz} aria-hidden="true"></i>
				</div>
				bare = true;
			} else if (typeof value === 'number') {
				value = value;
			} else if (typeof value === 'string') {
				if (!fieldSpec.type || fieldSpec.format === 'date-time') {
					let date = Date.parse(value);
					if (!isNaN(date)) {
						value = prettyDateTime(date);
					}
				}
			} else if (typeof value === 'object') {
				let fieldEntity = opts.entity ? this.getFieldComponent(key, opts.entity, subject, fieldSpec) : null;
				let isSingle = !Array.isArray(value);
				if (opts.entity && fieldEntity && fieldEntity.useInView) {
					let embedProps = this.getComponentListProps(key, value, isSingle);
					value = h(fieldEntity.componentType, embedProps);
					bare = true;
				} else if (!isSingle) {
					value = this.renderArrayFieldValue(value);
				} else if (value != null) {
					value = this.renderObjectFieldValue(value, opts);
				}
			} else if (typeof value === 'undefined') {
				//key is not present in subject or is undefined.
			} else {
				console.error('renderFieldValue ERROR', key, value, typeof value, subject, fieldSpec);
			}
		}
		if (fieldSpec.multiline) {
			value = value != null
				? <div class={style.field_scroll_overflow}>
						{value.split(/\n+/).map(para=><p>{para}</p>)}
					</div>
				: value;
		}
		if (value == null || (typeof value === 'string' && value.trim().length == 0)) {
			value = this.renderEmptyFieldValue();
		}
		return bare ? value : <div class="form-control form-control-plaintext">{value}</div>;
	}

	renderEmptyFieldValue() {
		return <span class="text-muted font-italic">empty</span>;
	}

	renderArrayFieldValue(value) {
		if (value && value.length > 0) {
			return <ul>
				{value.map(v=><li>
						{this.renderFieldValue(v)}
					</li>)}
			</ul>
		} else {
			return this.renderEmptyFieldValue();
		}
	}

	renderObjectFieldValue(value, opts) {
		if (SCHEMA_KEY in value
				&& value[SCHEMA_KEY] in this.props.config.entitySchemata
				&& value[SCHEMA_KEY] in this.props.entities) {
			let proto = this.props.entities[value[SCHEMA_KEY]];
			let text = proto.getItemName(value);
			return (!opts.bare) ? <a href={proto.getViewUrl(value)}>{text}</a> : text
		}
		return this._renderFields(value);
	}

	isPrimative() {
		//TODO figure out better soln to this.
		return false;
	}

	renderField(subject, key, fieldSpec, opts) {
		console.debug(this.constructor.name, 'renderField', key, subject, fieldSpec, opts);
		let currentValue = key in subject ? subject[key] : '';
		if (fieldSpec.type === 'null') {
			return '';
		}
		let title = 'title' in fieldSpec ? fieldSpec.title : prettyKey(key);
		opts.id = "subject_" + key;
		opts.helpId = "subject_help_" + key;
		let fieldValue = this.renderFieldValue(subject[key], subject, key, fieldSpec, opts);
		let fieldCaption = this.renderFieldCaption(key, opts.helpId, fieldSpec)
		let classes = '';
		if (fieldSpec.if) {
			classes = 'border-left border-info pl-3 ml-2';
			if (this.validateIf(subject, fieldSpec.if)) {
				// add class for fade in and indent
				classes += (' ' + style.field_shown);
			} else {
				// add class for fade out and indent
				classes += (' ' + style.field_hidden);
			}
		}

		return <div class={classes}>
			{ (fieldSpec.type === 'boolean')
			? <div class={"form-check " + style.mk_check}>
					{ fieldValue }
					<label class="form-check-label" for={opts.id}>{title}</label>
					{ fieldCaption }
				</div>
			: <div class={"form-group"}>
					<label for={opts.id}>{title}</label>
					{ fieldValue }
					{ fieldCaption }
				</div>
			}
			</div>
	}

	validateIf(subject, conditions) {
		console.debug('validateIf', subject, conditions)
		for (let property in conditions) {
			let cond = conditions[property];
			//TODO handle all validation here
			if (cond.enum && !(cond.enum.includes(subject[property]))) {
				return false;
			} else if (cond.properties && !this.validateIf(subject[property] || {}, cond.properties)) {
				return false;
			}
		}
		return true;
	}

	renderFieldCaption(key, helpId, fieldSpec = {}) {
		return 'description' in fieldSpec
			? <small id={helpId} class="form-text text-muted">{fieldSpec.description}</small>
			: '';
	}

	render() {
		if (this.state.isLoading || (!this.state.subject && !this.state.error)) {
			return this.renderLoading();
		} else if (this.state.error) {
			return  this.renderError(this.state.error);
		} else {
			return this.renderInternal();
		}
	}

	renderLoading() {
		return <Loading />
	}

	renderError(error) {
		return <Error error={error} />
	}

	renderInternal() {
		return this.renderView(this.state.subject);
	}

	renderView(subject) {
		if (!subject) {
			return '';
		}
		return <div class={style.field_view}>
			{this._renderFields(subject, {
				fields: this.getFields(subject),
				title: this.getDisplayName(subject),
				entity: subject
			})}
		</div>
	}

	_renderFields(subject, opts={}) {
		let keys = opts.fields ? Object.keys(opts.fields) : Object.keys(subject);
		let fieldSpecFunc = opts.fields ? this._readFieldSpec : ()=>({});
		opts.fields = opts.fields || [];
		return <div>
			{ opts.title ? <h1>{ opts.title }</h1> : '' }
			{
				keys.map(key=>
					this.renderField(subject, key, fieldSpecFunc(opts.fields[key], key), opts)
				)
			}
		</div>
	}

}

export {
	MkComponentBase,
	UPDATE_FORM
}
