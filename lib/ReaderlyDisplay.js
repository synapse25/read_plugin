/* ReaderlyDisplay.js
* 
* Just the Readerly text display, including areas for
* future buttons. No settings, etc.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
* 
* NOTES:
* - name - ReaderlyBar? ReaderlySee?
* 
* TODO:
* - Consider prepending main element as opposed to appending it. Possibly
* 	easer for screen readers to find more quickly.
*/

(function (root, displayFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery', 'core-CSS', 'settings/noui-CSS'], function ( jquery, nouiCSS ) {
        	return ( root.ReaderlyDisplay = displayFactory( jquery, nouiCSS ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = displayFactory( require('jquery'), require('./core-CSS'), require('./settings/noui-CSS') );
    } else {
        // Browser globals
        root.ReaderlyDisplay = displayFactory( root.jQuery, root.nouiCSS );
    }
}(this, function ( $, coreCSSstr, nouiCSSstr ) {

	"use strict";

	var ReaderlyDisplay = function ( timer, parentNode ) {

		var rDis = {};

		rDis._toClose = [];


		var iframeStr = '<iframe id="__rdly_iframe" title="Readerly article reader."></iframe>';

		var cssStr = '<style>' + coreCSSstr + '\n' + nouiCSSstr + '</style>';

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

		var readerly, textElems, $iframe;

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
			$(readerly).slideDown( 200, rDis.update );
			return rDis;
		};


		rDis.hide = function () {
			$(readerly).slideUp( 200, rDis.update );
			return rDis;
		};


		rDis.destroy = function () {
			$(readerly).remove();
			return rDis;
		};


		// iframe element
		rDis.resizeIframe = function () {
			$iframe[0].style.height = readerly.scrollHeight + 'px';
			return rDis;
		};


		rDis.update = function () {
		// Callable from outside to have the display reset what it needs to reset
			rDis.resizeIframe();
			return rDis;
		};



		// =========== INITIALIZE =========== \\

		rDis._addEvents = function () {
			$('#__rdly_close').on( 'click', rDis.close );
			$(readerly).on( 'mousedown mouseup mousemove', rDis.update );
			$(window).on( 'resize', rDis.update );
			// Event for content zooming?
			return rDis;
		};


		rDis._addNodes = function ( parentNode ) {

			if (!parentNode) { parentNode = $(document.body)[0] }

			$iframe = $(iframeStr);
			$iframe.appendTo( parentNode );

			var doc  = $iframe[0].contentDocument;

			readerly = rDis._readerlyNode = $(htmlStr)[0];
			$(readerly).appendTo( doc.body );

			// STYLES
			var $styles = $(cssStr);
			$styles.appendTo( doc.head );

			// ??: Is this useful?
			rDis.nodes 	= {
				doc: 			doc,
				head: 			doc.head,
				body: 			doc.body,
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
			if ( !$('#__rdly_iframe')[0] ) {
				rDis._addNodes( parentNode )
					._addEvents()
					// This is in the wrong place
					// Reconfig needed. This should construct timer?
					// Create parent object instead?
					.addToClosingQueue( timer );
				// This should not be visible until it's .show()n
				$(readerly).hide(0, rDis.update )
				// $('#__rdly_iframe').hide(0);
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
