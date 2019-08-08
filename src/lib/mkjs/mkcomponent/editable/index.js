import { h, Component } from 'preact';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Error, Banner } from '../..';
import { UPDATE_FORM } from '../base';
import { MkComponentListable } from '../listable';
import { findUpdates, deepCopy } from '../../util';
import { route } from 'preact-router';

import style from '../style.less';

const MULTISELECT_CHECKBOX_MAX_ITEMS = 20;
const RADIO_BUTTON_MAX_ITEMS = 6;

const FIELD_PROPERTY_AUTOGEN = "@autogenerated";

class MkComponentEditable extends MkComponentListable {

	constructor(props = {}, {shouldRefetch} = {}) {
		super(props);

		this.state = Object.assign(this.state, {
			onUpdate: props.onUpdate || null,
			onCreate: props.onCreate || null,
			onDelete: props.onDelete || null,
			editing: this.isEditing(props),
			creating: this.isCreating(props),
			createButton: 'createButton' in props,
			formError: null,
			defaultFormValues: props.defaultFormValues || {},
			creatingInModal: props.creatingInModal,
			hideCancel: props.hideCancel
		});

		if (this.state.editing && this.state.modalEditSubject == null && !this.state.onUpdate) {
			this.state.onUpdate = (subject) => {
				//must fetch subject because, routing back to the same component will not initiate fetch;
				this.fetchSubject();
				route(this.getViewUrl(subject));
			}
		}

		if (this.state.creating) {
			this.state.subject = true;
		} else if ((props.apis && !props.noFetch)
				&& (shouldRefetch || (this.state.subject === null && !props.isLoading))) {
			this.fetchSubject();
		}

		this.submitUpdate = this.submitUpdate.bind(this);
		this.submitCreate = this.submitCreate.bind(this);
	}

	componentWillReceiveProps(props) {
		//TODO check deep equal -- instead of a string or numerical id this could be some sort of criteria set
		if (props[this.getSubjectIdPropKey()] !== this.state.subjectId ||
				this.state.editing !== this.isEditing(props) ||
				this.state.listing !== this.isListing(props) ||
				(this.state.isLoading && !props.isLoading) ||
				props.forceRefresh) {

			let shouldRefetch = this.state &&
				this.state.subjectId &&
				props[this.getSubjectIdPropKey()] !== this.state.subjectId;
			this.constructor(props, {shouldRefetch});
		}
	}

	isEditing(props = {}) {
		return 'editing' in props ? props.editing : 'edit' in props;
	}

	isCreating(props = {}) {
		return 'creating' in props ? props.creating : 'create' in props;
	}

	isListing(props = {}) {
		return (this.isEditing(props) || this.isCreating(props)) ? false : super.isListing(props);
	}

	clearUpdateForm() {
		this.setState({
			[UPDATE_FORM]: null
		})
	}

	callUpdate(updates, id) {
		return this.getApi().update(updates, id);
	}

	submitUpdate(id, updates, entity) {
		this.setState({
			isLoading: true
		})
		this.callUpdate(updates, id, entity).then(subject => {
			let index = this.state.modalEditIndex;
			//TODO allow options of going back to list, staying on edit page, going to presentation page
			this.setState({
				isLoading: false,
				editing: false,
				modalEditSubject: null,
				modalEditIndex: null,
				formError: null,
				[UPDATE_FORM]: null
			});
			if (this.state.onUpdate) {
				this.state.onUpdate(subject, index);
			}
		}).catch(error => {
			this.handleError(error);
		});
	}

	submitCreate(item, event) {
		this.setState({
			isLoading: true
		})
		this.getApi().create(item).then(subject => {
			if (this.state.creatingInModal) {
				console.log('!!!!!!creatingInModal', this.state)
				let newState = {
					isLoading: false,
					creating: false,
					creatingInModal: false,
					formError: null,
					[UPDATE_FORM]: null,
				}
				if (this.state.listing) {
					this.fetchSubject(); //TODO move this to onCreate from create new button
				} else {
					//set subject so that renderView doesn't error out.
					newState.subject = subject;
				}
				this.setState(newState);
				if (this.state.onCreate) {
					this.state.onCreate(subject, item);
				}
			} else if (this.state.onCreate) {
				this.state.onCreate(subject, item);
			} else {
				route(this.getViewUrl(subject));
			}
		}).catch(error => {
			this.handleError(error);
		});
	}

