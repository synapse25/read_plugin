/* main.js
* 
* TODO:
* - Cache whole page text when possible/read
* - Cache options and prevent them from being reset on
* 	close of extension
* - Cache reading progress?
* - Trigger pause on clicking of central element, not
* 	just text
*/

(function(){

	// var r; // Read Object
	var readOptions = {
		"wpm": 300,
		"slowStartCount": 5,
		"sentenceDelay": 2.5,
		"otherPuncDelay": 1.5,
		"shortWordDelay": 1.3,
		"longWordDelay": 1.4
	};

	var queue 		= new Queue(),
		timer 		= new ReaderlyTimer( readOptions ),
		mainDisplay = new ReaderlyDisplay( timer ),
		playback 	= new ReaderlyPlayback( timer, mainDisplay ),
		settings 	= new ReaderlySettings( timer, mainDisplay ),
		speed 		= new SpeedSettings( timer, settings );

	$(timer).on( 'starting', function showLoading() {
		mainDisplay.wait();
	})


	function playReadContent ( text ) {
		// TODO: If there's already a queue, start where we left off
		queue.process( text );
		timer.start( queue );
		return true;
	}


	chrome.extension.onMessage.addListener(function (request, sender, sendResponse) {

		mainDisplay.show();
		mainDisplay.wait();

		var func = request.functiontoInvoke;
		if ( func === "readSelectedText" ) {
			playReadContent( request.selectedText );
		} else if ( func === "readFullPage" ) {
			var getArticle = $.get( 'https://readparser.herokuapp.com/?url=' + document.URL );
			getArticle.success(function( result ) {
				playReadContent( result );
			}).error(function( jqXHR, textStatus, errorThrown ) {
				var text = '';
				var elements = $('p, li, h1, h2, h3, h4, h5, h6, span, pre');
				elements.each(function(index, element) {
					element = $(element);
					var elementText = element
						.clone()
						.children('sup')
						.remove()
						.end()
						.text()
						.trim();
					if (elementText.length >= 60)
						if (!(element.tagName === 'LI' && elementText.includes('    ')))
							text += " " + elementText;
				});  // end for each desired element
				playReadContent(text);
			});  // end getArticle
		}
	});

})();
