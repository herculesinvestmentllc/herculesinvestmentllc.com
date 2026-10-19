/* Marks the document as scripted, so CSS can scope its hidden start states to it.
   Loaded synchronously in the head, before the body renders, so there is no flash.
   If JavaScript is blocked or fails to load this never runs, and the page keeps its
   content visible instead of being stuck at opacity:0 with no way to recover.

   The hidden start state is only safe if something is guaranteed to lift it. The reveal
   script lives at the end of the body, so a request that hangs or is blocked after this
   file runs would leave the page hidden with no recovery. The timer below is that
   guarantee: if the reveal has not started shortly after load, unhide everything.
   effects.js clears it the moment it begins observing. */
'use strict';
document.documentElement.classList.add('js');
window.__revealTimer = setTimeout(function () {
  document.documentElement.classList.add('no-anim');
}, 2000);
