/* ReaderlySettings.js
* 
* Should manage settings. Don't put them directly in here
* one by one. This should have functions that allow this
* object to be extended.
* 
* TODO:
* ??: Add events/buttons for things like opening and closing settings?
*/

(function (root, settingsFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery'], function ( jquery ) {
        	return ( root.ReaderlySettings = settingsFactory( jquery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = settingsFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReaderlySettings = settingsFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var ReaderlySettings = function ( timer, mainDisplay ) {

		var rSet = {};

		rSet.settings = {};

		rSet.nodes 				= {};
		rSet.menuNodes 			= {};
		rSet._destroyTabEvent 	= null;
		rSet._changeIDsEvent 	= null;

		rSet._isOpen 			= false;

		var opener, container, menus, tabs;


		// =========== ALLOW EXTENTIONS OF SETTINGS =========== \\

		// ---- Add a tab to go with the settings ---- \\
		rSet._hideLoneTab = function () {
		/* Make sure that if there's only one settings element,
		* the tabs don't show
		*/
			if ( Object.keys(rSet.menuNodes).length <= 1 ) {
				$(tabs).addClass( '__rdly-hidden' );
			} else {
				$(tabs).removeClass( '__rdly-hidden' );
			}
			return rSet;
		};

		rSet._showMenu = function ( evnt ) {
			var id 		 = evnt.target.id,
				$menus 	 = $('.__rdly-settings-menu'),
				$tabs 	 = $('.__rdly-settings-tab'),
				thisMenu = rSet.menuNodes[ id ],
				$thisTab = $tabs.find('#' + id + '_tab');

			// Hide all, then show this one
			$menus.addClass( '__rdly-hidden' );
			$(thisMenu).removeClass( '__rdly-hidden' );
			// Same type of thing, showing this tab as active
			$tabs.removeClass( '__rdly-active-ui' );
			$thisTab.addClass( '__rdly-active-ui' );

			return rSet;
		};

		rSet.destroyMenu = function ( evnt ) {
			var tabID = evnt.target.id,  // jQuery element? Need to get [0] item?
				itemNode = 

			$(rSet.menuNodes[ tabID ]).remove();
			rSet.menuNodes[ tabID ] = null;
			$('#' + tabID ).remove();

			return rSet;
		};

		rSet._addTab = function ( id, tabText ) {
			var html = '<div id="' + id + '_tab" class="__rdly-settings-tab">' + tabText + '</div>',
				$tab = $( html );
			$tab.appendTo( tabs );
			rSet._hideLoneTab();

			$tab.on( 'touchend click', rSet._showMenu )

			return $tab;
		};

		rSet.addMenu = function ( menu ) {// node, tabText ) {

			var node 	= menu.node,
				tabText = menu.tabText;

			var id = node.id;

			// Abort if already exists
			if ( rSet.menuNodes[ id ] ) {
				// Not sure how else to handle this gracefully...
				// Just refuse to add something with this ID? That seems cruel.
				console.warn( "A settings menu of this id is already in here. Please pick a different id or use someManager.destroyMenu( 'someID' ) to destroy it. Existing menu:", rSet.menuNodes[ id ] );
				return node;
			}

			// Otherwise keep going
			var $newNode = $(node);
			$newNode.addClass( '__rdly-settings-menu' );

			$(menus).append( $newNode );
			$newNode[0].addEventListener( 'destroyOneSettingsMenu', rSet._removeMenu, false );
			// rSet.menuNodes[ id ] = node;
			rSet.settings[ menu.id ] = menu;

			var $tab = rSet._addTab( id, tabText );

			return rSet;
		};  // End rSet.addMenu()


		// =========== BASE OBJECT =========== \\
		rSet._open = function () {
			$(container).addClass( '__rdly-settings-open' );
			$(opener).addClass( '__rdly-active-ui' );  // different style
			rSet._isOpen = true;
			return rSet;
		};

		rSet.close = function ( evnt ) {
		// Allowed to be called externally
			$(container).removeClass( '__rdly-settings-open' );
			$(opener).removeClass( '__rdly-active-ui' );  // different style
			rSet._isOpen = false;
			return rSet;
		};

		rSet._toggleOpenClose = function () {
			if ( $(container).hasClass( '__rdly-settings-open' ) ) {
				rSet.close();
			} else {
				rSet._open();
			}
			return rSet;
		};

		rSet._onBlur = function ( evnt ) {
			var parent = $(evnt.target).parents('#__rdly_settings_container')[0]
			if ( !parent ) {
				// If they've clicked the "open settings" button, toggle
				if ( evnt.target === rSet.nodes._openSettings ) {
					rSet._toggleOpenClose();
				// Otherwise they're just getting out of the settings menu, so close
				// ??: Allow users to click other buttons while settings are open?
				// They may realize they want to pause while they're changing the
				// settings, so maybe not.
				} else {
					rSet.close();
				}
			}
			return rSet;
		};

		rSet._addEvents = function () {
			// $('#__rdly').on( 'touchend click', rSet._onBlur );  // See question above
			$(opener).on( 'touchend click', rSet._toggleOpenClose );
			return rSet;
		};


		rSet._addBase = function ( mainDisplay ) {
			var $open = $('<button id="__rdly_open_settings" class="__rdly-big-menu-button">Set</button>'),
				$cont = $('<div id="__rdly_settings_container"></div>'),
				$taby = $('<div id="__rdly_settings_tabs"></div>'),
				$sets = $('<div id="__rdly_settings_menus"></div>');

			var left  = mainDisplay.nodes.left,
				below = mainDisplay.nodes.below;

			var nodes 	= rSet.nodes;
			opener 		= nodes._openSettings 	 	= $open.prependTo( left )[0];
			container 	= nodes._settingsContainer 	= $cont.prependTo( below )[0];
			tabs 		= nodes._tabs 			 	= $taby.appendTo( $cont )[0];
			menus 		= nodes._menus 		 		= $sets.appendTo( $cont )[0];

			return rSet;	
		};

		rSet._destroy = function () {
			$('#__rdly_open_settings').remove();
			$('#__rdly_settings_container').remove();

			$('#__rdly').off( rSet._onBlur );

			return rSet;
		};

		rSet._init = function ( mainDisplay ) {

			// Not sure yet why you'd want to rebuild this object from
			// scratch, but going to offer the option for now
			if ( $('#__rdly_open_settings') ) { rSet._destroy(); }

			rSet._addBase( mainDisplay )
				._addEvents();

			mainDisplay.addToClosingQueue( rSet );

			return rSet;
		};



		// =========== CREATE =========== \\
		// Don't show at start, only when prompted
		rSet._init( mainDisplay );

		// To be called in a script
		return rSet;
	};  // End ReaderlySettings() -> {}

	// To put on the window object, or export into a module
    return ReaderlySettings;
}));