	submitDelete(item, index) {
		this.getApi().delete(item).then(() => {
			if (this.state.onDelete) {
				this.state.onDelete(item, index);
			}
			//this makes sense in the context of a list page
			if (!this.props.subject) {
				this.fetchSubject();
			}
		}).catch(error => {
			this.handleError(error);
		});
	}

	_fieldReference(CT, {
			criteria = {},
			nameFunc = item=>item ? item.name : 'null',//TODO use CT().getItemName(item)
			valueFunc = item => item,
			isSelected = (sel,item)=>(sel && item && sel.id == item.id)//TODO create getId(item)?
		} = {}) {
		let component = new CT(Object.assign({noFetch: true}, this.props));
		return {
			componentType: CT,
			isReference: true,
			optionList: (subject)=>{
				return component.fetchList(criteria).then((list)=>{
					return list.map(item=>({
						name : nameFunc(item),
						value : valueFunc(item),
						isSelected: isSelected
					}));
				});
			}
		}
	}

	getEditableFields(subject = {}) {
		let fields = this.getFields(subject);
		let editableFields = {};
		Object.keys(fields).forEach(fieldName=> {
			if (!fields[fieldName][FIELD_PROPERTY_AUTOGEN]) {
				//TODO exclude fields that are write-once
				editableFields[fieldName] = fields[fieldName];
			}
		})

		//TODO determine if field is a reference (then show dropdown with option to create)
		//TODO if field is child, also populate componentType so form knows what to build
		return editableFields;
	}

	getCreateFields() {
		//TODO filter fields that have a hint to not be part of create form.
		//TODO if field is a child (CASCADE=ALL), then don't include in create, but do include in edit.
		return this.getEditableFields();
	}

	listSwitchPostion(list, i, j) {
		let prevI = list[i];
		list[i] = list[j];
		list[j] = prevI;
		this.setState({});
	}

	getListHeaderButtons(list) {
		if (this.isRevisionList()) {
			return <a class="pull-right" href={list.length > 0 ? this.getViewUrl(list[0]) : ''}>view</a>
		} else if (this.userCan('create')) {
			return this.getCreateInModalButton()
		}
	}

	getCreateInModalButton(text="Create New") {
		return <button class="pull-right btn btn-success" onClick={()=>this.setState({creatingInModal: true})}>{text}</button>
	}

	renderList(list, {isEmbedded = false} = {}) {
		let headerAction, headerActionText;

		if (this.props.enableActions && this.userCan('create') //should show create action
				&& isEmbedded // do not show header action in a regular list
				&& (!this.props.isSingle || list.length === 0)) { //do not show add button if this is an object instead of array
			headerAction = (e) => {
				e.preventDefault();
				if (this.isPrimative()) {
					list.push(this.getNewValue());
					this.setState({});
				} else {
					this.setState({creatingInModal: true});
				}
			}
			headerActionText = <i class="fa fa-plus" aria-hidden="true"></i>
		}

		let actions = {};
		if (isEmbedded && this.props.enableActions) {
			actions['moveUp'] = (item, index) => {
				return index > 0
					? this.renderListButton('arrow-up', e=>{
							this.listSwitchPostion(list, index, index - 1);
						})
					: '';
			}
			actions['moveDown'] = (item, index) => {
				return index < list.length - 1
					? this.renderListButton('arrow-down', e=>{
							this.listSwitchPostion(list, index, index + 1);
						})
					: this.renderListButton();
			}
			if (!this.isPrimative()) {
				actions['update'] = (item, index) => {
					return this.renderListButton('pencil', e=>{
						this.setState({
							modalEditSubject: item,
							modalEditIndex: index
						})
					});
				}
			}
		}

		return super.renderList(list, {actions, headerAction, headerActionText, isEmbedded});
	}

	renderFieldValue(value, item, fieldName, fieldSpec, opts={}) {
		//TODO how to determine if you should render edit field?
		if ((opts.editable || this.isPrimative()) && !fieldSpec.immutable) {
			return this.renderEditFieldInput(item, fieldName, fieldSpec, opts);
		} else {
			return super.renderFieldValue(value, item, fieldName, fieldSpec, opts);
		}
	}

	renderView(subject) {
		return <div>
			{ this.editBanner(subject) }
			{ super.renderView(subject) }
		</div>
	}

