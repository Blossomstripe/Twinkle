"use strict";

/**
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * _addText: '{{Twinkle Header}}'
 *
 * @source https://git.qiuwen.wiki/InterfaceAdmin/Twinkle
 * @source https://git.qiuwen.wiki/Mirror/xiplus-twinkle
 * @author © 2011-2022 English Wikipedia Contributors
 * @author © 2011-2021 Chinese Wikipedia Contributors
 * @author © 2021-     Qiuwen Baike Contributors
 * @license <https://creativecommons.org/licenses/by-sa/4.0/>
 */
/* Twinkle.js - twinklefluff.js */
/* <nowiki> */
( function ( $ ) {
/*
 ****************************************
 *** twinklefluff.js: Revert/rollback module
 ****************************************
 * Mode of invocation:  Links on contributions, recent changes, history, and diff pages
 * Active on:           Diff pages, history pages, Special:RecentChanges(Linked), and Special:Contributions
 */
/**
 * Twinklefluff revert and antivandalism utility
 */

Twinkle.fluff = function twinklefluff() {
	// Only proceed if the user can actually edit the page in question
	// (see #632 for contribs issue).  wgIsProbablyEditable should take
	// care of namespace/contentModel restrictions as well as explicit
	// protections; it won't take care of cascading or TitleBlacklist.
	if ( mw.config.get( "wgIsProbablyEditable" ) ) {
		// wgDiffOldId included for clarity in if else loop
		if ( mw.config.get( "wgDiffNewId" ) || mw.config.get( "wgDiffOldId" ) ) {
			// Reload alongside the revision slider
			mw.hook( "wikipage.diff" ).add( () => {
				Twinkle.fluff.addLinks.diff();
			} );
		} else if ( mw.config.get( "wgAction" ) === "view" && mw.config.get( "wgRevisionId" ) && mw.config.get( "wgCurRevisionId" ) !== mw.config.get( "wgRevisionId" ) ) {
			Twinkle.fluff.addLinks.oldid();
		} else if ( mw.config.get( "wgAction" ) === "history" && mw.config.get( "wgArticleId" ) ) {
			Twinkle.fluff.addLinks.history();
		}
	} else if ( mw.config.get( "wgNamespaceNumber" ) === -1 ) {
		Twinkle.fluff.skipTalk = !Twinkle.getPref( "openTalkPageOnAutoRevert" );
		Twinkle.fluff.rollbackInPlace = Twinkle.getPref( "rollbackInPlace" );
		if ( mw.config.get( "wgCanonicalSpecialPageName" ) === "Contributions" ) {
			Twinkle.fluff.addLinks.contributions();
		} else if ( mw.config.get( "wgCanonicalSpecialPageName" ) === "Recentchanges" || mw.config.get( "wgCanonicalSpecialPageName" ) === "Recentchangeslinked" ) {
			// Reload with recent changes updates
			// structuredChangeFilters.ui.initialized is just on load
			mw.hook( "wikipage.content" ).add( ( item ) => {
				if ( item.is( "div" ) ) {
					Twinkle.fluff.addLinks.recentchanges();
				}
			} );
		}
	}
};

// A list of usernames, usually only bots, that vandalism revert is jumped
// over; that is, if vandalism revert was chosen on such username, then its
// target is on the revision before.  This is for handling quick bots that
// makes edits seconds after the original edit is made.  This only affects
// vandalism rollback; for good faith rollback, it will stop, indicating a bot
// has no faith, and for normal rollback, it will rollback that edit.
Twinkle.fluff.trustedBots = [];
Twinkle.fluff.skipTalk = null;
Twinkle.fluff.rollbackInPlace = null;
// String to insert when a username is hidden
Twinkle.fluff.hiddenName = "已隐藏的用户";

// Consolidated construction of fluff links
Twinkle.fluff.linkBuilder = {
	spanTag: function ( color, content ) {
		var span = document.createElement( "span" );
		span.style.color = color;
		span.appendChild( document.createTextNode( content ) );
		return span;
	},
	buildLink: function ( color, text ) {
		var link = document.createElement( "a" );
		link.appendChild( Twinkle.fluff.linkBuilder.spanTag( "Black", "[" ) );
		link.appendChild( Twinkle.fluff.linkBuilder.spanTag( color, text ) );
		link.appendChild( Twinkle.fluff.linkBuilder.spanTag( "Black", "]" ) );
		link.href = "#";
		return link;
	},
	/**
	 * @param {string} [vandal=null] - Username of the editor being reverted
	 * Provide a falsey value if the username is hidden, defaults to null
	 * @param {boolean} inline - True to create two links in a span, false
	 * to create three links in a div (optional)
	 * @param {number|string} [rev=wgCurRevisionId] - Revision ID being reverted (optional)
	 * @param {string} [page=wgPageName] - Page being reverted (optional)
	 */
	rollbackLinks: function ( vandal, inline, rev, page ) {
		vandal = vandal || null;
		var elem = inline ? "span" : "div";
		var revNode = document.createElement( elem );
		rev = parseInt( rev, 10 );
		if ( rev ) {
			revNode.setAttribute( "id", `tw-revert${rev}` );
		} else {
			revNode.setAttribute( "id", "tw-revert" );
		}
		var separator = inline ? " " : " || ";
		var sepNode1 = document.createElement( "span" );
		var sepText = document.createTextNode( separator );
		sepNode1.setAttribute( "class", "tw-rollback-link-separator" );
		sepNode1.appendChild( sepText );
		var sepNode2 = sepNode1.cloneNode( true );
		var normNode = document.createElement( "span" );
		var vandNode = document.createElement( "span" );
		var normLink = Twinkle.fluff.linkBuilder.buildLink( "SteelBlue", "回退" );
		var vandLink = Twinkle.fluff.linkBuilder.buildLink( "Red", "破坏" );
		normLink.style.fontWeight = "bold";
		vandLink.style.fontWeight = "bold";
		$( normLink ).on( "click", () => {
			Twinkle.fluff.revert( "norm", vandal, rev, page );
			Twinkle.fluff.disableLinks( revNode );
		} );
		$( vandLink ).on( "click", () => {
			Twinkle.fluff.revert( "vand", vandal, rev, page );
			Twinkle.fluff.disableLinks( revNode );
		} );
		normNode.setAttribute( "class", "tw-rollback-link-normal" );
		vandNode.setAttribute( "class", "tw-rollback-link-vandalism" );
		normNode.appendChild( sepNode1 );
		vandNode.appendChild( sepNode2 );
		normNode.appendChild( normLink );
		vandNode.appendChild( vandLink );
		if ( !inline ) {
			var agfNode = document.createElement( "span" );
			var agfLink = Twinkle.fluff.linkBuilder.buildLink( "DarkOliveGreen", "回退（AGF）" );
			$( agfLink ).on( "click", () => {
				Twinkle.fluff.revert( "agf", vandal, rev, page );
				// Twinkle.fluff.disableLinks(revNode); // rollbackInPlace not relevant for any inline situations
			} );

			agfNode.setAttribute( "class", "tw-rollback-link-agf" );
			agfLink.style.fontWeight = "bold";
			agfNode.appendChild( agfLink );
			revNode.appendChild( agfNode );
		}
		revNode.appendChild( normNode );
		revNode.appendChild( vandNode );
		return revNode;
	},
	// Build [restore this revision] links
	restoreThisRevisionLink: function ( revisionRef, inline ) {
		// If not a specific revision number, should be wgDiffNewId/wgDiffOldId/wgRevisionId
		revisionRef = typeof revisionRef === "number" ? revisionRef : mw.config.get( revisionRef );
		var elem = inline ? "span" : "div";
		var revertToRevisionNode = document.createElement( elem );
		revertToRevisionNode.setAttribute( "id", `tw-revert-to-${revisionRef}` );
		revertToRevisionNode.style.fontWeight = "bold";
		var revertToRevisionLink = Twinkle.fluff.linkBuilder.buildLink( "SaddleBrown", "恢复此版本" );
		$( revertToRevisionLink ).on( "click", () => {
			Twinkle.fluff.revertToRevision( revisionRef );
		} );
		if ( inline ) {
			revertToRevisionNode.appendChild( document.createTextNode( " " ) );
		}
		revertToRevisionNode.appendChild( revertToRevisionLink );
		return revertToRevisionNode;
	}
};
Twinkle.fluff.addLinks = {
	contributions: function () {
		// $('sp-contributions-footer-anon-range') relies on the fmbox
		// id in [[MediaWiki:Sp-contributions-footer-anon-range]]
		if ( mw.config.exists( "wgRelevantUserName" ) ) {
			// Get the username these contributions are for
			var username = mw.config.get( "wgRelevantUserName" );
			if ( Twinkle.getPref( "showRollbackLinks" ).indexOf( "contribs" ) !== -1 || mw.config.get( "wgUserName" ) !== username && Twinkle.getPref( "showRollbackLinks" ).indexOf( "others" ) !== -1 || mw.config.get( "wgUserName" ) === username && Twinkle.getPref( "showRollbackLinks" ).indexOf( "mine" ) !== -1 ) {
				var $list = $( "#mw-content-text" ).find( "ul li:has(span.mw-uctop):has(.mw-changeslist-diff)" );
				$list.each( ( key, current ) => {
					// revid is also available in the href of both
					// .mw-changeslist-date or .mw-changeslist-diff
					var page = $( current ).find( ".mw-contributions-title" ).text();

					// It's unlikely, but we can't easily check for revdel'd usernames
					// since only a strong element is provided, with no easy selector
					current.appendChild( Twinkle.fluff.linkBuilder.rollbackLinks( username, true, current.dataset.mwRevid, page ) );
				} );
			}
		}
	},
	recentchanges: function () {
		if ( Twinkle.getPref( "showRollbackLinks" ).indexOf( "recent" ) !== -1 ) {
			// Latest and revertable (not page creations, logs, categorizations, etc.)
			var $list = $( ".mw-changeslist .mw-changeslist-last.mw-changeslist-src-mw-edit" );
			// Exclude top-level header if "group changes" preference is used
			// and find only individual lines or nested lines
			$list = $list.not( ".mw-rcfilters-ui-highlights-enhanced-toplevel" ).find( ".mw-changeslist-line-inner, td.mw-enhanced-rc-nested" );
			$list.each( ( key, current ) => {
				// The :not is possibly unnecessary, as it appears that
				// .mw-userlink is simply not present if the username is hidden
				var vandal = $( current ).find( ".mw-userlink:not(.history-deleted)" ).text();
				var href = $( current ).find( ".mw-changeslist-diff" ).attr( "href" );
				var rev = mw.util.getParamValue( "diff", href );
				var page = current.dataset.targetPage;
				current.appendChild( Twinkle.fluff.linkBuilder.rollbackLinks( vandal, true, rev, page ) );
			} );
		}
	},
	history: function () {
		if ( Twinkle.getPref( "showRollbackLinks" ).indexOf( "history" ) !== -1 ) {
			// All revs
			var histList = $( "#pagehistory li" ).toArray();

			// On first page of results, so add revert/rollback
			// links to the top revision
			if ( !$( ".mw-firstlink" ).length ) {
				var first = histList.shift();
				var vandal = $( first ).find( ".mw-userlink:not(.history-deleted)" ).text();

				// Check for first username different than the top user,
				// only apply rollback links if/when found
				// for faster than every
				for ( var i = 0; i < histList.length; i++ ) {
					if ( $( histList[ i ] ).find( ".mw-userlink" ).text() !== vandal ) {
						first.appendChild( Twinkle.fluff.linkBuilder.rollbackLinks( vandal, true ) );
						break;
					}
				}
			}

			// oldid
			histList.forEach( ( rev ) => {
				// From restoreThisRevision, non-transferable
				// If the text has been revdel'd, it gets wrapped in a span with .history-deleted,
				// and href will be undefined (and thus oldid is NaN)
				var href = rev.querySelector( ".mw-changeslist-date" ).href;
				var oldid = parseInt( mw.util.getParamValue( "oldid", href ), 10 );
				if ( !isNaN( oldid ) ) {
					rev.appendChild( Twinkle.fluff.linkBuilder.restoreThisRevisionLink( oldid, true ) );
				}
			} );
		}
	},
	diff: function () {
		// Autofill user talk links on diffs with vanarticle for easy warning, but don't autowarn
		var warnFromTalk = function ( xtitle ) {
			var talkLink = $( `#mw-diff-${xtitle}2 .mw-usertoollinks a` ).first();
			if ( talkLink.length ) {
				var extraParams = `vanarticle=${mw.util.rawurlencode( Morebits.pageNameNorm )}&noautowarn=true`;
				// diffIDs for vanarticlerevid
				extraParams += "&vanarticlerevid=";
				extraParams += xtitle === "otitle" ? mw.config.get( "wgDiffOldId" ) : mw.config.get( "wgDiffNewId" );
				var href = talkLink.attr( "href" );
				if ( href.indexOf( "?" ) === -1 ) {
					talkLink.attr( "href", `${href}?${extraParams}` );
				} else {
					talkLink.attr( "href", `${href}&${extraParams}` );
				}
			}
		};

		// Older revision
		warnFromTalk( "otitle" ); // Add quick-warn link to user talk link
		// Don't load if there's a single revision or weird diff (cur on latest)
		if ( mw.config.get( "wgDiffOldId" ) && mw.config.get( "wgDiffOldId" ) !== mw.config.get( "wgDiffNewId" ) ) {
			// Add a [restore this revision] link to the older revision
			var oldTitle = document.getElementById( "mw-diff-otitle1" ).parentNode;
			var revertToRevision = Twinkle.fluff.linkBuilder.restoreThisRevisionLink( "wgDiffOldId" );
			oldTitle.insertBefore( revertToRevision, oldTitle.firstChild );
			if ( Twinkle.getPref( "customRevertSummary" ).length > 0 ) {
				revertToRevision.appendChild( document.createTextNode( " || " ) );
				var revertsummary = new Morebits.quickForm.element( {
					type: "select",
					name: "revertsummary"
				} );
				revertsummary.append( {
					type: "option",
					label: "选择回退理由",
					value: ""
				} );
				$( Twinkle.getPref( "customRevertSummary" ) ).each( ( _, e ) => {
					revertsummary.append( {
						type: "option",
						label: e.label,
						value: e.value
					} );
				} );
				revertToRevision.appendChild( revertsummary.render().childNodes[ 0 ] );
			}
		}

		// Newer revision
		warnFromTalk( "ntitle" ); // Add quick-warn link to user talk link
		// Add either restore or rollback links to the newer revision
		// Don't show if there's a single revision or weird diff (prev on first)
		if ( document.getElementById( "differences-nextlink" ) ) {
			// Not latest revision, add [restore this revision] link to newer revision
			var newTitle = document.getElementById( "mw-diff-ntitle1" ).parentNode;
			newTitle.insertBefore( Twinkle.fluff.linkBuilder.restoreThisRevisionLink( "wgDiffNewId" ), newTitle.firstChild );
		} else if ( Twinkle.getPref( "showRollbackLinks" ).indexOf( "diff" ) !== -1 && mw.config.get( "wgDiffOldId" ) && ( mw.config.get( "wgDiffOldId" ) !== mw.config.get( "wgDiffNewId" ) || document.getElementById( "differences-prevlink" ) ) ) {
			// Normally .mw-userlink is a link, but if the
			// username is hidden, it will be a span with
			// .history-deleted as well. When a sysop views the
			// hidden content, the span contains the username in a
			// link element, which will *just* have
			// .mw-userlink. The below thus finds the first
			// instance of the class, which if hidden is the span
			// and thus text returns undefined. Technically, this
			// is a place where sysops *could* have more
			// information available to them (as above, via
			// &unhide=1), since the username will be available by
			// checking a.mw-userlink instead, but revert() will
			// need reworking around userHidden
			var vandal = $( "#mw-diff-ntitle2" ).find( ".mw-userlink" )[ 0 ];
			// See #1337
			vandal = vandal ? vandal.text : "";
			var ntitle = document.getElementById( "mw-diff-ntitle1" ).parentNode;
			ntitle.insertBefore( Twinkle.fluff.linkBuilder.rollbackLinks( vandal ), ntitle.firstChild );
		}
	},
	oldid: function () {
		// Add a [restore this revision] link on old revisions
		var revisionInfo = document.getElementById( "mw-revision-info" );
		if ( revisionInfo ) {
			var title = revisionInfo.parentNode;
			title.insertBefore( Twinkle.fluff.linkBuilder.restoreThisRevisionLink( "wgRevisionId" ), title.firstChild );
		}
	}
};
Twinkle.fluff.disableLinks = function disablelinks( parentNode ) {
	// Array.from not available in IE11 :(
	$( parentNode ).children().each( ( _ix, node ) => {
		node.innerHTML = node.textContent; // Feels like cheating
		$( node ).css( "font-weight", "normal" ).css( "color", "darkgray" );
	} );
};
Twinkle.fluff.revert = function revertPage( type, vandal, rev, page ) {
	var pagename = page || mw.config.get( "wgPageName" );
	var revid = rev || mw.config.get( "wgCurRevisionId" );
	if ( Twinkle.fluff.rollbackInPlace ) {
		var notifyStatus = document.createElement( "span" );
		mw.notify( notifyStatus, {
			autoHide: false,
			title: `回退${page}`,
			tag: `twinklefluff_${rev}` // Shouldn't be necessary given disableLink
		} );

		Morebits.status.init( notifyStatus );
	} else {
		Morebits.status.init( document.getElementById( "mw-content-text" ) );
		$( "#catlinks" ).remove();
	}
	var params = {
		type: type,
		user: vandal,
		userHidden: !vandal,
		// Keep track of whether the username was hidden
		pagename: pagename,
		revid: revid
	};
	var query = {
		action: "query",
		prop: [ "info", "revisions", "flagged" ],
		titles: pagename,
		inprop: "watched",
		intestactions: "edit",
		rvlimit: Twinkle.getPref( "revertMaxRevisions" ),
		rvprop: [ "ids", "timestamp", "user" ],
		curtimestamp: "",
		meta: "tokens",
		type: "csrf",
		format: "json"
	};
	var qiuwen_api = new Morebits.wiki.api( "抓取较早修订版本信息", query, Twinkle.fluff.callbacks.main );
	qiuwen_api.params = params;
	qiuwen_api.post();
};
Twinkle.fluff.revertToRevision = function revertToRevision( oldrev ) {
	Morebits.status.init( document.getElementById( "mw-content-text" ) );
	var query = {
		action: "query",
		prop: [ "info", "revisions" ],
		titles: mw.config.get( "wgPageName" ),
		inprop: "watched",
		rvlimit: 1,
		rvstartid: oldrev,
		rvprop: [ "ids", "user" ],
		curtimestamp: "",
		meta: "tokens",
		type: "csrf",
		format: "json"
	};
	var qiuwen_api = new Morebits.wiki.api( "抓取该较早版本", query, Twinkle.fluff.callbacks.toRevision );
	qiuwen_api.params = {
		rev: oldrev
	};
	qiuwen_api.post();
};
Twinkle.fluff.callbacks = {
	toRevision: function ( apiobj ) {
		var response = apiobj.getResponse();
		var loadtimestamp = response.curtimestamp;
		var csrftoken = response.query.tokens.csrftoken;
		var page = response.query.pages[ 0 ];
		var lastrevid = parseInt( page.lastrevid, 10 );
		var touched = page.touched;
		var rev = page.revisions[ 0 ];
		var revertToRevID = parseInt( rev.revid, 10 );
		var revertToUser = rev.user;
		var revertToUserHidden = !!rev.userhidden;
		if ( revertToRevID !== apiobj.params.rev ) {
			apiobj.statelem.error( "抓取到的修订版本与请求的修订版本不符，取消。" );
			return;
		}
		// eslint-disable-next-line no-tabs
		var optional_summary = prompt( "请输入回退理由：								", apiobj.params.summary ); // padded out to widen prompt in Firefox
		if ( optional_summary === null ) {
			apiobj.statelem.error( "由用户取消。" );
			return;
		}
		var summary = Twinkle.fluff.formatSummary( `回退到由$USER做出的修订版本${revertToRevID}`, revertToUserHidden ? null : revertToUser, optional_summary );
		var query = {
			action: "edit",
			title: mw.config.get( "wgPageName" ),
			summary: summary,
			tags: Twinkle.changeTags,
			token: csrftoken,
			undo: lastrevid,
			undoafter: revertToRevID,
			basetimestamp: touched,
			starttimestamp: loadtimestamp,
			minor: Twinkle.getPref( "markRevertedPagesAsMinor" ).indexOf( "torev" ) !== -1 ? true : undefined,
			format: "json"
		};
			// Handle watching, possible expiry
		if ( Twinkle.getPref( "watchRevertedPages" ).indexOf( "torev" ) !== -1 ) {
			var watchOrExpiry = Twinkle.getPref( "watchRevertedExpiry" );
			if ( !watchOrExpiry || watchOrExpiry === "no" ) {
				query.watchlist = "nochange";
			} else if ( watchOrExpiry === "default" || watchOrExpiry === "preferences" ) {
				query.watchlist = "preferences";
			} else {
				query.watchlist = "watch";
				// number allowed but not used in Twinkle.config.watchlistEnums
				if ( ( !page.watched || page.watchlistexpiry ) && typeof watchOrExpiry === "string" && watchOrExpiry !== "yes" ) {
					query.watchlistexpiry = watchOrExpiry;
				}
			}
		}
		Morebits.wiki.actionCompleted.redirect = mw.config.get( "wgPageName" );
		Morebits.wiki.actionCompleted.notice = "回退完成";
		var qiuwen_api = new Morebits.wiki.api( "保存回退内容", query, Twinkle.fluff.callbacks.complete, apiobj.statelem );
		qiuwen_api.params = apiobj.params;
		qiuwen_api.post();
	},
	main: function ( apiobj ) {
		var response = apiobj.getResponse();
		var loadtimestamp = response.curtimestamp;
		var csrftoken = response.query.tokens.csrftoken;
		var page = response.query.pages[ 0 ];
		if ( !page.actions.edit ) {
			apiobj.statelem.error( "未能成功编辑页面，页面可能被半（全）保护" );
			return;
		}
		var lastrevid = parseInt( page.lastrevid, 10 );
		var touched = page.touched;
		var revs = page.revisions;
		var statelem = apiobj.statelem;
		var params = apiobj.params;
		if ( revs.length < 1 ) {
			statelem.error( "没有其它修订版本，无法回退" );
			return;
		}
		var top = revs[ 0 ];
		var lastuser = top.user;
		if ( lastrevid < params.revid ) {
			Morebits.status.error( "错误", [ "从服务器获取的最新修订版本ID ", Morebits.htmlNode( "strong", lastrevid ), " 小于目前所显示的修订版本ID。这可能意味着当前修订版本已被删除、服务器延迟、或抓取到的信息有错误。取消。" ] );
			return;
		}

		// Used for user-facing alerts, messages, etc., not edits or summaries
		var userNorm = params.user || Twinkle.fluff.hiddenName;
		var index = 1;
		if ( params.revid !== lastrevid ) {
			Morebits.status.warn( "Warning", [ "最新修订版本 ", Morebits.htmlNode( "strong", lastrevid ), " 与我们的修订版本 ", Morebits.htmlNode( "strong", params.revid ), "不同" ] );
			if ( lastuser === params.user ) {
				switch ( params.type ) {
					case "vand":
						Morebits.status.info( "信息", [ "最新修订版本由 ", Morebits.htmlNode( "strong", userNorm ), " 做出，因我们假定破坏，继续回退操作。" ] );
						break;
					case "agf":
						Morebits.status.warn( "警告", [ "最新修订版本由 ", Morebits.htmlNode( "strong", userNorm ), " 做出，因我们假定善意，取消回退操作，因为问题可能已被修复。" ] );
						return;
					default:
						Morebits.status.warn( "提示", [ "最新修订版本由 ", Morebits.htmlNode( "strong", userNorm ), " 做出，但我们还是不回退了。" ] );
						return;
				}
			} else if ( params.type === "vand" &&
			// Okay to test on user since it will either fail or sysop will correctly access it
			// Besides, none of the trusted bots are going to be revdel'd
			Twinkle.fluff.trustedBots.indexOf( top.getAttribute( "user" ) ) !== -1 && revs.length > 1 && revs[ 1 ].getAttribute( "revid" ) === params.revid ) {
				Morebits.status.info( "信息", [ "最新修订版本由 ", Morebits.htmlNode( "strong", lastuser ), "，一个可信的机器人做出，但之前的版本被认为是破坏，继续回退操作。" ] );
				index = 2;
			} else {
				Morebits.status.error( "错误", [ "最新修订版本由 ", Morebits.htmlNode( "strong", lastuser ), " 做出，所以这个修订版本可能已经被回退了，取消回退操作。" ] );
				return;
			}
		} else {
			// Expected revision is the same, so the users must match;
			// this allows sysops to know whether the users are the same
			params.user = lastuser;
			userNorm = params.user || Twinkle.fluff.hiddenName;
		}
		if ( Twinkle.fluff.trustedBots.indexOf( params.user ) !== -1 ) {
			switch ( params.type ) {
				case "vand":
					Morebits.status.info( "信息", [ "将对 ", Morebits.htmlNode( "strong", userNorm ), " 执行破坏回退，这是一个可信的机器人，我们假定您要回退前一个修订版本。" ] );
					index = 2;
					params.user = revs[ 1 ].user;
					params.userHidden = !!revs[ 1 ].userhidden;
					break;
				case "agf":
					Morebits.status.warn( "提示", [ "将对 ", Morebits.htmlNode( "strong", userNorm ), " 执行善意回退，但这是一个可信的机器人，取消回退操作。" ] );
					return;
				case "norm":
					/* falls through */
				default:
					var cont = confirm( `选择了常规回退，但最新修改是由一个可信的机器人（${userNorm}）做出的。确定以回退前一个修订版本，取消以回退机器人的修改` );
					if ( cont ) {
						Morebits.status.info( "信息", [ "将对 ", Morebits.htmlNode( "strong", userNorm ), " 执行常规回退，这是一个可信的机器人，基于确认，我们将回退前一个修订版本。" ] );
						index = 2;
						params.user = revs[ 1 ].user;
						params.userHidden = !!revs[ 1 ].userhidden;
						userNorm = params.user || Twinkle.fluff.hiddenName;
					} else {
						Morebits.status.warn( "提示", [ "将对 ", Morebits.htmlNode( "strong", userNorm ), " 执行常规回退，这是一个可信的机器人，基于确认，我们仍将回退这个修订版本。" ] );
					}
					break;
			}
		}
		var found = false;
		var count = 0;
		for ( var i = index; i < revs.length; ++i ) {
			++count;
			if ( revs[ i ].getAttribute( "user" ) !== params.user ) {
				found = i;
				break;
			}
		}
		if ( !found ) {
			statelem.error( [ "未找到之前的修订版本，可能 ", Morebits.htmlNode( "strong", userNorm ), ` 是唯一贡献者，或这个用户连续做出了超过 ${mw.language.convertNumber( Twinkle.getPref( "revertMaxRevisions" ) )} 次编辑。` ] );
			return;
		}
		if ( !count ) {
			Morebits.status.error( "错误", "我们将要回退0个修订版本，这没有意义，所以取消回退操作。可能是因为这个修订版本已经被回退，但修订版本ID仍是一样的。" );
			return;
		}
		var good_revision = revs[ found ];
		var userHasAlreadyConfirmedAction = false;
		if ( params.type !== "vand" && count > 1 ) {
			if ( !confirm( `${userNorm} 连续做出了 ${mw.language.convertNumber( count )} 次编辑，是否要全部回退？` ) ) {
				Morebits.status.info( "提示", "用户取消操作" );
				return;
			}
			userHasAlreadyConfirmedAction = true;
		}
		params.count = count;
		params.goodid = good_revision.revid;
		params.gooduser = good_revision.user;
		params.gooduserHidden = !!good_revision.userhidden;
		statelem.status( [ Morebits.htmlNode( "strong", mw.language.convertNumber( count ) ), " 个修订版本之前由 ", Morebits.htmlNode( "strong", params.gooduserHidden ? Twinkle.fluff.hiddenName : params.gooduser ), " 做出的修订版本 ", Morebits.htmlNode( "strong", params.goodid ) ] );
		var summary, extra_summary;
		switch ( params.type ) {
			case "agf":
				// eslint-disable-next-line no-tabs
				extra_summary = prompt( "可选的编辑摘要：							  ", params.summary ); // padded out to widen prompt in Firefox
				if ( extra_summary === null ) {
					statelem.error( "Aborted by user." );
					return;
				}
				userHasAlreadyConfirmedAction = true;
				summary = Twinkle.fluff.formatSummary( "回退$USER做出的出于善意的编辑", params.userHidden ? null : params.user, extra_summary );
				break;
			case "vand":
				summary = Twinkle.fluff.formatSummary( `回退$USER做出的${params.count}次编辑，到由${params.gooduserHidden ? Twinkle.fluff.hiddenName : params.gooduser}做出的最后修订版本 `, params.userHidden ? null : params.user );
				break;
			case "norm":
				/* falls through */
			default:
				if ( Twinkle.getPref( "offerReasonOnNormalRevert" ) ) {
					// eslint-disable-next-line no-tabs
					extra_summary = prompt( "可选的编辑摘要：							  ", params.summary ); // padded out to widen prompt in Firefox
					if ( extra_summary === null ) {
						statelem.error( "用户取消操作。" );
						return;
					}
					userHasAlreadyConfirmedAction = true;
				}
				summary = Twinkle.fluff.formatSummary( `回退$USER做出的${params.count}次编辑`, params.userHidden ? null : params.user, extra_summary );
				break;
		}
		if ( ( Twinkle.getPref( "confirmOnFluff" ) ||
			// Mobile user agent taken from [[en:MediaWiki:Gadget-confirmationRollback-mobile.js]]
			Twinkle.getPref( "confirmOnMobileFluff" ) && /Android|webOS|iPhone|iPad|iPod|BlackBerry|Mobile|Opera Mini/i.test( navigator.userAgent ) ) && !userHasAlreadyConfirmedAction && !confirm( "回退页面：您确定吗？" ) ) {
			statelem.error( "用户取消操作。" );
			return;
		}

		// Decide whether to notify the user on success
		if ( !Twinkle.fluff.skipTalk && Twinkle.getPref( "openTalkPage" ).indexOf( params.type ) !== -1 && !params.userHidden && mw.config.get( "wgUserName" ) !== params.user ) {
			params.notifyUser = true;
			// Pass along to the warn module
			params.vantimestamp = top.timestamp;
		}

		// figure out whether we need to/can review the edit
		var flagged = page.flagged;
		if ( ( Morebits.userIsInGroup( "reviewer" ) || Morebits.userIsSysop ) && !!flagged && flagged.stable_revid >= params.goodid && !!flagged.pending_since ) {
			params.reviewRevert = true;
			params.csrftoken = csrftoken;
		}
		var query = {
			action: "edit",
			title: params.pagename,
			summary: summary,
			tags: Twinkle.changeTags,
			token: csrftoken,
			undo: lastrevid,
			undoafter: params.goodid,
			basetimestamp: touched,
			starttimestamp: loadtimestamp,
			minor: Twinkle.getPref( "markRevertedPagesAsMinor" ).indexOf( params.type ) !== -1 ? true : undefined,
			format: "json"
		};
			// Handle watching, possible expiry
		if ( Twinkle.getPref( "watchRevertedPages" ).indexOf( params.type ) !== -1 ) {
			var watchOrExpiry = Twinkle.getPref( "watchRevertedExpiry" );
			if ( !watchOrExpiry || watchOrExpiry === "no" ) {
				query.watchlist = "nochange";
			} else if ( watchOrExpiry === "default" || watchOrExpiry === "preferences" ) {
				query.watchlist = "preferences";
			} else {
				query.watchlist = "watch";
				// number allowed but not used in Twinkle.config.watchlistEnums
				if ( ( !page.watched || page.watchlistexpiry ) && typeof watchOrExpiry === "string" && watchOrExpiry !== "yes" ) {
					query.watchlistexpiry = watchOrExpiry;
				}
			}
		}
		if ( !Twinkle.fluff.rollbackInPlace ) {
			Morebits.wiki.actionCompleted.redirect = params.pagename;
		}
		Morebits.wiki.actionCompleted.notice = "回退完成";
		var qiuwen_api = new Morebits.wiki.api( "保存回退内容", query, Twinkle.fluff.callbacks.complete, statelem );
		qiuwen_api.params = params;
		qiuwen_api.post();
	},
	complete: function ( apiobj ) {
		// TODO Most of this is copy-pasted from Morebits.wiki.page#fnSaveSuccess. Unify it
		var response = apiobj.getResponse();
		var edit = response.edit;
		if ( edit.captcha ) {
			apiobj.statelem.error( "不能回退，因服务器要求您输入验证码。" );
		} else if ( edit.nochange ) {
			apiobj.statelem.error( "要回退到的版本与当前版本相同。" );
		} else {
			apiobj.statelem.info( "完成" );
			var params = apiobj.params;
			if ( params.notifyUser && !params.userHidden ) {
				// notifyUser only from main, not from toRevision
				Morebits.status.info( "信息", [ "开启用户 ", Morebits.htmlNode( "strong", params.user ), " 的讨论页" ] );
				var windowQuery = {
					title: `User talk:${params.user}`,
					action: "edit",
					preview: "yes",
					vanarticle: params.pagename.replace( /_/g, " " ),
					vanarticlerevid: params.revid,
					vantimestamp: params.vantimestamp,
					vanarticlegoodrevid: params.goodid,
					type: params.type,
					count: params.count
				};
				switch ( Twinkle.getPref( "userTalkPageMode" ) ) {
					case "tab":
						window.open( mw.util.getUrl( "", windowQuery ), "_blank" );
						break;
					case "blank":
						window.open( mw.util.getUrl( "", windowQuery ), "_blank", "location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800" );
						break;
					case "window":
						/* falls through */
					default:
						window.open( mw.util.getUrl( "", windowQuery ), window.name === "twinklewarnwindow" ? "_blank" : "twinklewarnwindow", "location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800" );
						break;
				}
			}
		}
	}
};

// If builtInString contains the string "$USER", it will be replaced
// by an appropriate user link if a user name is provided
Twinkle.fluff.formatSummary = function ( builtInString, userName, customString ) {
	var result = builtInString;

	// append user's custom reason
	if ( customString ) {
		result += `: ${Morebits.string.toUpperCaseFirstChar( customString )}`;
	}

	// find number of UTF-8 bytes the resulting string takes up, and possibly add
	// a contributions or contributions+talk link if it doesn't push the edit summary
	// over the 499-byte limit
	if ( /\$USER/.test( builtInString ) ) {
		if ( userName ) {
			var resultLen = unescape( encodeURIComponent( result.replace( "$USER", "" ) ) ).length;
			var contribsLink = `[[Special:Contribs/${userName}|${userName}]]`;
			var contribsLen = unescape( encodeURIComponent( contribsLink ) ).length;
			if ( resultLen + contribsLen <= 499 ) {
				var talkLink = `（[[User talk:${userName}|讨论]]）`;
				if ( resultLen + contribsLen + unescape( encodeURIComponent( talkLink ) ).length <= 499 ) {
					result = Morebits.string.safeReplace( result, "$USER", contribsLink + talkLink );
				} else {
					result = Morebits.string.safeReplace( result, "$USER", contribsLink );
				}
			} else {
				result = Morebits.string.safeReplace( result, "$USER", userName );
			}
		} else {
			result = Morebits.string.safeReplace( result, "$USER", Twinkle.fluff.hiddenName );
		}
	}
	return result;
};
Twinkle.addInitCallback( Twinkle.fluff, "fluff" );
}( jQuery ) );

/* </nowiki> */