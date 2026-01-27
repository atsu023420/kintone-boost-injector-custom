(() => {
"use strict";
kb.event.on('kb.edit.load.complete', (event) => {
console.log(event);
return event;
});
})();
