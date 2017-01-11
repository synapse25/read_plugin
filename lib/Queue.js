/* Queue.js
* 
* Builds the queue of fragment object to be served one at
* a time by the timer/player/reader.
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
* - Split queue into
*   Words and...
*   Word(s) Navigator/Trotter/Transporter/Traveler/Traverse/Walker/Explorer
* 
*/

(function (root, qFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {  // amd if possible
        // AMD. Register as an anonymous module.
        define( ['lib/Fragment', 'sbd'], function (Fragment, sbd) { return (root.Queue = qFactory(Fragment, sbd)); });
    } else if (typeof module === 'object' && module.exports) {  // Node-ish next
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = qFactory( require('./Fragment.js'), require('sbd') );
    } else {  // Global if nothing else
        // Browser globals
        root.Queue = qFactory( Fragment, root );  // root.sentences is undefined :P Not sure what to provide there
    }
}(this, function ( Fragment, sentenceParser ) {

    "use strict";

    var wordRegex = /([^\s\-\—\/]+[\-\—\/]?|[\r\n]+)/g;
    var presuf = /^(\W*)(anti|auto|ab|an|ax|al|as|bi|bet|be|contra|cat|cath|cir|cum|cog|col|com|con|cor|could|co|desk|de|dis|did|dif|di|eas|every|ever|extra|ex|end|en|em|epi|evi|func|fund|fin|hyst|hy|han|il|in|im|ir|just|jus|loc|lig|lit|li|mech|manu|man|mal|mis|mid|mono|multi|mem|micro|non|nano|ob|oc|of|opt|op|over|para|per|post|pre|peo|pro|retro|rea|re|rhy|should|some|semi|sen|sol|sub|suc|suf|super|sup|sur|sus|syn|sym|syl|tech|trans|tri|typo|type|uni|un|van|vert|with|would|won)?(.*?)(weens?|widths?|icals?|ables?|ings?|tions?|ions?|ies|isms?|ists?|ful|ness|ments?|ly|ify|ize|ise|ity|en|ers?|ences?|tures?|ples?|als?|phy|puts?|phies|ry|ries|cy|cies|mums?|ous|cents?)?(\W*)$/i;
    var vowels = 'aeiouyAEIOUY'+
        'ẚÁáÀàĂăẮắẰằẴẵẲẳÂâẤấẦầẪẫẨẩǍǎÅåǺǻÄäǞǟÃãȦȧǠǡĄąĀāẢảȀȁȂȃẠạẶặẬậḀḁȺⱥ'+
        'ǼǽǢǣÉƏƎǝéÈèĔĕÊêẾếỀềỄễỂểĚěËëẼẽĖėȨȩḜḝĘęĒēḖḗḔḕẺẻȄȅȆȇẸẹỆệḘḙḚḛɆɇɚɝÍíÌìĬĭÎîǏǐÏ'+
        'ïḮḯĨĩİiĮįĪīỈỉȈȉȊȋỊịḬḭIıƗɨÓóÒòŎŏÔôỐốỒồỖỗỔổǑǒÖöȪȫŐőÕõṌṍṎṏȬȭȮȯȰȱØøǾǿǪǫǬǭŌōṒṓ'+
        'ṐṑỎỏȌȍȎȏƠơỚớỜờỠỡỞởỢợỌọỘộƟɵÚúÙùŬŭÛûǓǔŮůÜüǗǘǛǜǙǚǕǖŰűŨũṸṹŲųŪūṺṻỦủȔȕȖȗƯưỨứỪừ'+
        'ỮữỬửỰựỤụṲṳṶṷṴṵɄʉÝýỲỳŶŷY̊ẙŸÿỸỹẎẏȲȳỶỷỴỵʏɎɏƳƴ';
    var c = '[^'+vowels+']';
    var v = '['+vowels+']';
    var vccv = new RegExp('('+v+c+')('+c+v+')', 'g');
    var simple = new RegExp('(.{2,4}'+v+')'+'('+c+')', 'g');  // Currently not used
    var puncSplit = /(.+?)(\.[^\w]\b|,[^\w]\b)(.+?)/;


    // TODO: Do this without needing a new object each time
    var Queue = function () {
    /* 
    * 
    * 
    */
        var qu = {};

        // ========= (for external use) ========= \\
        qu.text      = null;  // Is this useful?
        qu.sentences = null;
        qu.sentenceFragments = [];
        qu.fragments = [];
        qu.index     = -1;
        qu.index2    = [ 0, -1 ];
        // Since data will be in arrays of sentences with words, this will
        // tell us which index corresponds to which sentence/word position
        qu.positions = [];
        qu.position  = { sentence: 0, fragment: 0 };
        qu._progress = 0;


        // ========= BUILD THE QUEUE (internal) ========= \\
        qu.process = function ( text ) {

            // Cleanup
            qu.text       = text;
            var sentences = qu.sentences = sentenceParser.sentences( text, {
                'sanitize' : true, // No html passed in
            });

            var sFrags   = qu.sentenceFragments = [];  // Array of arrays of fragment objects (for now)
            qu.fragments = [];
            qu.index     = -1;
            qu.index2    = [ 0, -1 ];
            qu.positions = [];

            for ( let senti = 0; senti < sentences.length; senti++ ) {
                let sentence            = sentences[senti],
                    fragmentedWithPos   = qu._processSentence( sentence, senti );
                sFrags.push( fragmentedWithPos );
            }

            return qu;
        };  // End qu.process()

        qu._processSentence = function ( text, sentenceIndex ) {

            var sentence    = [],
                positions   = qu.positions,
                frags       = qu.fragments;

            // Build word chain
            var rawWords    = text.match(wordRegex),
                fragIndex   = 0;

            var pos         = positions.length;  // 1 past the previous index

            // Extra splits on odd punctuation situations
            let i = 0;
            while (i < rawWords.length) {
                let w = rawWords[i];
                w = qu._puncBreak(w);
                let subWords = w.match(wordRegex);
                let j = 0;
                while (j < subWords.length) {
                    if (subWords[j].length > 13) {
                        let subw = qu._break(subWords[j]);
                        let subsubWords = subw.match(wordRegex);
                        let k = 0;
                        while (k < subsubWords.length) {
                            let frag = new Fragment(subsubWords[k]);

                            sentence.push( frag );
                            positions.push( { sentence: sentenceIndex, fragment: fragIndex } );
                            fragIndex++;
                            k++;
                            // old
                            frags.push( frag );

                        }  // end for every sub sub word
                    } else {
                        let frag = new Fragment(subWords[j]);
                        sentence.push( frag );
                        positions.push( { sentence: sentenceIndex, fragment: fragIndex } );
                        fragIndex++;
                        // old
                        frags.push( frag );
                    }  // end if long word

                    j++;
                }  // end for every subword

                i++;
            }  // end for every raw word

            return {posIndex: pos, fragments: sentence};
        };  // End qu._processSentence()

        qu._puncBreak = function (word) {  // Recursive
            var parts = puncSplit.exec(word);
            var ret = [];
            if (parts) {
                ret.push (parts[1]+parts[2]);
                ret = ret.concat(qu._puncBreak(parts[3]));
            } else {
                ret = [word];
            }
            return ret.join(' ');
        };

        qu._break = function (word) {
        /* 
        * 
        * Break up longer words into shorter fragments.
        * TODO: Deal with words that are non-English or nonsense
        */
            // punctuation, prefix, center, suffix, punctuation
            var parts = presuf.exec(word);
            var ret = [];
            if (parts[2]) {
                ret.push(parts[2]);
            }
            if (parts[3]) {
                ret.push(parts[3].replace(vccv, '$1-$2'));
            }
            if (parts[4]) {
                ret.push(parts[4]);
            }
            return (parts[1]||'') + ret.join('-') + (parts[5]||'');
        };


        // ========= RUNTIME: TRAVELING THE QUEUE (for external use) ========= \\
        qu.getFrag = function ( pos ) {
            var frag = qu.sentenceFragments[ pos.sentence ].fragments[ pos.fragment ];
            return frag;
        };

        qu.getIndex = function ( posToTest ) {
            console.log('position:', posToTest, 'positions:', qu.positions)
            var index = qu.positions.findIndex( function matchPositionToIndex( pos ) {
                console.log( pos );
                var sent = pos.sentence === posToTest.sentence,
                    frag = pos.fragment === posToTest.fragment;
                return sent && frag;
            });
            console.log(index)
            return index;
        };

        // qu.getSentence = function ( pos ) {
        //     var sent = qu.sentenceFragments[ pos.sentence ];
        //     return sent;
        // };

        // qu.getWord = function ( pos ) {
        //     var frag = qu.sentenceFragments[ pos.sentence ].fragments[ pos.fragment ];
        //     return frag;
        // };

        qu.next = qu.nextWord = function () {

            // if ( qu.getProgress() >= 1 ) {
            //     return qu.getFrag( qu.index );
            // }

            // var pos       = qu.position,
            //     potential = { sentence: pos.sentence, fragment: pos.fragment },
            //     sent      = qu.getSentence( potential );

            // if ( pos.fragment >= sent.length ) {
            //     potential.sentence += 1;
            //     potential.fragment = 0;
            //     sent = qu.getSentence( potential );
            // }

            // if ( sent ) {
            //     qu.index += 1;
            // }


            // var incremented = { sentence: qu.position.sentence, word: qu.position.word + 1 }
            // var potential = qu.getWord( incremented );
            // if ( !potential ) {
            //     incremented.sentence += 1;
            //     incremented.word = 0;
            //     potential;
            // }
            qu.index    = Math.min( qu.index + 1, qu.positions.length - 1 );
            var pos     = qu.positions[ qu.index ];
            qu.position = { sentence: pos.sentence, fragment: pos.fragment };
            // console.log( qu.position, qu.index );
            return qu.getFrag( qu.position );
        };

        qu.prev = qu.prevWord = function () {
            qu.index    = Math.max( qu.index - 1, 0 );
            var pos     = qu.positions[ qu.index ];
            qu.position = { sentence: pos.sentence, fragment: pos.fragment };
            return qu.getFrag( qu.position );
        };

        qu.current = qu.currentWord = function() {
            // Make sure nothing's off about the index
            var index   = Math.max( qu.index, 0 );
            qu.index    = Math.min( index, qu.positions.length - 1 );
            var pos     = qu.positions[ index ];
            qu.position = { sentence: pos.sentence, fragment: pos.fragment };
            return qu.getFrag( qu.position );
        };

        qu.nextSentence = function () {
            var pos     = qu.position,
                senti   = pos.sentence + 1;

            pos.sentence = Math.min( senti, (qu.sentenceFragments.length - 1) );
            pos.fragment = 0;
            qu.index     = qu.getIndex( pos );

            // console.log( 'sentence:');//, pos, qu.index );

            // // Possibly faster method to explore if optimization becomes an issue:
            // // If there's no next sentence
            // if ( senti >= qu.sentenceFragments.length ) {
            //     // Go to the start of the last sentence
            //     var diff = qu.position.fragment;
            //     qu.position.fragment = 0;
            //     qu.index -= diff;
            //     // ?? Stay at the current word instead?
            // } else {
            //     qu.position.sentence += 1;
            //     qu.position.fragment = 0;
            //     qu.index = qu.getIndex( qu.position );
            // }

            return qu.getFrag( qu.position );
        };  // End qu.nextSentence()

        qu.prevSentence = function () {
            var pos     = qu.position,
                senti   = pos.sentence - 1;

            pos.sentence = Math.max( senti, 0 );
            pos.fragment = 0;
            qu.index     = qu.getIndex( pos );

            return qu.getFrag( qu.position );
        };  // End qu.prevSentence()

        qu.currentSentence = function () {
            var pos     = qu.position,
                senti   = pos.sentence;

            senti = Math.min( senti, (qu.sentenceFragments.length - 1) );
            senti = Math.max( senti, 0 );
            pos.sentence = senti;
            pos.fragment = 0;
            qu.index     = qu.getIndex( pos );

            return qu.getFrag( qu.position );
        };  // End qu.currentSentence()

        qu.restart = function () {
            // Will be normalized by the next operation called (next, prev, current)
            qu.index    = -1;
            qu.position = { sentence: 0, fragment: 0 };
            return qu;
        };

        // TODO: Go back whole words and sentences at a time
        qu.goTo = function ( playbackObj ) {
        // .type = 'index', 'word', or 'sentence'
        // .amount = int
        // Not sure what argument to pass in.
        // 'previous sentence'? 'next sentence'? 'section of document'? An index number?
            var type    = playbackObj.type,
                amount  = playbackObj.amount;
            if ( type === 'index' || type === 'word' ) {
                qu.index = amount;
            } else if ( type === 'sentence' ) {

            }
            // TODO: (perhaps) qu[ type ] = amount;
            return qu;
        };


        qu.getProgress = function () {
            qu._progress = qu.index / (qu.positions.length - 1);
            return qu._progress;
        };

        return qu;
    };  // End Queue() -> {}

    return Queue;
}));
