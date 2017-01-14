/* WordNav.js
* 
* Navigate the sentences and words in Words
* 
* Based on https://github.com/jamestomasino/read_plugin/blob/master/ReadBlock.js
* 
* TODO:
* - Go back a sentence - array of indexes where sentences start?
* - Change max word length - recombine split words (record of which
* words were split) and address each word that is longer than
* the max-word length.
* - ??: Add delay for paragraph?
* - Reset values non-destructively
* - Split Qeue into
*   Words and...
*   Word(s) Navigator/Trotter/Transporter/Traveler/Traverse/Walker/Explorer
*/

(function (root, wNavFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {  // amd if possible
        // AMD. Register as an anonymous module.
        define( [], function () { return ( root.WordNav = wNavFactory() ) });
    } else if (typeof module === 'object' && module.exports) {  // Node-ish next
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = wNavFactory();
    } else {  // Global if nothing else
        // Browser globals
        root.WordNav = wNavFactory( Fragment, root );  // root.sentences is undefined :P Not sure what to provide there
    }
}(this, function () {

    "use strict";


    // TODO: Do this without needing a new object each time
    var WordNav = function () {
    /* {}
    * 
    * 
    */
        var wNav = {};

        // Contains .text, .sentenceFragments, .positions
        wNav.words 		= null;

        wNav.index 		= 0;
        wNav.index2 	= [ 0, 0 ];
        wNav.position 	= { sentence: 0, fragment: 0 };

        // ==== Internal ==== \\
        wNav._progress 	= 0;
        var sentences 	= null,
        	positions 	= null;


       	wNav.process = function ( words ) {
       		if (!words) { console.error('WordNav needs dataz to .process(). You gave it dis:', words); }
	        wNav.words 	= words;
	        sentences 	= words.sentenceFragments;
	    	positions 	= words.positions;

	       return wNav;
       	};

        // ========= RUNTIME: TRAVELING THE WORDS/SENTENCES (for external use) ========= \\
        wNav.getFragment = function ( posOrIndex ) {
        // Either a position or an index can be passed in
            var pos = null;
            if ( typeof pos === 'number' ) {
                pos = positions[ posOrIndex ]
            } else {
                pos = posOrIndex;
            }

            var frag = sentences[ pos.sentence ].fragments[ pos.fragment ];
            return frag;
        };

        wNav.getIndex = function ( posToTest ) {
            // console.log('position to test for:', posToTest)
            // console.log('position:', posToTest, 'positions:', positions)
            var index = positions.findIndex( function matchPositionToIndex( pos ) {
                // console.log( pos );
                var sent = pos.sentence === posToTest.sentence,
                    frag = pos.fragment === posToTest.fragment;
                return sent && frag;
            });
            // console.log( 'index found:', index)
            return index;
        };

        wNav.getPosition = function ( index ) {
            return positions[ index ];
        };


        wNav.normalizeIndex = function ( index ) {
            index = Math.min( index, positions.length - 1 );  // max
            return Math.max( index, 0 );  // min
        };

        // wNav.getSentence = function ( pos ) {
        //     var sent = sentences[ pos.sentence ];
        //     return sent;
        // };

        // wNav.getWord = function ( pos ) {
        //     var frag = sentences[ pos.sentence ].fragments[ pos.fragment ];
        //     return frag;
        // };

        wNav.next = wNav.nextWord = function () {

            wNav.index 	= Math.min( wNav.index + 1, positions.length - 1 );
            var pos     = positions[ wNav.index ];
            // Unfortunately, this means that .index doesn't exactly represent what was just shown...
            // ??: What up with that?
            wNav.position = { sentence: pos.sentence, fragment: pos.fragment };

            return wNav.getFragment( wNav.position );
        };

        wNav.prev = wNav.prevWord = function () {
            wNav.index  = Math.max( wNav.index - 1, 0 );
            var pos     = positions[ wNav.index ];
            wNav.position = { sentence: pos.sentence, fragment: pos.fragment };
            return wNav.getFragment( wNav.position );
        };

        wNav.current = wNav.currentWord = function() {
            // Make sure nothing's off about the index
            wNav.index    = wNav.normalizeIndex( wNav.index )
            var pos     = positions[ wNav.index ];
            wNav.position = { sentence: pos.sentence, fragment: pos.fragment };
            return wNav.getFragment( wNav.position );
        };

        wNav.nextSentence = function () {
            var pos     = wNav.position,
                senti   = pos.sentence + 1;

            pos.sentence = Math.min( senti, (sentences.length - 1) );
            pos.fragment = 0;
            wNav.index     = wNav.getIndex( pos );

            // console.log( 'sentence:');//, pos, wNav.index );

            // // Possibly faster method to explore if optimization becomes an issue:
            // // If there's no next sentence
            // if ( senti >= sentences.length ) {
            //     // Go to the start of the last sentence
            //     var diff = wNav.position.fragment;
            //     wNav.position.fragment = 0;
            //     wNav.index -= diff;
            //     // ?? Stay at the current word instead?
            // } else {
            //     wNav.position.sentence += 1;
            //     wNav.position.fragment = 0;
            //     wNav.index = wNav.getIndex( wNav.position );
            // }

            return wNav.getFragment( wNav.position );
        };  // End wNav.nextSentence()

        wNav.prevSentence = function () {
            var pos     = wNav.position,
                senti   = pos.sentence;

            // If we're in the middle of a sentence, go back to the
            // beginning the sentence. Otherwise, go to the previous
            // sentence. ??: Should the behavior really be here?
            if ( pos.fragment === 0 ) { senti -= 1; }
                
            pos.sentence = Math.max( senti, 0 );
            pos.fragment = 0;
            wNav.index     = wNav.getIndex( pos );

            return wNav.getFragment( wNav.position );
        };  // End wNav.prevSentence()

        wNav.currentSentence = function () {
            var pos     = wNav.position,
                senti   = pos.sentence;

            senti = Math.min( senti, (sentences.length - 1) );
            senti = Math.max( senti, 0 );
            pos.sentence = senti;
            pos.fragment = 0;
            wNav.index     = wNav.getIndex( pos );

            return wNav.getFragment( wNav.position );
        };  // End wNav.currentSentence()

        wNav.restart = function () {
            // Will be normalized by the next operation called (next, prev, current)
            wNav.index    = 0;
            wNav.position = { sentence: 0, fragment: 0 };
            return wNav;
        };


        wNav.goToWord = function ( index ) {
            wNav.index    = wNav.normalizeIndex( index );
            wNav.position = positions[ index ];
            return wNav.getFragment( wNav.position );
        };  // End wNav.goToWord()


        wNav.goToSentence = function ( index ) {
            index = wNav.normalizeIndex( index );

            var pos      = positions[ index ];
            pos.fragment = 0;

            // Update both current position and current index
            wNav.position  = pos;
            wNav.index     = wNav.getIndex( pos );

            return wNav.getFragment( pos );
        };  // End wNav.goToSentence()


        // TODO: Go back whole words and sentences at a time
        wNav.goTo = function ( playbackObj ) {
        // .type = 'index', 'word', or 'sentence'
        // .amount = int
        // Not sure what argument to pass in.
        // 'previous sentence'? 'next sentence'? 'section of document'? An index number?
            var type    = playbackObj.type,
                amount  = playbackObj.amount;
            if ( type === 'index' || type === 'word' ) {
                wNav.index = amount;
            } else if ( type === 'sentence' ) {

            }
            // TODO: (perhaps) wNav[ type ] = amount;
            return wNav;
        };


        wNav.getProgress = function () {
            wNav._progress = wNav.index / positions.length;
            return wNav._progress;
        };

        wNav.getLength = function () {
            return positions.length;
        };

        return wNav;
    };  // End WordNav() -> {}

    return WordNav;
}));