	editBanner(subject, icon='caret-down') {
		return this.userCan('update', subject)
			? <Banner fullWidth>
					{ icon ? <i class={ "pr-2 fa fa-" + icon } aria-hidden="true"></i> : '' }
					This is a {this.getDisplayName()} that you can <a href={this.getEditUrl(subject)}>edit</a>.
				</Banner>
			: ''
	}

	renderInternal() {
		if (this.state.editing) {
			if (this.userCan('update', this.state.subject)) {
				return this.renderUpdate(this.state.subject);
			} else {
				return <Error message="You do not have permission to edit this" />
			}
		} else if (this.state.creating) {
			if (this.userCan('create')) {
				return this.renderCreate();
			} else {
				return <Error message="You do not have permission to create" />
			}
		} else {
			return <div>
				{ this.state.modalEditSubject
					? <Modal isOpen={true}>
						<ModalBody className={style.modal_body_form} >
							{ this.renderUpdate(this.state.modalEditSubject)}
						</ModalBody>
					</Modal>
					: ''
				}
				{ this.state.creatingInModal && !this.isPrimative()
					? <Modal isOpen={true}>
						<ModalBody className={style.modal_body_form} >
							{this.renderCreate()}
						</ModalBody>
					</Modal>
					: ''
				}
				{ !this.state.creatingInModal && !this.state.modalEditSubject && this.state.formError
					? <Banner formError={this.state.formError} />
					: ''
				}
				{ (this.state.createButton)
					? this.getCreateInModalButton(this.props.createButtonText)
					: super.renderInternal() }
			</div>
		}
	}

	renderCreate() {
		//TODO get create fields
		let fields = this.getCreateFields();

		if (!(UPDATE_FORM in this.state) || this.state[UPDATE_FORM] === null) {
			let form = this.getCreateForm(fields);
			console.log('renderCreate: prepared create form', form)
			this.state[UPDATE_FORM] = form;
		}
		return this._renderEdit(fields)
	}

	getCreateForm(fields) {
		let form = Object.assign({}, this.state.defaultFormValues);
		Object.keys(fields).forEach(key=>{
			let fieldSpec = this._readFieldSpec(fields[key], key);
			if (key in form) {
				//key is already present in form from defaultFormValues
			} else if ('default' in fieldSpec) {
				form[key] = fieldSpec.default;
			} else {
				let type = fieldSpec.type;
				if (type === 'boolean') {
					form[key] = false;
				} else if (type === 'object' || type === 'null') {
					form[key] = null;
				} else if (type === 'array') {
					form[key] = [];
				} else if (type === 'string' || type === 'number' || type === 'integer') {
					form[key] = null;
				} else {
					console.error('fieldSpec type unrecognized', key, fieldSpec);
					form[key] = null;
				}
			}
		})
		return form;
	}

	getUpdateForm(item, fields) {
		let copy = {};
		//only deep copy fields;
		for (let fieldName in fields) {
			let field = fields[fieldName];
			if ('$value' in field) {
				copy[fieldName] = field['$value'];
			} else if (fieldName in item && item[fieldName] !== null) {
				copy[fieldName] = deepCopy(item[fieldName])
			} else {
				copy[fieldName] = field.type === 'array' ? [] : null;
			}
		}
		return copy;
	}

	renderUpdate(entity) {
		console.debug('renderUpdate', entity, this.state);
		let fields = this.getEditableFields(entity);
		this.primeUpdate(fields, entity)
		//TODO if entity field has changed but the same UPDATE_FORM field has not changed, update the UPDATE_FORM value
		//TODO keep track of fields that have changed in the updateForm so that only those fields can be submitted for update

		return this._renderEdit(fields, true, entity)
	}

	primeUpdate(fields, entity = this.state.subject) {
		if (!(UPDATE_FORM in this.state) || this.state[UPDATE_FORM] === null) {
			this.state[UPDATE_FORM] = this.getUpdateForm(entity, fields);
		}
	}

	prepareUpdate(subject, entity) {
		return subject;
	}

	prepareCreate(subject) {
		return subject;
	}

	validateAll(subject, entity) {
		console.log(this.constructor.name, 'validateAll', subject, entity);
		if (entity && Object.keys(subject).length === 0) {
			return {
				content: "No changes were made in this form. Nothing to submit.",
				level: "warning"
			};
		}
		//TODO add field validation
		return this.validate(subject, entity);
	}

	validate(subject, entity) {
	}

