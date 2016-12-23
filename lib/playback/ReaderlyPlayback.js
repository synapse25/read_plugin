/* ReaderlyPlayback.js
* 
* Pause, play, rewind, fast-forward, and scrub
* controls. Includes progress bar. Name is not
* accurate, but it is clear and recognizable.
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/Read.js
*/

(function (root, playbackFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( ['jquery'], function ( jquery ) {
        	return ( root.ReaderlyPlayback = playbackFactory( jQuery ) );
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = playbackFactory( require('jquery') );
    } else {
        // Browser globals
        root.ReaderlyPlayback = playbackFactory( root.jQuery );
    }
}(this, function ( $ ) {

	"use strict";

	var ReaderlyPlayback = function ( timer, mainDisplay ) {

		var rPly = {};

		// Why is this here? Because it's going to be a rewind/fastforward
		// control in the future
		var scrubberStr = '<div id="__rdly_scrubber"></div>';
		// Go in .rdly-bar-center .rdly-below?
		// 'play' and 'pause' are also triggered by clicking on the text
		var controlsStr = '<div id="__rdly_playback_controls">\
						<button id="__rdly_rewind_sentence" class="__rdly-playback-button"></button>\
						<button id="__rdly_rewind_word" class="__rdly-playback-button"></button>\
						<button id="__rdly_pause" class="__rdly-playback-button"></button>\
						<button id="__rdly_play" class="__rdly-playback-button"></button>\
						<button id="__rdly_fastforward_word" class="__rdly-playback-button"></button>\
						<button id="__rdly_fastforward_sentence" class="__rdly-playback-button"></button>\
					</div>';

		var restartStr = '<button id="__rdly_restart" class="__rdly-big-menu-button">Re</button>'


		var scrubber, controls, restart;



		$(timer).on('playing', rPly._pause);
		rPly._play = function () {
			// Change the pause element and play element
			return rPly;
		}


		$(timer).on('paused', rPly._pause);
		$(timer).on('stopped', rPly._pause);
		rPly._pause = function () {
			// Change the pause element and play element
			return rPly;
		}


		rPly._togglePlayPause = function () {
			timer.togglePlayPause();
			return rPly;
		};


		rPly._restart = function () {
			timer.restart()
		};


		rPly._addEvents = function () {
			$(mainDisplay.nodes.textElements).on( 'touchend click', rPly._togglePlayPause );
			$(restart).on( 'touchend click', rPly._restart );
			return rPly;
		};


		rPly._init = function ( mainDisplay ) {

			scrubber = $(scrubberStr)[0];
			controls = $(controlsStr)[0];
			restart  = $(restartStr)[0];

			var nodes = mainDisplay.nodes;
			$(scrubber).appendTo( nodes.percentDone );
			$(controls).appendTo( nodes.bar );
			$(restart).appendTo( nodes.left );

			rPly._addEvents();

			return rPly;
		};



		// =========== ADD NODE, ETC. =========== \\
		// Don't show at start, only when prompted
		rPly._init( mainDisplay );

		// To be called in a script
		return rPly;
	};  // End ReaderlyPlayback() -> {}

	// To put on the window object, or export into a module
    return ReaderlyPlayback;
}));