import { h, Component } from 'preact';
import style from './style.less';
import Markup from 'preact-markup';
import Markdown from 'preact-markdown';
import { MkComponent } from 'lib/mkjs/mkcomponent';
import { Banner } from 'lib/mkjs';

export default class ContentItem extends MkComponent {

	getSubjectIdPropKey() {
		console.debug('ContentItem.getSubjectIdPropKey', this.props);
		return this.props.url && this.props.url.startsWith('/content-items/') ? 'id' : 'url';
	}

	getViewUrl(item = this.state.subject) {
		return 'path' in item ? item.path : super.getViewUrl(item);
	}

	getListFields(list) {
		return {
			path: {},
			title: {}
		}
	}

	//TODO this is a concept. it could aid in the tabular display, create/update and validation
	getFields() {
		return {
			path: String,
			title: String, //max length?
			subtitle: String, //max length?
			content: {
				type: 'string',
				multiline: true //TODO change this to standard json-schema
			}, //max length?
			isBare: {
				type: 'boolean',
				description: 'Check this box if this content item should not display a title. Use this if this content item will be embedded in other pages'
			},
			isLaunched: Boolean,
			isLoginRequired: Boolean,
			titleImage: String,//url
			titleColor: String,//color
			titleBackgroundColor: String,//color
		}
	}

	userCan(action, item) {
		console.debug('ContentItem.userCan', action, this);
		if (action === 'update' || action === 'create' ) {
			return this.props.userIsAdmin;
		} else if (action === 'get') {
			return true;
		} else if (action === 'delete') {
			return false; //content pages are never deleted, only redirected
		}
	}

	renderView(contentItem) {
		if (contentItem.isBare) {
			//plain content items -- sub-components or totally custom pages
			return <Markup type="html" markup={contentItem.content} />;
		} else {
			// This block for templated pages
			let titleClasses = [style.splash, style.splash_bg];
			let titleStyle = [];
			let titleTextStyle = [];
			if (contentItem.titleImage) {
				titleStyle.push(`background-image: url(${contentItem.titleImage})`);
			}
			if (contentItem.titleColor) {
				titleStyle.push(`color: ${contentItem.titleColor}`);
			}
			if (contentItem.titleBackgroundColor) {
				titleTextStyle.push(`background-color: ${contentItem.titleBackgroundColor}`);
			}
			return (
				<section>
					{
						this.props.revisionNumber
							? <Banner fullWidth level="warning">
									You are viewing an old revision of this page.
								</Banner>
							: ''
					}
					<div  class={style.full_width + " row"}>
						<div class={titleClasses.join(' ')} style={titleStyle.join(';')}>
							<div class={style.title}>
								<h1 style={titleTextStyle.join(';')}>{contentItem.title}</h1>
								{
									contentItem.subtitle
									? <div class={style.subtitle}><span style={titleTextStyle.join(';')}>{contentItem.subtitle}</span></div>
									: ''
								}
							</div>
						</div>
					</div>
					{this.renderMainContent(contentItem)}
				</section>
			);
		}
	}

	renderMainContent(contentItem) {
		return <div>
			<div>
				{
					contentItem.content
					? (contentItem.plainMarkup
						? <Markup type="html" markup={contentItem.content} />
						: <Markdown markdown={contentItem.content} /> )
					: ''
				}
			</div>
			{
				this.userCan('update') && !this.props.revisionNumber
					? <div class="my-3">{this.editBanner(contentItem, 'caret-up')}</div>
					: ''
			}
		</div>
	}
}