	getEditTitle(isUpdate, entity) {
		return (isUpdate ? 'Update ' : 'Create a New ') + this.getDisplayName(entity);
	}

	getEditButtonText(isUpdate) {
		return isUpdate ? 'Update' : 'Create';
	}

	handleCancel(isUpdate, entity){
		if (isUpdate) {
			route(this.getViewUrl(entity));
		} else {
			history.back();
		}
	}

	_renderEdit(fields, isUpdate=false, entity) {
		//TODO figure out double rendering

		let cancelAction = ()=> {
			if (this.state.modalEditSubject) {
				this.setState({
					modalEditSubject: null,
					modalEditIndex: null,
					[UPDATE_FORM]: null,
					formError: null
				});
			} else if (this.state.creatingInModal) {
				this.setState({
					creatingInModal: false,
					formError: null
				});
			} else {
				this.handleCancel(isUpdate, entity)
			}
		}
		let cancelButton = <button type="button" class="btn btn-secondary ml-2" onClick={cancelAction}>Cancel</button>

		if (!fields || Object.keys(fields).length === 0) {
			return <div>
				<Error message={"No fields defined for " + this.getDisplayName(entity) + '.'} />
				<div class={style.full_page_form_submit + " clearfix my-3"}>
					{cancelButton}
				</div>
			</div>
		}
		let subject = this.state[UPDATE_FORM];
		let action;
		let fieldProps = {entity, fields, editable: true};
		if (!this.props.preview) {
			fieldProps.title = this.getEditTitle(isUpdate, entity);
			action = (e)=>{
				e.preventDefault();
				if (isUpdate) {
					subject = findUpdates(subject, this.getUpdateForm(entity, fields));
				}
				let validationResult = this.validateAll(subject, entity);
				if (validationResult) {
					this.setState({
						formError: validationResult
					})
					//TODO scroll to top of form instead of top of page
					window.scrollTo(0, 0);
					return;
				}
				if (isUpdate) {
					subject = this.prepareUpdate(subject, entity);
					return this.submitUpdate(entity.id, subject, entity);
				} else {
					subject = this.prepareCreate(subject);
					return this.submitCreate(subject, e);
				}
			};
		}
		return <form class={style.full_page_form} onSubmit={action}>
			{this.state.formError
				? <Banner formError={this.state.formError} />
				: ''
			}
			{ this._renderFields(subject, fieldProps)}
			{ action
				? <div>
						<div class={style.full_page_form_submit + " clearfix mt-3"}>
							<button type="submit" class="btn btn-primary">{this.getEditButtonText(isUpdate)}</button>
							{this.state.hideCancel ? '' : cancelButton}
						</div>
						{ isUpdate
							? this.getUpdateFooter(subject)
							: this.getCreateFooter(subject)
						}
					</div>
				: ''
			}
		</form>
	}

	getUpdateFooter() {

	}

	getCreateFooter() {

	}

	getComponentListProps(key, currentValue, isSingle, enableActions=false) {
		let updateListFunction = (changeFunc) => {
			return (subject, index)=>{
				let list = this.state[UPDATE_FORM][key];
				changeFunc(list, index, subject);
				this.setState({});
			}
		}
		let updateObjectFunction = (subject) => {
			this.state[UPDATE_FORM][key] = subject;
			console.log('updateObjectFunction', subject, this.state[UPDATE_FORM]);
			this.setState({});
		}
		return Object.assign(super.getComponentListProps(key, currentValue, isSingle), {
			editing: false,
			creating: false,
			onUpdate: isSingle ? updateObjectFunction : updateListFunction((list, index, subject)=>{
				list[index] = subject;
			}),
			onDelete: isSingle ? ()=>updateObjectFunction(null) : updateListFunction((list, index, subject)=>{
				list.splice(index, 1);
			}),
			onCreate: isSingle ? updateObjectFunction : updateListFunction((list, index, subject)=>{
				list.push(subject);
			}),
			enableActions
		});
	}

