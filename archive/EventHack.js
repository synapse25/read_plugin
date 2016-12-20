/* EventHack.js
* 
* Just a quick and dirty non-DOM based event system
* http://stackoverflow.com/a/15308814/3791179
*/

(function (root, eventFactory) {  // root is usually `window`
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define( [], function () { return ( root.EventHack = eventFactory() ); });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but only CommonJS-like
        // environments that support module.exports, like Node.
        module.exports = eventFactory();
    } else {
        // Browser globals
        root.EventHack = eventFactory();
    }
}(this, function () {

	"use strict";

	// var EventHack = function () {

		function _Event(name){
		  this.name = name;
		  this.callbacks = [];
		}

		_Event.registerCallback = function(callback){
		  this.callbacks.push(callback);
		}

		function EventHack(){
		  this.events = {};
		}

		var eh = EventHack.prototype;

		eh.prototype.registerEvent = function(eventName){
		  var evnt = new _Event(eventName);
		  this.events[eventName] = evnt;
		};

		eh.prototype.trigger = function(eventName, eventArgs){
		  this.events[eventName].callbacks.forEach(function(callback){
		    callback(eventArgs);
		  });
		};

		eh.prototype.on = function(eventName, callback){
		  this.events[eventName].registerCallback(callback);
		};


	// 	return Event;
	// };  // End EventHack() -> {}

    // return EventHack;
    return EventHack;
}));




