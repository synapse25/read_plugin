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
        	return ( root.ReaderlyDisplay = displayFactory( jQuery ) );
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

		/*jshint multistr: true */
		//  TODO: Change (almost) all these to id's
		var htmlStr = '<div id="__rdly">\
						<div id="__rdly_above_bar">\
							<div id="__rdly_progress">\
								<div id="__rdly_percent_done"></div>\
							</div>\
						</div>\
						<div id="__rdly_bar">\
							<div class="__rdly-bar-section __rdly-bar-left"></div>\
							<div class="__rdly-bar-section __rdly-bar-center __rdly-transform-centered">\
								<div class="__rdly-above"></div>\
								<div class="__rdly-text-elements">\
									<div class="__rdly-indicator __rdly-transform-centered"></div>\
									<div class="__rdly-text __rdly-transform-centered"></div>\
								</div>\
								<div class="__rdly-loading __rdly-hidden"></div>\
								<div class="__rdly-below"></div>\
							</div>\
							<div class="__rdly-bar-section __rdly-bar-right">\
								<button id="__rdly_close" class="__rdly-sup-menu-button">X</button>\
							</div>\
						</div>\
						<div id="__rdly_below_bar"></div>\
					</div>';

		var whiteSpaceRegexp = /[\n\r\s]/;

		var readerly, textElems, textNode, loading, percentDone;



		// =========== RUNTIME ACTIONS =========== \\

		rDis.show = function () {
			$(readerly).slideDown( 200 );
			return rDis;
		};


		rDis.hide = function () {
			$(readerly).slideUp( 200 );
			return rDis;
		};


		rDis.close = function () {
			// This is where /all/ the closing for /everything/ happens
			rDis.hide();
			timer.pause();
		};


		rDis.hideText = function () {
			$(textElems).addClass('__rdly-hidden');
			return rDis;
		};


		rDis.showText = function () {
			$(textElems).removeClass('__rdly-hidden');
			return rDis;
		};


		rDis.wait = function () {
			rDis.hideText();
			$(loading).addClass('__rdly-rotating');
			$(loading).removeClass('__rdly-hidden');
			return rDis;
		};


		rDis.stopWaiting = function () {
			$(loading).addClass('__rdly-hidden');
			$(loading).removeClass('__rdly-rotating');
			rDis.showText();
			return rDis;
		};


		rDis.clear = function () {
			$(textNode).html("");
		};


		rDis.destroy = function () {
			$(readerly).remove();
			return rDis;
		};



		// =========== INITIALIZE =========== \\

		rDis._showNewFragment = function ( evnt, timer, fragment ) {
			// TOOD: Deal with line braeks in Queue instead
			var chars = fragment.chars;
			if ( !whiteSpaceRegexp.test(chars) ) {
				$(textNode).html( chars );
				rDis.stopWaiting();
			}
			// return text;
			return rDis;
		};


		rDis._showProgress = function ( evnt, timer, fraction ) {
			var percent = fraction * 100;
			$(percentDone).css('width', percent + '%' );
		};


		rDis._addEvents = function () {
			$(timer).on( 'newWordFragment', rDis._showNewFragment );
			$(timer).on( 'progress', rDis._showProgress );
			$('#__rdly_close').on( 'click', rDis.close );
			return rDis;
		};


		rDis._addNodes = function ( parentNode ) {

			if (!parentNode) { parentNode = $(document.body)[0] }

			readerly = rDis._readerlyNode = $(htmlStr)[0];
			$(readerly).appendTo( parentNode );

			textElems  	= $(readerly).find('.__rdly-text-elements')[0];
			textNode  	= $(readerly).find('.__rdly-text')[0];
			loading  	= $(readerly).find('.__rdly-loading')[0];
			percentDone = $(readerly).find('#__rdly_percent_done')[0];

			// ??: Is this useful?
			rDis.nodes 	= {
				readerly: 		readerly,
				above: 			$(readerly).find('#__rdly_above_bar')[0],
				progress: 		$(readerly).find('#__rdly_progress')[0],
				percentDone: 	percentDone,
				bar: 			$(readerly).find('#__rdly-bar')[0],
				left: 			$(readerly).find('.__rdly-bar-left')[0],
				center: 		$(readerly).find('.__rdly-bar-center')[0],
				indicator: 		$(readerly).find('.__rdly-indicator')[0],
				textElements: 	textElems,
				text: 			textNode,
				loading: 		loading,
				right: 			$(readerly).find('.__rdly-bar-right')[0],
				below: 			$(readerly).find('#__rdly_below_bar')[0]
			}

			return rDis;
		};  // End rDis._addNodes()


		rDis._init = function ( parentNode ) {
			if ( !$('#__rdly')[0] ) {
				rDis._addNodes( parentNode );
				rDis._addEvents();
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
