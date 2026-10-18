/* Marks the document as scripted, so CSS can scope its hidden start states to it.
   Loaded synchronously in the head, before the body renders, so there is no flash.
   If JavaScript is blocked or fails to load this never runs, and the page keeps its
   content visible instead of being stuck at opacity:0 with no way to recover. */
'use strict';
document.documentElement.classList.add('js');
