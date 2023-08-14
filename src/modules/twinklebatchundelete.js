/* Twinkle.js - twinklebatchundelete.js */
(($) => {
	/**
	 * twinklebatchundelete.js: Batch undelete module
	 * Mode of invocation: Tab ("Und-batch")
	 * Active on: Existing user and project pages
	 */
	Twinkle.batchundelete = () => {
		if (
			!Morebits.userIsSysop ||
			!mw.config.get('wgArticleId') ||
			(mw.config.get('wgNamespaceNumber') !== mw.config.get('wgNamespaceIds').user &&
				mw.config.get('wgNamespaceNumber') !== mw.config.get('wgNamespaceIds').project)
		) {
			return;
		}
		Twinkle.addPortletLink(
			Twinkle.batchundelete.callback,
			wgULS('批复', '批復'),
			'tw-batch-undel',
			wgULS('反删除页面', '反刪除頁面')
		);
	};
	Twinkle.batchundelete.callback = () => {
		const Window = new Morebits.simpleWindow(600, 400);
		Window.setScriptName('Twinkle');
		Window.setTitle(wgULS('批量反删除', '批次反刪除'));
		Window.addFooterLink(wgULS('Twinkle帮助', 'Twinkle說明'), 'H:TW/DOC#batchundelete');
		const form = new Morebits.quickForm(Twinkle.batchundelete.callback.evaluate);
		form.append({
			type: 'checkbox',
			list: [
				{
					label: wgULS('若存在已删除的讨论页，也恢复', '若存在已刪除的討論頁，也恢復'),
					name: 'undel_talk',
					value: 'undel_talk',
					checked: true,
				},
			],
		});
		form.append({
			type: 'input',
			name: 'reason',
			label: '理由：',
			size: 60,
		});
		const statusdiv = document.createElement('div');
		statusdiv.style.padding = '15px'; // just so it doesn't look broken
		Window.setContent(statusdiv);
		Morebits.status.init(statusdiv);
		Window.display();
		const query = {
			action: 'query',
			generator: 'links',
			prop: 'info',
			inprop: 'protection',
			titles: mw.config.get('wgPageName'),
			gpllimit: Twinkle.getPref('batchMax'),
		};
		const statelem = new Morebits.status(wgULS('抓取页面列表', '抓取頁面列表'));
		const qiuwen_api = new Morebits.wiki.api(
			wgULS('加载中…', '載入中…'),
			query,
			(apiobj) => {
				const xml = apiobj.responseXML;
				const $pages = $(xml).find('page[missing]');
				const list = [];
				$pages.each((index, page) => {
					const $page = $(page);
					const title = $page.attr('title');
					const $editprot = $page.find('pr[type="create"][level="sysop"]');
					const isProtected = $editprot.length > 0;
					list.push({
						label:
							title +
							(isProtected
								? `（${wgULS('全保护，', '全保護，')}${
										$editprot.attr('expiry') === 'infinity'
											? wgULS('无限期', '無限期')
											: `${new Morebits.date($editprot.attr('expiry')).calendar(
													'utc'
											  )} (UTC)${wgULS('过期', '過期')}`
								  }）`
								: ''),
						value: title,
						checked: true,
						style: isProtected ? 'color:red' : '',
					});
				});
				apiobj.params.form.append({
					type: 'header',
					label: wgULS('待恢复页面', '待恢復頁面'),
				});
				apiobj.params.form.append({
					type: 'button',
					label: wgULS('全选', '全選'),
					event: (e) => {
						$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', true);
					},
				});
				apiobj.params.form.append({
					type: 'button',
					label: wgULS('全不选', '全不選'),
					event: (e) => {
						$(Morebits.quickForm.getElements(e.target.form, 'pages')).prop('checked', false);
					},
				});
				apiobj.params.form.append({
					type: 'checkbox',
					name: 'pages',
					shiftClickSupport: true,
					list: list,
				});
				apiobj.params.form.append({
					type: 'submit',
				});
				const result = apiobj.params.form.render();
				apiobj.params.Window.setContent(result);
			},
			statelem
		);
		qiuwen_api.params = {
			form: form,
			Window: Window,
		};
		qiuwen_api.post();
	};
	Twinkle.batchundelete.callback.evaluate = (event) => {
		Morebits.wiki.actionCompleted.notice = wgULS('反删除已完成', '反刪除已完成');
		const numProtected = $(Morebits.quickForm.getElements(event.target, 'pages')).filter(
			(index, element) => element.checked && element.nextElementSibling.style.color === 'red'
		).length;
		if (
			numProtected > 0 &&
			!confirm(
				wgULS('您正要反删除 ', '您正要反刪除 ') +
					numProtected +
					wgULS(' 个全保护页面，您确定吗？', ' 個全保護頁面，您確定嗎？')
			)
		) {
			return;
		}
		const pages = event.target.getChecked('pages');
		const reason = event.target.reason.value;
		const undel_talk = event.target.reason.value;
		if (!reason) {
			mw.notify('您需要指定理由。', {
				type: 'warn',
				tag: 'twinklebatchundelete',
			});
			return;
		}
		Morebits.simpleWindow.setButtonsEnabled(false);
		Morebits.status.init(event.target);
		if (!pages) {
			Morebits.status.error(
				wgULS('错误', '錯誤'),
				wgULS('没什么要反删除的，取消操作', '沒什麼要反刪除的，取消操作')
			);
			return;
		}
		const pageUndeleter = new Morebits.batchOperation(wgULS('反删除页面', '反刪除頁面'));
		pageUndeleter.setOption('chunkSize', Twinkle.getPref('batchChunks'));
		pageUndeleter.setOption('preserveIndividualStatusLines', true);
		pageUndeleter.setPageList(pages);
		pageUndeleter.run((pageName) => {
			const params = {
				page: pageName,
				undel_talk: undel_talk,
				reason: reason,
				pageUndeleter: pageUndeleter,
			};
			const qiuwen_page = new Morebits.wiki.page(pageName, wgULS('反删除页面', '反刪除頁面') + pageName);
			qiuwen_page.setCallbackParameters(params);
			qiuwen_page.setEditSummary(`${reason} (批量)`);
			qiuwen_page.setChangeTags(Twinkle.changeTags);
			qiuwen_page.suppressProtectWarning();
			qiuwen_page.setMaxRetries(3); // temporary increase from 2 to make batchundelete more likely to succeed
			qiuwen_page.undeletePage(Twinkle.batchundelete.callbacks.doExtras, pageUndeleter.workerFailure);
		});
	};
	Twinkle.batchundelete.callbacks = {
		// this stupid parameter name is a temporary thing until I implement an overhaul
		// of Morebits.wiki.* callback parameters
		doExtras: (thingWithParameters) => {
			const params = thingWithParameters.parent
				? thingWithParameters.parent.getCallbackParameters()
				: thingWithParameters.getCallbackParameters();
			// the initial batch operation's job is to delete the page, and that has
			// succeeded by now
			params.pageUndeleter.workerSuccess(thingWithParameters);
			let query;
			let qiuwen_api;
			if (params.undel_talk) {
				const talkpagename = new mw.Title(params.page).getTalkPage().getPrefixedText();
				if (talkpagename !== params.page) {
					query = {
						action: 'query',
						prop: 'deletedrevisions',
						drvprop: 'ids',
						drvlimit: 1,
						titles: talkpagename,
					};
					qiuwen_api = new Morebits.wiki.api(
						wgULS('检查讨论页的已删版本', '檢查討論頁的已刪版本'),
						query,
						Twinkle.batchundelete.callbacks.undeleteTalk
					);
					qiuwen_api.params = params;
					qiuwen_api.params.talkPage = talkpagename;
					qiuwen_api.post();
				}
			}
		},
		undeleteTalk: (apiobj) => {
			const xml = apiobj.responseXML;
			const exists = $(xml).find('page:not([missing])').length > 0;
			const delrevs = $(xml).find('rev').attr('revid');
			if (exists || !delrevs) {
				// page exists or has no deleted revisions; forget about it
				return;
			}
			const page = new Morebits.wiki.page(
				apiobj.params.talkPage,
				wgULS('正在反删除', '正在反刪除') + apiobj.params.page + wgULS('的讨论页', '的討論頁')
			);
			page.setEditSummary(
				wgULS('反删除“', '反刪除「') +
					apiobj.params.page +
					wgULS('”的[[Help:讨论页|讨论页]]', '」的[[Help:討論頁|討論頁]]')
			);
			page.setChangeTags(Twinkle.changeTags);
			page.undeletePage();
		},
	};
	Twinkle.addInitCallback(Twinkle.batchundelete, 'batchundelete');
})(jQuery);
