/* ReaderlyDisplay.js
* 
* Just the Readerly text display, including areas for
* future buttons. No settings, etc.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
* 
* NOTES:
* - name - ReaderlyBar? ReaderlySee?
*/

(function (root, displayFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery'], function ( jquery ) {
        	return ( root.ReaderlyDisplay = displayFactory( jquery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = displayFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReaderlyDisplay = displayFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var ReaderlyDisplay = function ( timer, parentNode ) {

		var rDis = {};

		rDis._toClose = [];


		/*jshint multistr: true */
		//  TODO: Change (almost) all these to id's
		var htmlStr = '<div id="__rdly">\
	<div id="__rdly_above_bar" class="__rdly-main-section"></div>\
	<div id="__rdly_bar" class="__rdly-main-section">\
		<div class="__rdly-bar-section __rdly-bar-left"></div>\
		<div class="__rdly-bar-section __rdly-bar-center __rdly-transform-centered">\
			<div id="__rdly_above_text_elements"></div>\
			<div id="__rdly_left_text_elements"></div>\
			<div id="__rdly_text_elements"></div>\
			<div id="__rdly_right_text_elements"></div>\
			<div id="__rdly_below_text_elements"></div>\
		</div>\
		<div class="__rdly-bar-section __rdly-bar-right">\
			<button id="__rdly_close" class="__rdly-sup-menu-button">X</button>\
		</div>\
	</div>\
	<div id="__rdly_below_bar" class="__rdly-main-section __rdly-hidden"></div>\
</div>';

		var readerly, textElems;//, textNode, loading, percentDone;

		// =========== HOOKS =========== \\

		rDis.addToClosingQueue = function ( newObjWithCloseFunc ) {
			// TODO: Prevent duplicates
			rDis._toClose.push( newObjWithCloseFunc );
			return rDis;
		};



		// =========== RUNTIME ACTIONS =========== \\

		rDis.close = function () {
		// This is where everything gets closed, paused, put away
			rDis.hide();
			for (var closei = 0; closei < rDis._toClose.length; closei++) {
				rDis._toClose[ closei ].close();
			};
			return rDis;
		};


		rDis.show = function () {
			$(readerly).slideDown( 200 );
			return rDis;
		};


		rDis.hide = function () {
			$(readerly).slideUp( 200 );
			return rDis;
		};


		rDis.destroy = function () {
			$(readerly).remove();
			return rDis;
		};



		// =========== INITIALIZE =========== \\

		rDis._addEvents = function () {
			$('#__rdly_close').on( 'click', rDis.close );
			return rDis;
		};


		rDis._addNodes = function ( parentNode ) {

			if (!parentNode) { parentNode = $(document.body)[0] }

			readerly = rDis._readerlyNode = $(htmlStr)[0];
			$(readerly).appendTo( parentNode );

			// ??: Is this useful?
			rDis.nodes 	= {
				readerly: 		readerly,
				above: 			$(readerly).find('#__rdly_above_bar')[0],
				bar: 			$(readerly).find('#__rdly-bar')[0],
				barLeft: 		$(readerly).find('.__rdly-bar-left')[0],
				barCenter: 		$(readerly).find('.__rdly-bar-center')[0],
				aboveText: 		$(readerly).find('#__rdly_above_text_elements')[0],
				leftOfText: 	$(readerly).find('#__rdly_left_text_elements')[0],
				textElements: 	$(readerly).find('#__rdly_text_elements')[0],
				rightOfText: 	$(readerly).find('#__rdly_right_text_elements')[0],
				belowText: 		$(readerly).find('#__rdly_below_text_elements')[0],
				barRight: 		$(readerly).find('.__rdly-bar-right')[0],
				below: 			$(readerly).find('#__rdly_below_bar')[0]
			}

			return rDis;
		};  // End rDis._addNodes()


		rDis._init = function ( parentNode ) {
			if ( !$('#__rdly')[0] ) {
				rDis._addNodes( parentNode )
					._addEvents()
					// This is in the wrong place
					// Reconfig needed. This should construct timer?
					// Create parent object instead?
					.addToClosingQueue( timer );
				// This should not be visible until it's .show()n
				$('#__rdly').hide(0);
			}
			return rDis;
		};


		// =========== ADD NODE, ETC. =========== \\
		// Don't show at start, only when prompted
		rDis._init( parentNode );

		// To be called in a script
		return rDis;
	};  // End ReaderlyDisplay() -> {}

	// To put on the window object, or export into a module
    return ReaderlyDisplay;
}));
