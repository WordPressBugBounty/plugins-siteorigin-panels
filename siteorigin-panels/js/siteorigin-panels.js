(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var panels = window.panels;

module.exports = Backbone.Collection.extend( {
	model: panels.model.cell,

	initialize: function () {
	},

	/**
	 * Get the total weight for the cells in this collection.
	 * @returns {number}
	 */
	totalWeight: function () {
		var totalWeight = 0;
		this.each( function ( cell ) {
			totalWeight += cell.get( 'weight' );
		} );

		return totalWeight;
	},

} );

},{}],2:[function(require,module,exports){
var panels = window.panels;

module.exports = Backbone.Collection.extend( {
	model: panels.model.historyEntry,

	/**
	 * The builder model
	 */
	builder: null,

	/**
	 * The maximum number of items in the history
	 */
	maxSize: 12,

	initialize: function () {
		this.on( 'add', this.onAddEntry, this );
	},

	/**
	 * Add an entry to the collection.
	 *
	 * @param text The text that defines the action taken to get to this
	 * @param data
	 */
	addEntry: function ( text, data ) {

		if ( _.isEmpty( data ) ) {
			data = this.builder.getPanelsData();
		}

		var entry = new panels.model.historyEntry( {
			text: text,
			data: JSON.stringify( data ),
			time: parseInt( new Date().getTime() / 1000 ),
			collection: this
		} );

		this.add( entry );
	},

	/**
	 * Resize the collection so it's not bigger than this.maxSize
	 */
	onAddEntry: function ( entry ) {

		if ( this.models.length > 1 ) {
			var lastEntry = this.at( this.models.length - 2 );

			if (
				(
					entry.get( 'text' ) === lastEntry.get( 'text' ) && entry.get( 'time' ) - lastEntry.get( 'time' ) < 15
				) ||
				(
					entry.get( 'data' ) === lastEntry.get( 'data' )
				)
			) {
				// If both entries have the same text and are within 20 seconds of each other, or have the same data, then remove most recent
				this.remove( entry );
				lastEntry.set( 'count', lastEntry.get( 'count' ) + 1 );
			}
		}

		// Make sure that there are not to many entries in this collection
		while ( this.models.length > this.maxSize ) {
			this.shift();
		}
	}
} );

},{}],3:[function(require,module,exports){
var panels = window.panels;

module.exports = Backbone.Collection.extend( {
	model: panels.model.row,

	/**
	 * Destroy all the rows in this collection
	 */
	empty: function () {
		var model;
		do {
			model = this.collection.first();
			if ( ! model ) {
				break;
			}

			model.destroy();
		} while ( true );
	}

} );

},{}],4:[function(require,module,exports){
var panels = window.panels;

module.exports = Backbone.Collection.extend( {
	model: panels.model.widget,

	initialize: function () {

	}

} );

},{}],5:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = panels.view.dialog.extend( {
	dialogClass: 'so-panels-dialog-add-builder',

	render: function () {
		// Render the dialog and attach it to the builder interface
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-builder' ).html(), {} ) );
		this.$( '.so-content .siteorigin-panels-builder' ).append( this.builder.$el );
	},

	initializeDialog: function () {
		var thisView = this;
		this.once( 'open_dialog_complete', function () {
			thisView.builder.initSortable();
		} );

		this.on( 'open_dialog_complete', function () {
			thisView.builder.trigger( 'builder_resize' );
		} );
	}
} );

},{}],6:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = panels.view.dialog.extend( {

	historyEntryTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-dialog-history-entry' ).html() ) ),

	entries: {},
	currentEntry: null,
	revertEntry: null,
	selectedEntry: null,

	previewScrollTop: null,

	dialogClass: 'so-panels-dialog-history',
	dialogIcon: 'history',

	events: {
		'click .so-close': 'closeDialog',
		'keyup .so-close': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-restore': 'restoreSelectedEntry',
		'keyup .history-entry': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	initializeDialog: function () {
		this.entries = new panels.collection.historyEntries();

		this.on( 'open_dialog', this.setCurrentEntry, this );
		this.on( 'open_dialog', this.renderHistoryEntries, this );

		this.on( 'open_dialog_complete', function () {
			this.$( '.history-entry' ).trigger( 'focus' );
		} );
	},

	render: function () {
		var thisView = this;

		// Render the dialog and attach it to the builder interface
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-history' ).html(), {} ) );

		// Set the history URL.
		this.$( 'form.history-form' ).attr( 'action', this.builder.config.editorPreview );

		this.$( 'iframe.siteorigin-panels-history-iframe' ).on( 'load', function () {
			var $$ = $( this );
			$$.show();

			$$.contents().scrollTop( thisView.previewScrollTop );
		} );
	},

	/**
	 * Set the original entry. This should be set when creating the dialog.
	 *
	 * @param {panels.model.builder} builder
	 */
	setRevertEntry: function ( builder ) {
		this.revertEntry = new panels.model.historyEntry( {
			data: JSON.stringify( builder.getPanelsData() ),
			time: parseInt( new Date().getTime() / 1000 )
		} );
	},

	/**
	 * This is triggered when the dialog is opened.
	 */
	setCurrentEntry: function () {
		this.currentEntry = new panels.model.historyEntry( {
			data: JSON.stringify( this.builder.model.getPanelsData() ),
			time: parseInt( new Date().getTime() / 1000 )
		} );

		this.selectedEntry = this.currentEntry;
		this.previewEntry( this.currentEntry );
		this.$( '.so-buttons .so-restore' ).addClass( 'disabled' );
	},

	/**
	 * Render the history entries in the sidebar
	 */
	renderHistoryEntries: function () {
		// Set up an interval that will display the time since every 10 seconds
		var thisView = this;

		var c = this.$( '.history-entries' ).empty();

		if ( this.currentEntry.get( 'data' ) !== this.revertEntry.get( 'data' ) || ! _.isEmpty( this.entries.models ) ) {
			$( this.historyEntryTemplate( {title: panelsOptions.loc.history.revert, count: 1} ) )
				.data( 'historyEntry', this.revertEntry )
				.prependTo( c );
		}

		// Now load all the entries in this.entries
		this.entries.each( function ( entry ) {

			var html = thisView.historyEntryTemplate( {
				title: panelsOptions.loc.history[entry.get( 'text' )],
				count: entry.get( 'count' )
			} );

			$( html )
				.data( 'historyEntry', entry )
				.prependTo( c );
		} );


		$( this.historyEntryTemplate( {title: panelsOptions.loc.history['current'], count: 1} ) )
			.data( 'historyEntry', this.currentEntry )
			.addClass( 'so-selected' )
			.prependTo( c );

		// Handle loading and selecting
		c.find( '.history-entry' ).on( 'click', function(e) {
			if ( e.type == 'keyup' && e.which != 13 ) {
				return;
			}

			var $$ = jQuery( this );
			c.find( '.history-entry' ).not( $$ ).removeClass( 'so-selected' );
			$$.addClass( 'so-selected' );

			var entry = $$.data( 'historyEntry' );

			thisView.selectedEntry = entry;

			if ( thisView.selectedEntry.cid !== thisView.currentEntry.cid ) {
				thisView.$( '.so-buttons .so-restore' ).removeClass( 'disabled' );
			} else {
				thisView.$( '.so-buttons .so-restore' ).addClass( 'disabled' );
			}

			thisView.previewEntry( entry );
		} );

		this.updateEntryTimes();
	},

	/**
	 * Preview an entry
	 *
	 * @param entry
	 */
	previewEntry: function ( entry ) {
		var iframe = this.$( 'iframe.siteorigin-panels-history-iframe' );
		iframe.hide();
		this.previewScrollTop = iframe.contents().scrollTop();

		this.$( 'form.history-form input[name="live_editor_panels_data"]' ).val( entry.get( 'data' ) );
		this.$( 'form.history-form input[name="live_editor_post_ID"]' ).val( this.builder.config.postId );
		this.$( 'form.history-form' ).trigger( 'submit' );
	},

	/**
	 * Restore the current entry
	 */
	restoreSelectedEntry: function () {

		if ( this.$( '.so-buttons .so-restore' ).hasClass( 'disabled' ) ) {
			return false;
		}

		if ( this.currentEntry.get( 'data' ) === this.selectedEntry.get( 'data' ) ) {
			this.closeDialog();
			return false;
		}

		// Add an entry for this restore event
		if ( this.selectedEntry.get( 'text' ) !== 'restore' ) {
			this.builder.addHistoryEntry( 'restore', this.builder.model.getPanelsData() );
		}

		this.builder.model.loadPanelsData( JSON.parse( this.selectedEntry.get( 'data' ) ) );

		this.closeDialog();

		return false;
	},

	/**
	 * Update the entry times for the list of entries down the side
	 */
	updateEntryTimes: function () {
		var thisView = this;

		this.$( '.history-entries .history-entry' ).each( function () {
			var $$ = jQuery( this );

			var time = $$.find( '.timesince' );
			var entry = $$.data( 'historyEntry' );

			time.html( thisView.timeSince( entry.get( 'time' ) ) );
		} );
	},

	/**
	 * Gets the time since as a nice string.
	 *
	 * @param date
	 */
	timeSince: function ( time ) {
		var diff = parseInt( new Date().getTime() / 1000 ) - time;

		var parts = [];
		var interval;

		// There are 3600 seconds in an hour
		if ( diff > 3600 ) {
			interval = Math.floor( diff / 3600 );
			if ( interval === 1 ) {
				parts.push( panelsOptions.loc.time.hour.replace( '%d', interval ) );
			} else {
				parts.push( panelsOptions.loc.time.hours.replace( '%d', interval ) );
			}
			diff -= interval * 3600;
		}

		// There are 60 seconds in a minute
		if ( diff > 60 ) {
			interval = Math.floor( diff / 60 );
			if ( interval === 1 ) {
				parts.push( panelsOptions.loc.time.minute.replace( '%d', interval ) );
			} else {
				parts.push( panelsOptions.loc.time.minutes.replace( '%d', interval ) );
			}
			diff -= interval * 60;
		}

		if ( diff > 0 ) {
			if ( diff === 1 ) {
				parts.push( panelsOptions.loc.time.second.replace( '%d', diff ) );
			} else {
				parts.push( panelsOptions.loc.time.seconds.replace( '%d', diff ) );
			}
		}

		// Return the amount of time ago
		return _.isEmpty( parts ) ? panelsOptions.loc.time.now : panelsOptions.loc.time.ago.replace( '%s', parts.slice( 0, 2 ).join( ', ' ) );

	}

} );

},{}],7:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = panels.view.dialog.extend( {

	directoryTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-directory-items' ).html() ) ),

	builder: null,
	dialogClass: 'so-panels-dialog-prebuilt-layouts',
	dialogIcon: 'layouts',

	currentTab: false,
	directoryPage: 1,
	maxPages: 1,
	itemsPer: 16,
	activeFilter: [],

	events: {
		'click .so-close': 'closeDialog',
		'click .so-sidebar-tabs li a': 'tabClickHandler',
		'click .so-content .layout': 'layoutClickHandler',
		'keyup .so-sidebar-search': 'searchHandler',

		// The directory items.
		'click .so-screenshot, .so-title': 'directoryItemClickHandler',
		'keyup .so-directory-item': 'clickTitleOnEnter',

		// Filtering.
		'click .so-directory-items-filter-categories li': 'filterCategory',
		'click .so-directory-items-filter-niches li': 'filterNiches',

		'click .so-previous': 'previousPage',
		'click .so-next': 'nextPage',
	},

	clickTitleOnEnter: function( e ) {
		if ( e.which == 13 ) {
			$( e.target ).find( '.so-title' ).trigger( 'click' );
		}
	},

	/**
	 * Initialize the prebuilt dialog.
	 */
	initializeDialog: function () {
		var thisView = this;

		this.on( 'open_dialog', function () {
			thisView.$( '.so-sidebar-tabs li a' ).first().trigger( 'click' );
			thisView.$( '.so-status' ).removeClass( 'so-panels-loading' );
		} );

		this.on( 'open_dialog_complete', function () {
			// Clear the search and re-filter the widgets when we open the dialog
			this.$( '.so-sidebar-search' ).val( '' ).trigger( 'focus' );
		} );
	},

	/**
	 * Render the prebuilt layouts dialog
	 */
	render: function () {
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-prebuilt' ).html(), {} ) );
		this.on( 'button_click', this.toolbarButtonClick, this );
		this.initToolbar();
	},

	/**
	 *
	 * @param e
	 * @return {boolean}
	 */
	tabClickHandler: function ( e ) {
		e.preventDefault();
		// Reset selected item state when changing tabs
		this.selectedLayoutItem = null;
		this.uploadedLayout = null;
		this.updateButtonState( false );

		this.$( '.so-sidebar-tabs li' ).removeClass( 'tab-active' );

		var $$ = $( e.target );
		var tab = $$.attr( 'href' ).split( '#' )[1];
		$$.parent().addClass( 'tab-active' );

		var thisView = this;

		// Empty everything
		this.$( '.so-content' ).empty();

		thisView.currentTab = tab;
		if ( tab == 'import' ) {
			this.displayImportExport();
		} else {
			this.displayLayoutDirectory( '', 1, tab );
		}

		thisView.$( '.so-sidebar-search' ).val( '' );
	},

	/**
	 * Display and setup the import/export form
	 */
	displayImportExport: function () {
		var c = this.$( '.so-content' ).empty().removeClass( 'so-panels-loading' );
		c.html( $( '#siteorigin-panels-dialog-prebuilt-importexport' ).html() );

		var thisView = this;
		var uploadUi = thisView.$( '.import-upload-ui' );

		// Create the uploader
		var uploader = new plupload.Uploader( {
			runtimes: 'html5,silverlight,flash,html4',

			browse_button: uploadUi.find( '.file-browse-button' ).get( 0 ),
			container: uploadUi.get( 0 ),
			drop_element: uploadUi.find( '.drag-upload-area' ).get( 0 ),

			file_data_name: 'panels_import_data',
			multiple_queues: false,
			max_file_size: panelsOptions.plupload.max_file_size,
			url: panelsOptions.plupload.url,
			flash_swf_url: panelsOptions.plupload.flash_swf_url,
			silverlight_xap_url: panelsOptions.plupload.silverlight_xap_url,
			filters: [
				{title: panelsOptions.plupload.filter_title, extensions: 'json'}
			],

			multipart_params: {
				action: 'so_panels_import_layout'
			},

			init: {
				PostInit: function ( uploader ) {
					if ( uploader.features.dragdrop ) {
						uploadUi.addClass( 'has-drag-drop' );
					}
					uploadUi.find( '.progress-precent' ).css( 'width', '0%' );
				},
				FilesAdded: function ( uploader ) {
					uploadUi.find( '.file-browse-button' ).trigger( 'blur' );
					uploadUi.find( '.drag-upload-area' ).removeClass( 'file-dragover' );
					uploadUi.find( '.progress-bar' ).fadeIn( 'fast' );
					thisView.$( '.js-so-selected-file' ).text( panelsOptions.loc.prebuilt_loading );
					uploader.start();
				},
				UploadProgress: function ( uploader, file ) {
					uploadUi.find( '.progress-precent' ).css( 'width', file.percent + '%' );
				},
				FileUploaded: function ( uploader, file, response ) {
					var layout = JSON.parse( response.response );
					if ( ! _.isUndefined( layout.widgets ) ) {

						thisView.uploadedLayout = layout;
						uploadUi.find( '.progress-bar' ).hide();
						thisView.$( '.js-so-selected-file' ).text(
							panelsOptions.loc.ready_to_insert.replace( '%s', file.name )
						);
						thisView.updateButtonState( true );
					} else {
						alert( panelsOptions.plupload.error_message );
					}
				},
				Error: function () {
					alert( panelsOptions.plupload.error_message );
				}
			}
		} );
		uploader.init();

		if ( /Edge\/\d./i.test(navigator.userAgent) ){
			// A very dirty fix for a Microsoft Edge issue.
			// TODO find a more elegant fix if Edge gains market share
			setTimeout( function(){
				uploader.refresh();
			}, 250 );
		}

		// This is
		uploadUi.find( '.drag-upload-area' )
			.on( 'dragover', function () {
				$( this ).addClass( 'file-dragover' );
			} )
			.on( 'dragleave', function () {
				$( this ).removeClass( 'file-dragover' );
			} );

		// Handle exporting the file
		c.find( '.so-export' ).on( 'submit', function( e ) {
			var $$ = $( this );
			var panelsData = thisView.builder.model.getPanelsData();
			var postName = $( 'input[name="post_title"], .editor-post-title__input' ).val();
			if ( ( ! postName || postName === '' ) && $( '.block-editor-page' ).length ) {
				postName = $( '.wp-block-post-title' ).text();
			}
			panelsData.name = postName !== '' ? postName : $( 'input[name="post_ID"]' ).val();

			// Append block position id to filename.
			if ( $( '.block-editor-page' ).length ) {
				var currentBlockPosition = thisView.getCurrentBlockPosition();
				if ( currentBlockPosition >= 0 ) {
					panelsData.name += '-' + currentBlockPosition;
				}
			}
			$$.find( 'input[name="panels_export_data"]' ).val( JSON.stringify( panelsData ) );
		} );

	},

	/**
	 * Return current block index.
	 */
	getCurrentBlockPosition: function() {
		var selectedBlockClientId = wp.data.select( 'core/block-editor' ).getSelectedBlockClientId();
		return wp.data.select( 'core/block-editor' ).getBlocks().findIndex( function ( block ) {
			return block.clientId === selectedBlockClientId;
		} );
	},

	/**
	 * Display the layout directory tab.
	 *
	 * @param query
	 */
	displayLayoutDirectory: function ( search, page, type ) {
		var thisView = this;
		var c = this.$( '.so-content' ).empty().addClass( 'so-panels-loading' );

		if ( search === undefined ) {
			search = '';
		}
		if ( page === undefined ) {
			page = 1;
		}
		if ( type === undefined ) {
			type = 'directory-siteorigin';
		}

		if ( this.isLayoutDirectory() && ! panelsOptions.directory_enabled ) {
			// Display the button to enable the prebuilt layout
			c.removeClass( 'so-panels-loading' ).html( $( '#siteorigin-panels-directory-enable' ).html() );
			c.find( '.so-panels-enable-directory' ).on( 'click', function( e ) {
				e.preventDefault();
				// Sent the query to enable the directory, then enable the directory
				$.get(
					panelsOptions.ajaxurl,
					{action: 'so_panels_directory_enable'},
					function () {

					}
				);

				// Enable the layout directory
				panelsOptions.directory_enabled = true;
				c.addClass( 'so-panels-loading' );
				thisView.displayLayoutDirectory( search, page, type );
			} );
			return;
		}

		// Get all the items for the current query
		$.get(
			panelsOptions.ajaxurl,
			{
				action: 'so_panels_layouts_query',
				page: page,
				type: type,
				search: search,
				builderType: this.builder.config.builderType,
			},
			function ( data ) {
				// Skip this if we're no longer viewing the layout directory
				if ( thisView.currentTab !== type ) {
					return;
				}

				// Add the directory items
				c.removeClass( 'so-panels-loading' ).html( thisView.directoryTemplate( data ) );

				// Depending on the active type, we need to handle things slightly differently.
				if ( type.match( '^directory-' ) ) {
					thisView.directoryPage = page;
					thisView.maxPages = data.max_num_pages;
					thisView.updatePagination();
				} else {
					// Lets setup the next and previous buttons
					var prev = c.find( '.so-previous' ), next = c.find( '.so-next' );

					if ( page <= 1 ) {
						prev.addClass( 'button-disabled' );
					} else {
						prev.on( 'click', function( e ) {
							e.preventDefault();
							thisView.displayLayoutDirectory( search, page - 1, thisView.currentTab );
						} );
					}

					if ( page === data.max_num_pages || data.max_num_pages === 0 ) {
						next.addClass( 'button-disabled' );
					} else {
						next.on( 'click', function( e ) {
							e.preventDefault();
							thisView.displayLayoutDirectory( search, page + 1, thisView.currentTab );
						} );
					}

					thisView.$( '.so-directory-items' ).toggleClass( 'so-empty', ! data.items.length );
				}

				if ( page <= 1 ) {
					c.find( '.so-previous' ).addClass( 'button-disabled' );
				}

				// Handle nice preloading of the screenshots
				c.find( '.so-screenshot' ).each( function () {
					var $$ = $( this ), $a = $$.find( '.so-screenshot-wrapper' );
					$a.css( 'height', ( $a.width() / 4 * 3 ) + 'px' ).addClass( 'so-loading' );

					if ( $$.data( 'src' ) !== '' ) {
						// Set the initial height
						var $img = $( '<img/>' ).attr( 'src', $$.data( 'src' ) ).on( 'load', function () {
							$a.removeClass( 'so-loading' ).css( 'height', 'auto' );
							$img.appendTo( $a ).hide().fadeIn( 'fast' );
						} );
					} else {
						$( '<img/>' ).attr( 'src', panelsOptions.prebuiltDefaultScreenshot ).appendTo( $a ).hide().fadeIn( 'fast' );
					}

				} );

				// Set the title
				c.find( '.so-directory-browse' ).html( data.title );
			},
			'json'
		);
	},

	filterLayouts: function() {
		this.directoryPage = 1;
		this.$( '.so-directory-item ' ).removeClass( 'so-filter' );

		var category = this.$( '.so-directory-items-filter-categories li.so-active-filter' ).data( 'filter' );
		var niches = this.$( '.so-directory-items-filter-niches li.so-active-filter' ).map( function() {
		  return $( this ).data( 'filter' );
		} ).get();

		this.activeFilter = category + niches.map( function( filter ) {
			return filter;
		} ).join( '' );


		if ( this.activeFilter.length ) {
			var matchedItems = this.$( '.so-directory-items-wrapper' ).find( this.activeFilter );
			matchedItems.addClass( 'so-filter' );
		}

		this.updatePagination();

		var visibleItems = this.$( '.so-directory-item' ).filter(':visible');

		this.$( '.so-directory-items' ).toggleClass(
			'so-empty',
			! visibleItems.length
		);
	},

	getItems: function() {
		if ( this.activeFilter.length ) {
			return this.$( '.so-directory-items-wrapper' ).find( '.so-filter' );
		} else {
			return this.$( '.so-directory-items-wrapper .so-directory-item' );
		}
	},

	/**
	 * Get the maximum number of pages for the current context.
	 *
	 * @param {*} $items An optional jQuery collection of items to calculate the maximum pages for.
	 * @returns int The maximum number of pages based on the items and items per page.
	 */
	contextualMaxPages: function( $items = null ) {
		if ( $items === null ) {
			$items = this.getItems();
		}

		const contextualMaxPages = Math.ceil( $items.length / this.itemsPer );
		return contextualMaxPages > this.maxPages ? contextualMaxPages : this.maxPages;
	},

	updatePagination: function() {
		var $items = this.getItems();

		const startIndex = this.isLayoutDirectory() ?
			this.directoryPage - 1 :
			( this.directoryPage - 1 ) * this.itemsPer;

		const endIndex = startIndex + this.itemsPer;

		// Hide any items not on the current page.
		this.$( '.so-directory-items-wrapper .so-directory-item' ).addClass( 'so-hidden' );
		$items.slice( startIndex, endIndex ).removeClass( 'so-hidden' );

		this.$( '.so-previous' ).toggleClass( 'button-disabled', this.directoryPage === 1 );
		this.$( '.so-next' ).toggleClass(
			'button-disabled',
			this.directoryPage === this.contextualMaxPages( $items )
		);
	},

	isLayoutDirectory: function() {
		return this.currentTab.match( '^directory-' );
	},

	/**
	 * Update the layout directory interface with the new search value and page.
	 *
	 * @param {string} directoryPath - The path to the layout directory.
	 * @param {Object} config - Configuration options for the update.
	 * @returns {boolean} - Returns true if the update was successful, otherwise false.
	 */
	updateLayoutDirectory: function() {
		if ( ! this.isLayoutDirectory() ) {
			return false;
		}

		const searchVal = this.$( '.so-sidebar-search' ).val().toLowerCase();
		this.displayLayoutDirectory(
			searchVal,
			this.directoryPage,
			this.currentTab
		);

		return true;
	},

	previousPage: function() {
		if (this.directoryPage > 1) {
			this.directoryPage--;

			if ( ! this.updateLayoutDirectory() ) {
				this.updatePagination();
			}
		}
	},

	nextPage: function() {
		const maxPages = this.contextualMaxPages();

		if ( this.directoryPage < maxPages ) {
			this.directoryPage++;

			if ( ! this.updateLayoutDirectory() ) {
				this.updatePagination();
			}
		}
	},

	filterCategory: function( e ) {
		this.$( '.so-directory-items-filter-categories li.so-active-filter' ).removeClass( 'so-active-filter' );
		$( e.target ).addClass( 'so-active-filter' );
		this.filterLayouts();
	},

	filterNiches: function( e ) {
		$( e.target ).toggleClass( 'so-active-filter' );
		this.filterLayouts();
	},

	/**
	 * Set the selected state for the clicked layout directory item and remove previously selected item.
	 * Enable the toolbar buttons.
	 */
	directoryItemClickHandler: function ( e ) {
		var $directoryItem = this.$( e.target ).closest( '.so-directory-item' );
		this.$( '.so-directory-items' ).find( '.selected' ).removeClass( 'selected' );
		$directoryItem.addClass( 'selected' );
		this.selectedLayoutItem = {lid: $directoryItem.data( 'layout-id' ), type: $directoryItem.data( 'layout-type' )};
		this.updateButtonState( true );

	},

	/**
	 * Load a particular layout into the builder.
	 *
	 * @param id
	 */
	toolbarButtonClick: function ( $button ) {
		if ( ! this.canAddLayout() ) {
			return false;
		}
		var position = $button.data( 'value' );
		if ( _.isUndefined( position ) ) {
			return false;
		}
		this.updateButtonState( false );

		if ( $button.hasClass( 'so-needs-confirm' ) && ! $button.hasClass( 'so-confirmed' ) ) {
			this.updateButtonState( true );
			if ( $button.hasClass( 'so-confirming' ) ) {
				return;
			}
			$button.addClass( 'so-confirming' );
			var originalText = $button.html();
			$button.html( '<span class="dashicons dashicons-yes"></span>' + $button.data( 'confirm' ) );
			setTimeout( function () {
				$button.removeClass( 'so-confirmed' ).html( originalText );
			}, 2500 );
			setTimeout( function () {
				$button.removeClass( 'so-confirming' );
				$button.addClass( 'so-confirmed' );
			}, 200 );
			return false;
		}
		this.addingLayout = true;
		if ( this.currentTab === 'import' ) {
			this.addLayoutToBuilder( this.uploadedLayout, position );
		} else {
			this.loadSelectedLayout().then( function ( layout ) {
				this.addLayoutToBuilder( layout, position );
			}.bind( this ) );
		}
	},

	canAddLayout: function () {
		return (
			   this.selectedLayoutItem || this.uploadedLayout
			   ) && ! this.addingLayout;
	},

	/**
	 * Load the layout according to selectedLayoutItem.
	 */
	loadSelectedLayout: function () {
		this.setStatusMessage( panelsOptions.loc.prebuilt_loading, true );

		var args = _.extend(
			this.selectedLayoutItem,
			{
				action: 'so_panels_get_layout',
				builderType: this.builder.config.builderType
			}
		);
		var deferredLayout = new $.Deferred();

		$.get(
			panelsOptions.ajaxurl,
			args,
			function ( layout ) {
				var msg = '';
				if ( ! layout.success ) {
					msg = layout.data.message;
					deferredLayout.reject( layout.data );
				} else {
					deferredLayout.resolve( layout.data );
				}
				this.setStatusMessage( msg, false, ! layout.success );
				this.updateButtonState( true );
			}.bind( this )
		);
		return deferredLayout.promise();
	},

	/**
	 * Handle an update to the search
	 */
	searchHandler: function ( e ) {
		if ( e.keyCode === 13 ) {
			var search = $( e.currentTarget ).val().toLowerCase();
			this.displayLayoutDirectory( search, 1, this.currentTab );
		}
	},

	/**
	 * Attempt to set the 'Insert' button's state according to the `enabled` argument, also checking whether the
	 * requirements for inserting a layout have valid values.
	 */
	updateButtonState: function ( enabled ) {
		enabled = enabled && (
			this.selectedLayoutItem || this.uploadedLayout
			);
		var $button = this.$( '.so-import-layout' );
		$button.prop( "disabled", ! enabled );
		if ( enabled ) {
			$button.removeClass( 'disabled' );
		} else {
			$button.addClass( 'disabled' );
		}
	},

	addLayoutToBuilder: function ( layout, position ) {
		this.builder.addHistoryEntry( 'prebuilt_loaded' );
		this.builder.model.loadPanelsData( layout, position );
		this.addingLayout = false;
		this.closeDialog();
	}
} );

},{}],8:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = panels.view.dialog.extend({

	cellPreviewTemplate: _.template( panels.helpers.utils.processTemplate( $('#siteorigin-panels-dialog-row-cell-preview').html() ) ),

	editableLabel: true,

	events: {
		'click .so-close': 'closeDialog',
		'keyup .so-close': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},

		// Toolbar buttons
		'click .so-close': 'saveHandler',
		'click .so-toolbar .so-saveinline': function( e ) {
			this.saveHandler( true );
		},
		'click .so-mode': 'switchModeShow',
		'keyup .so-mode': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-saveinline-mode': function() {
			this.switchMode( true );
		},
		'keyup .so-mode-list li': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-close-mode': function() {
			this.switchMode( false );
		},
		'keyup .so-close-mode': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-toolbar .so-save': 'saveHandler',
		'click .so-toolbar .so-saveinline': function( e ) {
			this.saveHandler( true );
		},
		'click .so-toolbar .so-insert': 'insertHandler',
		'click .so-toolbar .so-delete': 'deleteHandler',
		'keyup .so-toolbar .so-delete': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-toolbar .so-duplicate': 'duplicateHandler',
		'keyup .so-toolbar .so-duplicate': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},

		// Changing the row.
		'click .row-set-form .so-row-field': 'changeCellTotal',
		'change .row-set-form .so-row-field': 'changeCellTotal',
		'click .cell-resize-sizing span': 'changeCellRatio',
		'click .cell-resize-direction ': 'changeSizeDirection',

		// If user clicks the column size indicator, focus the field.
		'click .preview-cell-unit ': function( e ) {
			$( e.target ).next().trigger( 'focus' );
		},

		'keyup .cell-resize-direction': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e, true );
		},
		'keyup .cell-resize-sizing': function( e ) {
			if ( e.which == 13 ) {
				var size = $( e.target ).index();
				var parent = $( e.target ).parent();
				$( e.target ).find( 'span' ).trigger( 'click' );

				// Refocus on the selected size to prevent focus loss.
				parent.find( '.cell-resize-sizing' ).eq( size ).trigger( 'focus' );
			}
		},
	},

	rowView: null,
	dialogIcon: 'add-row',
	dialogClass: 'so-panels-dialog-row-edit',
	styleType: 'row',
	columnResizeData: [],

	dialogType: 'edit',

	/**
	 * The current settings, not yet saved to the model
	 */
	row: {
		// This will be a clone of cells collection.
		cells: null,
		// The style settings of the row
		style: {}
	},

	cellStylesCache: [],

	initializeDialog: function () {
		this.on('open_dialog', function () {
			if (!_.isUndefined(this.model) && !_.isEmpty(this.model.get('cells'))) {
				this.setRowModel(this.model);
			} else {
				this.setRowModel(null);
			}

			this.columnResizeData = this.$( '.cell-resize').data( 'resize' );
			this.regenerateRowPreview();
			this.drawCellResizers();
			this.updateActiveCellClass();
			this.renderStyles();
			this.openSelectedCellStyles();
		}, this);

		this.on( 'open_dialog_complete', function() {
			$( '.so-panels-dialog-wrapper .so-title' ).trigger( 'focus' );
		} );

		// This is the default row layout
		this.row = {
			cells: new panels.collection.cells( panelsOptions.default_columns ),
			style: {}
		};

		// Refresh panels data after both dialog form components are loaded
		this.dialogFormsLoaded = 0;
		var thisView = this;
		this.on('form_loaded styles_loaded', function () {
			this.dialogFormsLoaded++;
			if (this.dialogFormsLoaded === 2) {
				thisView.updateModel({
					refreshArgs: {
						silent: true
					}
				});
			}
		});

		this.on('close_dialog', this.closeHandler);

		this.on( 'edit_label', function ( text ) {
			// If text is set to default values, just clear it.
			if ( text === panelsOptions.loc.row.add || text === panelsOptions.loc.row.edit ) {
				text = '';
			}
			this.model.set( 'label', text );
			if ( _.isEmpty( text ) ) {
				var title = this.dialogType === 'create' ? panelsOptions.loc.row.add : panelsOptions.loc.row.edit;
				this.$( '.so-title').text( title );
			}
		}.bind( this ) );
	},

	/**
	 *
	 * @param dialogType Either "edit" or "create"
	 */
	setRowDialogType: function (dialogType) {
		this.dialogType = dialogType;
	},

	/**
	 * Render the new row dialog
	 */
	render: function () {
		var title = this.dialogType === 'create' ? panelsOptions.loc.row.add : panelsOptions.loc.row.edit;
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-row' ).html(), {
			title: title,
			dialogType: this.dialogType
		} ) );

		var titleElt = this.$( '.so-title' );

		if ( this.model.has( 'label' ) && ! _.isEmpty( this.model.get( 'label' ) ) ) {
			titleElt.text( this.model.get( 'label' ) );
		}
		this.$( '.so-edit-title' ).val( titleElt.text() );

		if (!this.builder.supports('addRow')) {
			this.$('.so-buttons .so-duplicate').remove();
		}
		if (!this.builder.supports('deleteRow')) {
			this.$('.so-buttons .so-delete').remove();
		}

		if ( ! _.isUndefined( this.model ) && this.dialogType == 'edit' ) {
			// Set the initial value of the
			this.$( 'input[name="cells"].so-row-field' ).val( this.model.get( 'cells' ).length );
		}

		return this;
	},

	renderStyles: function () {
		if ( this.styles ) {
			this.styles.off( 'styles_loaded' );
			this.styles.remove();
		}

		// Now we need to attach the style window
		this.styles = new panels.view.styles();
		this.styles.model = this.model;
		this.styles.render('row', this.builder.config.postId, {
			builderType: this.builder.config.builderType,
			dialog: this
		});

		var $rightSidebar = this.$('.so-sidebar.so-right-sidebar');
		this.styles.attach( $rightSidebar );

		// Handle the loading class
		this.styles.on('styles_loaded', function (hasStyles) {
			if ( ! hasStyles ) {
				// If we don't have styles remove the view.
				this.styles.remove();

				// If the sidebar is empty, hide it.
				if ( $rightSidebar.children().length === 0 ) {
					$rightSidebar.closest('.so-panels-dialog').removeClass('so-panels-dialog-has-right-sidebar');
					$rightSidebar.hide();
				}
			}
		}, this);
	},

	/**
	 * Set the row model we'll be using for this dialog.
	 *
	 * @param model
	 */
	setRowModel: function (model) {
		this.model = model;

		if (_.isEmpty(this.model)) {
			return this;
		}

		// Set the rows to be a copy of the model
		this.row = {
			cells: this.model.get('cells').clone(),
			style: {},
		};

		// Set the initial value of the cell field.
		if ( this.dialogType == 'edit' ) {
			this.$( 'input[name="cells"].so-row-field' ).val( this.model.get( 'cells' ).length );
		}

		this.clearCellStylesCache();

		return this;
	},

	/**
	 * Regenerate the row preview and resizing interface.
	 */
	regenerateRowPreview: function () {
		var thisDialog = this;
		var rowPreview = this.$('.row-preview');

		// If no selected cell, select the first cell.
		var selectedIndex = this.getSelectedCellIndex();

		rowPreview.empty();

		var timeout;

		// Represent the cells
		this.row.cells.each(function (cellModel, i) {
			var newCell = $(this.cellPreviewTemplate({weight: cellModel.get('weight')}));
			rowPreview.append(newCell);

			if(i == selectedIndex) {
				newCell.find('.preview-cell-in').addClass('cell-selected');
			}

			var prevCell = newCell.prev();
			var handle;

			if (prevCell.length) {
				handle = $('<div class="resize-handle"></div>');
				handle
					.appendTo(newCell)
					.on( 'dblclick', function () {
						var prevCellModel = thisDialog.row.cells.at(i - 1);
						var t = cellModel.get('weight') + prevCellModel.get('weight');
						cellModel.set('weight', t / 2);
						prevCellModel.set('weight', t / 2);
						thisDialog.scaleRowWidths();
					});

				handle.draggable({
					axis: 'x',
					containment: rowPreview,
					start: function (e, ui) {

						// Create the clone for the current cell
						var newCellClone = newCell.clone().appendTo(ui.helper).css({
							position: 'absolute',
							top: '0',
							width: newCell.outerWidth(),
							left: 6,
							height: newCell.outerHeight()
						});
						newCellClone.find('.resize-handle').remove();

						// Create the clone for the previous cell
						var prevCellClone = prevCell.clone().appendTo(ui.helper).css({
							position: 'absolute',
							top: '0',
							width: prevCell.outerWidth(),
							right: 6,
							height: prevCell.outerHeight()
						});
						prevCellClone.find('.resize-handle').remove();

						$(this).data({
							'newCellClone': newCellClone,
							'prevCellClone': prevCellClone
						});

						// Hide the
						newCell.find('> .preview-cell-in').css('visibility', 'hidden');
						prevCell.find('> .preview-cell-in').css('visibility', 'hidden');
					},
					drag: function (e, ui) {
						// Calculate the new cell and previous cell widths as a percent
						var cellWeight = thisDialog.row.cells.at(i).get('weight');
						var prevCellWeight = thisDialog.row.cells.at(i - 1).get('weight');
						var ncw = cellWeight - (
								(
									ui.position.left + 6
								) / rowPreview.width()
							);
						var pcw = prevCellWeight + (
								(
									ui.position.left + 6
								) / rowPreview.width()
							);

						$( this ).data( 'newCellClone' ).css( 'width', rowPreview.width() * ncw + 'px' )
							.find('.preview-cell-weight').html(Math.round(ncw * 1000) / 10);

						$( this ).data( 'prevCellClone' ).css( 'width', rowPreview.width() * pcw + 'px' )
							.find('.preview-cell-weight').html(Math.round(pcw * 1000) / 10);
					},
					stop: function (e, ui) {
						// Remove the clones
						$(this).data('newCellClone').remove();
						$(this).data('prevCellClone').remove();

						// Reshow the main cells
						newCell.find('.preview-cell-in').css('visibility', 'visible');
						prevCell.find('.preview-cell-in').css('visibility', 'visible');

						// Calculate the new cell weights
						var offset = ui.position.left + 6;
						var percent = offset / rowPreview.width();

						// Ignore this if any of the cells are below 2% in width.
						var cellModel = thisDialog.row.cells.at(i);
						var prevCellModel = thisDialog.row.cells.at(i - 1);
						if (cellModel.get('weight') - percent > 0.02 && prevCellModel.get('weight') + percent > 0.02) {
							cellModel.set('weight', cellModel.get('weight') - percent);
							prevCellModel.set('weight', prevCellModel.get('weight') + percent);
						}

						thisDialog.scaleRowWidths();
						ui.helper.css('left', -6);
					}
				});
			}

			newCell.on( 'click', function( event ) {

				if ( ! ( $(event.target).is('.preview-cell') || $(event.target).is('.preview-cell-in') ) ) {
					return;
				}

				var cell = $(event.target);
				cell.closest('.row-preview').find('.preview-cell .preview-cell-in').removeClass('cell-selected');
				cell.addClass('cell-selected');

				this.openSelectedCellStyles();

			}.bind(this));

			newCell.find( '.preview-cell-weight' ).on( 'click', function( ci ) {

				// Disable the draggable while entering values.
				thisDialog.$( '.resize-handle' ).css( 'pointer-event', 'none' ).draggable( 'disable' );

				var resizeCells = function( refocusIndex = false ) {
					timeout = setTimeout( function() {
						var rowPreviewInputs = rowPreview.find( '.preview-cell-weight-input' );
						// If there are no weight inputs, then skip this.
						if ( rowPreviewInputs.length === 0 ) {
							return false;
						}

						var rowWeights = [],
							rowChanged = [],
							changedSum = 0,
							unchangedSum = 0;

						rowPreviewInputs.each( function( i, el ) {
							var val = parseFloat( $( el ).val() );
							if ( isNaN( val ) ) {
								val = 1 / thisDialog.row.cells.length;
							} else {
								val = Math.round( val * 10 ) / 1000;
							}

							// Check within 3 decimal points.
							var changed = ! $( el ).hasClass( 'no-user-interacted' );

							rowWeights.push( val );
							rowChanged.push( changed );

							if ( changed ) {
								changedSum += val;
							} else {
								unchangedSum += val;
							}
						} );

						if ( changedSum > 0 && unchangedSum > 0 && 1 - changedSum > 0 ) {
							// Balance out the unchanged rows to occupy the weight left over by the changed sum.
							for ( var i = 0; i < rowWeights.length; i++ ) {
								if ( ! rowChanged[ i ] ) {
									rowWeights[ i ] = (
											rowWeights[ i ] / unchangedSum
										) * (
											1 - changedSum
										);
								}
							}
						}

						// Last check to ensure total weight is 1.
						var sum = _.reduce( rowWeights, function ( memo, num ) {
							return memo + num;
						} );

						rowWeights = rowWeights.map( function( w ) {
							return w / sum;
						} );

						// Set the new cell weights and regenerate the preview.
						if ( Math.min.apply( Math, rowWeights ) > 0.01 ) {
							thisDialog.row.cells.each( function( cell, i ) {
								cell.set( 'weight', rowWeights[ i ] );
							} );
						}

						// Now lets animate the cells into their new widths.
						rowPreview.find( '.preview-cell' ).each( function ( i, el ) {
							var cellWeight = thisDialog.row.cells.at( i ).get( 'weight');
							$( el ).animate( { 'width': Math.round( cellWeight * 1000 ) / 10 + "%" }, 250 );
							$( el ).find( '.preview-cell-weight-input' ).val( Math.round( cellWeight * 1000 ) / 10 );
						});

						setTimeout( function() {
							if ( typeof refocusIndex === 'number' ) {
								rowPreviewInputs.get( refocusIndex ).focus();
							}

							// So the draggable handle is not hidden.
							thisDialog.regenerateRowPreview.bind( thisDialog )
						}, 260 );

					}, 100 );
				}

				rowPreview.find( '.preview-cell-weight' ).each( function( ci ) {
					var columnId = ci + 1;
					var $$ = jQuery( this ).hide();
					var maxSize = 100 - ( thisDialog.row.cells.length - 1 );
					var label = panelsOptions.loc.row.cellInput.replace( '%s', columnId );

					$( `<input
						type="number"
						class="preview-cell-weight-input no-user-interacted"
						id="column-${ columnId }"
						min="1"
						max="${ maxSize }"
						aria-label="${ label }"
					/>` )
						.val( parseFloat( $$.html() ) ).insertAfter( $$ )
						.on( 'focus', function() {
							clearTimeout( timeout );
							$( this ).attr( 'type', 'number' );
						} )
						.on( 'keyup', function( e ) {
							if ( e.keyCode !== 9 ) {
								// Only register the interaction if the user didn't press tab.
								$( this ).removeClass( 'no-user-interacted' );
							}

							// Enter is pressed.
							if ( e.keyCode === 13 ) {
								e.preventDefault();
								resizeCells();
							}

							// Up or down is pressed.
							if ( e.keyCode === 38 || e.keyCode === 40 ) {
								e.preventDefault();
								// During the row regeneration, the inputs are removed and re-added so we need the id to refocus.
								var parent = $( e.target ).parents( '.preview-cell' ).index();

								resizeCells( parent );
							}
						} )
						.on( 'blur', resizeCells )
						.on( 'click', function () {
							// If the input is already focused, the user has clicked a step.
							if ( $( this ).is( ':focus' ) ) {
								resizeCells();
							}
							$( this ).trigger( 'select' );
						} );
				} );

				$( this ).siblings( '.preview-cell-weight-input' ).trigger( 'select' );

				// When the field blurs, we convert the inputs to text to prevent an overlap with the step counter with the percentage.
				rowPreview.find( '.preview-cell-weight-input' ).on( 'blur', function() {
					rowPreview.find( '.preview-cell-weight-input' ).attr( 'type', 'text' );
				} );
			} );

			// When a user tabs to  one of the column previews, switch all of them to inputs.
			newCell.find( '.preview-cell-weight' ).on( 'focus', function( e ) {
				$( e.target ).trigger( 'click' );
			} );

		}, this);

		this.updateActiveCellClass();

		this.trigger('form_loaded', this);
	},

	getSelectedCellIndex: function() {
		var selectedIndex = -1;
		this.$('.preview-cell .preview-cell-in').each(function(index, el) {
			if($(el).is('.cell-selected')) {
				selectedIndex = index;
			}
		});
		return selectedIndex;
	},

	openSelectedCellStyles: function() {
		if (!_.isUndefined(this.cellStyles)) {
			if (this.cellStyles.stylesLoaded) {
				var style = {};
				try {
					style = this.getFormValues('.so-sidebar .so-visual-styles.so-cell-styles').style;
				}
				catch (err) {
					console.log('Error retrieving cell styles - ' + err.message);
				}

				this.cellStyles.model.set('style', style);
			}
			this.cellStyles.detach();
		}

		this.cellStyles = this.getSelectedCellStyles();

		if ( this.cellStyles ) {
			var $rightSidebar = this.$( '.so-sidebar.so-right-sidebar' );
			this.cellStyles.attach( $rightSidebar );
			this.cellStyles.on( 'styles_loaded', function ( hasStyles ) {
				if ( hasStyles ) {
					$rightSidebar.closest('.so-panels-dialog').addClass('so-panels-dialog-has-right-sidebar');
					$rightSidebar.show();
				}
			} );
		}
	},

	getSelectedCellStyles: function () {
		var cellIndex = this.getSelectedCellIndex();
		if ( cellIndex > -1 ) {
			var cellStyles = this.cellStylesCache[cellIndex];
			if ( !cellStyles ) {
				cellStyles = new panels.view.styles();
				cellStyles.model = this.row.cells.at( cellIndex );
				cellStyles.render( 'cell', this.builder.config.postId, {
					builderType: this.builder.config.builderType,
					dialog: this,
					index: cellIndex,
				} );
				this.cellStylesCache[cellIndex] = cellStyles;
			}
		}

		return cellStyles;
	},

	clearCellStylesCache: function () {
		// Call remove() on all cell styles to remove data, event listeners etc.
		this.cellStylesCache.forEach(function (cellStyles) {
			cellStyles.remove();
			cellStyles.off( 'styles_loaded' );
		});
		this.cellStylesCache = [];
	},

	/**
	 * Visually scale the row widths based on the cell weights
	 */
	scaleRowWidths: function () {
		var thisDialog = this;
		this.$('.row-preview .preview-cell').each(function (i, el) {
			var cell = thisDialog.row.cells.at(i);
			$(el)
				.css('width', cell.get('weight') * 100 + "%")
				.find('.preview-cell-weight').html(Math.round(cell.get('weight') * 1000) / 10);
		});
	},

	drawCellResizers: function() {
		this.$( '.cell-resize' ).empty();
		var cellsCount = this.getCurrentCellCount();
		var currentCellSizes = this.columnResizeData[ cellsCount ];

		// Certain sizes may require some additional CSS spacing.
		this.$( '.row-set-form' ).attr( 'data-cells', cellsCount );

		if ( cellsCount > 1 && typeof currentCellSizes !== 'undefined' ) {
			this.$( '.cell-resize-container, .cell-resize-direction-container' ).show();
			for ( ci = 0; ci < currentCellSizes.length; ci++ ) {
				this.$( '.cell-resize' ).append( '<span class="cell-resize-sizing" tabindex="0"></span>' );
				var $lastCell = this.$( '.cell-resize' ).find( '.cell-resize-sizing' ).last();
				$lastCell.data( 'cells', currentCellSizes[ ci ] );
				for ( cs = 0; cs < currentCellSizes[ ci ].length; cs++ ) {
					$lastCell.append( '<span style="width: ' + currentCellSizes[ ci ][ cs ] + '%;">' + currentCellSizes[ ci ][ cs ] + '%</span>' );
				}
			}
		} else {
			this.$( '.cell-resize-container, .cell-resize-direction-container' ).hide();
		}
	},

	updateActiveCellClass: function() {
		$( '.so-active-ratio' ).removeClass( 'so-active-ratio' );
		var activeCellRatio = this.$( '.preview-cell-weight' ).map( function() {
			return Math.trunc( Number( $( this ).text() ) );
		} ).get();

		var cellsCount = this.getCurrentCellCount();
		$.each( this.columnResizeData[ cellsCount ], function( i, ratio ) {
			if ( ratio.toString() === activeCellRatio.toString() ) {
				activeCellRatio = i;
				return false;
			}
		} );

		if ( typeof activeCellRatio == 'number' ) {
			$( $( '.cell-resize-sizing' ).get( activeCellRatio ) ).addClass( 'so-active-ratio' );
		}
	},

	changeSizeDirection: function( e ) {
		var $current = $( e.target );
		var currentDirection = $current.attr( 'data-direction' );
		var newDirection = currentDirection == 'left' ? 'right' : 'left';
		var label = panelsOptions.loc.row.direction.replace( '%s', panelsOptions.loc.row[ newDirection ] );

		$current
			.removeClass( 'dashicons-arrow-' + currentDirection )
			.addClass( 'dashicons-arrow-' + newDirection )
			.attr( 'data-direction', newDirection )
			.attr( 'aria-label', label );

		// Reverse all sizes.
		for ( var columnCount in this.columnResizeData ) {
			this.columnResizeData[ columnCount ] = this.columnResizeData[ columnCount ].map( function( size ) {
				return size.reverse();
			} );
		}

		this.drawCellResizers();
	},

	changeCellRatio: function( e ) {
		var $current = $( e.target );
		if ( ! $current.hasClass( 'cell-resize-sizing' ) ) {
			$current = $current.parent();
		}

		if ( ! $current.hasClass( 'so-active-ratio' ) ) {
			$( '.so-active-ratio' ).removeClass( 'so-active-ratio' );
			$current.addClass( 'so-active-ratio' );
			this.changeCellTotal( $current.data('cells' ) )
		}
	},

	getCurrentCellCount: function() {
		return parseInt( this.$('.row-set-form input[name="cells"]').val() );
	},

	changeCellTotal: function ( cellRatio = 0 ) {
		var thisDialog = this;
		 try {
			var cellsCount = this.getCurrentCellCount();
			this.drawCellResizers();

			if (_.isNaN( cellsCount )) {
				cellsCount = 1;
			} else {
				if ( cellsCount < 1 ) {
					cellsCount = 1;
				} else if ( cellsCount > 12 ) {
					cellsCount = 12;
				}
			}
			this.$( '.row-set-form input[name="cells"]' ).val( cellsCount );

			var cells = [];
			var cellCountChanged = (
				this.row.cells.length !== cellsCount
			);

			// Create some cells
			for ( var i = 0; i < cellsCount; i++ ) {
				cells.push( 1 );
			}

			// Lets make sure that the row weights add up to 1.
			var totalRowWeight = _.reduce( cells, function( memo, weight ) {
				return memo + weight;
			} );

			cells = _.map( cells, function( cell ) {
				return cell / totalRowWeight;
			} );

			// Don't return cells that are too small
			cells = _.filter( cells, function( cell ) {
				return cell > 0.01;
			} );

			// Discard deleted cells.
			this.row.cells = new panels.collection.cells( this.row.cells.first( cells.length ) );

			_.each( cells, function( cellWeight, index ) {
				var cell = this.row.cells.at( index );
				if ( ! cell ) {
					cell = new panels.model.cell( {
						weight: cellWeight,
						row: this.model
					} );

					setTimeout( thisDialog.regenerateRowPreview.bind( thisDialog ), 260 );
					this.row.cells.add( cell );
				} else {
					cell.set(
						'weight',
						cellRatio.length ? cellRatio[ index ] / 100 : cellWeight
					);
				}
			}.bind( this ) );

			if ( cellCountChanged ) {
				this.regenerateRowPreview();
			} else {
				// // Now lets animate the cells into their new widths
				this.$( '.preview-cell' ).each( function( i, el ) {
					var width = Math.round( thisDialog.row.cells.at( i ).get( 'weight' ) * 1000 ) / 10;
					var $previewCellWeight = $( el ).find( '.preview-cell-weight' );
					// To prevent a jump, don't animate cells that haven't changed size.
					if ( parseInt( $previewCellWeight.text() ) != width ) {
						$( el ).animate( { 'width': width + "%" }, 250 );
						$previewCellWeight.html( width );
					}
				} );

				// So the draggable handle is not hidden.
				this.$( '.preview-cell' ).css( 'overflow', 'visible' );

				setTimeout( thisDialog.regenerateRowPreview.bind( thisDialog ), 260 );
			}
		}
		catch ( err ) {
			console.log( 'Error setting cells - ' + err.message );
		}

		// Remove the button primary class
		this.$( '.row-set-form .so-button-row-set' ).removeClass( 'button-primary' );
	},

	/**
	 * Handle a click on the dialog left bar tab
	 */
	tabClickHandler: function ($t) {
		if ($t.attr('href') === '#row-layout') {
			this.$('.so-panels-dialog').addClass('so-panels-dialog-has-right-sidebar');
		} else {
			this.$('.so-panels-dialog').removeClass('so-panels-dialog-has-right-sidebar');
		}
	},

	/**
	 * Update the current model with what we have in the dialog
	 */
	updateModel: function (args) {
		args = _.extend({
			refresh: true,
			refreshArgs: null
		}, args);

		// Set the cells
		if (!_.isEmpty(this.model)) {
			this.model.setCells( this.row.cells );
			this.model.set( 'ratio', this.row.ratio );
		}

		// Update the row styles if they've loaded
		if ( ! _.isUndefined( this.styles ) && this.styles.stylesLoaded ) {
			// This is an edit dialog, so there are styles
			var newStyles = {};
			try {
				newStyles = this.getFormValues( '.so-sidebar .so-visual-styles.so-row-styles' ).style;
			}
			catch (err) {
				console.log( 'Error retrieving row styles - ' + err.message );
			}

			// Have there been any Style changes?
			if ( JSON.stringify( this.model.attributes.style ) !== JSON.stringify( newStyles ) ) {
				this.model.set( 'style', newStyles );
				this.model.trigger( 'change:styles' );
				this.model.trigger( 'change:styles-row' );
			}
		}

		// Update the cell styles if any are showing.
		if ( !_.isUndefined( this.cellStyles ) && this.cellStyles.stylesLoaded ) {

			var newStyles = {};
			try {
				newStyles = this.getFormValues( '.so-sidebar .so-visual-styles.so-cell-styles' ).style;
			}
			catch (err) {
				console.log('Error retrieving cell styles - ' + err.message);
			}

			// Has there been any Style changes?
			if ( JSON.stringify( this.model.attributes.style ) !== JSON.stringify( newStyles ) ) {
				this.cellStyles.model.set( 'style', newStyles );
				this.model.trigger( 'change:styles' );
				this.model.trigger( 'change:styles-cell' );
			}
		}

		if (args.refresh) {
			this.builder.model.refreshPanelsData(args.refreshArgs);
		}
	},

	/**
	 * Insert the new row
	 */
	insertHandler: function () {
		this.builder.addHistoryEntry('row_added');

		this.updateModel();

		var activeCell = this.builder.getActiveCell({
			createCell: false,
		});

		var options = {};
		if (activeCell !== null) {
			options.at = this.builder.model.get('rows').indexOf(activeCell.row) + 1;
		}

		// Set up the model and add it to the builder
		this.model.collection = this.builder.model.get('rows');
		this.builder.model.get('rows').add(this.model, options);

		this.closeDialog();

		this.builder.model.refreshPanelsData();

		return false;
	},

	/**
	 * We'll just save this model and close the dialog
	 */
	saveHandler: function( savePage = false, e ) {
		this.builder.addHistoryEntry( 'row_edited' );
		this.updateModel();
		if ( typeof savePage == 'boolean' ) {
			panels.helpers.utils.saveHeartbeat( this );
		} else {
			this.builder.model.refreshPanelsData();
			this.closeDialog();
		}

		return false;
	},

	/**
	 * The user clicks delete, so trigger deletion on the row model
	 */
	deleteHandler: function () {
		// Trigger a destroy on the model that will happen with a visual indication to the user
		this.rowView.visualDestroyModel();
		this.closeDialog({silent: true});

		return false;
	},

	/**
	 * Duplicate this row
	 */
	duplicateHandler: function () {
		this.builder.addHistoryEntry('row_duplicated');

		var duplicateRow = this.model.clone(this.builder.model);

		this.builder.model.get('rows').add( duplicateRow, {
			at: this.builder.model.get('rows').indexOf(this.model) + 1
		} );

		this.closeDialog({silent: true});

		return false;
	},

	closeHandler: function() {
		this.clearCellStylesCache();
		if( ! _.isUndefined(this.cellStyles) ) {
			this.cellStyles = undefined;
		}
	},

	switchModeShow: function() {
		const list = this.$( '.so-toolbar .so-mode-list' );
		const toolbar = this.$( '.so-toolbar' );
		list.show();
		list.find( 'li:first-of-type' ).trigger( 'focus' );
		toolbar.find( '.button-primary:visible' ).addClass( 'so-active-mode' );
		toolbar.find( '.button-primary' ).hide();

		setTimeout( function() {
			$( document ).one( 'click', function( e ) {
				var $$ = $( e.target );

				if ( ! $$.hasClass( 'so-saveinline-mode' ) && ! $$.hasClass( 'so-close-mode' ) ) {
					list.hide();
					toolbar.find( '.so-active-mode' ).show()
				}
			} );
		}, 100 );
	},

	switchMode: function( inline = false ) {
		const toolbar = this.$( '.so-toolbar' );
		toolbar.find( '.so-mode-list' ).hide();
		toolbar.find( '.button-primary' ).removeClass( 'so-active-mode' );
		if ( inline ) {
			toolbar.find( '.so-saveinline' ).show();
		} else {
			toolbar.find( '.so-save' ).show();
		}

		window.panelsMode = inline ? 'inline' : 'dialog';

		this.$( '.so-mode' ).trigger( 'focus' );
	},

} );

},{}],9:[function(require,module,exports){
var panels = window.panels, $ = jQuery;
var jsWidget = require( '../view/widgets/js-widget' );

module.exports = panels.view.dialog.extend( {

	builder: null,
	sidebarWidgetTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-dialog-widget-sidebar-widget' ).html() ) ),

	dialogClass: 'so-panels-dialog-edit-widget',
	dialogIcon: 'add-widget',

	widgetView: false,
	savingWidget: false,
	editableLabel: true,

	events: {
		'click .so-close': 'saveHandler',
		'click .so-toolbar .so-saveinline': function( e ) {
			this.saveHandler( true );
		},
		'click .so-mode': 'switchModeShow',
		'keyup .so-mode': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-saveinline-mode': function() {
			this.switchMode( true );
		},
		'keyup .so-mode-list li': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-close-mode': function() {
			this.switchMode( false );
		},
		'keyup .so-close-mode': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'keyup .so-close': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-nav.so-previous': 'navToPrevious',
		'keyup .so-nav.so-previous': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-nav.so-next': 'navToNext',
		'keyup .so-nav.so-next': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},

		// Action handlers
		'click .so-toolbar .so-delete': 'deleteHandler',
		'keyup .so-toolbar .so-delete': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-toolbar .so-duplicate': 'duplicateHandler',
		'keyup .so-toolbar .so-duplicate': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	initializeDialog: function () {
		var thisView = this;
		this.listenTo( this.model, 'change:values', this.handleChangeValues );
		this.listenTo( this.model, 'destroy', this.remove );

		// Refresh panels data after both dialog form components are loaded
		this.dialogFormsLoaded = 0;
		this.on( 'form_loaded styles_loaded', function () {
			this.dialogFormsLoaded ++;
			if ( this.dialogFormsLoaded === 2 ) {
				thisView.updateModel( {
					refreshArgs: {
						silent: true
					}
				} );
			}
		} );

		this.on( 'edit_label', function ( text ) {

				// If text is set to default value, just clear it.
				if ( text === panelsOptions.widgets[ this.model.get( 'class' ) ]['title']) {
					text = '';
				} else {
					// Sanitize  widget label.
					const $tempDiv = $( '<div></div>' ).text( text );
					text = $tempDiv.text();
				}

				this.model.set( 'label', text );

				if ( _.isEmpty( text ) ) {
					this.$( '.so-title' ).text(
						_.escape(
							this.model.getWidgetField( 'title' )
						)
					);
				}
			}.bind( this ) );

		this.on( 'open_dialog_complete', function() {
			// If the title isn't visible, focus the first input.
			const focusTarget = this.$( '.so-title-editable' );
			if ( focusTarget.length ) {
				focusTarget.trigger( 'focus' );
			} else {
				this.$( '.so-content .siteorigin-widget-field-repeater-item-top, .so-content input, .so-content select' ).first().trigger( 'focus' );
			}
		} );
	},

	/**
	 * Render the widget dialog.
	 */
	render: function () {
		// Render the dialog and attach it to the builder interface
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-widget' ).html(), {} ) );
		this.loadForm();

		const rawTitle = this.model.getWidgetField( 'title' );
		const title = _.escape( rawTitle ).replace( /&quot;/g, '"' );
		this.$( '.so-title .widget-name' ).text( title );
		this.$( '.so-edit-title' ).val( title );

		if( ! this.builder.supports( 'addWidget' ) ) {
			this.$( '.so-buttons .so-duplicate' ).remove();
		}
		if( ! this.builder.supports( 'deleteWidget' ) ) {
			this.$( '.so-buttons .so-delete' ).remove();
		}

		// Now we need to attach the style window
		this.styles = new panels.view.styles();
		this.styles.model = this.model;
		this.styles.render( 'widget', this.builder.config.postId, {
			builderType: this.builder.config.builderType,
			dialog: this
		} );

		var $rightSidebar = this.$( '.so-sidebar.so-right-sidebar' );
		this.styles.attach( $rightSidebar );

		// Handle the loading class
		this.styles.on( 'styles_loaded', function ( hasStyles ) {
			// If we don't have styles remove the empty sidebar.
			if ( ! hasStyles ) {
				$rightSidebar.closest( '.so-panels-dialog' ).removeClass( 'so-panels-dialog-has-right-sidebar' );
				$rightSidebar.remove();
			}
		}, this );
	},

	/**
	 * Get the previous widget editing dialog by looking at the dom.
	 * @returns {*}
	 */
	getPrevDialog: function () {
		var widgets = this.builder.$( '.so-cells .cell .so-widget' );
		if ( widgets.length <= 1 ) {
			return false;
		}
		var currentIndex = widgets.index( this.widgetView.$el );

		if ( currentIndex === 0 ) {
			return false;
		} else {
			var widgetView;
			do {
				widgetView = widgets.eq( --currentIndex ).data( 'view' );
				if ( ! _.isUndefined( widgetView ) && ! widgetView.model.get( 'read_only' ) ) {
					return widgetView.getEditDialog();
				}
			} while( ! _.isUndefined( widgetView ) && currentIndex > 0 );
		}

		return false;
	},

	/**
	 * Get the next widget editing dialog by looking at the dom.
	 * @returns {*}
	 */
	getNextDialog: function () {
		var widgets = this.builder.$( '.so-cells .cell .so-widget' );
		if ( widgets.length <= 1 ) {
			return false;
		}

		var currentIndex = widgets.index( this.widgetView.$el );

		if ( currentIndex === widgets.length - 1 ) {
			return false;
		} else {
			var widgetView;
			do {
				widgetView = widgets.eq( ++currentIndex ).data( 'view' );
				if ( ! _.isUndefined( widgetView ) && ! widgetView.model.get( 'read_only' ) ) {
					return widgetView.getEditDialog();
				}
			} while( ! _.isUndefined( widgetView ) );
		}

		return false;
	},

	/**
	 * Load the widget form from the server.
	 * This is called when rendering the dialog for the first time.
	 */
	loadForm: function () {
		// don't load the form if this dialog hasn't been rendered yet
		if ( ! this.$( '> *' ).length ) {
			return;
		}

		this.$( '.so-content' ).addClass( 'so-panels-loading' );

		var data = {
			'action': 'so_panels_widget_form',
			'widget': this.model.get( 'class' ),
			'instance': JSON.stringify( this.model.get( 'values' ) ),
			'raw': this.model.get( 'raw' ),
			'postId': this.builder.config.postId
		};

		var $soContent = this.$( '.so-content' );

		$.post( panelsOptions.ajaxurl, data, null, 'html' )
		.done( function ( result ) {
			// Add in the CID of the widget model
			var html = result.replace( /{\$id}/g, this.model.cid );

			// Load this content into the form
			$soContent
			.removeClass( 'so-panels-loading' )
			.html( html );

			// Trigger all the necessary events
			this.trigger( 'form_loaded', this );

			// For legacy compatibility, trigger a panelsopen event
			this.$( '.panel-dialog' ).trigger( 'panelsopen' );

			// If the main dialog is closed from this point on, save the widget content
			this.on( 'close_dialog', this.updateModel, this );

			var widgetContent = $soContent.find( '> .widget-content' );
			// If there's a widget content wrapper, this is one of the new widgets in WP 4.8 which need some special
			// handling in JS.
			if ( widgetContent.length > 0 ) {
				jsWidget.addWidget( $soContent, this.model.widget_id );
			}

		}.bind( this ) )
		.fail( function ( error ) {
			var html;
			if ( error && error.responseText ) {
				html = error.responseText;
			} else {
				html = panelsOptions.forms.loadingFailed;
			}

			$soContent
			.removeClass( 'so-panels-loading' )
			.html( html );
		} );
	},

	/**
	 * Save the widget from the form to the model
	 */
	updateModel: function ( args ) {
		args = _.extend( {
			refresh: true,
			refreshArgs: null
		}, args );

		// Get the values from the form and assign the new values to the model
		this.savingWidget = true;

		if ( ! this.model.get( 'missing' ) ) {
			// Only get the values for non missing widgets.
			var values = this.getFormValues();
			if ( _.isUndefined( values.widgets ) ) {
				values = {};
			} else {
				values = values.widgets;
				values = values[Object.keys( values )[0]];
			}

			this.model.setValues( values );
			this.model.set( 'raw', true ); // We've saved from the widget form, so this is now raw
		}

		if ( this.styles.stylesLoaded ) {
			// If the styles view has loaded
			var newStyles = {};
			try {
				newStyles = this.getFormValues( '.so-sidebar .so-visual-styles' ).style;
			}
			catch ( e ) {
			}

			// Have there been any Style changes?
			if ( JSON.stringify( this.model.attributes.style ) !== JSON.stringify( newStyles ) ) {
				this.model.set( 'style', newStyles );
				this.model.trigger( 'change:styles' );
			}
		}

		this.savingWidget = false;

		if ( args.refresh ) {
			this.builder.model.refreshPanelsData( args.refreshArgs );
		}
	},

	/**
	 *
	 */
	handleChangeValues: function () {
		if ( ! this.savingWidget ) {
			// Reload the form when we've changed the model and we're not currently saving from the form
			this.loadForm();
		}
	},

	/**
	 * Save a history entry for this widget. Called when the dialog is closed.
	 */
	saveHandler: function( savePage = false, e ) {
		this.builder.addHistoryEntry( 'widget_edited' );
		if ( typeof savePage == 'boolean' ) {
			this.updateModel();
			panels.helpers.utils.saveHeartbeat( this );
		} else {
			this.closeDialog();
		}
	},

	/**
	 * When the user clicks delete.
	 *
	 * @returns {boolean}
	 */
	deleteHandler: function () {
		this.widgetView.visualDestroyModel();
		this.closeDialog( {silent: true} );
		this.builder.model.refreshPanelsData();

		return false;
	},

	duplicateHandler: function () {
		// Call the widget duplicate handler directly
		this.widgetView.duplicateHandler();

		this.closeDialog( {silent: true} );
		this.builder.model.refreshPanelsData();

		return false;
	},

	switchModeShow: function() {
		const list = this.$( '.so-toolbar .so-mode-list' );
		const toolbar = this.$( '.so-toolbar' );
		list.show();
		list.find( 'li:first-of-type' ).trigger( 'focus' );
		toolbar.find( '.button-primary:visible' ).addClass( 'so-active-mode' );
		toolbar.find( '.button-primary' ).hide();

		setTimeout( function() {
			$( document ).one( 'click', function( e ) {
				var $$ = $( e.target );

				if ( ! $$.hasClass( 'so-saveinline-mode' ) && ! $$.hasClass( 'so-close-mode' ) ) {
					list.hide();
					toolbar.find( '.so-active-mode' ).show()
				}
			} );
		}, 100 );
	},

	switchMode: function( inline = false ) {
		const toolbar = this.$( '.so-toolbar' );
		toolbar.find( '.so-mode-list' ).hide();
		toolbar.find( '.button-primary' ).removeClass( 'so-active-mode' );
		if ( inline ) {
			toolbar.find( '.so-saveinline' ).show();
		} else {
			toolbar.find( '.so-close' ).show();
		}

		window.panelsMode = inline ? 'inline' : 'dialog';

		this.$( '.so-mode' ).trigger( 'focus' );
	},

} );

},{"../view/widgets/js-widget":33}],10:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = panels.view.dialog.extend( {

	builder: null,
	widgetTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-dialog-widgets-widget' ).html() ) ),
	filter: {},

	dialogClass: 'so-panels-dialog-add-widget',
	dialogIcon: 'add-widget',

	events: {
		'click .so-close': 'closeDialog',
		'click .widget-type': 'widgetClickHandler',
		'keyup .so-sidebar-search': 'searchHandler',
		'keyup .widget-type-wrapper': 'searchHandler',
		'keyup .widget-type-wrapper': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	/**
	 * Initialize the widget adding dialog
	 */
	initializeDialog: function () {

		this.on( 'open_dialog', function () {
			this.filter.search = '';
			this.filterWidgets( this.filter );
		}, this );


		this.on( 'open_dialog_complete', function () {
			// Clear the search and re-filter the widgets when we open the dialog
			this.$( '.so-sidebar-search' ).val( '' ).trigger( 'focus' );
			this.balanceWidgetHeights();
		} );

		// We'll implement a custom tab click handler
		this.on( 'tab_click', this.tabClickHandler, this );
	},

	render: function () {
		// Render the dialog and attach it to the builder interface
		this.renderDialog( this.parseDialogContent( $( '#siteorigin-panels-dialog-widgets' ).html(), {} ) );

		// Add all the widgets
		_.each( panelsOptions.widgets, function ( widget ) {
			var $w = $( this.widgetTemplate( {
				title: widget.title,
				description: widget.description
			} ) );

			if ( _.isUndefined( widget.icon ) ) {
				widget.icon = 'dashicons dashicons-admin-generic';
			}

			$( '<span class="widget-icon"></span>' ).addClass( widget.icon ).prependTo( $w.find( '.widget-type-wrapper' ) );

			$w.data( 'class', widget.class ).appendTo( this.$( '.widget-type-list' ) );
		}, this );

		// Add the sidebar tabs
		var tabs = this.$( '.so-sidebar-tabs' );
		_.each( panelsOptions.widget_dialog_tabs, function ( tab, key ) {
			$( this.dialogTabTemplate( {'title': tab.title, 'tab': key} ) ).data( {
				'message': tab.message,
				'filter': tab.filter
			} ).appendTo( tabs );
		}, this );

		// We'll be using tabs, so initialize them
		this.initTabs();

		var thisDialog = this;
		$( window ).on( 'resize', function() {
			thisDialog.balanceWidgetHeights();
		} );
	},

	/**
	 * Handle a tab being clicked
	 */
	tabClickHandler: function ( $t ) {
		// Get the filter from the tab, and filter the widgets
		this.filter = $t.parent().data( 'filter' );
		this.filter.search = this.$( '.so-sidebar-search' ).val();

		var message = $t.parent().data( 'message' );
		if ( _.isEmpty( message ) ) {
			message = '';
		}

		this.$( '.so-toolbar .so-status' ).html( message );

		this.filterWidgets( this.filter );

		return false;
	},

	/**
	 * Handle changes to the search value
	 */
	searchHandler: function ( e ) {
		if( e.which === 13 ) {
			var visibleWidgets = this.$( '.widget-type-list .widget-type:visible' );
			if( visibleWidgets.length === 1 ) {
				visibleWidgets.trigger( 'click' );
			}
		}
		else {
			this.filter.search = $( e.target ).val().trim();
			this.filterWidgets( this.filter );
		}
	},

	/**
	 * Filter the widgets that we're displaying
	 * @param filter
	 */
	filterWidgets: function ( filter ) {
		if ( _.isUndefined( filter ) ) {
			filter = {};
		}

		if ( _.isUndefined( filter.groups ) ) {
			filter.groups = '';
		}

		this.$( '.widget-type-list .widget-type' ).each( function () {
			var $$ = $( this ), showWidget;
			var widgetClass = $$.data( 'class' );

			var widgetData = (
				! _.isUndefined( panelsOptions.widgets[widgetClass] )
			) ? panelsOptions.widgets[widgetClass] : null;

			if ( _.isEmpty( filter.groups ) ) {
				// This filter doesn't specify groups, so show all
				showWidget = true;
			} else if ( widgetData !== null && ! _.isEmpty( _.intersection( filter.groups, panelsOptions.widgets[widgetClass].groups ) ) ) {
				// This widget is in the filter group
				showWidget = true;
			} else {
				// This widget is not in the filter group
				showWidget = false;
			}

			// This can probably be done with a more intelligent operator
			if ( showWidget ) {

				if ( ! _.isUndefined( filter.search ) && filter.search !== '' ) {
					// Check if the widget title contains the search term
					if ( widgetData.title.toLowerCase().indexOf( filter.search.toLowerCase() ) === - 1 ) {
						showWidget = false;
					}
				}

			}

			if ( showWidget ) {
				$$.show();
			} else {
				$$.hide();
			}
		} );

		// Balance the tags after filtering
		this.balanceWidgetHeights();
	},

	/**
	 * Add the widget to the current builder
	 *
	 * @param e
	 */
	widgetClickHandler: function ( e ) {
		// Add the history entry
		this.builder.trigger('before_user_adds_widget');
		this.builder.addHistoryEntry( 'widget_added' );

		var $w = $( e.currentTarget );

		var widget = new panels.model.widget( {
			class: $w.data( 'class' )
		} );

		// Add the widget to the cell model
		widget.cell = this.builder.getActiveCell();
		widget.cell.get('widgets').add( widget );

		this.closeDialog();
		this.builder.model.refreshPanelsData();

		this.builder.trigger('after_user_adds_widget', widget);
	},

	/**
	 * Balance widgets in a given row so they have enqual height.
	 * @param e
	 */
	balanceWidgetHeights: function ( e ) {
		var widgetRows = [[]];
		var previousWidget = null;

		// Work out how many widgets there are per row
		var perRow = Math.round( this.$( '.widget-type' ).parent().width() / this.$( '.widget-type' ).width() );

		// Add clears to create balanced rows
		this.$( '.widget-type' )
			.css( 'clear', 'none' )
			.filter( ':visible' )
			.each( function ( i, el ) {
				if ( i % perRow === 0 && i !== 0 ) {
					$( el ).css( 'clear', 'both' );
				}
			} );

		// Group the widgets into rows
		this.$( '.widget-type-wrapper' )
			.css( 'height', 'auto' )
			.filter( ':visible' )
			.each( function ( i, el ) {
				var $el = $( el );
				if ( previousWidget !== null && previousWidget.position().top !== $el.position().top ) {
					widgetRows[widgetRows.length] = [];
				}
				previousWidget = $el;
				widgetRows[widgetRows.length - 1].push( $el );
			} );

		// Balance the height of the widgets within the row.
		_.each( widgetRows, function ( row, i ) {
			var maxHeight = _.max( row.map( function ( el ) {
				return el.height();
			} ) );
			// Set the height of each widget in the row
			_.each( row, function ( el ) {
				el.height( maxHeight );
			} );

		} );
	}
} );

},{}],11:[function(require,module,exports){
var $ = jQuery;

module.exports = {
	/**
	 * Trigger click on valid enter key press.
	 */
	triggerClickOnEnter: function( e, refocus = false ) {
		if ( e.which == 13 ) {
			$( e.target ).trigger( 'click' );
			if ( refocus ) {
				setTimeout( function() {
					$( e.target ).trigger( 'focus' );
				}, 100 );
			}
		}
	},

};

},{}],12:[function(require,module,exports){
module.exports = {
	/**
	 * Check if we have copy paste available.
	 * @returns {boolean|*}
	 */
	canCopyPaste: function(){
		return typeof(Storage) !== "undefined" && panelsOptions.user;
	},

	/**
	 * Set the model that we're going to store in the clipboard
	 */
	setModel: function( model ){
		if( ! this.canCopyPaste() ) {
			return false;
		}

		var serial = panels.helpers.serialize.serialize( model );
		if( model instanceof  panels.model.row ) {
			serial.thingType = 'row-model';
		} else if( model instanceof  panels.model.widget ) {
			serial.thingType = 'widget-model';
		}

		// Can Page Builder cross domain copy paste?
		if (
			typeof SiteOriginPremium == 'object' &&
			typeof SiteOriginPremium.CrossDomainCopyPasteAddon == 'function'
		) {
			SiteOriginPremium.CrossDomainCopyPasteAddon().copy( serial );
		}

		// Store this in local storage
		localStorage[ 'panels_clipboard_' + panelsOptions.user ] = JSON.stringify( serial );
		return true;
	},

	/**
	 * Check if the current model stored in the clipboard is the expected type
	 */
	isModel: function( expected ){
		if( ! this.canCopyPaste() ) {
			return false;
		}

		var clipboardObject = localStorage[ 'panels_clipboard_' + panelsOptions.user ];
		if( clipboardObject !== undefined ) {
			clipboardObject = JSON.parse(clipboardObject);
			return clipboardObject.thingType && clipboardObject.thingType === expected;
		}

		return false;
	},

	/**
	 * Get the model currently stored in the clipboard
	 */
	getModel: function( expected ){
		if( ! this.canCopyPaste() ) {
			return null;
		}

		var clipboardObject = localStorage[ 'panels_clipboard_' + panelsOptions.user ];
		if( clipboardObject !== undefined ) {
			clipboardObject = JSON.parse( clipboardObject );
			if( clipboardObject.thingType && clipboardObject.thingType === expected ) {
				return panels.helpers.serialize.unserialize( clipboardObject, clipboardObject.thingType, null );
			}
		}

		return null;
	},
};

},{}],13:[function(require,module,exports){
module.exports = {
	isBlockEditor: function() {
		return typeof wp.blocks !== 'undefined' && jQuery( '.block-editor-page' ).length
	},

	isClassicEditor: function( builder ) {
		return builder.attachedToEditor && builder.$el.is( ':visible' );
	},
}

},{}],14:[function(require,module,exports){
module.exports = {
	/**
	 * Lock window scrolling for the main overlay
	 */
	lock: function () {
		if ( jQuery( 'body' ).css( 'overflow' ) === 'hidden' ) {
			return;
		}

		// lock scroll position, but retain settings for later
		var scrollPosition = [
			self.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
			self.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop
		];

		jQuery( 'body' )
			.data( {
				'scroll-position': scrollPosition
			} )
			.css( 'overflow', 'hidden' );

		if( ! _.isUndefined( scrollPosition ) ) {
			window.scrollTo( scrollPosition[0], scrollPosition[1] );
		}
	},

	/**
	 * Unlock window scrolling
	 */
	unlock: function () {
		if ( jQuery( 'body' ).css( 'overflow' ) !== 'hidden' ) {
			return;
		}

		// Check that there are no more dialogs or a live editor
		if ( ! jQuery( '.so-panels-dialog-wrapper' ).is( ':visible' ) && ! jQuery( '.so-panels-live-editor' ).is( ':visible' ) ) {
			jQuery( 'body' ).css( 'overflow', 'visible' );
			var scrollPosition = jQuery( 'body' ).data( 'scroll-position' );

			if( ! _.isUndefined( scrollPosition ) ) {
				window.scrollTo( scrollPosition[0], scrollPosition[1] );
			}
		}
	},
};

},{}],15:[function(require,module,exports){
/*
This is a modified version of https://github.com/underdogio/backbone-serialize/
*/

/* global Backbone, module, panels */

module.exports = {
	serialize: function( thing ){
		var val;

		if( thing instanceof Backbone.Model ) {
			var retObj = {};
			for ( var key in thing.attributes ) {
				if (thing.attributes.hasOwnProperty( key ) ) {
					// Skip these to avoid recursion
					if( key === 'builder' || key === 'collection' ) { continue; }

					// If the value is a Model or a Collection, then serialize them as well
					val = thing.attributes[key];
					if ( val instanceof Backbone.Model || val instanceof Backbone.Collection ) {
						retObj[key] = this.serialize( val );
					} else {
						// Otherwise, save the original value
						retObj[key] = val;
					}
				}
			}
			return retObj;
		}
		else if( thing instanceof Backbone.Collection ) {
			// Walk over all of our models
			var retArr = [];

			for ( var i = 0; i < thing.models.length; i++ ) {
				// If the model is serializable, then serialize it
				val = thing.models[i];

				if ( val instanceof Backbone.Model || val instanceof Backbone.Collection ) {
					retArr.push( this.serialize( val ) );
				} else {
					// Otherwise (it is an object), return it in its current form
					retArr.push( val );
				}
			}

			// Return the serialized models
			return retArr;
		}
	},

	unserialize: function( thing, thingType, parent ) {
		var retObj;

		switch( thingType ) {
			case 'row-model' :
				retObj = new panels.model.row();
				retObj.builder = parent;
				var atts = { style: thing.style };
				if ( thing.hasOwnProperty( 'label' ) ) {
					atts.label = thing.label;
				}
				if ( thing.hasOwnProperty( 'color_label' ) ) {
					atts.color_label = thing.color_label;
				}
				retObj.set( atts );
				retObj.setCells( this.unserialize( thing.cells, 'cell-collection', retObj ) );
				break;

			case 'cell-model' :
				retObj = new panels.model.cell();
				retObj.row = parent;
				retObj.set( 'weight', thing.weight );
				retObj.set( 'style', thing.style );
				retObj.set( 'widgets', this.unserialize( thing.widgets, 'widget-collection', retObj ) );
				break;

			case 'widget-model' :
				retObj = new panels.model.widget();
				retObj.cell = parent;
				for ( var key in thing ) {
					if ( thing.hasOwnProperty( key ) ) {
						retObj.set( key, thing[key] );
					}
				}
				retObj.set( 'widget_id', panels.helpers.utils.generateUUID() );
				break;

			case 'cell-collection':
				retObj = new panels.collection.cells();
				for( var i = 0; i < thing.length; i++ ) {
					retObj.push( this.unserialize( thing[i], 'cell-model', parent ) );
				}
				break;

			case 'widget-collection':
				retObj = new panels.collection.widgets();
				for( var i = 0; i < thing.length; i++ ) {
					retObj.push( this.unserialize( thing[i], 'widget-model', parent ) );
				}
				break;

			default:
				console.log( 'Unknown Thing - ' + thingType );
				break;
		}

		return retObj;
	}
};

},{}],16:[function(require,module,exports){
module.exports = {

	generateUUID: function(){
		var d = new Date().getTime();
		if( window.performance && typeof window.performance.now === "function" ){
			d += performance.now(); //use high-precision timer if available
		}
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return ( c == 'x' ? r : (r&0x3|0x8) ).toString(16);
		} );
		return uuid;
	},

	processTemplate: function ( s ) {
		if ( _.isUndefined( s ) || _.isNull( s ) ) {
			return '';
		}
		s = s.replace( /{{%/g, '<%' );
		s = s.replace( /%}}/g, '%>' );
		s = s.trim();
		return s;
	},

	// From this SO post: http://stackoverflow.com/questions/6139107/programmatically-select-text-in-a-contenteditable-html-element
	selectElementContents: function( element ) {
		var range = document.createRange();
		range.selectNodeContents( element );
		var sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange( range );
	},

	saveHeartbeat: function( thisDialog ) {
		jQuery( '.so-saveinline' ).attr( 'disabled', 'disabled' )
		jQuery( document ).one( 'heartbeat-send', function( event, data ) {
			data.panels = JSON.stringify( {
				data: thisDialog.builder.model.getPanelsData(),
				nonce: jQuery( '#_sopanels_nonce' ).val(),
				id: thisDialog.builder.config.postId
			} );
		} );
		jQuery( document ).one( 'heartbeat-tick', function( event, data ) {
			jQuery( '.so-saveinline' ).removeAttr( 'disabled' )
		} );
		wp.autosave.server.triggerSave()
	},

}

},{}],17:[function(require,module,exports){
/* global _, jQuery, panels */

var panels = window.panels, $ = jQuery;

module.exports = function ( config, force ) {

	return this.each( function () {
		var $$ = jQuery( this );

		if ( $$.data( 'soPanelsBuilderWidgetInitialized' ) && ! force ) {
			return;
		}
		var widgetId = $$.closest( 'form' ).find( '.widget-id' ).val();

		// Create a config for this specific widget
		var thisConfig = $.extend(
			true, 
			{
				builderSupports: $$.data( 'builder-supports' ),
			},
			config
		);

		// Exit if this isn't a real widget
		if ( ! _.isUndefined( widgetId ) && widgetId.indexOf( '__i__' ) > - 1 ) {
			return;
		}

		// Create the main builder model
		var builderModel = new panels.model.builder();

		// Now for the view to display the builder
		var builderView = new panels.view.builder( {
			model: builderModel,
			config: thisConfig
		} );

		// Save panels data when we close the dialog, if we're in a dialog
		var dialog = $$.closest( '.so-panels-dialog-wrapper' ).data( 'view' );
		if ( ! _.isUndefined( dialog ) ) {
			dialog.on( 'close_dialog', function () {
				builderModel.refreshPanelsData();
			} );

			dialog.on( 'open_dialog_complete', function () {
				// Make sure the new layout widget is always properly setup
				builderView.trigger( 'builder_resize' );
			} );

			dialog.model.on( 'destroy', function () {
				// Destroy the builder
				builderModel.emptyRows().destroy();
			} );

			// Set the parent for all the sub dialogs
			builderView.setDialogParents( panelsOptions.loc.layout_widget, dialog );
		}

		// Basic setup for the builder
		var isWidget = Boolean( $$.closest( '.widget-content' ).length );
		builderView
			.render()
			.attach( {
				container: $$,
				dialog: isWidget || $$.data('mode') === 'dialog',
				type: $$.data( 'type' )
			} )
			.setDataField( $$.find( 'input.panels-data' ) );

		if ( isWidget || $$.data('mode') === 'dialog' ) {
			// Set up the dialog opening
			builderView.setDialogParents( panelsOptions.loc.layout_widget, builderView.dialog );
			$$.find( '.siteorigin-panels-display-builder' ).on( 'click', function( e ) {
				e.preventDefault();
				builderView.dialog.openDialog();
			} );
		} else {
			// Remove the dialog opener button, this is already being displayed in a page builder dialog.
			$$.find( '.siteorigin-panels-display-builder' ).parent().remove();
		}

		// Trigger a global jQuery event after we've setup the builder view
		$( document ).trigger( 'panels_setup', builderView );

		$$.data( 'soPanelsBuilderWidgetInitialized', true );
	} );
};

},{}],18:[function(require,module,exports){
/**
 * Everything we need for SiteOrigin Page Builder.
 *
 * @copyright Greg Priday 2013 - 2016 - <https://siteorigin.com/>
 * @license GPL 3.0 http://www.gnu.org/licenses/gpl.html
 */

/* global Backbone, _, jQuery, tinyMCE, panelsOptions, plupload, confirm, console, require */

var panels = {};

// Store everything globally
window.panels = panels;
window.siteoriginPanels = panels;

// Helpers
panels.helpers = {};
panels.helpers.clipboard = require( './helpers/clipboard' );
panels.helpers.utils = require( './helpers/utils' );
panels.helpers.editor = require( './helpers/editor' );
panels.helpers.serialize = require( './helpers/serialize' );
panels.helpers.pageScroll = require( './helpers/page-scroll' );
panels.helpers.accessibility = require( './helpers/accessibility' );

// The models
panels.model = {};
panels.model.widget = require( './model/widget' );
panels.model.cell = require( './model/cell' );
panels.model.row = require( './model/row' );
panels.model.builder = require( './model/builder' );
panels.model.historyEntry = require( './model/history-entry' );

// The collections
panels.collection = {};
panels.collection.widgets = require( './collection/widgets' );
panels.collection.cells = require( './collection/cells' );
panels.collection.rows = require( './collection/rows' );
panels.collection.historyEntries = require( './collection/history-entries' );

// The views
panels.view = {};
panels.view.widget = require( './view/widget' );
panels.view.cell = require( './view/cell' );
panels.view.row = require( './view/row' );
panels.view.builder = require( './view/builder' );
panels.view.dialog = require( './view/dialog' );
panels.view.styles = require( './view/styles' );
panels.view.liveEditor = require( './view/live-editor' );

// The dialogs
panels.dialog = {};
panels.dialog.builder = require( './dialog/builder' );
panels.dialog.widgets = require( './dialog/widgets' );
panels.dialog.widget = require( './dialog/widget' );
panels.dialog.prebuilt = require( './dialog/prebuilt' );
panels.dialog.row = require( './dialog/row' );
panels.dialog.history = require( './dialog/history' );

// The utils
panels.utils = {};
panels.utils.menu = require( './utils/menu' );

// jQuery Plugins
jQuery.fn.soPanelsSetupBuilderWidget = require( './jquery/setup-builder-widget' );


// Set up Page Builder if we're on the main interface
jQuery( function ( $ ) {

	var container,
		field,
		form,
		builderConfig;
	
	var $panelsMetabox = $( '#siteorigin-panels-metabox' );
	form = $( 'form#post' );
	if ( $panelsMetabox.length && form.length ) {
		// This is usually the case when we're in the post edit interface
		container = $panelsMetabox;
		field = $panelsMetabox.find( '.siteorigin-panels-data-field' );

		builderConfig = {
			editorType: 'tinyMCE',
			postId: $( '#post_ID' ).val(),
			editorId: '#content',
			builderType: $panelsMetabox.data( 'builder-type' ),
			builderSupports: $panelsMetabox.data( 'builder-supports' ),
			loadOnAttach: panelsOptions.loadOnAttach && $( '#auto_draft' ).val() == 1,
			loadLiveEditor: $panelsMetabox.data( 'live-editor' ) == 1,
			liveEditorCloseAfter: $panelsMetabox.data( 'live-editor-close' ) == 1,
			editorPreview: container.data( 'preview-url' )
		};
	}
	else if ( $( '.siteorigin-panels-builder-form' ).length ) {
		// We're dealing with another interface like the custom home page interface
		var $$ = $( '.siteorigin-panels-builder-form' );

		container = $$.find( '.siteorigin-panels-builder-container' );
		field = $$.find( 'input[name="panels_data"]' );
		form = $$;

		builderConfig = {
			editorType: 'standalone',
			postId: $$.data( 'post-id' ),
			editorId: '#post_content',
			builderType: $$.data( 'type' ),
			builderSupports: $$.data( 'builder-supports' ),
			loadLiveEditor: false,
			liveEditorCloseAfter: false,
			editorPreview: $$.data( 'preview-url' )
		};
	}

	if ( ! _.isUndefined( container ) ) {
		// If we have a container, then set up the main builder
		var panels = window.siteoriginPanels;

		// Create the main builder model
		var builderModel = new panels.model.builder();

		// Now for the view to display the builder
		var builderView = new panels.view.builder( {
			model: builderModel,
			config: builderConfig
		} );

		// Trigger an event before the panels setup to allow adding listeners for various builder events which are
		// triggered during initial setup.
		$(document).trigger('before_panels_setup', builderView);

		// Set up the builder view
		builderView
			.render()
			.attach( {
				container: container
			} )
			.setDataField( field )
			.attachToEditor();

		// When the form is submitted, update the panels data
		form.on( 'submit', function() {
			// Refresh the data
			builderModel.refreshPanelsData();
		} );

		container.removeClass( 'so-panels-loading' );

		// Trigger a global jQuery event after we've setup the builder view. Everything is accessible form there
		$( document ).trigger( 'panels_setup', builderView, window.panels );

		// Make this globally available for things like Yoast compatibility.
		window.soPanelsBuilderView = builderView;
	}

	// Setup new widgets when they're added in the standard widget interface
	$( document ).on( 'widget-added', function ( e, widget ) {
		$( widget ).find( '.siteorigin-page-builder-widget' ).soPanelsSetupBuilderWidget();
	} );

	// Setup existing widgets on the page (for the widgets interface)
	if ( ! $( 'body' ).hasClass( 'wp-customizer' ) ) {
		$( function () {
			$( '.siteorigin-page-builder-widget' ).soPanelsSetupBuilderWidget();
		} );
	}

	// A global escape handler
	$(window).on('keyup', function(e){
		// [Esc] to close
		if ( e.which === 27 ) {
			// Trigger a click on the last visible Page Builder window
			$( '.so-panels-dialog-wrapper, .so-panels-live-editor' ).filter(':visible')
				.last().find('.so-title-bar .so-close, .live-editor-close').trigger( 'click' );
		}
	});
} );

// WP 5.7+: Prevent undesired "restore content" notice.
if ( typeof window.wp.autosave !== 'undefined' && jQuery( '#siteorigin-panels-metabox' ).length ) {
	jQuery( function( e ) {
		var blog_id = typeof window.autosaveL10n !== 'undefined' && window.autosaveL10n.blog_id;
		
		// Ensure sessionStorage is working, and we were able to find a blog id.
		if ( typeof window.sessionStorage != 'object' && ! blog_id ) {
			return;
		}

		stored_obj = window.sessionStorage.getItem( 'wp-autosave-' + blog_id );
		if ( stored_obj ) {
			stored_obj = JSON.parse( stored_obj );
			var storedPostData = stored_obj[ 'post_' + jQuery( '#post_ID' ).val() ]

			if ( typeof storedPostData == 'object' ) {
				// Override existing store with stored session data. The content is exactly the same.
				jQuery( '#content' ).val( storedPostData.content );
			}
		}
	} );
}

},{"./collection/cells":1,"./collection/history-entries":2,"./collection/rows":3,"./collection/widgets":4,"./dialog/builder":5,"./dialog/history":6,"./dialog/prebuilt":7,"./dialog/row":8,"./dialog/widget":9,"./dialog/widgets":10,"./helpers/accessibility":11,"./helpers/clipboard":12,"./helpers/editor":13,"./helpers/page-scroll":14,"./helpers/serialize":15,"./helpers/utils":16,"./jquery/setup-builder-widget":17,"./model/builder":19,"./model/cell":20,"./model/history-entry":21,"./model/row":22,"./model/widget":23,"./utils/menu":24,"./view/builder":25,"./view/cell":26,"./view/dialog":27,"./view/live-editor":28,"./view/row":29,"./view/styles":30,"./view/widget":31}],19:[function(require,module,exports){
module.exports = Backbone.Model.extend({
	layoutPosition: {
		BEFORE: 'before',
		AFTER: 'after',
		REPLACE: 'replace',
	},

	rows: {},

	defaults: {
		'data': {
			'widgets': [],
			'grids': [],
			'grid_cells': []
		}
	},

	initialize: function () {
		// These are the main rows in the interface
		this.set( 'rows', new panels.collection.rows() );
	},

	/**
	 * Add a new row to this builder.
	 *
	 * @param attrs
	 * @param cells
	 * @param options
	 */
	addRow: function (attrs, cells, options) {
		options = _.extend({
			noAnimate: false
		}, options);

		var cellCollection = new panels.collection.cells(cells);

		attrs = _.extend({
			collection: this.get('rows'),
			cells: cellCollection,
		}, attrs);

		// Create the actual row
		var row = new panels.model.row(attrs);
		row.builder = this;

		this.get('rows').add( row, options );

		return row;
	},

	/**
	 * Load the panels data into the builder
	 *
	 * @param data Object the layout and widgets data to load.
	 * @param position string Where to place the new layout. Allowed options are 'before', 'after'. Anything else will
	 *						  cause the new layout to replace the old one.
	 */
	loadPanelsData: function ( data, position ) {
		try {
			if ( position === this.layoutPosition.BEFORE ) {
				data = this.concatPanelsData( data, this.getPanelsData() );
			} else if ( position === this.layoutPosition.AFTER ) {
				data = this.concatPanelsData( this.getPanelsData(), data );
			}

			// Start by destroying any rows that currently exist. This will in turn destroy cells, widgets and all the associated views
			this.emptyRows();

			// This will empty out the current rows and reload the builder data.
			this.set( 'data', JSON.parse( JSON.stringify( data ) ), {silent: true} );

			var cit = 0;
			var rows = [];

			if ( _.isUndefined( data.grid_cells ) ) {
				this.trigger( 'load_panels_data' );
				return;
			}

			var gi;
			for ( var ci = 0; ci < data.grid_cells.length; ci ++ ) {
				gi = parseInt( data.grid_cells[ci].grid );
				if ( _.isUndefined( rows[gi] ) ) {
					rows[gi] = [];
				}

				rows[gi].push( data.grid_cells[ci] );
			}

			var builderModel = this;
			_.each( rows, function ( row, i ) {
				var rowAttrs = {};

				if ( ! _.isUndefined( data.grids[i].style ) ) {
					rowAttrs.style = data.grids[i].style;
				}

				if ( ! _.isUndefined( data.grids[i].color_label) ) {
					rowAttrs.color_label = data.grids[i].color_label;
				}

				if ( ! _.isUndefined( data.grids[i].label) ) {
					rowAttrs.label = data.grids[i].label;
				}
				// This will create and add the row model and its cells
				builderModel.addRow(rowAttrs, row, {noAnimate: true} );
			} );


			if ( _.isUndefined( data.widgets ) ) {
				return;
			}

			// Add the widgets
			_.each( data.widgets, function ( widgetData ) {
				var panels_info = null;
				if ( ! _.isUndefined( widgetData.panels_info ) ) {
					panels_info = widgetData.panels_info;
					delete widgetData.panels_info;
				} else {
					panels_info = widgetData.info;
					delete widgetData.info;
				}

				var row = builderModel.get('rows').at( parseInt( panels_info.grid ) );
				var cell = row.get('cells').at( parseInt( panels_info.cell ) );

				var newWidget = new panels.model.widget( {
					class: panels_info.class,
					values: widgetData
				} );

				if ( ! _.isUndefined( panels_info.style ) ) {
					newWidget.set( 'style', panels_info.style );
				}

				if ( ! _.isUndefined( panels_info.read_only ) ) {
					newWidget.set( 'read_only', panels_info.read_only );
				}
				if ( ! _.isUndefined( panels_info.widget_id ) ) {
					newWidget.set( 'widget_id', panels_info.widget_id );
				}
				else {
					newWidget.set( 'widget_id', panels.helpers.utils.generateUUID() );
				}

				if ( ! _.isUndefined( panels_info.label ) ) {
					newWidget.set( 'label', panels_info.label );
				}

				newWidget.cell = cell;
				cell.get('widgets').add( newWidget, { noAnimate: true } );
			} );

			this.trigger( 'load_panels_data' );
		}
		catch ( err ) {
			console.log( 'Error loading data: ' + err.message );

		}
	},

	/**
	 * Concatenate the second set of Page Builder data to the first. There is some validation of input, but for the most
	 * part it's up to the caller to ensure the Page Builder data is well formed.
	 */
	concatPanelsData: function ( panelsDataA, panelsDataB ) {

		if ( _.isUndefined( panelsDataB ) || _.isUndefined( panelsDataB.grids ) || _.isEmpty( panelsDataB.grids ) ||
			 _.isUndefined( panelsDataB.grid_cells ) || _.isEmpty( panelsDataB.grid_cells ) ) {
			return panelsDataA;
		}

		if ( _.isUndefined( panelsDataA ) || _.isUndefined( panelsDataA.grids ) || _.isEmpty( panelsDataA.grids ) ) {
			return panelsDataB;
		}

		var gridsBOffset = panelsDataA.grids.length;
		var widgetsBOffset = ! _.isUndefined( panelsDataA.widgets ) ? panelsDataA.widgets.length : 0;
		var newPanelsData = {grids: [], 'grid_cells': [], 'widgets': []};

		// Concatenate grids (rows)
		newPanelsData.grids = panelsDataA.grids.concat( panelsDataB.grids );

		// Create a copy of panelsDataA grid_cells and widgets
		if ( ! _.isUndefined( panelsDataA.grid_cells ) ) {
			newPanelsData.grid_cells = panelsDataA.grid_cells.slice();
		}
		if ( ! _.isUndefined( panelsDataA.widgets ) ) {
			newPanelsData.widgets = panelsDataA.widgets.slice();
		}

		var i;
		// Concatenate grid cells (row columns)
		for ( i = 0; i < panelsDataB.grid_cells.length; i ++ ) {
			var gridCellB = panelsDataB.grid_cells[i];
			gridCellB.grid = parseInt( gridCellB.grid ) + gridsBOffset;
			newPanelsData.grid_cells.push( gridCellB );
		}

		// Concatenate widgets
		if ( ! _.isUndefined( panelsDataB.widgets ) ) {
			for ( i = 0; i < panelsDataB.widgets.length; i ++ ) {
				var widgetB = panelsDataB.widgets[i];
				widgetB.panels_info.grid = parseInt( widgetB.panels_info.grid ) + gridsBOffset;
				widgetB.panels_info.id = parseInt( widgetB.panels_info.id ) + widgetsBOffset;
				newPanelsData.widgets.push( widgetB );
			}
		}

		return newPanelsData;
	},

	/**
	 * Convert the content of the builder into a object that represents the page builder data
	 */
	getPanelsData: function () {

		var builder = this;

		var data = {
			'widgets': [],
			'grids': [],
			'grid_cells': []
		};
		var widgetId = 0;

		this.get('rows').each( function ( row, ri ) {

			row.get('cells').each( function ( cell, ci ) {

				cell.get('widgets').each( function ( widget, wi ) {
					// Add the data for the widget, including the panels_info field.
					var panels_info = {
						class: widget.get( 'class' ),
						raw: widget.get( 'raw' ),
						grid: ri,
						cell: ci,
						// Strictly this should be an index
						id: widgetId ++,
						widget_id: widget.get( 'widget_id' ),
						style: widget.get( 'style' ),
						label: widget.get( 'label' ),
					};

					if( _.isEmpty( panels_info.widget_id ) ) {
						panels_info.widget_id = panels.helpers.utils.generateUUID();
					}

					var values = _.extend( _.clone( widget.get( 'values' ) ), {
						panels_info: panels_info
					} );
					data.widgets.push( values );
				} );

				// Add the cell info
				data.grid_cells.push( {
					grid: ri,
					index: ci,
					weight: cell.get( 'weight' ),
					style: cell.get( 'style' ),
				} );

			} );

			data.grids.push( {
				cells: row.get('cells').length,
				style: row.get( 'style' ),
				color_label: row.get( 'color_label' ),
				label: row.get( 'label' ),
			} );

		} );

		return data;

	},

	/**
	 * This will check all the current entries and refresh the panels data
	 */
	refreshPanelsData: function ( args ) {
		args = _.extend( {
			silent: false
		}, args );

		var oldData = this.get( 'data' );
		var newData = this.getPanelsData();
		this.set( 'data', newData, {silent: true} );

		if ( ! args.silent && JSON.stringify( newData ) !== JSON.stringify( oldData ) ) {
			// The default change event doesn't trigger on deep changes, so we'll trigger our own
			this.trigger( 'change' );
			this.trigger( 'change:data' );
			this.trigger( 'refresh_panels_data', newData, args );
		}
	},

	/**
	 * Empty all the rows and the cells/widgets they contain.
	 */
	emptyRows: function () {
		_.invoke( this.get('rows').toArray(), 'destroy' );
		this.get('rows').reset();

		return this;
	},

	isValidLayoutPosition: function ( position ) {
		return position === this.layoutPosition.BEFORE ||
			   position === this.layoutPosition.AFTER ||
			   position === this.layoutPosition.REPLACE;
	},

	/**
	 * Convert HTML into Panels Data
	 * @param html
	 */
	getPanelsDataFromHtml: function( html, editorClass ){
		var thisModel = this;
		var $html = jQuery( '<div id="wrapper">' + html + '</div>' );

		if( $html.find('.panel-layout .panel-grid').length ) {
			// This looks like Page Builder html, lets try parse it
			var panels_data = {
				grids: [],
				grid_cells: [],
				widgets: [],
			};

			// The Regex object that'll match SiteOrigin widgets
			var re = new RegExp( panelsOptions.siteoriginWidgetRegex , "i" );
			var decodeEntities = (function() {
				// this prevents any overhead from creating the object each time
				var element = document.createElement('div');

				function decodeHTMLEntities (str) {
					if(str && typeof str === 'string') {
						// strip script/html tags
						str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
						str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
						element.innerHTML = str;
						str = element.textContent;
						element.textContent = '';
					}

					return str;
				}

				return decodeHTMLEntities;
			})();

			// Remove all wrapping divs from a widget to get its html
			var getTextWidgetContents = function( $el ){
				var $divs = $el.find( 'div' );
				if( ! $divs.length ) {
					return $el.html();
				}

				for ( var i = 0; i < $divs.length - 1; i++ ) {
					if ( $divs.eq( i ).text().trim() != $divs.eq( i + 1 ).text().trim() ) {
						break;
					}
				}

				var title = $divs.eq( i ).find( '.widget-title:header' ),
					titleText = '';

				if( title.length ) {
					titleText = title.html();
					title.remove();
				}

				return {
					title: titleText,
					text: $divs.eq(i).html(),
				};
			};

			var $layout = $html.find( '.panel-layout' ).eq(0);
			var filterNestedLayout = function( i, el ){
				return jQuery( el ).closest( '.panel-layout' ).is( $layout );
			};

			$html.find('> .panel-layout > .panel-grid').filter( filterNestedLayout ).each( function( ri, el ){
				var $row = jQuery( el ),
					$cells = $row.find( '.panel-grid-cell' ).filter( filterNestedLayout );

				panels_data.grids.push( {
					cells: $cells.length,
					style: $row.data( 'style' ),
					color_label: $row.data( 'color-label' ),
					label: $row.data( 'label' ),
				} );

				$cells.each( function( ci, el ){
					var $cell = jQuery( el ),
						$widgets = $cell.find( '.so-panel' ).filter( filterNestedLayout );

					panels_data.grid_cells.push( {
						grid: ri,
						weight: ! _.isUndefined( $cell.data( 'weight' ) ) ? parseFloat( $cell.data( 'weight' ) ) : 1,
						style: $cell.data( 'style' ),
					} );

					$widgets.each( function( wi, el ){
						var $widget = jQuery(el),
							widgetContent = $widget.find('.panel-widget-style').length ? $widget.find('.panel-widget-style').html() : $widget.html(),
							panels_info = {
								grid: ri,
								cell: ci,
								style: $widget.data( 'style' ),
								raw: false,
								label: $widget.data( 'label' )
							};

						widgetContent = widgetContent.trim();

						// Check if this is a SiteOrigin Widget
						var match = re.exec( widgetContent );
						if( ! _.isNull( match ) && widgetContent.replace( re, '' ).trim() === '' ) {
							try {
								var classMatch = /class="(.*?)"/.exec( match[3] ),
									dataInput = jQuery( match[5] ),
									data = JSON.parse( decodeEntities( dataInput.val( ) ) ),
									newWidget = data.instance;

								panels_info.class = classMatch[1].replace( /\\\\+/g, '\\' );
								panels_info.raw = false;

								newWidget.panels_info = panels_info;
								panels_data.widgets.push( newWidget );
							}
							catch ( err ) {
								// There was a problem, so treat this as a standard editor widget
								panels_info.class = editorClass;
								panels_data.widgets.push( _.extend( getTextWidgetContents( $widget ), {
									filter: "1",
									type: "visual",
									panels_info: panels_info
								} ) );
							}

							// Continue
							return true;
						}
						else if( widgetContent.indexOf( 'panel-layout' ) !== -1 ) {
							// Check if this is a layout widget
							var $widgetContent = jQuery( '<div>' + widgetContent + '</div>' );
							if( $widgetContent.find('.panel-layout .panel-grid').length ) {
								// This is a standard editor class widget
								panels_info.class = 'SiteOrigin_Panels_Widgets_Layout';
								panels_data.widgets.push( {
									panels_data: thisModel.getPanelsDataFromHtml( widgetContent, editorClass ),
									panels_info: panels_info
								} );

								// continue
								return true;
							}
						}

						// This is a standard editor class widget
						panels_info.class = editorClass;
						panels_data.widgets.push( _.extend( getTextWidgetContents( $widget ), {
							filter: "1",
							type: "visual",
							panels_info: panels_info
						} ) );
						return true;
					} );
				} );
			} );

			// Remove all the Page Builder content
			$html.find('.panel-layout').remove();
			$html.find('style[data-panels-style-for-post]').remove();

			// If there's anything left, add it to an editor widget at the end of panels_data
			if( $html.html().replace(/^\s+|\s+$/gm,'').length ) {
				panels_data.grids.push( {
					cells: 1,
					style: {},
				} );
				panels_data.grid_cells.push( {
					grid: panels_data.grids.length - 1,
					weight: 1,
				} );
				panels_data.widgets.push( {
					filter: "1",
					text: $html.html().replace(/^\s+|\s+$/gm,''),
					title: "",
					type: "visual",
					panels_info: {
						class: editorClass,
						raw: false,
						grid: panels_data.grids.length - 1,
						cell: 0
					}
				} );
			}

			return panels_data;
		}
		else {
			// This is probably just old school post content
			return {
				grid_cells: [ { grid: 0, weight: 1 } ],
				grids: [ { cells: 1 } ],
				widgets: [
					{
						filter: "1",
						text: html,
						title: "",
						type: "visual",
						panels_info: {
							class: editorClass,
							raw: false,
							grid: 0,
							cell: 0
						}
					}
				]
			};
		}
	}
} );

},{}],20:[function(require,module,exports){
module.exports = Backbone.Model.extend( {
	/* A collection of widgets */
	widgets: {},

	/* The row this model belongs to */
	row: null,

	defaults: {
		weight: 0,
		style: {}
	},

	indexes: null,

	/**
	 * Set up the cell model
	 */
	initialize: function () {
		this.set( 'widgets', new panels.collection.widgets() );
		this.on( 'destroy', this.onDestroy, this );
	},

	/**
	 * Triggered when we destroy a cell
	 */
	onDestroy: function () {
		// Destroy all the widgets
		_.invoke( this.get('widgets').toArray(), 'destroy' );
		this.get('widgets').reset();
	},

	/**
	 * Create a clone of the cell, along with all its widgets
	 */
	clone: function ( row, cloneOptions ) {
		if ( _.isUndefined( row ) ) {
			row = this.row;
		}
		cloneOptions = _.extend( {cloneWidgets: true}, cloneOptions );

		var clone = new this.constructor( this.attributes );
		clone.set( 'collection', row.get('cells'), {silent: true} );
		clone.row = row;

		if ( cloneOptions.cloneWidgets ) {
			// Now we're going add all the widgets that belong to this, to the clone
			this.get('widgets').each( function ( widget ) {
				clone.get('widgets').add( widget.clone( clone, cloneOptions ), {silent: true} );
			} );
		}

		return clone;
	}

} );

},{}],21:[function(require,module,exports){
module.exports = Backbone.Model.extend( {
	defaults: {
		text: '',
		data: '',
		time: null,
		count: 1
	}
} );

},{}],22:[function(require,module,exports){
module.exports = Backbone.Model.extend( {
	/* The builder model */
	builder: null,

	defaults: {
		style: {}
	},

	indexes: null,

	/**
	 * Initialize the row model
	 */
	initialize: function () {
		if ( _.isEmpty(this.get('cells') ) ) {
			this.set('cells', new panels.collection.cells());
		}
		else {
			// Make sure that the cells have this row set as their parent
			this.get('cells').each( function( cell ){
				cell.row = this;
			}.bind( this ) );
		}
		this.on( 'destroy', this.onDestroy, this );
	},

	/**
	 * Add cells to the model row
	 *
	 * @param newCells the updated collection of cell models
	 */
	setCells: function ( newCells ) {
		var currentCells = this.get('cells') || new panels.collection.cells();
		var cellsToRemove = [];

		currentCells.each(function (cell, i) {
			var newCell = newCells.at(i);
			if(newCell) {
				cell.set('weight', newCell.get('weight'));
			} else {
				var newParentCell = currentCells.at( newCells.length - 1 );

				// First move all the widgets to the new cell
				var widgetsToMove = cell.get('widgets').models.slice();
				for ( var j = 0; j < widgetsToMove.length; j++ ) {
					widgetsToMove[j].moveToCell( newParentCell, { silent: false } );
				}

				cellsToRemove.push(cell);
			}
		});

		_.each(cellsToRemove, function(cell) {
			currentCells.remove(cell);
		});

		if( newCells.length > currentCells.length) {
			_.each(newCells.slice(currentCells.length, newCells.length), function (newCell) {
				// TODO: make sure row and collection is set correctly when cell is created then we can just add new cells
				newCell.set({collection: currentCells});
				newCell.row = this;
				currentCells.add(newCell);
			}.bind(this));
		}

		// Rescale the cells when we add or remove
		this.reweightCells();
	},

	/**
	 * Make sure that all the cell weights add up to 1
	 */
	reweightCells: function () {
		var totalWeight = 0;
		var cells = this.get('cells');
		cells.each( function ( cell ) {
			totalWeight += cell.get( 'weight' );
		} );

		cells.each( function ( cell ) {
			cell.set( 'weight', cell.get( 'weight' ) / totalWeight );
		} );

		// This is for the row view to hook into and resize
		this.trigger( 'reweight_cells' );
	},

	/**
	 * Triggered when the model is destroyed
	 */
	onDestroy: function () {
		// Also destroy all the cells
		_.invoke( this.get('cells').toArray(), 'destroy' );
		this.get('cells').reset();
	},

	/**
	 * Create a clone of the row, along with all its cells
	 *
	 * @param {panels.model.builder} builder The builder model to attach this to.
	 *
	 * @return {panels.model.row} The cloned row.
	 */
	clone: function ( builder ) {
		if ( _.isUndefined( builder ) ) {
			builder = this.builder;
		}

		var clone = new this.constructor( this.attributes );
		clone.set( 'collection', builder.get('rows'), {silent: true} );
		clone.builder = builder;

		var cellClones = new panels.collection.cells();
		this.get('cells').each( function ( cell ) {
			cellClones.add( cell.clone( clone ), {silent: true} );
		} );

		clone.set( 'cells', cellClones );

		return clone;
	}
} );

},{}],23:[function(require,module,exports){
/**
 * Model for an instance of a widget
 */
module.exports = Backbone.Model.extend( {

	cell: null,

	defaults: {
		// The PHP Class of the widget
		class: null,

		// Is this class missing? Missing widgets are a special case.
		missing: false,

		// The values of the widget
		values: {},

		// Have the current values been passed through the widgets update function
		raw: false,

		// Visual style fields
		style: {},

		read_only: false,
		widget_id: '',
	},

	indexes: null,

	initialize: function () {
		var widgetClass = this.get( 'class' );
		if ( _.isUndefined( panelsOptions.widgets[widgetClass] ) || ! panelsOptions.widgets[widgetClass].installed ) {
			this.set( 'missing', true );
		}
	},

	/**
	 * @param field
	 * @returns {*}
	 */
	getWidgetField: function ( field ) {
		if ( _.isUndefined( panelsOptions.widgets[this.get( 'class' )] ) ) {
			if ( field === 'title' || field === 'description' ) {
				return panelsOptions.loc.missing_widget[field];
			} else {
				return '';
			}
		} else if ( this.has( 'label' ) && ! _.isEmpty( this.get( 'label' ) ) ) {
			// Use the label instead of the actual widget title
			return this.get( 'label' );
		} else {
			return panelsOptions.widgets[ this.get( 'class' ) ][ field ];
		}
	},

	/**
	 * Move this widget model to a new cell. Called by the views.
	 *
	 * @param panels.model.cell newCell
	 * @param object options The options passed to the
	 *
	 * @return boolean Indicating if the widget was moved into a different cell
	 */
	moveToCell: function ( newCell, options, at ) {
		options = _.extend( {
			silent: true,
		}, options );

		this.cell = newCell;
		this.collection.remove( this, options );
		newCell.get('widgets').add( this, _.extend( {
			at: at
		}, options ) );

		// This should be used by views to reposition everything.
		this.trigger( 'move_to_cell', newCell, at );

		return this;
	},

	/**
	 * This is basically a wrapper for set that checks if we need to trigger a change
	 */
	setValues: function ( values ) {
		var hasChanged = false;
		if ( JSON.stringify( values ) !== JSON.stringify( this.get( 'values' ) ) ) {
			hasChanged = true;
		}

		this.set( 'values', values, {silent: true} );

		if ( hasChanged ) {
			// We'll trigger our own change events.
			// NB: Must include the model being changed (i.e. `this`) as a workaround for a bug in Backbone 1.2.3
			this.trigger( 'change', this );
			this.trigger( 'change:values' );
		}
	},

	/**
	 * Create a clone of this widget attached to the given cell.
	 *
	 * @param {panels.model.cell} cell The cell model we're attaching this widget clone to.
	 * @returns {panels.model.widget}
	 */
	clone: function ( cell, options ) {
		if ( _.isUndefined( cell ) ) {
			cell = this.cell;
		}

		var clone = new this.constructor( this.attributes );

		// Create a deep clone of the original values
		var cloneValues = JSON.parse( JSON.stringify( this.get( 'values' ) ) );

		// We want to exclude any fields that start with _ from the clone. Assuming these are internal.
		var cleanClone = function ( vals ) {
			_.each( vals, function ( el, i ) {
				if ( _.isString( i ) && i[0] === '_' ) {
					delete vals[i];
				}
				else if ( _.isObject( vals[i] ) ) {
					cleanClone( vals[i] );
				}
			} );

			return vals;
		};
		cloneValues = cleanClone( cloneValues );

		if ( this.get( 'class' ) === "SiteOrigin_Panels_Widgets_Layout" ) {
			// Special case of this being a layout widget, it needs a new ID
			cloneValues.builder_id = Math.random().toString( 36 ).substr( 2 );
		}

		clone.set( 'widget_id', '' );
		clone.set( 'values', cloneValues, {silent: true} );
		clone.set( 'collection', cell.get('widgets'), {silent: true} );
		clone.cell = cell;

		// This is used to force a form reload later on
		clone.isDuplicate = true;

		return clone;
	},

	/**
	 * Ensure the title is valid.
	 *
	 * @param title The text we're testing.
	 * @returns boolean
	 */
	isValidTitle: function( title ) {
		return ! _.isUndefined( title ) &&
			_.isString( title ) &&
			title !== '' &&
			title !== 'on' &&
			title !== 'true' &&
			title !== 'false' &&
			title[0] !== '_' &&
			! _.isFinite( title );
	},

	/**
	 * Remove HTML from the title, and limit its length.
	 *
	 * @param title The title we're cleaning.
	 * @returns string The "cleaned" title.
	 */
	cleanTitle: function( title ) {
		// Prevent situation where invalid titles are processed for cleaning.
		if ( typeof title !== 'string' ) {
			return false;
		}
		title = title.replace( /<\/?[^>]+(>|$)/g, "" );
		var parts = title.split( " " );
		parts = parts.slice( 0, 20 );
		return parts.join( ' ' );
	},

	/**
	 * Iterate an array and find a valid field we can use for a title. Supports multidimensional arrays.
	 *
	 * @param values An array containing field values.
	 * @returns object thisView The current widget instance.
	 * @returns object fields The fields we're specifically check for.
	 * @param object check_sub_fields Whether we should check sub fields.
	 *
	 * @returns string The title we found. If we weren't able to find one, it returns false.
	 */
	getTitleFromValues: function( values, thisView, fields = false, check_sub_fields = true ) {
		var widgetTitle = false;
		for ( const k in values ) {
			if ( typeof values[ k ] == 'object' ) {
				if ( check_sub_fields ) {
					// Field is an object, check child for valid titles.
					widgetTitle = thisView.getTitleFromValues( values[ k ], thisView, fields );
					if ( widgetTitle ) {
						break;
					}
				}
			// Check for predefined title fields.
			} else if ( typeof fields == 'object' ) {
				for ( var i = 0; i < fields.length; i++ ) {
					if ( k == fields[i] ) {
						widgetTitle = thisView.cleanTitle( values[ k ] )
						if ( widgetTitle ) {
							break;
						}
					}
				}
				if ( widgetTitle ) {
					break;
				}
			// Ensure field isn't a required WB field, and if its not, confirm it's valid.
			} else if (
				typeof fields != 'object' &&
				k.charAt( 0 ) !== '_' &&
				k !== 'so_sidebar_emulator_id' &&
				k !== 'option_name' &&
				thisView.isValidTitle( values[ k ] )
			) {
				widgetTitle = thisView.cleanTitle( values[ k ] )
				if ( widgetTitle ) {
					break;
				}
			}
		};

		return widgetTitle;
	},

	/**
	 * Gets the value that makes most sense as the title.
	 */
	getTitle: function () {
		var widgetData = panelsOptions.widgets[this.get( 'class' )];
		var titleFields = [];
		var titleFieldOnly = false;

		if ( _.isUndefined( widgetData ) ) {
			return this.get( 'class' ).replace( /_/g, ' ' );
		} else if ( ! _.isUndefined( widgetData.panels_title ) ) {
			// This means that the widget has told us which field it wants us to use as a title
			if ( widgetData.panels_title === false ) {
				return panelsOptions.widgets[this.get( 'class' )].description;
			} else {
				titleFields.push( widgetData.panels_title );
				titleFieldOnly = true;
			}
		} else {
			titleFields = ['title', 'text'];
		}
		var values = this.get( 'values' );
		var thisView = this;
		var widgetTitle = false;

		// Check titleFields for valid titles.
		widgetTitle = this.getTitleFromValues(
			values,
			thisView,
			titleFields,
			typeof widgetData.panels_title_check_sub_fields != 'undefined' ? widgetData.panels_title_check_sub_fields : false
		);

		if ( ! widgetTitle && ! titleFieldOnly ) {
			// No titles were found. Let's check the rest of the fields for a valid title.
			widgetTitle = this.getTitleFromValues( values, thisView );
		}

		return widgetTitle ? widgetTitle : this.getWidgetField( 'description' );
	}

} );

},{}],24:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	wrapperTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-context-menu' ).html() ) ),
	sectionTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-context-menu-section' ).html() ) ),

	contexts: [],
	active: false,

	events: {
		'keyup .so-search-wrapper input': 'searchKeyUp'
	},

	/**
	 * Intialize the context menu
	 */
	initialize: function () {
		this.listenContextMenu();
		this.render();
		this.attach();
	},

	/**
	 * Listen for the right click context menu
	 */
	listenContextMenu: function () {
		var thisView = this;

		$( window ).on( 'contextmenu', function ( e ) {
			if ( thisView.active && ! thisView.isOverEl( thisView.$el, e ) ) {
				thisView.closeMenu();
				thisView.active = false;
				e.preventDefault();
				return false;
			}

			if ( thisView.active ) {
				// Lets not double up on the context menu
				return true;
			}

			// Other components should listen to activate_context
			thisView.active = false;
			thisView.trigger( 'activate_context', e, thisView );

			if ( thisView.active ) {
				// We don't want the default event to happen.
				e.preventDefault();

				thisView.openMenu( {
					left: e.pageX,
					top: e.pageY
				} );
			}
		} );
	},

	render: function () {
		this.setElement( this.wrapperTemplate() );
	},

	attach: function () {
		this.$el.appendTo( 'body' );
	},

	/**
	 * Display the actual context menu.
	 *
	 * @param position
	 */
	openMenu: function ( position ) {
		this.trigger( 'open_menu' );

		// Start listening for situations when we should close the menu
		$( window ).on( 'keyup', {menu: this}, this.keyboardListen );
		$( window ).on( 'click', {menu: this}, this.clickOutsideListen );

		// Set the maximum height of the menu
		this.$el.css( 'max-height', $( window ).height() - 20 );

		// Correct the left position
		if ( position.left + this.$el.outerWidth() + 10 >= $( window ).width() ) {
			position.left = $( window ).width() - this.$el.outerWidth() - 10;
		}
		if ( position.left <= 0 ) {
			position.left = 10;
		}

		// Check top position
		if ( position.top + this.$el.outerHeight() - $( window ).scrollTop() + 10 >= $( window ).height() ) {
			position.top = $( window ).height() + $( window ).scrollTop() - this.$el.outerHeight() - 10;
		}
		if ( position.left <= 0 ) {
			position.left = 10;
		}

		// position the contextual menu
		this.$el.css( {
			left: position.left + 1,
			top: position.top + 1
		} ).show();
		this.$( '.so-search-wrapper input' ).trigger( 'focus' );
	},

	closeMenu: function () {
		this.trigger( 'close_menu' );

		// Stop listening for situations when we should close the menu
		$( window ).off( 'keyup', this.keyboardListen );
		$( window ).off( 'click', this.clickOutsideListen );

		this.active = false;
		this.$el.empty().hide();
	},

	/**
	 * Keyboard events handler
	 */
	keyboardListen: function ( e ) {
		var menu = e.data.menu;

		switch ( e.which ) {
			case 27:
				menu.closeMenu();
				break;
		}
	},

	/**
	 * Listen for a click outside the menu to close it.
	 * @param e
	 */
	clickOutsideListen: function ( e ) {
		var menu = e.data.menu;
		if ( e.which !== 3 && menu.$el.is( ':visible' ) && ! menu.isOverEl( menu.$el, e ) ) {
			menu.closeMenu();
		}
	},

	/**
	 * Add a new section to the contextual menu.
	 *
	 * @param settings
	 * @param items
	 * @param callback
	 */
	addSection: function ( id, settings, items, callback ) {
		var thisView = this;
		settings = _.extend( {
			display: 5,
			defaultDisplay: false,
			search: true,

			// All the labels
			sectionTitle: '',
			searchPlaceholder: '',

			// This is the key to be used in items for the title. Makes it easier to list objects
			titleKey: 'title'
		}, settings );

		// Create the new section
		var section = $( this.sectionTemplate( {
			settings: settings,
			items: items
		} ) ).attr( 'id', 'panels-menu-section-' + id );
		this.$el.append( section );

		section.find( '.so-item:not(.so-confirm)' ).on( 'click', function() {
			var $$ = $( this );
			callback( $$.data( 'key' ) );
			thisView.closeMenu();
		} );

		section.find( '.so-item.so-confirm' ).on( 'click', function() {
			var $$ = $( this );

			if ( $$.hasClass( 'so-confirming' ) ) {
				callback( $$.data( 'key' ) );
				thisView.closeMenu();
				return;
			}

			$$
				.data( 'original-text', $$.html() )
				.addClass( 'so-confirming' )
				.html( '<span class="dashicons dashicons-yes"></span> ' + panelsOptions.loc.dropdown_confirm );

			setTimeout( function () {
				$$.removeClass( 'so-confirming' );
				$$.html( $$.data( 'original-text' ) );
			}, 2500 );
		} );

		section.data( 'settings', settings ).find( '.so-search-wrapper input' ).trigger( 'keyup' );

		this.active = true;
	},

	/**
	 * Check if a section exists in the current menu.
	 *
	 * @param id
	 * @returns {boolean}
	 */
	hasSection: function( id ){
		return this.$el.find( '#panels-menu-section-' + id  ).length > 0;
	},

	/**
	 * Handle searching inside a section.
	 *
	 * @param e
	 * @returns {boolean}
	 */
	searchKeyUp: function ( e ) {
		var
			$$ = $( e.currentTarget ),
			section = $$.closest( '.so-section' ),
			settings = section.data( 'settings' );

		if ( e.which === 38 || e.which === 40 ) {
			// First, lets check if this is an up, down or enter press
			var
				items = section.find( 'ul li:visible' ),
				activeItem = items.filter( '.so-active' ).eq( 0 );

			if ( activeItem.length ) {
				items.removeClass( 'so-active' );

				var activeIndex = items.index( activeItem );

				if ( e.which === 38 ) {
					if ( activeIndex - 1 < 0 ) {
						activeItem = items.last();
					} else {
						activeItem = items.eq( activeIndex - 1 );
					}
				}
				else if ( e.which === 40 ) {
					if ( activeIndex + 1 >= items.length ) {
						activeItem = items.first();
					} else {
						activeItem = items.eq( activeIndex + 1 );
					}
				}
			}
			else if ( e.which === 38 ) {
				activeItem = items.last();
			}
			else if ( e.which === 40 ) {
				activeItem = items.first();
			}

			activeItem.addClass( 'so-active' );
			return false;
		}
		if ( e.which === 13 ) {
			if ( section.find( 'ul li:visible' ).length === 1 ) {
				// We'll treat a single visible item as active when enter is clicked
				section.find( 'ul li:visible' ).trigger( 'click' );
				return false;
			}
			section.find( 'ul li.so-active:visible' ).trigger( 'click' );
			return false;
		}

		if ( $$.val() === '' ) {
			// We'll display the defaultDisplay items
			if ( settings.defaultDisplay ) {
				section.find( '.so-item' ).hide();
				for ( var i = 0; i < settings.defaultDisplay.length; i ++ ) {
					section.find( '.so-item[data-key="' + settings.defaultDisplay[i] + '"]' ).show();
				}
			} else {
				// We'll just display all the items
				section.find( '.so-item' ).show();
			}
		} else {
			section.find( '.so-item' ).hide().each( function () {
				var item = $( this );
				if ( item.html().toLowerCase().indexOf( $$.val().toLowerCase() ) !== - 1 ) {
					item.show();
				}
			} );
		}

		// Now, we'll only show the first settings.display visible items
		section.find( '.so-item:visible:gt(' + (
			settings.display - 1
			) + ')' ).hide();


		if ( section.find( '.so-item:visible' ).length === 0 && $$.val() !== '' ) {
			section.find( '.so-no-results' ).show();
		} else {
			section.find( '.so-no-results' ).hide();
		}
	},

	/**
	 * Check if the given mouse event is over the element
	 * @param el
	 * @param event
	 */
	isOverEl: function ( el, event ) {
		var elPos = [
			[el.offset().left, el.offset().top],
			[el.offset().left + el.outerWidth(), el.offset().top + el.outerHeight()]
		];

		// Return if this event is over the given element
		return (
			event.pageX >= elPos[0][0] && event.pageX <= elPos[1][0] &&
			event.pageY >= elPos[0][1] && event.pageY <= elPos[1][1]
		);
	}

} );

},{}],25:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {

	// Config options
	config: {},

	template: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-builder' ).html() ) ),
	dialogs: {},
	rowsSortable: null,
	dataField: false,
	currentData: '',
	contentPreview: '',
	initialContentPreviewSetup: false,

	attachedToEditor: false,
	attachedVisible: false,
	liveEditor: undefined,
	menu: false,

	activeCell: null,

	events: {
		'click .so-tool-button.so-widget-add': 'displayAddWidgetDialog',
		'click .so-tool-button.so-row-add': 'displayAddRowDialog',
		'click .so-tool-button.so-prebuilt-add': 'displayAddPrebuiltDialog',
		'click .so-tool-button.so-history': 'displayHistoryDialog',
		'click .so-tool-button.so-live-editor': 'displayLiveEditor',
		'keyup .so-tool-button': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	/* A row collection */
	rows: null,

	/**
	 * Initialize the builder
	 */
	initialize: function ( options ) {
		var builder = this;

		this.config = _.extend( {
			loadLiveEditor: false,
			liveEditorCloseAfter: false,
			builderSupports: {}
		}, options.config );

		// These are the actions that a user can perform in the builder
		this.config.builderSupports = _.extend( {
			addRow: true,
			editRow: true,
			deleteRow: true,
			moveRow: true,
			addWidget: true,
			editWidget: true,
			deleteWidget: true,
			moveWidget: true,
			prebuilt: true,
			history: true,
			liveEditor: true,
			revertToEditor: true
		}, this.config.builderSupports );

		// Automatically load the live editor as soon as it's ready
		if ( options.config.loadLiveEditor ) {
			this.on( 'builder_live_editor_added', function () {
				this.displayLiveEditor();
			} );
		}

		// Now lets create all the dialog boxes that the main builder interface uses
		this.dialogs = {
			widgets: new panels.dialog.widgets(),
			row: new panels.dialog.row(),
			prebuilt: new panels.dialog.prebuilt()
		};

		
		// Check if we have preview markup available.
		$previewContent = $( '.siteorigin-panels-preview-content' );
		if ( $previewContent.length ) {
			this.contentPreview = $previewContent.val();
		}

		// Set the builder for each dialog and render it.
		_.each( this.dialogs, function ( p, i, d ) {
			d[ i ].setBuilder( builder );
		} );

		this.dialogs.row.setRowDialogType( 'create' );

		// This handles a new row being added to the collection - we'll display it in the interface
		this.listenTo( this.model.get( 'rows' ), 'add', this.onAddRow );

		// Reflow the entire builder when ever the
		$( window ).on( 'resize', function( e ) {
			if ( e.target === window ) {
				builder.trigger( 'builder_resize' );
			}
		} );

		// When the data changes in the model, store it in the field
		this.listenTo( this.model, 'change:data load_panels_data', this.storeModelData );
		this.listenTo( this.model, 'change:data load_panels_data', this.toggleWelcomeDisplay );

		// Handle a content change
		this.on( 'builder_attached_to_editor', this.handleContentChange, this );
		this.on( 'content_change', this.handleContentChange, this );
		this.on( 'display_builder', this.handleDisplayBuilder, this );
		this.on( 'hide_builder', this.handleHideBuilder, this );
		this.on( 'builder_rendered builder_resize', this.handleBuilderSizing, this );

		this.on( 'display_builder', this.wrapEditorExpandAdjust, this );

		// Create the context menu for this builder
		this.menu = new panels.utils.menu( {} );
		this.listenTo( this.menu, 'activate_context', this.activateContextMenu )

		if ( this.config.loadOnAttach ) {
			this.on( 'builder_attached_to_editor', function () {
				this.displayAttachedBuilder( { confirm: false } );
			}, this );
		}
		return this;
	},

	/**
	 * Render the builder interface.
	 *
	 * @return {panels.view.builder}
	 */
	render: function () {
		// this.$el.html( this.template() );
		this.setElement( this.template() );
		this.$el
		.attr( 'id', 'siteorigin-panels-builder-' + this.cid )
		.addClass( 'so-builder-container' );

		this.trigger( 'builder_rendered' );

		return this;
	},

	/**
	 * Attach the builder to the given container
	 *
	 * @param container
	 * @returns {panels.view.builder}
	 */
	attach: function ( options ) {

		options = _.extend( {
			container: false,
			dialog: false
		}, options );

		if ( options.dialog ) {
			// We're going to add this to a dialog
			this.dialog = new panels.dialog.builder();
			this.dialog.builder = this;
		} else {
			// Attach this in the standard way
			this.$el.appendTo( options.container );
			this.metabox = options.container.closest( '.postbox' );
			this.initSortable();
			this.trigger( 'attached_to_container', options.container );
		}

		this.trigger( 'builder_attached' );

		// Add support for components we have

		if ( this.supports( 'liveEditor' ) ) {
			this.addLiveEditor();
		}
		if ( this.supports( 'history' ) ) {
			this.addHistoryBrowser();
		}

		// Hide toolbar buttons we don't support
		var toolbar = this.$( '.so-builder-toolbar' );
		var welcomeMessageContainer = this.$( '.so-panels-welcome-message' );
		var welcomeMessage = panelsOptions.loc.welcomeMessage;

		var supportedItems = [];

		if ( !this.supports( 'addWidget' ) ) {
			toolbar.find( '.so-widget-add' ).hide();
		} else {
			supportedItems.push( welcomeMessage.addWidgetButton );
		}
		if ( !this.supports( 'addRow' ) ) {
			toolbar.find( '.so-row-add' ).hide();
		} else {
			supportedItems.push( welcomeMessage.addRowButton );
		}
		if ( !this.supports( 'prebuilt' ) ) {
			toolbar.find( '.so-prebuilt-add' ).hide();
		} else {
			supportedItems.push( welcomeMessage.addPrebuiltButton );
		}

		var msg = '';
		if ( supportedItems.length === 3 ) {
			msg = welcomeMessage.threeEnabled;
		} else if ( supportedItems.length === 2 ) {
			msg = welcomeMessage.twoEnabled;
		} else if ( supportedItems.length === 1 ) {
			msg = welcomeMessage.oneEnabled;
		} else if ( supportedItems.length === 0 ) {
			msg = welcomeMessage.addingDisabled;
		}

		var resTemplate = _.template( panels.helpers.utils.processTemplate( msg ) );
		var msgHTML = resTemplate( { items: supportedItems } ) + ' ' + welcomeMessage.docsMessage;
		welcomeMessageContainer.find( '.so-message-wrapper' ).html( msgHTML );

		return this;
	},

	/**
	 * This will move the Page Builder meta box into the editor if we're in the post/page edit interface.
	 *
	 * @returns {panels.view.builder}
	 */
	attachToEditor: function () {
		if ( this.config.editorType !== 'tinyMCE' ) {
			return this;
		}

		this.attachedToEditor = true;
		var metabox = this.metabox;
		var thisView = this;

		// Handle switching between the page builder and other tabs
		$( '#wp-content-wrap .wp-editor-tabs' )
		.find( '.wp-switch-editor' )
		.on( 'click', function( e ) {
			e.preventDefault();
			$( '#wp-content-editor-container' ).show();

			// metabox.hide();
			$( '#wp-content-wrap' ).removeClass( 'panels-active' );
			$( '#content-resize-handle' ).show();

			// Make sure the word count is visible
			thisView.trigger( 'hide_builder' );
		} ).end()
		.append(
			$( '<button type="button" id="content-panels" class="hide-if-no-js wp-switch-editor switch-panels">' + metabox.find( 'h2.hndle' ).html() + '</button>' )
			.on( 'click', function( e ) {
				if ( thisView.displayAttachedBuilder( { confirm: true } ) ) {
					e.preventDefault();
				}
			} )
		);

		// Switch back to the standard editor
		if ( this.supports( 'revertToEditor' ) ) {
			metabox.find( '.so-switch-to-standard' ).on( 'click keyup', function( e ) {
				e.preventDefault();

				if ( e.type == "keyup" && e.which != 13 ) {
					return
				}

				if ( !confirm( panelsOptions.loc.confirm_stop_builder ) ) {
					return;
				}

				// User is switching to the standard visual editor
				thisView.addHistoryEntry( 'back_to_editor' );
				thisView.model.loadPanelsData( false );

				// Switch back to the standard editor
				$( '#wp-content-wrap' ).show();
				metabox.hide();

				// Resize to trigger reflow of WordPress editor stuff
				$( window ).trigger( 'resize');

				thisView.attachedVisible = false;
				thisView.trigger( 'hide_builder' );
			} ).show();
		}

		// Move the panels box into a tab of the content editor
		metabox.insertAfter( '#wp-content-wrap' ).hide().addClass( 'attached-to-editor' );

		// Switch to the Page Builder interface as soon as we load the page if there are widgets or the normal editor
		// isn't supported.
		var data = this.model.get( 'data' );
		if ( !_.isEmpty( data.widgets ) || !_.isEmpty( data.grids ) || !this.supports( 'revertToEditor' ) ) {
			this.displayAttachedBuilder( { confirm: false } );
		}

		// We will also make this sticky if its attached to an editor.
		var stickToolbar = function () {
			var toolbar = thisView.$( '.so-builder-toolbar' );

			if ( thisView.$el.hasClass( 'so-display-narrow' ) ) {
				// In this case, we don't want to stick the toolbar.
				toolbar.css( {
					top: 0,
					left: 0,
					width: '100%',
					position: 'absolute'
				} );
				thisView.$el.css( 'padding-top', toolbar.outerHeight() + 'px' );
				return;
			}

			var newTop = $( window ).scrollTop() - thisView.$el.offset().top;

			if ( $( '#wpadminbar' ).css( 'position' ) === 'fixed' ) {
				newTop += $( '#wpadminbar' ).outerHeight();
			}

			var limits = {
				top: 0,
				bottom: thisView.$el.outerHeight() - toolbar.outerHeight() + 20
			};

			if ( newTop > limits.top && newTop < limits.bottom ) {
				if ( toolbar.css( 'position' ) !== 'fixed' ) {
					// The toolbar needs to stick to the top, over the interface
					toolbar.css( {
						top: $( '#wpadminbar' ).outerHeight(),
						left: thisView.$el.offset().left + 'px',
						width: thisView.$el.outerWidth() + 'px',
						position: 'fixed'
					} );
				}
			} else {
				// The toolbar needs to be at the top or bottom of the interface
				toolbar.css( {
					top: Math.min( Math.max( newTop, 0 ), thisView.$el.outerHeight() - toolbar.outerHeight() + 20 )  + 'px',
					left: 0,
					width: '100%',
					position: 'absolute'
				} );
			}

			thisView.$el.css( 'padding-top', toolbar.outerHeight() + 'px' );
		};

		this.on( 'builder_resize', stickToolbar, this );
		$( document ).on( 'scroll', stickToolbar );
		stickToolbar();

		this.trigger( 'builder_attached_to_editor' );

		return this;
	},

	/**
	 * Display the builder interface when attached to a WordPress editor
	 */
	displayAttachedBuilder: function ( options ) {
		options = _.extend( {
			confirm: true
		}, options );

		// Switch to the Page Builder interface

		if ( options.confirm ) {
			var editor = typeof tinyMCE !== 'undefined' ? tinyMCE.get( 'content' ) : false;
			var editorContent = ( editor && _.isFunction( editor.getContent ) ) ? editor.getContent() : $( 'textarea#content' ).val();

			if ( editorContent !== '' && !confirm( panelsOptions.loc.confirm_use_builder ) ) {
				return false;
			}
		}

		// Hide the standard content editor
		$( '#wp-content-wrap' ).hide();


		$( '#editor-expand-toggle' ).on( 'change.editor-expand', function () {
			if ( !$( this ).prop( 'checked' ) ) {
				$( '#wp-content-wrap' ).hide();
			}
		} );

		// Show page builder and the inside div
		this.metabox.show().find( '> .inside' ).show();

		// Triggers full refresh
		$( window ).trigger( 'resize' );
		$( document ).trigger( 'scroll' );

		// Make sure the word count is visible
		this.attachedVisible = true;
		this.trigger( 'display_builder' );

		return true;
	},

	/**
	 * Initialize the row sortables
	 */
	initSortable: function () {
		if ( !this.supports( 'moveRow' ) ) {
			return this;
		}

		var builderView = this;
		var builderID = builderView.$el.attr( 'id' );
		var container = 'parent';

		if ( ! $( 'body' ).hasClass( 'wp-customizer' ) && $( 'body' ).attr( 'class' ).match( /version-([0-9-]+)/ )[0].replace( /\D/g,'' ) < 59 ) {
			wpVersion = '#wpwrap';
		}

		// Create the sortable element for rows.
		this.rowsSortable = this.$( '.so-rows-container:not(.sow-row-color)' ).sortable( {
			appendTo: container,
			items: '.so-row-container',
			handle: '.so-row-move',
			// For the block editor, where it's possible to have multiple Page Builder blocks on a page.
			// Also specify builderID when not in the block editor to prevent being able to drop rows from builder in a dialog
			// into builder on the page under the dialog.
			connectWith: '#' + builderID + '.so-rows-container,.block-editor .so-rows-container',
			axis: 'y',
			tolerance: 'pointer',
			scroll: false,
			remove: function ( e, ui ) {
				builderView.model.get( 'rows' ).remove(
					$( ui.item ).data( 'view' ).model,
					{ silent: true }
				);
				builderView.model.refreshPanelsData();
			},
			receive: function ( e, ui ) {
				builderView.model.get( 'rows' ).add(
					$( ui.item ).data( 'view' ).model,
					{ silent: true, at: $( ui.item ).index() }
				);
				builderView.model.refreshPanelsData();
			},
			stop: function ( e, ui ) {
				var $$ = $( ui.item ),
					row = $$.data( 'view' ),
					rows = builderView.model.get( 'rows' );

				// If this hasn't already been removed and added to a different builder.
				if ( rows.get( row.model ) ) {
					builderView.addHistoryEntry( 'row_moved' );

					rows.remove( row.model, {
						'silent': true
					} );
					rows.add( row.model, {
						'silent': true,
						'at': $$.index()
					} );

					row.trigger( 'move', $$.index() );

					builderView.model.refreshPanelsData();
				}
			}
		} );

		return this;
	},

	/**
	 * Refresh the row sortable
	 */
	refreshSortable: function () {
		// Refresh the sortable to account for the new row
		if ( !_.isNull( this.rowsSortable ) ) {
			this.rowsSortable.sortable( 'refresh' );
		}
	},

	/**
	 * Set the field that's used to store the data
	 * @param field
	 * @param options
	 */
	setDataField: function ( field, options ) {
		options = _.extend( {
			load: true
		}, options );

		this.dataField = field;
		this.dataField.data( 'builder', this );

		if ( options.load && field.val() !== '' ) {
			var data = this.dataField.val();
			try {
				data = JSON.parse( data );
			}
			catch ( err ) {
				console.log( "Failed to parse Page Builder layout data from supplied data field." );
				data = {};
			}

			this.setData( data );
		}

		return this;
	},

	/**
	 * Set the current panels data to be used.
	 *
	 * @param data
	 */
	setData: function( data ) {
		this.model.loadPanelsData( data );
		this.currentData = data;
		this.toggleWelcomeDisplay();
	},

	/**
	 * Get the current panels data.
	 *
	 */
	getData: function() {
		return this.model.get( 'data' );
	},

	/**
	 * Store the model data in the data html field set in this.setDataField.
	 */
	storeModelData: function () {
		var data = JSON.stringify( this.model.get( 'data' ) );

		if ( $( this.dataField ).val() !== data ) {
			// If the data is different, set it and trigger a content_change event
			$( this.dataField ).val( data );
			$( this.dataField ).trigger( 'change' );
			this.trigger( 'content_change' );
		}
	},

	/**
	 * HAndle the visual side of adding a new row to the builder.
	 *
	 * @param row
	 * @param collection
	 * @param options
	 */
	onAddRow: function ( row, collection, options ) {
		options = _.extend( { noAnimate: false }, options );
		// Create a view for the row
		var rowView = new panels.view.row( { model: row } );
		rowView.builder = this;
		rowView.render();

		// Attach the row elements to this builder
		if ( _.isUndefined( options.at ) || collection.length <= 1 ) {
			// Insert this at the end of the widgets container
			rowView.$el.appendTo( this.$( '.so-rows-container' ) );
		} else {
			// We need to insert this at a specific position
			rowView.$el.insertAfter(
				this.$( '.so-rows-container .so-row-container' ).eq( options.at - 1 )
			);
		}

		if ( options.noAnimate === false ) {
			rowView.visualCreate();
		}

		this.refreshSortable();
		rowView.resizeRow();
		this.trigger( 'row_added' );
	},

	/**
	 * Display the dialog to add a new widget.
	 *
	 * @returns {boolean}
	 */
	displayAddWidgetDialog: function () {
		this.dialogs.widgets.openDialog();
	},

	/**
	 * Display the dialog to add a new row.
	 */
	displayAddRowDialog: function () {
		var row = new panels.model.row();
		var cells = new panels.collection.cells( panelsOptions.default_columns );
		cells.each( function ( cell ) {
			cell.row = row;
		} );
		row.set( 'cells', cells );
		row.builder = this.model;

		this.dialogs.row.setRowModel( row );
		this.dialogs.row.openDialog();
	},

	/**
	 * Display the dialog to add prebuilt layouts.
	 *
	 * @returns {boolean}
	 */
	displayAddPrebuiltDialog: function () {
		this.dialogs.prebuilt.openDialog();
	},

	/**
	 * Display the history dialog.
	 *
	 * @returns {boolean}
	 */
	displayHistoryDialog: function () {
		this.dialogs.history.openDialog();
	},

	/**
	 * Handle pasting a row into the builder.
	 */
	pasteRowHandler: function () {
		var pastedModel = panels.helpers.clipboard.getModel( 'row-model' );

		if ( !_.isEmpty( pastedModel ) && pastedModel instanceof panels.model.row ) {
			this.addHistoryEntry( 'row_pasted' );
			pastedModel.builder = this.model;
			this.model.get( 'rows' ).add( pastedModel, {
				at: this.model.get( 'rows' ).indexOf( this.model ) + 1
			} );
			this.model.refreshPanelsData();
		}
	},

	/**
	 * Get the model for the currently selected cell
	 */
	getActiveCell: function ( options ) {
		options = _.extend( {
			createCell: true,
		}, options );

		if ( !this.model.get( 'rows' ).length ) {
			// There aren't any rows yet
			if ( options.createCell ) {
				// Create a row with a single cell
				this.model.addRow( {}, [ { weight: 1 } ], { noAnimate: true } );
			} else {
				return null;
			}
		}

		// Make sure the active cell isn't empty, and it's in a row that exists
		var activeCell = this.activeCell;
		if ( _.isEmpty( activeCell ) || this.model.get( 'rows' ).indexOf( activeCell.model.row ) === -1 ) {
			return this.model.get( 'rows' ).last().get( 'cells' ).first();
		} else {
			return activeCell.model;
		}
	},

	/**
	 * Add a live editor to the builder
	 *
	 * @returns {panels.view.builder}
	 */
	addLiveEditor: function () {
		if ( _.isEmpty( this.config.editorPreview ) ) {
			return this;
		}

		// Create the live editor and set the builder to this.
		this.liveEditor = new panels.view.liveEditor( {
			builder: this,
			previewUrl: this.config.editorPreview
		} );

		// Display the live editor button in the toolbar
		if ( this.liveEditor.hasPreviewUrl() ) {
			var addLEButton = false;
			if ( ! panels.helpers.editor.isBlockEditor() || $( '.widgets-php' ).length ) {
				addLEButton = true;
			} else if ( wp.data.select( 'core/editor' ).getEditedPostAttribute( 'status' ) != 'auto-draft' ) {
				addLEButton = true;
			} else {
				// Block Editor powered page that's an auto draft. To avoid a 404, we need to save the draft.
				$( '.editor-post-save-draft' ).trigger( 'click' );
				var openLiveEditorAfterSave = setInterval( function() {
					if (
						! wp.data.select('core/editor').isSavingPost() &&
						! wp.data.select('core/editor').isAutosavingPost() &&
						wp.data.select('core/editor').didPostSaveRequestSucceed()
					) {
						clearInterval( openLiveEditorAfterSave );
						this.$( '.so-builder-toolbar .so-live-editor' ).show();
					}
				}.bind( this ), 250 );
			}

			if ( addLEButton ) {
				this.$( '.so-builder-toolbar .so-live-editor' ).show();
			}
		}

		this.trigger( 'builder_live_editor_added' );

		return this;
	},

	/**
	 * Show the current live editor
	 */
	displayLiveEditor: function () {
		if ( _.isUndefined( this.liveEditor ) ) {
			return;
		}

		this.liveEditor.open();
	},

	/**
	 * Add the history browser.
	 *
	 * @return {panels.view.builder}
	 */
	addHistoryBrowser: function () {
		if ( _.isEmpty( this.config.editorPreview ) ) {
			return this;
		}

		this.dialogs.history = new panels.dialog.history();
		this.dialogs.history.builder = this;
		this.dialogs.history.entries.builder = this.model;

		// Set the revert entry
		this.dialogs.history.setRevertEntry( this.model );

		// Display the live editor button in the toolbar
		this.$( '.so-builder-toolbar .so-history' ).show();
	},

	/**
	 * Add an entry.
	 *
	 * @param text
	 * @param data
	 */
	addHistoryEntry: function ( text, data ) {
		if ( _.isUndefined( data ) ) {
			data = null;
		}

		if ( !_.isUndefined( this.dialogs.history ) ) {
			this.dialogs.history.entries.addEntry( text, data );
		}
	},

	supports: function ( thing ) {

		if ( thing === 'rowAction' ) {
			// Check if this supports any row action
			return this.supports( 'addRow' ) || this.supports( 'editRow' ) || this.supports( 'deleteRow' );
		} else if ( thing === 'widgetAction' ) {
			// Check if this supports any widget action
			return this.supports( 'addWidget' ) || this.supports( 'editWidget' ) || this.supports( 'deleteWidget' );
		}

		return _.isUndefined( this.config.builderSupports[ thing ] ) ? false : this.config.builderSupports[ thing ];
	},

	/**
	 * Handle a change of the content
	 */
	handleContentChange: function () {

		// Make sure we actually need to copy content.
		if ( panelsOptions.copy_content	&& ( panels.helpers.editor.isBlockEditor() || panels.helpers.editor.isClassicEditor( this ) ) ) {
			var panelsData = this.model.getPanelsData();
			if ( !_.isEmpty( panelsData.widgets ) ) {
				// We're going to create a copy of page builder content into the post content
				$.post(
					panelsOptions.ajaxurl,
					{
						action: 'so_panels_builder_content_json',
						panels_data: JSON.stringify( panelsData ),
						post_id: this.config.postId
					},
					function ( content ) {
						// Post content doesn't need to be generated on load while contentPreview does.
						if (
							this.contentPreview &&
							content.post_content !== '' &&
							this.initialContentPreviewSetup
						) {
							this.updateEditorContent( content.post_content );
						}

						if ( content.preview !== '' ) {
							this.contentPreview = content.preview;
							this.initialContentPreviewSetup = true;
						}
					}.bind( this )
				);
			}
		}
	},

	/**
	 * Update editor content with the given content.
	 *
	 * @param content
	 */
	updateEditorContent: function ( content ) {
		// Switch back to the standard editor
		if ( this.config.editorType !== 'tinyMCE' || typeof tinyMCE === 'undefined' || _.isNull( tinyMCE.get( "content" ) ) ) {
			var $editor = $( this.config.editorId );
			$editor.val( content ).trigger( 'change' ).trigger( 'keyup' );
		} else {
			var contentEd = tinyMCE.get( "content" );

			contentEd.setContent( content );

			contentEd.fire( 'change' );
			contentEd.fire( 'keyup' );
		}

		this.triggerSeoChange();
	},

	/**
	 * Trigger a change in SEO plugins.
	 */
	triggerSeoChange: function () {
		if ( typeof YoastSEO !== 'undefined' && ! _.isNull( YoastSEO ) && ! _.isNull( YoastSEO.app.refresh ) ) {
			YoastSEO.app.refresh();
		}
		if ( typeof rankMathEditor !== 'undefined' && ! _.isNull( rankMathEditor ) && ! _.isNull( rankMathEditor.refresh ) ) {
			rankMathEditor.refresh( 'content' );
		}
	},

	/**
	 * Handle displaying the builder
	 */
	handleDisplayBuilder: function () {
		var editor = typeof tinyMCE !== 'undefined' ? tinyMCE.get( 'content' ) : false;
		var editorContent = ( editor && _.isFunction( editor.getContent ) ) ? editor.getContent() : $( 'textarea#content' ).val();

		if (
			(
				_.isEmpty( this.model.get( 'data' ) ) ||
				( _.isEmpty( this.model.get( 'data' ).widgets ) && _.isEmpty( this.model.get( 'data' ).grids ) )
			) &&
			editorContent !== ''
		) {
			var editorClass = panelsOptions.text_widget;
			// There is a small chance a theme will have removed this, so check
			if ( _.isEmpty( editorClass ) ) {
				return;
			}

			// Create the existing page content in a single widget
			this.model.loadPanelsData( this.model.getPanelsDataFromHtml( editorContent, editorClass ) );
			this.model.trigger( 'change' );
			this.model.trigger( 'change:data' );
		}

		$( '#post-status-info' ).addClass( 'for-siteorigin-panels' );
	},

	handleHideBuilder: function () {
		$( '#post-status-info' ).show().removeClass( 'for-siteorigin-panels' );
	},

	wrapEditorExpandAdjust: function () {
		try {
			var events = ( $.hasData( window ) && $._data( window ) ).events.scroll,
				event;

			for ( var i = 0; i < events.length; i++ ) {
				if ( events[ i ].namespace === 'editor-expand' ) {
					event = events[ i ];

					// Wrap the call
					$( window ).off( 'scroll', event.handler );
					$( window ).on( 'scroll', function( e ) {
						if ( !this.attachedVisible ) {
							event.handler( e );
						}
					}.bind( this ) );

					break;
				}
			}
		}
		catch ( e ) {
			// We tried, we failed
			return;
		}
	},

	/**
	 * Either add or remove the narrow class
	 * @returns {exports}
	 */
	handleBuilderSizing: function () {
		var width = this.$el.width();

		if ( !width ) {
			return this;
		}

		if ( width < 575 ) {
			this.$el.addClass( 'so-display-narrow' );
		} else {
			this.$el.removeClass( 'so-display-narrow' );
		}

		return this;
	},

	/**
	 * Set the parent dialog for all the dialogs in this builder.
	 *
	 * @param text
	 * @param dialog
	 */
	setDialogParents: function ( text, dialog ) {
		_.each( this.dialogs, function ( p, i, d ) {
			d[ i ].setParent( text, dialog );
		} );

		// For any future dialogs
		this.on( 'add_dialog', function ( newDialog ) {
			newDialog.setParent( text, dialog );
		}, this );
	},

	/**
	 * This shows or hides the welcome display depending on whether there are any rows in the collection.
	 */
	toggleWelcomeDisplay: function () {
		if ( !this.model.get( 'rows' ).isEmpty() ) {
			this.$( '.so-panels-welcome-message' ).hide();
		} else {
			this.$( '.so-panels-welcome-message' ).show();
		}
	},

	/**
	 * Activate the contextual menu
	 * @param e
	 * @param menu
	 */
	activateContextMenu: function ( e, menu ) {
		var builder = this;

		// Only run this if the event target is a descendant of this builder's DOM element.
		if ( $.contains( builder.$el.get( 0 ), e.target ) ) {
			// Get the element we're currently hovering over
			var over = $( [] )
			.add( builder.$( '.so-panels-welcome-message:visible' ) )
			.add( builder.$( '.so-rows-container > .so-row-container' ) )
			.add( builder.$( '.so-cells > .cell' ) )
			.add( builder.$( '.cell-wrapper > .so-widget' ) )
			.filter( function ( i ) {
				return menu.isOverEl( $( this ), e );
			} );

			var activeView = over.last().data( 'view' );
			if ( activeView !== undefined && activeView.buildContextualMenu !== undefined ) {
				// We'll pass this to the current active view so it can populate the contextual menu
				activeView.buildContextualMenu( e, menu );
			}
			else if ( over.last().hasClass( 'so-panels-welcome-message' ) ) {
				// The user opened the contextual menu on the welcome message
				this.buildContextualMenu( e, menu );
			}
		}
	},

	/**
	 * Build the contextual menu for the main builder - before any content has been added.
	 */
	buildContextualMenu: function ( e, menu ) {
		var actions = {};

		if ( this.supports( 'addRow' ) ) {
			actions.add_row = { title: panelsOptions.loc.contextual.add_row };
		}

		if ( panels.helpers.clipboard.canCopyPaste() ) {
			if ( panels.helpers.clipboard.isModel( 'row-model' ) && this.supports( 'addRow' ) ) {
				actions.paste_row = { title: panelsOptions.loc.contextual.row_paste };
			}
		}

		if ( !_.isEmpty( actions ) ) {
			menu.addSection(
				'builder-actions',
				{
					sectionTitle: panelsOptions.loc.contextual.row_actions,
					search: false,
				},
				actions,
				function ( c ) {
					switch ( c ) {
						case 'add_row':
							this.displayAddRowDialog();
							break;

						case 'paste_row':
							this.pasteRowHandler();
							break;
					}
				}.bind( this )
			);
		}
	},
} );

},{}],26:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	template: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-builder-cell' ).html() ) ),
	events: {
		'click .cell-wrapper': 'handleCellClick'
	},

	/* The row view that this cell is a part of */
	row: null,
	widgetSortable: null,

	initialize: function () {
		this.listenTo(this.model.get('widgets'), 'add', this.onAddWidget );
	},

	/**
	 * Render the actual cell
	 */
	render: function () {
		var templateArgs = {
			weight: _.escape( this.model.get( 'weight' ) ),
			totalWeight: _.escape( this.row.model.get( 'cells' ).totalWeight() )
		};

		this.setElement( this.template( templateArgs ) );
		this.$el.data( 'view', this );

		// Now lets render any widgets that are currently in the row
		var thisView = this;
		this.model.get('widgets').each( function ( widget ) {
			var widgetView = new panels.view.widget( {model: widget} );
			widgetView.cell = thisView;
			widgetView.render();

			widgetView.$el.appendTo( thisView.$( '.widgets-container' ) );
		} );

		this.initSortable();
		this.initResizable();

		return this;
	},

	/**
	 * Initialize the widget sortable
	 */
	initSortable: function () {
		if( ! this.row.builder.supports( 'moveWidget' ) ) {
			return this;
		}

		var cellView = this;
		var builder = cellView.row.builder;

		// Go up the view hierarchy until we find the ID attribute
		var builderID = builder.$el.attr( 'id' );
		var builderModel = builder.model;

		// Create a widget sortable that's connected with all other cells
		this.widgetSortable = this.$( '.widgets-container' ).sortable( {
			placeholder: "so-widget-sortable-highlight",
			connectWith: '#' + builderID + ' .so-cells .cell .widgets-container,.block-editor .so-cells .cell .widgets-container',
			tolerance: 'pointer',
			scroll: false,
			over: function ( e, ui ) {
				// This will make all the rows in the current builder resize
				cellView.row.builder.trigger( 'widget_sortable_move' );
			},
			remove: function ( e, ui ) {
				cellView.model.get( 'widgets' ).remove(
					$( ui.item ).data( 'view' ).model,
					{ silent: true }
				);
				builderModel.refreshPanelsData();
			},
			receive: function ( e, ui ) {
				var widgetView = $( ui.item ).data( 'view' );
				widgetView.cell = cellView;
				var widgetModel = widgetView.model;
				widgetModel.cell = cellView.model;
				cellView.model.get( 'widgets' ).add(
					widgetModel,
					{ silent: true, at: $( ui.item ).index() }
				);
				builderModel.refreshPanelsData();
			},
			stop: function ( e, ui ) {
				var $$ =  $( ui.item ),
					widget = $$.data( 'view' ),
					targetCell = $$.closest( '.cell' ).data( 'view' );


				// If this hasn't already been removed and added to a different builder.
				if ( cellView.model.get( 'widgets' ).get( widget.model ) ) {

					cellView.row.builder.addHistoryEntry( 'widget_moved' );

					// Move the model and the view to the new cell
					widget.model.moveToCell( targetCell.model, {}, $$.index() );
					widget.cell = targetCell;

					builderModel.refreshPanelsData();
				}
			},
			helper: function ( e, el ) {
				var helper = el.clone()
					.css( {
						'width': el.outerWidth() + 'px',
						'z-index': 10000,
						'position': 'fixed'
					} )
					.addClass( 'widget-being-dragged' ).appendTo( 'body' );

				// Center the helper to the mouse cursor.
				if ( el.outerWidth() > 720 ) {
					helper.animate( {
						'margin-left': e.pageX - el.offset().left - (
						480 / 2
						),
						'width': 480
					}, 'fast' );
				}

				return helper;
			}
		} );

		return this;
	},

	/**
	 * Refresh the widget sortable when a new widget is added
	 */
	refreshSortable: function () {
		if ( ! _.isNull( this.widgetSortable ) ) {
			this.widgetSortable.sortable( 'refresh' );
		}
	},

	/**
	 * This will make the cell resizble
	 */
	initResizable: function () {
		if( ! this.row.builder.supports( 'editRow' ) ) {
			return this;
		}

		// var neighbor = this.$el.previous().data('view');
		var handle = this.$( '.resize-handle' ).css( 'position', 'absolute' );
		var container = this.row.$el;
		var cellView = this;

		// The view of the cell to the left is stored when dragging starts.
		var previousCell;

		handle.draggable( {
			axis: 'x',
			containment: container,
			start: function ( e, ui ) {
				// Set the containment to the cell parent
				previousCell = cellView.$el.prev().data( 'view' );
				if ( _.isUndefined( previousCell ) ) {
					return;
				}

				// Create the clone for the current cell
				var newCellClone = cellView.$el.clone().appendTo( ui.helper ).css( {
					position: 'absolute',
					top: '0',
					width: cellView.$el.outerWidth(),
					left: 5,
					height: cellView.$el.outerHeight()
				} );
				newCellClone.find( '.resize-handle' ).remove();

				// Create the clone for the previous cell
				var prevCellClone = previousCell.$el.clone().appendTo( ui.helper ).css( {
					position: 'absolute',
					top: '0',
					width: previousCell.$el.outerWidth() + 'px',
					right: 5,
					height: previousCell.$el.outerHeight() + 'px',
				} );
				prevCellClone.find( '.resize-handle' ).remove();

				$( this ).data( {
					'newCellClone': newCellClone,
					'prevCellClone': prevCellClone
				} );
			},
			drag: function ( e, ui ) {
				// Calculate the new cell and previous cell widths as a percent
				var containerWidth = cellView.row.$el.width() + 10;
				var ncw = cellView.model.get( 'weight' ) - (
					(
					ui.position.left + handle.outerWidth() / 2
					) / containerWidth
					);
				var pcw = previousCell.model.get( 'weight' ) + (
					(
					ui.position.left + handle.outerWidth() / 2
					) / containerWidth
					);

				$( this ).data( 'newCellClone' ).css( 'width', containerWidth * ncw + 'px'  )
					.find( '.preview-cell-weight' ).html( Math.round( ncw * 1000 ) / 10 );

				$( this ).data( 'prevCellClone' ).css( 'width', containerWidth * pcw + 'px' )
					.find( '.preview-cell-weight' ).html( Math.round( pcw * 1000 ) / 10 );
			},
			stop: function ( e, ui ) {
				// Remove the clones
				$( this ).data( 'newCellClone' ).remove();
				$( this ).data( 'prevCellClone' ).remove();

				var containerWidth = cellView.row.$el.width() + 10;
				var ncw = cellView.model.get( 'weight' ) - (
					(
					ui.position.left + handle.outerWidth() / 2
					) / containerWidth
					);
				var pcw = previousCell.model.get( 'weight' ) + (
					(
					ui.position.left + handle.outerWidth() / 2
					) / containerWidth
					);

				if ( ncw > 0.02 && pcw > 0.02 ) {
					cellView.row.builder.addHistoryEntry( 'cell_resized' );
					cellView.model.set( 'weight', ncw );
					previousCell.model.set( 'weight', pcw );
					cellView.row.resizeRow();
				}

				ui.helper.css( 'left', - handle.outerWidth() / 2  + 'px' );

				// Refresh the panels data
				cellView.row.builder.model.refreshPanelsData();
			}
		} );

		return this;
	},

	/**
	 * This is triggered when ever a widget is added to the row collection.
	 *
	 * @param widget
	 */
	onAddWidget: function ( widget, collection, options ) {
		options = _.extend( {noAnimate: false}, options );

		// Create the view for the widget
		var view = new panels.view.widget( {
			model: widget
		} );
		view.cell = this;

		if ( _.isUndefined( widget.isDuplicate ) ) {
			widget.isDuplicate = false;
		}

		// Render and load the form if this is a duplicate
		view.render( {
			'loadForm': widget.isDuplicate
		} );

		if ( _.isUndefined( options.at ) || collection.length <= 1 ) {
			// Insert this at the end of the widgets container
			view.$el.appendTo( this.$( '.widgets-container' ) );
		} else {
			// We need to insert this at a specific position
			view.$el.insertAfter(
				this.$( '.widgets-container .so-widget' ).eq( options.at - 1 )
			);
		}

		if ( options.noAnimate === false ) {
			// We need an animation
			view.visualCreate();
		}

		this.refreshSortable();
		this.row.resizeRow();
		this.row.builder.trigger( 'widget_added', view );
	},

	/**
	 * Handle this cell being clicked on
	 *
	 * @param e
	 * @returns {boolean}
	 */
	handleCellClick: function ( e ) {
		// Remove all existing selected cell indication for this builder
		this.row.builder.$el.find( '.so-cells .cell' ).removeClass( 'cell-selected' );

		if( this.row.builder.activeCell === this && ! this.model.get('widgets').length ) {
			// This is a click on an empty cell
			this.row.builder.activeCell = null;
		}
		else {
			this.$el.addClass( 'cell-selected' );
			this.row.builder.activeCell = this;
		}
	},

	/**
	 * Insert a widget from the clipboard
	 */
	pasteHandler: function(){
		var pastedModel = panels.helpers.clipboard.getModel( 'widget-model' );
		if( ! _.isEmpty( pastedModel ) && pastedModel instanceof panels.model.widget ) {
			this.row.builder.addHistoryEntry( 'widget_pasted' );
			pastedModel.cell = this.model;
			this.model.get('widgets').add( pastedModel );
			this.row.builder.model.refreshPanelsData();
		}
	},

	/**
	 * Build up the contextual menu for a cell
	 *
	 * @param e
	 * @param menu
	 */
	buildContextualMenu: function ( e, menu ) {
		var thisView = this;

		if( ! menu.hasSection( 'add-widget-below' ) ) {
			menu.addSection(
				'add-widget-cell',
				{
					sectionTitle: panelsOptions.loc.contextual.add_widget_cell,
					searchPlaceholder: panelsOptions.loc.contextual.search_widgets,
					defaultDisplay: panelsOptions.contextual.default_widgets
				},
				panelsOptions.widgets,
				function ( c ) {
					thisView.row.builder.trigger('before_user_adds_widget')
					thisView.row.builder.addHistoryEntry( 'widget_added' );

					var widget = new panels.model.widget( {
						class: c
					} );

					// Add the widget to the cell model
					widget.cell = thisView.model;
					widget.cell.get('widgets').add( widget );

					thisView.row.builder.model.refreshPanelsData();
					thisView.row.builder.trigger('after_user_adds_widget', widget);
				}
			);
		}

		var actions = {};
		if ( this.row.builder.supports('addWidget') && panels.helpers.clipboard.isModel( 'widget-model' ) ) {
			actions.paste = {title: panelsOptions.loc.contextual.cell_paste_widget};
		}

		if( ! _.isEmpty( actions ) ) {
			menu.addSection(
				'cell-actions',
				{
					sectionTitle: panelsOptions.loc.contextual.cell_actions,
					search: false,
				},
				actions,
				function ( c ) {
					switch ( c ) {
						case 'paste':
							this.pasteHandler();
							break;
					}

					this.row.builder.model.refreshPanelsData();
				}.bind( this )
			);
		}

		// Add the contextual menu for the parent row
		this.row.buildContextualMenu( e, menu );
	}
} );

},{}],27:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	dialogTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-dialog' ).html() ) ),
	dialogTabTemplate: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-dialog-tab' ).html() ) ),

	tabbed: false,
	rendered: false,
	builder: false,
	className: 'so-panels-dialog-wrapper',
	dialogClass: '',
	dialogIcon: 'add-widget',
	parentDialog: false,
	dialogOpen: false,
	editableLabel: false,

	events: {
		'click .so-close': 'closeDialog',
		'keyup .so-close': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-nav.so-previous': 'navToPrevious',
		'keyup .so-nav.so-previous': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
		'click .so-nav.so-next': 'navToNext',
		'keyup .so-nav.so-next': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	initialize: function () {
		// The first time this dialog is opened, render it
		this.once( 'open_dialog', this.render );
		this.once( 'open_dialog', this.attach );
		this.once( 'open_dialog', this.setDialogClass );

		this.trigger( 'initialize_dialog', this );

		if ( ! _.isUndefined( this.initializeDialog ) ) {
			this.initializeDialog();
		}
		
		_.bindAll( this, 'initSidebars', 'hasSidebar', 'onResize', 'toggleLeftSideBar', 'toggleRightSideBar' );
	},

	/**
	 * Returns the next dialog in the sequence. Should be overwritten by a child dialog.
	 * @returns {null}
	 */
	getNextDialog: function () {
		return null;
	},

	/**
	 * Returns the previous dialog in this sequence. Should be overwritten by child dialog.
	 * @returns {null}
	 */
	getPrevDialog: function () {
		return null;
	},

	/**
	 * Adds a dialog class to uniquely identify this dialog type
	 */
	setDialogClass: function () {
		if ( this.dialogClass !== '' ) {
			this.$( '.so-panels-dialog' ).addClass( this.dialogClass );
		}
	},

	/**
	 * Set the builder that controls this dialog.
	 * @param {panels.view.builder} builder
	 */
	setBuilder: function ( builder ) {
		this.builder = builder;

		// Trigger an add dialog event on the builder so it can modify the dialog in any way
		builder.trigger( 'add_dialog', this, this.builder );

		return this;
	},

	/**
	 * Attach the dialog to the window
	 */
	attach: function () {
		this.$el.appendTo( 'body' );

		return this;
	},

	/**
	 * Converts an HTML representation of the dialog into arguments for a dialog box
	 * @param html HTML for the dialog
	 * @param args Arguments passed to the template
	 * @returns {}
	 */
	parseDialogContent: function ( html, args ) {
		// Add a CID
		args = _.extend( {cid: this.cid}, args );


		var c = $( (
			_.template( panels.helpers.utils.processTemplate( html ) )
		)( args ) );
		var r = {
			title: c.find( '.title' ).html(),
			buttons: c.find( '.buttons' ).html(),
			content: c.find( '.content' ).html()
		};

		if ( c.has( '.left-sidebar' ) ) {
			r.left_sidebar = c.find( '.left-sidebar' ).html();
		}

		if ( c.has( '.right-sidebar' ) ) {
			r.right_sidebar = c.find( '.right-sidebar' ).html();
		}

		return r;

	},

	/**
	 * Render the dialog and initialize the tabs
	 *
	 * @param attributes
	 * @returns {panels.view.dialog}
	 */
	renderDialog: function ( attributes ) {
		attributes = _.extend( {
			editableLabel: this.editableLabel,
			dialogIcon: this.dialogIcon,
		}, attributes );

		this.$el.html( this.dialogTemplate( attributes ) ).hide();
		this.$el.data( 'view', this );
		this.$el.addClass( 'so-panels-dialog-wrapper' );

		if ( this.parentDialog !== false ) {
			// Add a link to the parent dialog as a sort of crumbtrail.
			var dialogParent = $( '<h3 class="so-parent-link"></h3>' ).html( this.parentDialog.text + '<div class="so-separator"></div>' );
			dialogParent.on( 'click', function( e ) {
				e.preventDefault();
				this.closeDialog();
				this.parentDialog.dialog.openDialog();
			}.bind(this) );
			this.$( '.so-title-bar .so-title' ).before( dialogParent );

			// Remove the Mode Button in dialogs that have a parent dialog.
			this.$el.find( '.so-button-mode' ).remove();
		}

		if( this.$( '.so-title-bar .so-title-editable' ).length ) {
			// Added here because .so-edit-title is only available after the template has been rendered.
			this.initEditableLabel();
		}
		
		setTimeout( this.initSidebars, 1 );

		return this;
	},
	
	initSidebars: function () {
		var $leftButton = this.$( '.so-show-left-sidebar' ).hide();
		var $rightButton = this.$( '.so-show-right-sidebar' ).hide();
		var hasLeftSidebar = this.hasSidebar( 'left' );
		var hasRightSidebar = this.hasSidebar( 'right' );
		// Set up resize handling
		if ( hasLeftSidebar || hasRightSidebar ) {
			$( window ).on( 'resize', this.onResize );
			if ( hasLeftSidebar ) {
				$leftButton.show();
				$leftButton.on( 'click', this.toggleLeftSideBar );
			}
			if ( hasRightSidebar ) {
				$rightButton.show();
				$rightButton.on( 'click', this.toggleRightSideBar );
			}
		}
		
		this.onResize();
	},

	/**
	 * Initialize the sidebar tabs
	 */
	initTabs: function () {
		var tabs = this.$( '.so-sidebar-tabs li a' );

		if ( tabs.length === 0 ) {
			return this;
		}

		var thisDialog = this;
		tabs.on( 'click', function( e ) {
			e.preventDefault();
			var $$ = $( this );

			thisDialog.$( '.so-sidebar-tabs li' ).removeClass( 'tab-active' );
			thisDialog.$( '.so-content .so-content-tabs > *' ).hide();

			$$.parent().addClass( 'tab-active' );

			var url = $$.attr( 'href' );
			if ( ! _.isUndefined( url ) && url.charAt( 0 ) === '#' ) {
				// Display the new tab
				var tabName = url.split( '#' )[1];
				thisDialog.$( '.so-content .so-content-tabs .tab-' + tabName ).show();
			}

			// This lets other dialogs implement their own custom handlers
			thisDialog.trigger( 'tab_click', $$ );

		} );

		// Trigger a click on the first tab
		this.$( '.so-sidebar-tabs li a' ).first().trigger( 'click' );
		return this;
	},

	initToolbar: function () {
		// Trigger simplified click event for elements marked as toolbar buttons.
		var buttons = this.$( '.so-toolbar .so-buttons .so-toolbar-button' );
		buttons.on( 'click keyup', function( e ) {
			e.preventDefault();

			if ( e.type == 'keyup' && e.which != 13 ) {
				return;
			}

			this.trigger( 'button_click', $( e.currentTarget ) );
		}.bind( this ) );

		// Handle showing and hiding the dropdown list items
		var $dropdowns = this.$( '.so-toolbar .so-buttons .so-dropdown-button' );
		$dropdowns.on( 'click', function( e ) {
			e.preventDefault();
			var $dropdownButton = $( e.currentTarget );
			var $dropdownList = $dropdownButton.siblings( '.so-dropdown-links-wrapper' );
			if ( $dropdownList.is( '.hidden' ) ) {
				$dropdownList.removeClass( 'hidden' );
			} else {
				$dropdownList.addClass( 'hidden' );
			}

		}.bind( this ) );

		// Hide dropdown list on click anywhere, unless it's a dropdown option which requires confirmation in it's
		// unconfirmed state.
		$( 'html' ).on( 'click', function( e ) {
			this.$( '.so-dropdown-links-wrapper' ).not( '.hidden' ).each( function ( index, el ) {
				var $dropdownList = $( el );
				var $trgt = $( e.target );
				if ( $trgt.length === 0 || !(
						(
							$trgt.is('.so-needs-confirm') && !$trgt.is('.so-confirmed')
						) || $trgt.is('.so-dropdown-button')
					) ) {
					$dropdownList.addClass('hidden');
				}
			} );
		}.bind( this ) );
	},

	/**
	 * Initialize the editable dialog title
	 */
	initEditableLabel: function(){
		var $editElt = this.$( '.so-title-bar .so-title-editable' );

		$editElt.on( 'keypress', function ( event ) {
				var enterPressed = event.type === 'keypress' && event.keyCode === 13;
				if ( enterPressed ) {
					// Need to make sure tab focus is on another element, otherwise pressing enter multiple times refocuses
					// the element and allows newlines.
					var tabbables = $( ':tabbable' );
					var curTabIndex = tabbables.index( $editElt );
					tabbables.eq( curTabIndex + 1 ).trigger( 'focus' );
					// After the above, we're somehow left with the first letter of text selected,
					// so this removes the selection.
					window.getSelection().removeAllRanges();
				}
				return ! enterPressed;
			} )
			.on( 'blur', function () {
				var newValue = $editElt.text().replace( /^\s+|\s+$/gm, '' );
				var oldValue = $editElt.data( 'original-value' ).replace( /^\s+|\s+$/gm, '' );
				if ( newValue !== oldValue ) {
					$editElt.text( newValue );
					this.trigger( 'edit_label', newValue );
				}

			}.bind( this ) )
			.on( 'focus', function() {
				$editElt.data( 'original-value', $editElt.text() );
				panels.helpers.utils.selectElementContents( this );
			} );
	},

	/**
	 * Quickly setup the dialog by opening and closing it.
	 */
	setupDialog: function () {
		this.openDialog();
		this.closeDialog();
	},

	/**
	 * Refresh the next and previous buttons.
	 */
	refreshDialogNav: function () {
		this.$( '.so-title-bar .so-nav' ).show().removeClass( 'so-disabled' );

		// Lets also hide the next and previous if we don't have a next and previous dialog
		var nextDialog = this.getNextDialog();
		var nextButton = this.$( '.so-title-bar .so-next' );

		var prevDialog = this.getPrevDialog();
		var prevButton = this.$( '.so-title-bar .so-previous' );

		if ( nextDialog === null ) {
			nextButton.hide();
		} else if ( nextDialog === false ) {
			nextButton.addClass( 'so-disabled' );
			nextButton.attr( 'tabindex', -1 );
		} else {
			nextButton.attr( 'tabindex', 0 );
		}

		if ( prevDialog === null ) {
			prevButton.hide();
		} else if ( prevDialog === false ) {
			prevButton.addClass( 'so-disabled' );
			prevButton.attr( 'tabindex', -1 );
		} else {
			prevButton.attr( 'tabindex', 0 );
		}
	},

	/**
	 * Open the dialog
	 */
	openDialog: function ( options ) {
		options = _.extend( {
			silent: false
		}, options );

		if ( ! options.silent ) {
			this.trigger( 'open_dialog' );
		}

		this.dialogOpen = true;

		this.refreshDialogNav();

		// Stop scrolling for the main body
		panels.helpers.pageScroll.lock();

		this.onResize();

		if ( typeof window.panelsMode == 'string' ) {
			if ( window.panelsMode == 'inline' ) {
				this.$( '.so-toolbar .so-close, .so-toolbar .so-save' ).hide();
				this.$( '.so-toolbar .so-saveinline' ).show().addClass( 'so-active-mode' );
			} else {
				this.$( '.so-toolbar .so-saveinline' ).hide();
				this.$( '.so-toolbar .so-close, .so-toolbar .so-save' ).show().addClass( 'so-active-mode' );
			}
		}

		this.$el.show();

		if ( ! options.silent ) {
			// This triggers once everything is visible
			this.trigger( 'open_dialog_complete' );
			this.builder.trigger( 'open_dialog', this );
			$( document ).trigger( 'open_dialog', this );
		}
	},

	/**
	 * Close the dialog
	 *
	 * @param e
	 * @returns {boolean}
	 */
	closeDialog: function ( options ) {
		options = _.extend( {
			silent: false
		}, options );

		// Allow for external field validation when attempting to close a widget.
		if ( typeof this.widgetView == 'object' ) {
			var values = this.getFormValues();
			if ( typeof values.widgets == 'object' ) {
				validSave = $( document ).triggerHandler(
					'close_dialog_validation',
					[
						// Widget values.
						values.widgets[ this.model.cid ],
						// Widget Class
						this.model.attributes.class,
						// Model instance - used for finding field markup.
						this.model.cid,
						// Instance.
						this
					]
				);
			}

			if ( typeof validSave == 'boolean' && ! validSave ) {
				return false;
			}
		}

		if ( ! options.silent ) {
			this.trigger( 'close_dialog' );
		}

		this.dialogOpen = false;

		this.$el.hide();
		panels.helpers.pageScroll.unlock();

		if ( ! options.silent ) {
			// This triggers once everything is hidden
			this.trigger( 'close_dialog_complete' );
			this.builder.trigger( 'close_dialog', this );
		}
	},

	/**
	 * Navigate to the previous dialog
	 */
	navToPrevious: function () {
		this.closeDialog();

		var prev = this.getPrevDialog();
		if ( prev !== null && prev !== false ) {
			prev.openDialog();
		}
	},

	/**
	 * Navigate to the next dialog
	 */
	navToNext: function () {
		this.closeDialog();

		var next = this.getNextDialog();
		if ( next !== null && next !== false ) {
			next.openDialog();
		}
	},

	/**
	 * Get the values from the form and convert them into a data array
	 */
	getFormValues: function ( formSelector ) {
		if ( _.isUndefined( formSelector ) ) {
			formSelector = '.so-content';
		}

		var $f = this.$( formSelector );

		var data = {}, parts;

		// Find all the named fields in the form
		$f.find( '[name]' ).each( function () {
			var $$ = $( this );

			try {

				var name = /([A-Za-z_]+)\[(.*)\]/.exec( $$.attr( 'name' ) );
				if ( _.isEmpty( name ) ) {
					return true;
				}

				// Create an array with the parts of the name
				if ( _.isUndefined( name[2] ) ) {
					parts = $$.attr( 'name' );
				} else {
					parts = name[2].split( '][' );
					parts.unshift( name[1] );
				}

				parts = parts.map( function ( e ) {
					if ( ! isNaN( parseFloat( e ) ) && isFinite( e ) ) {
						return parseInt( e );
					} else {
						return e;
					}
				} );

				var sub = data;
				var fieldValue = null;

				var fieldType = (
					_.isString( $$.attr( 'type' ) ) ? $$.attr( 'type' ).toLowerCase() : false
				);

				// First we need to get the value from the field
				if ( fieldType === 'checkbox' ) {
					if ( $$.is( ':checked' ) ) {
						fieldValue = $$.val() !== '' ? $$.val() : true;
					} else {
						fieldValue = null;
					}
				}
				else if ( fieldType === 'radio' ) {
					if ( $$.is( ':checked' ) ) {
						fieldValue = $$.val();
					} else {
						//skip over unchecked radios
						return;
					}
				}
				else if ( $$.prop( 'tagName' ) === 'SELECT' ) {
					var selected = $$.find( 'option:selected' );

					if ( selected.length === 1 ) {
						fieldValue = $$.find( 'option:selected' ).val();
					}
					else if ( selected.length > 1 ) {
						// This is a mutli-select field
						fieldValue = _.map( $$.find( 'option:selected' ), function ( n, i ) {
							return $( n ).val();
						} );
					}

				} else {
					// This is a fallback that will work for most fields
					fieldValue = $$.val();
				}

				// Now, we need to filter this value if necessary
				if ( ! _.isUndefined( $$.data( 'panels-filter' ) ) ) {
					switch ( $$.data( 'panels-filter' ) ) {
						case 'json_parse':
							// Attempt to parse the JSON value of this field
							try {
								fieldValue = JSON.parse( fieldValue );
							}
							catch ( err ) {
								fieldValue = '';
							}
							break;
					}
				}

				// Is this field an ACF Repeater?
				if (
					$$.parents( '.acf-repeater' ).length ||
					$$.parents( '.acf-field-checkbox' ).length ||
					$$.parents( '.acf-gallery' ).length
				) {
					// If field is empty, skip it - this is to avoid indexes which are admin only.
					if ( fieldValue == '' ) {
						return;
					}

					// Ensure only the standard PB fields are set up.
					// This allows for the rest of the ACF fields to be handled
					// as objects rather than an array.
					parts.slice( parts[2], parts.length );
				}

				// Now convert this into an array
				if ( fieldValue !== null ) {
					for ( var i = 0; i < parts.length; i ++ ) {
						if ( i === parts.length - 1 ) {
							if ( parts[i] === '' ) {
								// This needs to be an array
								sub.push( fieldValue );
							} else {
								sub[parts[i]] = fieldValue;
							}
						} else {
							if ( _.isUndefined( sub[parts[i]] ) ) {
								if ( parts[i + 1] === '' ) {
									sub[parts[i]] = [];
								} else {
									sub[parts[i]] = {};
								}
							}
							sub = sub[parts[i]];
						}
					}
				}
			}
			catch ( error ) {
				// Ignore this error, just log the message for debugging
				console.log( 'Field [' + $$.attr('name') + '] could not be processed and was skipped - ' + error.message );
			}

		} ); // End of each through input fields

		return data;
	},

	/**
	 * Set a status message for the dialog
	 */
	setStatusMessage: function ( message, loading, error ) {
		var msg = error ? '<span class="dashicons dashicons-warning"></span>' + message : message;
		this.$( '.so-toolbar .so-status' ).html( msg );
		if ( ! _.isUndefined( loading ) && loading ) {
			this.$( '.so-toolbar .so-status' ).addClass( 'so-panels-loading' );
		} else {
			this.$( '.so-toolbar .so-status' ).removeClass( 'so-panels-loading' );
		}
	},

	/**
	 * Set the parent after.
	 */
	setParent: function ( text, dialog ) {
		this.parentDialog = {
			text: text,
			dialog: dialog
		};
	},
	
	onResize: function () {
		var mediaQuery = window.matchMedia( '(max-width: 980px)' );
		var sides = [ 'left', 'right' ];
		
		sides.forEach( function ( side ) {
			var $sideBar = this.$( '.so-' + side + '-sidebar' );
			var $showSideBarButton = this.$( '.so-show-' + side + '-sidebar' );
			if ( this.hasSidebar( side ) ) {
				$showSideBarButton.hide();
				if ( mediaQuery.matches ) {
					$showSideBarButton.show();
					$showSideBarButton.closest( '.so-title-bar' ).addClass( 'so-has-' + side + '-button' );
					$sideBar.hide();
					$sideBar.closest( '.so-panels-dialog' ).removeClass( 'so-panels-dialog-has-' + side + '-sidebar' );
				} else {
					$showSideBarButton.hide();
					$showSideBarButton.closest( '.so-title-bar' ).removeClass( 'so-has-' + side + '-button' );
					$sideBar.show();
					$sideBar.closest( '.so-panels-dialog' ).addClass( 'so-panels-dialog-has-' + side + '-sidebar' );
				}
			} else {
				$sideBar.hide();
				$showSideBarButton.hide();
			}
		}.bind( this ) );
	},
	
	hasSidebar: function ( side ) {
		return this.$( '.so-' + side + '-sidebar' ).children().length > 0;
	},
	
	toggleLeftSideBar: function () {
		this.toggleSidebar( 'left' );
	},
	
	toggleRightSideBar: function () {
		this.toggleSidebar( 'right' );
	},
	
	toggleSidebar: function ( side ) {
		var sidebar = this.$( '.so-' + side + '-sidebar' );
		
		if ( sidebar.is( ':visible' ) ) {
			sidebar.hide();
		} else {
			sidebar.show();
		}
	},
	
} );

},{}],28:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	template: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-live-editor' ).html() ) ),

	previewScrollTop: 0,
	loadTimes: [],
	previewFrameId: 1,

	previewUrl: null,
	previewIframe: null,

	events: {
		'click .live-editor-close': 'close',
		'click .live-editor-save': 'closeAndSave',
		'click .live-editor-collapse': 'collapse',
		'click .live-editor-mode': 'mobileToggle',
		'keyup .live-editor-mode': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	initialize: function ( options ) {
		options = _.extend( {
			builder: false,
			previewUrl: false,
		}, options );

		if( _.isEmpty( options.previewUrl ) ) {
			options.previewUrl = panelsOptions.ajaxurl + "&action=so_panels_live_editor_preview";
		}

		this.builder = options.builder;
		this.previewUrl = options.previewUrl;

		this.listenTo( this.builder.model, 'refresh_panels_data', this.handleRefreshData );
		this.listenTo( this.builder.model, 'load_panels_data', this.handleLoadData );
	},

	/**
	 * Render the live editor
	 */
	render: function () {
		this.setElement( this.template() );
		this.$el.hide();
		
		if ( $( '#submitdiv #save-post' ).length > 0 ) {
			var $saveButton = this.$el.find( '.live-editor-save' );
			$saveButton.text( $saveButton.data( 'save' ) );
		}

		var isMouseDown = false;
		$( document )
			.on( 'mousedown', function() {
				isMouseDown = true;
			} )
			.on( 'mouseup', function() {
				isMouseDown = false;
			} );

		// Handle highlighting the relevant widget in the live editor preview
		var liveEditorView = this;

		this.$el.on( 'mouseenter focusin', '.so-widget', function () {
			var $$ = $( this ),
				previewWidget = $$.data( 'live-editor-preview-widget' );

			if ( ! isMouseDown && previewWidget !== undefined && previewWidget.length && ! liveEditorView.$( '.so-preview-overlay' ).is( ':visible' ) ) {
				liveEditorView.highlightElement( previewWidget );
				liveEditorView.scrollToElement( previewWidget );
			}
		} );

		this.$el.on( 'mouseleave focusout', '.so-widget', function () {
			this.resetHighlights();
		}.bind(this) );

		this.listenTo( this.builder, 'open_dialog', function () {
			this.resetHighlights();
		} );

		return this;
	},

	/**
	 * Attach the live editor to the document
	 */
	attach: function () {
		this.$el.appendTo( 'body' );
	},

	/**
	 * Display the live editor
	 */
	open: function () {
		if ( this.$el.html() === '' ) {
			this.render();
		}
		if ( this.$el.closest( 'body' ).length === 0 ) {
			this.attach();
		}

		// Disable page scrolling
		panels.helpers.pageScroll.lock();

		if ( this.$el.is( ':visible' ) ) {
			return this;
		}

		// Refresh the preview display
		this.$el.show();
		this.refreshPreview( this.builder.model.getPanelsData() );

		$( '.live-editor-close' ).trigger( 'focus' );

		// Move the builder view into the Live Editor
		this.originalContainer = this.builder.$el.parent();
		this.builder.$el.appendTo( this.$( '.so-live-editor-builder' ) );
		this.builder.$( '.so-tool-button.so-live-editor' ).hide();
		this.builder.trigger( 'builder_resize' );


		if( $('#original_post_status' ).val() === 'auto-draft' && ! this.autoSaved ) {
			// The live editor requires a saved draft post, so we'll create one for auto-draft posts
			var thisView = this;

			if ( wp.autosave ) {
				// Set a temporary post title so the autosave triggers properly
				if( $('#title[name="post_title"]' ).val() === '' ) {
					$('#title[name="post_title"]' ).val( panelsOptions.loc.draft ).trigger('keydown');
				}

				$( document ).one( 'heartbeat-tick.autosave', function(){
					thisView.autoSaved = true;
					thisView.refreshPreview( thisView.builder.model.getPanelsData() );
				} );
				wp.autosave.server.triggerSave();
			}
		}
	},

	/**
	 * Close the Live Editor
	 */
	close: function ( closeAfter = true ) {
		if ( ! this.$el.is( ':visible' ) ) {
			return this;
		}

		if ( closeAfter && this.builder.config.liveEditorCloseAfter ) {
			// Live Editor is set to be closed upon saving the page.
			// This is done using a trigger rather than a redirect to confirm if
			// the user wants to save.
			$( '#wp-admin-bar-view a' )[0].click(); // JS click.
			return this;
		}

		this.$el.hide();
		panels.helpers.pageScroll.unlock();

		// Move the builder back to its original container
		this.builder.$el.appendTo( this.originalContainer );
		this.builder.$( '.so-tool-button.so-live-editor' ).show();
		this.builder.trigger( 'builder_resize' );
	},

	/**
	 * Close the Live Editor and save the post.
	 */
	closeAndSave: function(){
		this.close( false );
		// Finds the submit input for saving without publishing draft posts.
		$( '#submitdiv input[type="submit"][name="save"], .editor-post-publish-button, .edit-widgets-header__actions .is-primary' )[0].click();
	},

	/**
	 * Collapse the live editor
	 */
	collapse: function () {
		this.$el.toggleClass( 'so-collapsed' );
	},

	/**
	 * Create an overlay in the preview.
	 *
	 * @param over
	 * @return {*|Object} The item we're hovering over.
	 */
	highlightElement: function ( over ) {
		if( ! _.isUndefined( this.resetHighlightTimeout ) ) {
			clearTimeout( this.resetHighlightTimeout );
		}

		// Remove any old overlays

		var body = this.previewIframe.contents().find( 'body' );
		body.find( '.panel-grid .panel-grid-cell .so-panel' )
			.filter( function () {
				// Filter to only include non nested
				return $( this ).parents( '.so-panel' ).length === 0;
			} )
			.not( over )
			.addClass( 'so-panels-faded' );

		over.removeClass( 'so-panels-faded' ).addClass( 'so-panels-highlighted' );
	},

	/**
	 * Reset highlights in the live preview
	 */
	resetHighlights: function() {

		var body = this.previewIframe.contents().find( 'body' );
		this.resetHighlightTimeout = setTimeout( function(){
			body.find( '.panel-grid .panel-grid-cell .so-panel' )
				.removeClass( 'so-panels-faded so-panels-highlighted' );
		}, 100 );
	},

	/**
	 * Scroll over an element in the live preview
	 * @param over
	 */
	scrollToElement: function( over ) {
		var contentWindow = this.$( '.so-preview iframe' )[0].contentWindow;
		contentWindow.liveEditorScrollTo( over );
	},

	handleRefreshData: function ( newData ) {
		if ( ! this.$el.is( ':visible' ) ) {
			return this;
		}

		this.refreshPreview( newData );
	},

	handleLoadData: function () {
		if ( ! this.$el.is( ':visible' ) ) {
			return this;
		}

		this.refreshPreview( this.builder.model.getPanelsData() );
	},

	/**
	 * Refresh the Live Editor preview.
	 * @returns {exports}
	 */
	refreshPreview: function ( data ) {
		var loadTimePrediction = this.loadTimes.length ?
		_.reduce( this.loadTimes, function ( memo, num ) {
			return memo + num;
		}, 0 ) / this.loadTimes.length : 1000;

		// Store the last preview iframe position
		if( ! _.isNull( this.previewIframe )  ) {
			if ( ! this.$( '.so-preview-overlay' ).is( ':visible' ) ) {
				this.previewScrollTop = this.previewIframe.contents().scrollTop();
			}
		}

		// Add a loading bar
		this.$( '.so-preview-overlay' ).show();
		this.$( '.so-preview-overlay .so-loading-bar' )
			.clearQueue()
			.css( 'width', '0%' )
			.animate( {width: '100%'}, parseInt( loadTimePrediction ) + 100 );


		this.postToIframe(
			{
				live_editor_panels_data: JSON.stringify( data ),
				live_editor_post_ID: this.builder.config.postId
			},
			this.previewUrl,
			this.$('.so-preview')
		);

		this.previewIframe.data( 'load-start', new Date().getTime() );
	},

	/**
	 * Use a temporary form to post data to an iframe.
	 *
	 * @param data The data to send
	 * @param url The preview URL
	 * @param target The target iframe
	 */
	postToIframe: function( data, url, target ){
		// Store the old preview

		if( ! _.isNull( this.previewIframe )  ) {
			this.previewIframe.remove();
		}

		var iframeId = 'siteorigin-panels-live-preview-' + this.previewFrameId;

		// Remove the old preview frame
		this.previewIframe = $( '<iframe src="' + url + '"></iframe>' )
			.attr( {
				'id' : iframeId,
				'name' : iframeId,
			} )
			.appendTo( target );

		this.setupPreviewFrame( this.previewIframe );

		// We can use a normal POST form submit
		var tempForm = $( '<form id="soPostToPreviewFrame" method="post"></form>' )
			.attr( {
				id: iframeId,
				target: this.previewIframe.attr('id'),
				action: url
			} )
			.appendTo( 'body' );

		$.each( data, function( name, value ){
			$('<input type="hidden" />')
				.attr( {
					name: name,
					value: value
				} )
				.appendTo( tempForm );
		} );

		tempForm
			.trigger( 'submit' )
			.remove();

		this.previewFrameId++;

		return this.previewIframe;
	},

	/**
	 * Do all the basic setup for the preview Iframe element
	 * @param iframe
	 */
	setupPreviewFrame: function( iframe ){
		var thisView = this;
		iframe
			.data( 'iframeready', false )
			.on( 'iframeready', function () {
				var $$ = $( this ),
					$iframeContents = $$.contents();

				if( $$.data( 'iframeready' ) ) {
					// Skip this if the iframeready function has already run
					return;
				}

				$$.data( 'iframeready', true );

				if ( $$.data( 'load-start' ) !== undefined ) {
					thisView.loadTimes.unshift( new Date().getTime() - $$.data( 'load-start' ) );

					if ( ! _.isEmpty( thisView.loadTimes ) ) {
						thisView.loadTimes = thisView.loadTimes.slice( 0, 4 );
					}
				}

				if ( $( '.live-editor-mode.so-active' ).length ) {
					$( '.so-panels-live-editor .so-preview iframe' ).css( 'transition', 'none' );
					thisView.mobileToggle();
				}

				setTimeout( function(){
					// Scroll to the correct position
					$iframeContents.scrollTop( thisView.previewScrollTop );
					thisView.$( '.so-preview-overlay' ).hide();
					$( '.so-panels-live-editor .so-preview iframe' ).css( 'transition', 'all .2s ease' );
				}, 100 );

				// Lets find all the first level grids. This is to account for the Page Builder layout widget.
				var layoutWrapper = $iframeContents.find( '#pl-' + thisView.builder.config.postId );
				layoutWrapper.find( '.panel-grid .panel-grid-cell .so-panel' )
					.filter( function () {
						// Filter to only include non nested
						return $( this ).closest( '.panel-layout' ).is( layoutWrapper );
					} )
					.each( function ( i, el ) {
						var $$ = $( el );
						var widgetEdit = thisView.$( '.so-live-editor-builder .so-widget' ).eq( $$.data( 'index' ) );
						widgetEdit.data( 'live-editor-preview-widget', $$ );

						$$
							.css( {
								'cursor': 'pointer'
							} )
							.on( 'mouseenter', function() {
								widgetEdit.parent().addClass( 'so-hovered' );
								thisView.highlightElement( $$ );
							} )
							.on( 'mouseleave', function() {
								widgetEdit.parent().removeClass( 'so-hovered' );
								thisView.resetHighlights();
							} )
							.on( 'click', function( e ) {
								e.preventDefault();
								// When we click a widget, send that click to the form
								widgetEdit.find( '.title h4' ).trigger( 'click' );
							} );
					} );

				// Prevent default clicks inside the preview iframe
				$iframeContents.find( "a" ).css( {'pointer-events': 'none'} ).on( 'click', function( e ) {
					e.preventDefault();
				} );

			} )
			.on( 'load', function(){
				var $$ = $( this );
				if( ! $$.data( 'iframeready' ) ) {
					$$.trigger('iframeready');
				}
			} );
	},

	/**
	 * Return true if the live editor has a valid preview URL.
	 * @return {boolean}
	 */
	hasPreviewUrl: function () {
		return this.$( 'form.live-editor-form' ).attr( 'action' ) !== '';
	},

	/**
	 * Toggle the size of the preview iframe to simulate mobile devices.
	 * @param e
	 */
	mobileToggle: function( e ){
		var button = typeof e !== "undefined" ? $( e.currentTarget ) : $( '.live-editor-mode.so-active' );
		this.$('.live-editor-mode' ).not( button ).removeClass('so-active');
		button.addClass( 'so-active' );

		this.$el
			.removeClass( 'live-editor-desktop-mode live-editor-tablet-mode live-editor-mobile-mode' )
			.addClass( 'live-editor-' + button.data( 'mode' ) + '-mode' )
			.find( 'iframe' ).css( 'width', button.data( 'width' ) );
	}
} );

},{}],29:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	template: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-builder-row' ).html() ) ),

	events: {
		'click .so-row-settings': 'editSettingsHandler',
		'click .so-row-duplicate': 'duplicateHandler',
		'click .so-row-delete': 'confirmedDeleteHandler',
		'click .so-row-color': 'rowColorChangeHandler',
	},

	builder: null,
	dialog: null,

	/**
	 * Initialize the row view
	 */
	initialize: function () {

		var rowCells = this.model.get('cells');
		this.listenTo(rowCells, 'add', this.handleCellAdd );
		this.listenTo(rowCells, 'remove', this.handleCellRemove );

		this.listenTo( this.model, 'reweight_cells', this.resizeRow );
		this.listenTo( this.model, 'destroy', this.onModelDestroy );

		var thisView = this;
		rowCells.each( function ( cell ) {
			thisView.listenTo( cell.get('widgets'), 'add', thisView.resize );
		} );

		// When ever a new cell is added, listen to it for new widgets
		rowCells.on( 'add', function ( cell ) {
			thisView.listenTo( cell.get('widgets'), 'add', thisView.resize );
		}, this );

		this.listenTo( this.model, 'change:label', this.onLabelChange );
		this.listenTo( this.model, 'change:styles-row ', this.toggleVisibilityFade );
	},

	/**
	 * Render the row.
	 *
	 * @returns {panels.view.row}
	 */
	render: function () {
		var rowColorLabel = this.model.has( 'color_label' ) ? this.model.get( 'color_label' ) : panelsOptions.row_color.default;
		var rowLabel = this.model.has( 'label' ) ? this.model.get( 'label' ) : '';

		// Migrate legacy row color labels.
		if ( typeof rowColorLabel == 'number' && typeof panelsOptions.row_color.migrations[ rowColorLabel ] == 'string' ) {
			this.$el.removeClass( 'so-row-color-' + rowColorLabel );
			rowColorLabel = panelsOptions.row_color.migrations[ rowColorLabel ];
			this.$el.addClass( 'so-row-color-' + rowColorLabel );
			this.model.set( 'color_label', rowColorLabel );
		}

		this.setElement( this.template( {
			rowColorLabel: _.escape( rowColorLabel ),
			rowLabel: _.escape( rowLabel )
		} ) );
		this.$el.data( 'view', this );

		// Create views for the cells in this row
		var thisView = this;
		this.model.get('cells').each( function ( cell ) {
			var cellView = new panels.view.cell( {
				model: cell
			} );
			cellView.row = thisView;
			cellView.render();
			cellView.$el.appendTo( thisView.$( '.so-cells' ) );
		} );

		// Remove any unsupported actions
		if( ! this.builder.supports( 'rowAction' ) ) {
			this.$('.so-row-toolbar .so-dropdown-wrapper' ).remove();
			this.$el.addClass('so-row-no-actions');
		}
		else {
			if( ! this.builder.supports( 'editRow' ) ) {
				this.$('.so-row-toolbar .so-dropdown-links-wrapper .so-row-settings' ).parent().remove();
				this.$el.addClass('so-row-no-edit');
			}
			if( ! this.builder.supports( 'addRow' ) ) {
				this.$('.so-row-toolbar .so-dropdown-links-wrapper .so-row-duplicate' ).parent().remove();
				this.$el.addClass('so-row-no-duplicate');
			}
			if( ! this.builder.supports( 'deleteRow' ) ) {
				this.$('.so-row-toolbar .so-dropdown-links-wrapper .so-row-delete' ).parent().remove();
				this.$el.addClass('so-row-no-delete');
			}
		}
		if( ! this.builder.supports( 'moveRow' ) ) {
			this.$('.so-row-toolbar .so-row-move' ).remove();
			this.$el.addClass('so-row-no-move');
		}

		if ( ! this.$('.so-row-toolbar').html().trim().length ) {
			this.$('.so-row-toolbar' ).remove();
		}

		this.toggleVisibilityFade();

		// Resize the rows when ever the widget sortable moves
		this.listenTo( this.builder, 'widget_sortable_move', this.resizeRow );
		this.listenTo( this.builder, 'builder_resize', this.resizeRow );

		this.resizeRow();

		return this;
	},

	checkIfStyleExists: function( styles, setting ) {
		return typeof styles[ setting ] !== 'undefined' && styles[ setting ] == 'on';
	},

	/**
	 * Toggle Visibility: Check if row is hidden and apply fade as needed.
	 */
	toggleVisibilityFade: function() {
		var styles = this.model.attributes.style;
		if ( typeof styles == 'undefined' ) {
			return;
		}
		if (
			this.checkIfStyleExists( styles, 'disable_row' ) ||
			this.checkIfStyleExists( styles, 'disable_desktop' ) ||
			this.checkIfStyleExists( styles, 'disable_tablet' ) ||
			this.checkIfStyleExists( styles, 'disable_mobile' ) ||
			this.checkIfStyleExists( styles, 'disable_logged_in' ) ||
			this.checkIfStyleExists( styles, 'disable_logged_out' )
		) {
			this.$el.addClass( 'so-hidden-row' );
		} else {
			this.$el.removeClass( 'so-hidden-row' );
		}
	},

	/**
	 * Give a visual indication of the creation of this row
	 */
	visualCreate: function () {
		this.$el.hide().fadeIn( 'fast' );
	},

	/**
	 * Visually resize the row so that all cell heights are the same and the widths so that they balance to 100%
	 *
	 * @param e
	 */
	resizeRow: function( e ) {
		// Don't resize this
		if ( ! this.$el.is( ':visible' ) ) {
			return;
		}

		// Reset everything to have an automatic height
		this.$( '.so-cells .cell-wrapper' ).css( 'min-height', 0 );
		this.$( '.so-cells .resize-handle' ).css( 'height', 0 );
		this.$( '.so-cells' ).removeClass( 'so-action-icons' );

		// We'll tie the values to the row view, to prevent issue with values going to different rows
		var height = 0,
			cellWidth = 0,
			iconsShown = false,
			cell;

		this.$( '.so-cells .cell' ).each( function () {
			cell = $( this );

			$( this ).css(
				'width',
				( cell.data( 'view' ).model.get( 'weight' ) * 100) + "%"
			);

			cellWidth = cell.width();
			// Ensure this widget is large enough to allow for actions to appear.
			if ( cellWidth < 215 ) {
				cell.addClass( 'so-show-icon' );
				iconsShown = true;
				if ( cellWidth < 125 ) {
					cell.addClass( 'so-small-actions' );
				} else {
					cell.removeClass( 'so-small-actions' );
				}
			} else {
				cell.removeClass( 'so-show-icon so-small-actions' );
			}

			// Store cell height. This is used to determine the max height of cells.
			height = Math.max(
				height,
				cell.height()
			);
		} );

		// Resize all the grids and cell wrappers
		this.$( '.so-cells .cell-wrapper' ).css( 'min-height', Math.max( height, 63 ) + 'px' );
		// If action icons are visible in any cell, give the container a special class.
		if ( iconsShown ) {
			this.$( '.so-cells' ).addClass( 'so-action-icons' );
		}
		this.$( '.so-cells .resize-handle' ).css( 'height', this.$( '.so-cells .cell-wrapper' ).outerHeight() + 'px' );
	},

	/**
	 * Remove the view from the dom.
	 */
	onModelDestroy: function () {
		this.remove();
	},

	/**
	 * Fade out the view and destroy the model
	 */
	visualDestroyModel: function () {
		this.builder.addHistoryEntry( 'row_deleted' );
		var thisView = this;
		this.$el.fadeOut( 'normal', function () {
			thisView.model.destroy();
			thisView.builder.model.refreshPanelsData();
		} );
	},

	onLabelChange: function( model, text ) {
		if ( this.$( '.so-row-label' ).length == 0 ) {
			this.$( '.so-row-toolbar' ).prepend(
				'<h3 class="so-row-label"></h3>'
			);
		}

		this.$( '.so-row-label' ).text( text );
	},

	/**
	 * Duplicate this row.
	 *
	 * @return {boolean}
	 */
	duplicateHandler: function () {
		this.builder.addHistoryEntry( 'row_duplicated' );

		var duplicateRow = this.model.clone( this.builder.model );

		this.builder.model.get('rows').add( duplicateRow, {
			at: this.builder.model.get('rows').indexOf( this.model ) + 1
		} );

		this.builder.model.refreshPanelsData();
	},

	/**
	 * Copy the row to a localStorage
	 */
	copyHandler: function(){
		panels.helpers.clipboard.setModel( this.model );
	},

	/**
	 * Create a new row and insert it
	 */
	pasteHandler: function(){
		var pastedModel = panels.helpers.clipboard.getModel( 'row-model' );

		if( ! _.isEmpty( pastedModel ) && pastedModel instanceof panels.model.row ) {
			this.builder.addHistoryEntry( 'row_pasted' );
			pastedModel.builder = this.builder.model;
			this.builder.model.get('rows').add( pastedModel, {
				at: this.builder.model.get('rows').indexOf( this.model ) + 1
			} );
			this.builder.model.refreshPanelsData();
		}
	},

	/**
	 * Handles deleting the row with a confirmation.
	 */
	confirmedDeleteHandler: function ( e ) {
		var $$ = $( e.target );

		// The user clicked on the dashicon
		if ( $$.hasClass( 'dashicons' ) ) {
			$$ = $$.parent();
		}

		if ( $$.hasClass( 'so-confirmed' ) ) {
			this.visualDestroyModel();
		} else {
			var originalText = $$.html();

			$$.addClass( 'so-confirmed' ).html(
				'<span class="dashicons dashicons-yes"></span>' + panelsOptions.loc.dropdown_confirm
			);

			setTimeout( function () {
				$$.removeClass( 'so-confirmed' ).html( originalText );
			}, 2500 );
		}
	},

	/**
	 * Handle displaying the settings dialog
	 */
	editSettingsHandler: function () {
		if ( ! this.builder.supports( 'editRow' ) ) {
			return;
		}
		// Lets open up an instance of the settings dialog
		if ( this.dialog === null ) {
			// Create the dialog
			this.dialog = new panels.dialog.row();
			this.dialog.setBuilder( this.builder ).setRowModel( this.model );
			this.dialog.rowView = this;
		}

		this.dialog.openDialog();

		return this;
	},

	/**
	 * Handle deleting this entire row.
	 */
	deleteHandler: function () {
		this.model.destroy();
		return this;
	},

	/**
	 * Change the row background color.
	 */
	rowColorChangeHandler: function ( event ) {
		this.$( '.so-row-color' ).removeClass( 'so-row-color-selected' );
		var clickedColorElem = $( event.target );
		var newColorLabel = clickedColorElem.data( 'color-label' );
		var oldColorLabel = this.model.has( 'color_label' ) ? this.model.get( 'color_label' ) : panelsOptions.row_color.default;
		clickedColorElem.addClass( 'so-row-color-selected' );
		this.$el.removeClass( 'so-row-color-' + oldColorLabel );
		this.$el.addClass( 'so-row-color-' + newColorLabel );
		this.model.set( 'color_label', newColorLabel );
	},

	/**
	 * Handle a new cell being added to this row view. For now we'll assume the new cell is always last
	 */
	handleCellAdd: function ( cell ) {
		var cellView = new panels.view.cell( {
			model: cell
		} );
		cellView.row = this;
		cellView.render();
		cellView.$el.appendTo( this.$( '.so-cells' ) );
	},

	/**
	 * Handle a cell being removed from this row view
	 */
	handleCellRemove: function ( cell ) {
		// Find the view that ties in to the cell we're removing
		this.$( '.so-cells > .cell' ).each( function () {
			var view = $( this ).data( 'view' );
			if ( _.isUndefined( view ) ) {
				return;
			}

			if ( view.model.cid === cell.cid ) {
				// Remove this view
				view.remove();
			}
		} );
	},

	/**
	 * Build up the contextual menu for a row
	 *
	 * @param e
	 * @param menu
	 */
	buildContextualMenu: function ( e, menu ) {
		var options = [];
		for ( var i = 1; i < 5; i ++ ) {
			options.push( {
				title: i + ' ' + panelsOptions.loc.contextual.column
			} );
		}

		if( this.builder.supports( 'addRow' ) ) {
			menu.addSection(
				'add-row',
				{
					sectionTitle: panelsOptions.loc.contextual.add_row,
					search: false
				},
				options,
				function ( c ) {
					this.builder.addHistoryEntry( 'row_added' );

					var columns = Number( c ) + 1;
					var weights = [];
					for ( var i = 0; i < columns; i ++ ) {
						weights.push( {weight: 100 / columns } );
					}

					// Create the actual row
					var newRow = new panels.model.row( {
						collection: this.collection
					} );

					var cells = new panels.collection.cells(weights);
					cells.each(function (cell) {
						cell.row = newRow;
					});
					newRow.setCells(cells);
					newRow.builder = this.builder.model;

					this.builder.model.get('rows').add( newRow, {
						at: this.builder.model.get('rows').indexOf( this.model ) + 1
					} );

					this.builder.model.refreshPanelsData();
				}.bind( this )
			);
		}

		var actions = {};

		if( this.builder.supports( 'editRow' ) ) {
			actions.edit = { title: panelsOptions.loc.contextual.row_edit };
		}

		// Copy and paste functions
		if ( panels.helpers.clipboard.canCopyPaste() ) {
			actions.copy = { title: panelsOptions.loc.contextual.row_copy };
			if ( this.builder.supports( 'addRow' ) && panels.helpers.clipboard.isModel( 'row-model' ) ) {
				actions.paste = { title: panelsOptions.loc.contextual.row_paste };
			}
		}

		if( this.builder.supports( 'addRow' ) ) {
			actions.duplicate = { title: panelsOptions.loc.contextual.row_duplicate };
		}

		if( this.builder.supports( 'deleteRow' ) ) {
			actions.delete = { title: panelsOptions.loc.contextual.row_delete, confirm: true };
		}

		if( ! _.isEmpty( actions ) ) {
			menu.addSection(
				'row-actions',
				{
					sectionTitle: panelsOptions.loc.contextual.row_actions,
					search: false,
				},
				actions,
				function ( c ) {
					switch ( c ) {
						case 'edit':
							this.editSettingsHandler();
							break;
						case 'copy':
							this.copyHandler();
							break;
						case 'paste':
							this.pasteHandler();
							break;
						case 'duplicate':
							this.duplicateHandler();
							break;
						case 'delete':
							this.visualDestroyModel();
							break;
					}
				}.bind( this )
			);
		}
	},
} );

},{}],30:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {

	stylesLoaded: false,

	events: {
		'keyup .so-image-selector': function( e ) {
			if ( e.which == 13 ) {
				this.$el.find( '.select-image' ).trigger( 'click' );
			}
		},
	},

	initialize: function () {

	},

	/**
	 * Render the visual styles object.
	 *
	 * @param stylesType
	 * @param postId
	 * @param args
	 */
	render: function ( stylesType, postId, args ) {
		if ( _.isUndefined( stylesType ) ) {
			return;
		}

		// Add in the default args
		args = _.extend( {
			builderType: '',
			dialog: null
		}, args );

		this.$el.addClass( 'so-visual-styles so-' + stylesType + '-styles so-panels-loading' );

		var postArgs = {
			builderType: args.builderType
		};

		if ( stylesType === 'widget' ) {
			postArgs.widget = this.model.get( 'class' );
		}

		if ( stylesType === 'cell') {
			postArgs.index = args.index;
		}

		// Load the form
		$.post(
			panelsOptions.ajaxurl,
			{
				action: 'so_panels_style_form',
				type: stylesType,
				style: this.model.get( 'style' ),
				args: JSON.stringify( postArgs ),
				postId: postId
			},
			null,
			'html'
		).done( function ( response ) {
			this.$el.html( response );
			this.setupFields();
			this.stylesLoaded = true;
			this.trigger( 'styles_loaded', !_.isEmpty( response ) );
			if ( !_.isNull( args.dialog ) ) {
				args.dialog.trigger( 'styles_loaded', !_.isEmpty( response ) );
			}
		}.bind( this ) )
		.fail( function ( error ) {
			var html;
			if ( error && error.responseText ) {
				html = error.responseText;
			} else {
				html = panelsOptions.forms.loadingFailed;
			}

			this.$el.html( html );
		}.bind( this ) )
		.always( function () {
			this.$el.removeClass( 'so-panels-loading' );
		}.bind( this ) );

		return this;
	},

	/**
	 * Attach the style view to the DOM.
	 *
	 * @param wrapper
	 */
	attach: function ( wrapper ) {
		wrapper.append( this.$el );
	},

	/**
	 * Detach the styles view from the DOM
	 */
	detach: function () {
		this.$el.detach();
	},

	/**
	 * Setup all the fields
	 */
	setupFields: function () {

		// Set up the sections as collapsible
		this.$( '.style-section-wrapper' ).each( function () {
			var $s = $( this );

			$s.find( '.style-section-head' ).on( 'click keypress', function( e ) {
				e.preventDefault();
				$s.find( '.style-section-fields' ).slideToggle( 'fast' );
			} );
		} );

		// Set up the color fields
		if ( ! _.isUndefined( $.fn.wpColorPicker ) ) {
			if ( typeof panelsOptions.wpColorPickerOptions.palettes === 'object' && ! Array.isArray( panelsOptions.wpColorPickerOptions.palettes ) ) {
				panelsOptions.wpColorPickerOptions.palettes = $.map( panelsOptions.wpColorPickerOptions.palettes, function ( el ) {
					return el;
				} );
			}

			$.fn.handleAlphaDefault = function() {
				var $parent = $( this ).parents( '.wp-picker-container' );
				var $colorResult = $parent.find( '.wp-color-result' );
				if ( $parent.find( '.wp-color-picker[data-alpha-enabled]' ).length ) {
					$colorResult.css( 'background-image', $( this ).val() == '' ? 'none' : alphaImage );
				} else {
					$colorResult.css( 'background-image', 'none' );
				}
			}

			// Trigger a change event when user selects a color.
			panelsOptions.wpColorPickerOptions.change = function( e, ui ) {
				setTimeout( function() {
					$( e.target ).handleAlphaDefault();
					$( e.target ).trigger( 'change' );
				}, 100 );
			};

			this.$( '.so-wp-color-field' ).wpColorPicker( panelsOptions.wpColorPickerOptions );
			var alphaImage = this.$( '.wp-color-picker[data-alpha-enabled]' ).parents( '.wp-picker-container' ).find( '.wp-color-result' ).css( 'background-image' );
			this.$( '.wp-color-picker[data-alpha-enabled]' ).on( 'change', function() {
				$( this ).handleAlphaDefault();
			} ).trigger( 'change' );
		}

		// Set up the image select fields
		this.$( '.style-field-image' ).each( function () {
			var frame = null;
			var $s = $( this );

			$s.find( '.so-image-selector' ).on( 'click', function( e ) {
				e.preventDefault();

				if ( frame === null ) {
					// Create the media frame.
					frame = wp.media( {
						// Set the title of the modal.
						title: panelsOptions.add_media,

						// Tell the modal to show only images.
						library: {
							type: 'image'
						},

						// Customize the submit button.
						button: {
							// Set the text of the button.
							text: panelsOptions.add_media_done,
							close: true
						}
					} );

					// If there's a selected image, highlight it. 
					frame.on( 'open', function() {
						var selection = frame.state().get( 'selection' );
						var selectedImage = $s.find( '.so-image-selector > input' ).val();
						if ( selectedImage ) {
							selection.add( wp.media.attachment( selectedImage ) );
						}
					} );


					frame.on( 'select', function () {
						var attachment = frame.state().get( 'selection' ).first().attributes;

						var url = attachment.url;
						if ( ! _.isUndefined( attachment.sizes ) ) {
							try {
								url = attachment.sizes.thumbnail.url;
							}
							catch ( e ) {
								// We'll use the full image instead
								url = attachment.sizes.full.url;
							}
						}
						$s.find( '.current-image' ).css( 'background-image', 'url(' + url + ')' );

						// Store the ID
						$s.find( '.so-image-selector > input' ).val( attachment.id ).trigger( 'change' )

						$s.find( '.remove-image' ).removeClass( 'hidden' );
					} );
				}

				// Prevent loop that occurs if you close the frame using the close button while focused on the trigger.
				$( this ).next().focus();

				frame.open();
			} );

			// Handle clicking on remove
			$s.find( '.remove-image' ).on( 'click', function( e ) {
				e.preventDefault();
				$s.find( '.current-image' ).css( 'background-image', 'none' );
				$s.find( '.so-image-selector > input' ).val( '' );
				$s.find( '.remove-image' ).addClass( 'hidden' );
			} );
		} );

		// Set up all the measurement fields
		this.$( '.style-field-measurement' ).each( function () {
			var $$ = $( this );

			var text = $$.find( 'input[type="text"]' );
			var unit = $$.find( 'select' );
			var hidden = $$.find( 'input[type="hidden"]' );

			text.on( 'focus', function(){
				$( this ).trigger( 'select' );
			} );

			/**
			 * Load value into the visible input fields.
			 * @param value
			 */
			var loadValue = function( value ) {
				if( value === '' ) {
					return;
				}

				var re = /(?:([0-9\.,\-]+)(.*))+/;
				var valueList = hidden.val().split( ' ' );
				var valueListValue = [];
				for ( var i in valueList ) {
					var match = re.exec( valueList[i] );
					if ( ! _.isNull( match ) && ! _.isUndefined( match[1] ) && ! _.isUndefined( match[2] ) ) {
						valueListValue.push( match[1] );
						unit.val( match[2] );
					}
				}

				if( text.length === 1 ) {
					// This is a single input text field
					text.val( valueListValue.join( ' ' ) );
				}
				else {
					// We're dealing with a multiple field
					if( valueListValue.length === 1 ) {
						valueListValue = [ valueListValue[0], valueListValue[0], valueListValue[0], valueListValue[0] ];
					}
					else if( valueListValue.length === 2 ) {
						valueListValue = [ valueListValue[0], valueListValue[1], valueListValue[0], valueListValue[1] ];
					}
					else if( valueListValue.length === 3 ) {
						valueListValue = [ valueListValue[0], valueListValue[1], valueListValue[2], valueListValue[1] ];
					}

					// Store this in the visible fields
					text.each( function( i, el ) {
						$( el ).val( valueListValue[i] );
					} );
				}
			};
			loadValue( hidden.val() );

			/**
			 * Set value of the hidden field based on inputs
			 */
			var setValue = function( e ){
				var i;

				if( text.length === 1 ) {
					// We're dealing with a single measurement
					var fullString = text
						.val()
						.split( ' ' )
						.filter( function ( value ) {
							return value !== '';
						} )
						.map( function ( value ) {
							return value + unit.val();
						} )
						.join( ' ' );
					hidden.val( fullString );
				}
				else {
					var target = $( e.target ),
						valueList = [],
						emptyIndex = [],
						fullIndex = [];

					text.each( function( i, el ) {
						var value = $( el ).val( ) !== '' ? parseFloat( $( el ).val( ) ) : null;
						valueList.push( value );

						if( value === null ) {
							emptyIndex.push( i );
						}
						else {
							fullIndex.push( i );
						}
					} );

					if( emptyIndex.length === 3 && fullIndex[0] === text.index( target ) ) {
						text.val( target.val() );
						valueList = [ target.val(), target.val(), target.val(), target.val() ];
					}

					if( JSON.stringify( valueList ) === JSON.stringify( [ null, null, null, null ] ) ) {
						hidden.val('');
					}
					else {
						hidden.val( valueList.map( function( k ){
							return ( k === null ? 0 : k ) + unit.val();
						} ).join( ' ' ) );
					}
				}
			};

			// Set the value when ever anything changes
			text.on( 'change', setValue );
			unit.on( 'change', setValue );
		} );

		// Set up all the toggle fields
		this.$( '.style-field-toggle' ).each( function () {
			const $$ = $( this );
			const checkbox = $$.find( '.so-toggle-switch-input' );
			const label = checkbox.next();
			const settings = $$.find( '.so-toggle-fields' );

			const changeLabel = function() {
				if ( checkbox.prop( 'checked' ) ) {
					label.attr( 'aria-checked', 'true' )
					.attr( 'aria-label', label.data( 'on' ) );
				} else {
					label.attr( 'aria-checked', 'false' )
					.attr( 'aria-label', label.data( 'off' ) );
				}
			};

			changeLabel();

			checkbox.on( 'change', function() {
				if ( $( this ).prop( 'checked' ) ) {
					settings.slideDown();
				} else {
					settings.slideUp();
				}

				changeLabel();
			} );

			label.on( 'keyup', function( e ) {
				if ( e.key == 'Enter' ) {
					const isChecked = checkbox.prop( 'checked' );
					checkbox.prop( 'checked', ! isChecked )
						.trigger( 'change' );
				}
			} );
		} );
		this.$( '.style-field-toggle .so-toggle-switch-input' ).trigger( 'change' );

		// Set up all the Slider fields.
		this.$( '.style-field-slider' ).each( function() {
			var $$ = $( this );
			var $input = $$.find( '.so-wp-input-slider' );
			var $c = $$.find( '.so-wp-value-slider' );

			$c.slider( {
				max: parseFloat( $input.attr( 'max' ) ),
				min: parseFloat( $input.attr( 'min' ) ),
				step: parseFloat( $input.attr( 'step' ) ),
				value: parseFloat( $input.val() ),
				slide: function( e, ui ) {
					$input.val( parseFloat( ui.value ) );
					$input.trigger( 'change' );
					$$.find( '.so-wp-slider-value' ).html( ui.value );
				},
			});
			$input.on( 'change', function( event, data ) {
				if ( ! ( data && data.silent ) ) {
					$c.slider( 'value', parseFloat( $input.val() ) );
					$$.find('.so-wp-slider-value').html( $input.val() );
				}
			} );
		} );

		// Conditionally show Background related settings.
			const $background_image = this.$( '.so-field-background_image_attachment' );
			const $background_image_display = this.$( '.so-field-background_display' );
			const $background_image_size = this.$( '.so-field-background_image_size' );
			const $background_image_opacity = this.$( '.so-field-background_image_opacity' );
			const $background_image_alt = this.$( '.so-field-background_image_alt' );

			if (
				$background_image.length &&
				(
					$background_image_display.length ||
					$background_image_size.length ||
					$background_image_opacity.length ||
					$background_image_alt.length
				)
			) {
				var soBackgroundImageVisibility = function() {
					var hasImage = $background_image.find( '[name="style[background_image_attachment]"]' );

					if ( ! hasImage.val() || hasImage.val() == 0 ) {
						hasImage = $background_image.find( '[name="style[background_image_attachment_fallback]"]' );
					}

					if ( hasImage.val() && hasImage.val() != 0 ) {
						$background_image_display.show();
						$background_image_size.show();
						$background_image_opacity.show();
						$background_image_alt.show();
					} else {
						$background_image_display.hide();
						$background_image_size.hide();
						$background_image_opacity.hide();
						$background_image_alt.hide();
					}
				}
				soBackgroundImageVisibility();
				$background_image.find( '[name="style[background_image_attachment]"], [name="style[background_image_attachment_fallback]"]' ).on( 'change', soBackgroundImageVisibility );
				$background_image.find( '.remove-image' ).on( 'click', soBackgroundImageVisibility );
			}

		// Conditionally show Border related settings.
		var $border_color = this.$( '.so-field-border_color' ),
			$border_thickness = this.$( '.so-field-border_thickness' );

		if ( $border_color.length && $border_thickness.length ) {
			var soBorderVisibility = function() {
				if ( $border_color.find( '.so-wp-color-field' ).val() ) {
					$border_thickness.show();
					$border_thickness.show();
				} else {
					$border_thickness.hide();
					$border_thickness.hide();
				}
			}
			soBorderVisibility();
			$border_color.find( '.so-wp-color-field' ).on( 'change', soBorderVisibility );
			$border_color.find( '.wp-picker-clear' ).on( 'click', soBorderVisibility );
		}

		if ( typeof $.fn.select2 == 'function' ) {
			this.$( '.so-select2' ).select2();
		}

		// Allow other plugins to setup custom fields.
		$( document ).trigger( 'setup_style_fields', this );
	}

} );

},{}],31:[function(require,module,exports){
var panels = window.panels, $ = jQuery;

module.exports = Backbone.View.extend( {
	template: _.template( panels.helpers.utils.processTemplate( $( '#siteorigin-panels-builder-widget' ).html() ) ),

	// The cell view that this widget belongs to
	cell: null,

	// The edit dialog
	dialog: null,

	events: {
		'click .widget-edit': 'editHandler',
		'touchend .widget-edit': 'editHandler',
		'click .title h4': 'editHandler',
		'touchend .title h4': 'editHandler',
		'click .actions .widget-duplicate': 'duplicateHandler',
		'click .actions .widget-delete': 'deleteHandler',
		'keyup .actions a': function( e ) {
			panels.helpers.accessibility.triggerClickOnEnter( e );
		},
	},

	/**
	 * Initialize the widget
	 */
	initialize: function () {
		this.listenTo(this.model, 'destroy', this.onModelDestroy);
		this.listenTo(this.model, 'change:values', this.onModelChange);
		this.listenTo( this.model, 'change:styles ', this.toggleVisibilityFade );
		this.listenTo(this.model, 'change:label', this.onLabelChange);
	},

	/**
	 * Render the widget
	 */
	render: function ( options ) {
		options = _.extend( {'loadForm': false}, options );

		this.setElement( this.template( {
			title: _.escape( this.model.getWidgetField( 'title' ) ),
			description: this.model.getTitle(),
			widget_class: _.escape( this.model.attributes.class )
		} ) );

		this.$el.data( 'view', this );

		// Remove any unsupported actions
		if( ! this.cell.row.builder.supports( 'editWidget' ) || this.model.get( 'read_only' ) ) {
			this.$( '.actions .widget-edit' ).remove();
			this.$el.addClass('so-widget-no-edit');
		}
		if( ! this.cell.row.builder.supports( 'addWidget' ) ) {
			this.$( '.actions .widget-duplicate' ).remove();
			this.$el.addClass('so-widget-no-duplicate');
		}
		if( ! this.cell.row.builder.supports( 'deleteWidget' ) ) {
			this.$( '.actions .widget-delete' ).remove();
			this.$el.addClass('so-widget-no-delete');
		}
		if( ! this.cell.row.builder.supports( 'moveWidget' ) ) {
			this.$el.addClass('so-widget-no-move');
		}

		if ( ! this.$('.actions').html().trim().length ) {
			this.$( '.actions' ).remove();
		}

		if( this.model.get( 'read_only' ) ) {
			this.$el.addClass('so-widget-read-only');
		}

		if ( _.size( this.model.get( 'values' ) ) === 0 || options.loadForm ) {
			// If this widget doesn't have a value, create a form and save it
			var dialog = this.getEditDialog();

			// Save the widget as soon as the form is loaded
			dialog.once( 'form_loaded', dialog.saveWidget, dialog );

			// Setup the dialog to load the form
			dialog.setupDialog();
		}

		this.toggleVisibilityFade();

		// Add the global builder listeners
		this.listenTo( this.cell.row.builder, 'after_user_adds_widget', this.afterUserAddsWidgetHandler );

		return this;
	},

	checkIfStyleExists: function( styles, setting ) {
		return typeof styles[ setting ] !== 'undefined' && styles[ setting ] == 'on';
	},

	/**
	 * Toggle Visibility: Check if row is hidden and apply fade as needed.
	 */
	toggleVisibilityFade: function() {
		var styles = this.model.attributes.style;
		if ( typeof styles == 'undefined' ) {
			return;
		}
		if (
			this.checkIfStyleExists( styles, 'disable_widget' ) ||
			this.checkIfStyleExists( styles, 'disable_desktop' ) ||
			this.checkIfStyleExists( styles, 'disable_tablet' ) ||
			this.checkIfStyleExists( styles, 'disable_mobile' ) ||
			this.checkIfStyleExists( styles, 'disable_logged_in' ) ||
			this.checkIfStyleExists( styles, 'disable_logged_out' )
		) {
			this.$el.addClass( 'so-hidden-widget' );
		} else {
			this.$el.removeClass( 'so-hidden-widget' );
		}
	},

	/**
	 * Display an animation that implies creation using a visual animation
	 */
	visualCreate: function () {
		this.$el.hide().fadeIn( 'fast' );
	},

	/**
	 * Get the dialog view of the form that edits this widget
	 *
	 * @returns {null}
	 */
	getEditDialog: function () {
		if ( this.dialog === null ) {
			this.dialog = new panels.dialog.widget( {
				model: this.model
			} );
			this.dialog.setBuilder( this.cell.row.builder );

			// Store the widget view
			this.dialog.widgetView = this;
		}
		return this.dialog;
	},

	/**
	 * Handle clicking on edit widget.
	 */
	editHandler: function () {
		// Create a new dialog for editing this
		if ( ! this.cell.row.builder.supports( 'editWidget' ) || this.model.get( 'read_only' ) ) {
			return this;
		}

		this.getEditDialog().openDialog();
		return this;
	},

	/**
	 * Handle clicking on duplicate.
	 *
	 * @returns {boolean}
	 */
	duplicateHandler: function () {
		// Add the history entry
		this.cell.row.builder.addHistoryEntry( 'widget_duplicated' );

		// Create the new widget and connect it to the widget collection for the current row
		var newWidget = this.model.clone( this.model.cell );

		this.cell.model.get('widgets').add( newWidget, {
			// Add this after the existing model
			at: this.model.collection.indexOf( this.model ) + 1
		} );

		this.cell.row.builder.model.refreshPanelsData();
		return this;
	},

	/**
	 * Copy the row to a cookie based clipboard
	 */
	copyHandler: function(){
		panels.helpers.clipboard.setModel( this.model );
	},

	/**
	 * Handle clicking on delete.
	 *
	 * @returns {boolean}
	 */
	deleteHandler: function () {
		this.visualDestroyModel();
		return this;
	},

	onModelChange: function () {
		// Update the description when ever the model changes
		this.$( '.description' ).html( this.model.getTitle() );
	},

	onLabelChange: function( model ) {
		this.$( '.title > h4' ).text( model.getWidgetField( 'title' ) );
	},

	/**
	 * When the model is destroyed, fade it out
	 */
	onModelDestroy: function () {
		this.remove();
	},

	/**
	 * Visually destroy a model
	 */
	visualDestroyModel: function () {
		// Add the history entry
		this.cell.row.builder.addHistoryEntry( 'widget_deleted' );

		this.$el.fadeOut( 'fast', function () {
			this.cell.row.resizeRow();
			this.model.destroy();
			this.cell.row.builder.model.refreshPanelsData();
			this.remove();
		}.bind(this) );

		return this;
	},

	/**
	 * Build up the contextual menu for a widget
	 *
	 * @param e
	 * @param menu
	 */
	buildContextualMenu: function ( e, menu ) {
		if( this.cell.row.builder.supports( 'addWidget' ) ) {
			menu.addSection(
				'add-widget-below',
				{
					sectionTitle: panelsOptions.loc.contextual.add_widget_below,
					searchPlaceholder: panelsOptions.loc.contextual.search_widgets,
					defaultDisplay: panelsOptions.contextual.default_widgets
				},
				panelsOptions.widgets,
				function ( c ) {
					this.cell.row.builder.trigger('before_user_adds_widget');
					this.cell.row.builder.addHistoryEntry( 'widget_added' );

					var widget = new panels.model.widget( {
						class: c
					} );
					widget.cell = this.cell.model;

					// Insert the new widget below
					this.cell.model.get('widgets').add( widget, {
						// Add this after the existing model
						at: this.model.collection.indexOf( this.model ) + 1
					} );

					this.cell.row.builder.model.refreshPanelsData();

					this.cell.row.builder.trigger('after_user_adds_widget', widget);
				}.bind( this )
			);
		}

		var actions = {};

		if( this.cell.row.builder.supports( 'editWidget' ) && ! this.model.get( 'read_only' ) ) {
			actions.edit = { title: panelsOptions.loc.contextual.widget_edit };
		}

		// Copy and paste functions
		if ( panels.helpers.clipboard.canCopyPaste() ) {
			actions.copy = {title: panelsOptions.loc.contextual.widget_copy};
		}

		if( this.cell.row.builder.supports( 'addWidget' ) ) {
			actions.duplicate = { title: panelsOptions.loc.contextual.widget_duplicate };
		}

		if( this.cell.row.builder.supports( 'deleteWidget' ) ) {
			actions.delete = { title: panelsOptions.loc.contextual.widget_delete, confirm: true };
		}

		if( ! _.isEmpty( actions ) ) {
			menu.addSection(
				'widget-actions',
				{
					sectionTitle: panelsOptions.loc.contextual.widget_actions,
					search: false,
				},
				actions,
				function ( c ) {
					switch ( c ) {
						case 'edit':
							this.editHandler();
							break;
						case 'copy':
							this.copyHandler();
							break;
						case 'duplicate':
							this.duplicateHandler();
							break;
						case 'delete':
							this.visualDestroyModel();
							break;
					}
				}.bind( this )
			);
		}

		// Lets also add the contextual menu for the entire row
		this.cell.buildContextualMenu( e, menu );
	},

	/**
	 * Handler for any action after the user adds a new widget.
	 * @param widget
	 */
	afterUserAddsWidgetHandler: function( widget ) {
		if( this.model === widget && panelsOptions.instant_open ) {
			setTimeout(this.editHandler.bind(this), 350);
		}
	}

} );

},{}],32:[function(require,module,exports){
var $ = jQuery;

var customHtmlWidget = {
	addWidget: function( idBase, widgetContainer, widgetId ) {
		var component = wp.customHtmlWidgets;
		
		var fieldContainer = $( '<div></div>' );
		var syncContainer = widgetContainer.find( '.widget-content:first' );
		syncContainer.before( fieldContainer );

		var widgetControl = new component.CustomHtmlWidgetControl( {
			el: fieldContainer,
			syncContainer: syncContainer,
		} );

		widgetControl.initializeEditor();
		
		// HACK: To ensure CodeMirror resize for the gutter.
		widgetControl.editor.codemirror.refresh();
		
		return widgetControl;
	}
};

module.exports = customHtmlWidget;

},{}],33:[function(require,module,exports){
var customHtmlWidget = require( './custom-html-widget' );
var mediaWidget = require( './media-widget' );
var textWidget = require( './text-widget' );

var jsWidget = {
	CUSTOM_HTML: 'custom_html',
	MEDIA_AUDIO: 'media_audio',
	MEDIA_GALLERY: 'media_gallery',
	MEDIA_IMAGE: 'media_image',
	MEDIA_VIDEO: 'media_video',
	TEXT: 'text',

	addWidget: function( widgetContainer, widgetId ) {
		var idBase = widgetContainer.find( '> .id_base' ).val();
		var widget;

		switch ( idBase ) {
			case this.CUSTOM_HTML:
				widget = customHtmlWidget;
				break;
			case this.MEDIA_AUDIO:
			case this.MEDIA_GALLERY:
			case this.MEDIA_IMAGE:
			case this.MEDIA_VIDEO:
				widget = mediaWidget;
				break;
			case this.TEXT:
				widget = textWidget;
				break
		}

		widget.addWidget( idBase, widgetContainer, widgetId );
	},
};

module.exports = jsWidget;

},{"./custom-html-widget":32,"./media-widget":34,"./text-widget":35}],34:[function(require,module,exports){
var $ = jQuery;

var mediaWidget = {
	addWidget: function( idBase, widgetContainer, widgetId ) {
		var component = wp.mediaWidgets;

		var ControlConstructor = component.controlConstructors[ idBase ];
		if ( ! ControlConstructor ) {
			return;
		}

		var ModelConstructor = component.modelConstructors[ idBase ] || component.MediaWidgetModel;
		var syncContainer = widgetContainer.find( '> .widget-content' );
		var controlContainer = $( '<div class="media-widget-control"></div>' );
		syncContainer.before( controlContainer );

		var modelAttributes = {};
		syncContainer.find( '.media-widget-instance-property' ).each( function() {
			var input = $( this );
			modelAttributes[ input.data( 'property' ) ] = input.val();
		});
		modelAttributes.widget_id = widgetId;

		var widgetModel = new ModelConstructor( modelAttributes );

		var widgetControl = new ControlConstructor({
			el: controlContainer,
			syncContainer: syncContainer,
			model: widgetModel,
		});

		widgetControl.render();

		return widgetControl;
	}
};

module.exports = mediaWidget;

},{}],35:[function(require,module,exports){
var $ = jQuery;

var textWidget = {
	addWidget: function( idBase, widgetContainer, widgetId ) {
		var component = wp.textWidgets;

		var options = {};
		var visualField = widgetContainer.find( '.visual' );
		// 'visual' field and syncContainer were introduced together in 4.8.1
		if ( visualField.length > 0 ) {
			// If 'visual' field has no value it's a legacy text widget.
			if ( ! visualField.val() ) {
				return null;
			}

			var fieldContainer = $( '<div></div>' );
			var syncContainer = widgetContainer.find( '.widget-content:first' );
			syncContainer.before( fieldContainer );

			options = {
				el: fieldContainer,
				syncContainer: syncContainer,
			};
		} else {
			options = { el: widgetContainer };
		}

		var widgetControl = new component.TextWidgetControl( options );
		var wpEditor = wp.oldEditor ? wp.oldEditor : wp.editor;
		if ( wpEditor && wpEditor.hasOwnProperty( 'autop' ) ) {
			wp.editor.autop = wpEditor.autop;
			wp.editor.removep = wpEditor.removep;
			wp.editor.initialize = wpEditor.initialize
		}

		widgetControl.initializeEditor();

		return widgetControl;
	}
};

module.exports = textWidget;

},{}]},{},[18]);