	//handle rendering of objects and arrays
	renderObjectFieldInput(subject, fieldName, fieldSpec, {entity, currentValue, type}) {
		let fieldEntity = this.getFieldComponent(fieldName, entity, subject, fieldSpec);
		let isSingle = type === 'object';
		let embedProps = this.getComponentListProps(fieldName, currentValue, isSingle, true);
		if (fieldEntity && fieldEntity.isReference) {
			let optionList = fieldEntity.optionList;
			if (Array.isArray(optionList)) {
				embedProps.options = new Promise(function(resolve, reject) {
					resolve(optionList);
				});
			} else if (typeof optionList === 'function') {
				embedProps.options = new Promise(function(resolve, reject) {
					resolve(optionList(entity ? entity : subject));
				});
			} else if (typeof optionList === 'object' && p.constructor === Promise) {
				embedProps.options = optionList;
			} else {
				console.error('could not find entityType', type, fieldName, currentValue, fieldEntity);
				return <Error message="cannot determine list of options for reference" />
			}
			//TODO handle multiselect; handle pagination/search
			return <MkObjectReferenceComponent {...embedProps} />
		} else if (fieldEntity && fieldEntity.componentType) {
			embedProps.defaultFormValues = fieldEntity.defaultFormValues || {};
			return h(fieldEntity.componentType, embedProps);
		} else if (type === 'array' && 'items' in fieldSpec && 'type' in fieldSpec.items
				&& ['string', 'number', 'integer'].includes(fieldSpec.items.type)) {
			embedProps.fieldSpec = fieldSpec;
			if (fieldSpec.enum && fieldSpec.enum.length <= MULTISELECT_CHECKBOX_MAX_ITEMS) {
				return this.renderMultiCheck(fieldName, fieldSpec.enum, subject[fieldName])
			} else {
				console.debug('creating MkComponentPrimative', embedProps);
				return <MkComponentPrimative {...embedProps} />;
			}
		} else {
			return <Error message="general object handling not implemented" />
		}
	}

	renderEditFieldInput(subject, fieldName, fieldSpec, {entity, id, helpId}) {
		//TODO don't make this full-page width if the page is v. wide
		let currentValue = subject[fieldName];
		let type = fieldSpec.type;
		let classExtra = fieldSpec.className ? ' ' + fieldSpec.className : '';
		if (this.state.formError) {
			let err = this.state.formError;
			if (err.responseObject && err.responseObject.fieldErrors && err.responseObject.fieldErrors[fieldName]) {
				classExtra += " is-invalid";
			}
		}
		let placeholder = "placeholder" in fieldSpec ? fieldSpec.placeholder : "Enter response";
		if (type === 'boolean') {
			return <input name={fieldName} class={"form-check-input" + classExtra} id={id} aria-describedby={helpId}
					type="checkbox" checked={currentValue} onchange={this.handleChange}/>
		} else if (type === 'object' && fieldSpec.fileupload) {
			return <input name={fieldName} class={"form-control-file" + classExtra} id={id} aria-describedby={helpId}
					type="file" onchange={this.handleChangeFile}/>
		} else if (type === 'null') {
			return '';
		} else if (type === 'array' || type === 'object') {
			return this.renderObjectFieldInput(subject, fieldName, fieldSpec, {entity, currentValue, type})
		} else if (type === 'string' || type === 'number' || type === 'integer') {
			if ('enum' in fieldSpec) {
				if (fieldSpec.enum.length <= RADIO_BUTTON_MAX_ITEMS || ('radio' in fieldSpec && fieldSpec.radio)) {
					return this.renderRadio(fieldName, fieldSpec.enum, currentValue, classExtra);
				} else {
					return this.renderSelect(id, fieldName, this.handleChange, fieldSpec.enum, (opt)=>(opt===currentValue), classExtra);
				}
			} else if (type === 'string' && fieldSpec.multiline) {
				return <textarea name={fieldName} class={"form-control form-control-sm" + classExtra} id={id}
						aria-describedby={helpId} rows="16" onchange={this.handleChange}>{currentValue}</textarea>
			} else {
				let viewType= fieldSpec.hideText ? 'password' : null;
				return <input name={fieldName} type={viewType} class={"form-control" + classExtra} id={id}
						aria-describedby={helpId} placeholder={placeholder} value={currentValue} onchange={this.handleChange} />
			}
		} else {
			console.error('fieldSpec type unrecognized', fieldName, fieldSpec);
			return <Error message="field type unrecognized" />
		}
	}

	renderRadio(fieldName, options, currentValue, classExtra = '') {
		return <div class="d-block ml-2 btn-group btn-group-toggle" data-toggle="buttons">
				<label class={"btn mb-1 " + (!currentValue || currentValue === this.getNullSelectValue() ? "btn-light active" : "btn-outline-dark") + classExtra}>
					<input type="radio" name={fieldName} id={fieldName + '_null'} value={this.getNullSelectValue()} autocomplete="off"
						checked={!currentValue || currentValue === this.getNullSelectValue()} onchange={this.handleChange} /><span class="text-very-muted">unanswered</span>
				</label>
				{ options.map((option, i)=>(
					<label class={"btn mb-1 " + (currentValue === option ? "btn-info active" : "btn-outline-info") + classExtra} for={fieldName + i}>
						<input type="radio" name={fieldName} id={fieldName + i} value={option} autocomplete="off"
							checked={currentValue===option} onchange={this.handleChange} /> {option}
					</label>
				))}
			</div>
	}

	renderMultiCheck(fieldName, options, currentValue, classExtra = '') {
		return <div class="d-block ml-2 btn-group btn-group-toggle" data-toggle="buttons">
				{ options.map((option, i)=>(
					<label class={"btn mb-1 " + (currentValue.includes(option) ? "btn-info active" : "btn-outline-info") + classExtra} for={fieldName + i}>
						<input type="checkbox" name={fieldName} id={fieldName + i} value={option} autocomplete="off"
							checked={currentValue.includes(option)} onchange={this.handleChangeMultiCheck} /> {option}
					</label>
				))}
			</div>
	}

	renderSelect(id, fieldName, onchange, options, isOptionSelected, classExtra = '') {
		if (Array.isArray(options)) {
			let opts = {};
			options.forEach(opt=>{opts[opt] = opt});
			options = opts;
		}
		return <select class={"form-control" + classExtra} id={id} name={fieldName} onchange={onchange}>
			<option value={this.getNullSelectValue()} selected={isOptionSelected(null)}>(empty)</option>
			{ Object.keys(options).map((option)=>(
				<option value={option} selected={isOptionSelected(option)}>{options[option]}</option>
			))}
		</select>
	}

	getEditUrl(item) {
		return this.getViewUrl(item) + "?edit";
	}

}

class MkComponentPrimative extends MkComponentEditable {

	isPrimative() {
		return true;
	}

	getListFields(list) {
		return {
			value: {}
		};
	}

	getNewValue() {
		//TODO filter empty values when submitting updates?
		return {
			value: '' //TODO can I change this to null?
		}
	}

	getFields() {
		return {
			value: {}
		};
	}

	submitCreate(item) {
		if (this.state.onCreate) {
			this.state.onCreate(item);
		}
	}

	submitDelete(item, index) {
		if (this.state.onDelete) {
			this.state.onDelete(item, index);
		}
	}

	renderEditFieldInput(item, fieldName, fieldSpec, opts) {
		//TODO how to determine if you should render edit field?
		let val = typeof item === 'object' ? item.value : item;

		let onchange = (e)=>{
			if (this.state.onUpdate) {
				this.state.onUpdate(e.target.value, opts.index);
			}
		};
		if (this.props.fieldSpec && this.props.fieldSpec.enum) {
			return this.renderSelect(null, null, onchange,
				this.props.fieldSpec.enum, (opt)=>(opt===val));
		} else {
			return <input class="form-control" value={val} onChange={onchange}/>
		}
	}
}

class MkObjectReferenceComponent extends MkComponentPrimative {

	getNewValue() {
		//TODO filter unset values and nulls when submitting updates
		return {}
	}

	renderEditFieldInput(item, fieldName, fieldSpec, opts) {
		console.debug('MkObjectReferenceComponent.renderEditFieldInput', item, fieldName, fieldSpec, opts);

		if (this.props.options && !this.state.optionValues) {
			this.props.options.then((vals)=>this.setState({
				optionValues: vals
			}));
		}
		let onchange = (e)=>{
			let index = e.target.value;
			let val = this.state.optionValues[index] ? this.state.optionValues[index].value : null;

			if (this.state.onUpdate) {
				this.state.onUpdate(val, opts.index);
			}
		};

		let sortedOptions = this.state.optionValues
		? this.state.optionValues.sort((a, b)=>{
				if (a.name && b.name) {
					return a.name.localeCompare(b.name)
				}
			})
		: [];

		return <select class="form-control" name={fieldName} onchange={onchange}>
			<option value={this.getNullSelectValue()}>(none)</option>
			{ sortedOptions.map((o, index)=><option selected={o.isSelected(item, o != null ? o.value : null)} value={index}>{o.name}</option>) }
		</select>
	}

}

export {
	MkComponentEditable,
	MkComponentPrimative
}
