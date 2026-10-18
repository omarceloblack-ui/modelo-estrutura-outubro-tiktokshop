(() => {
  'use strict';
  window.MB_PRICING = quantity => {const unit=quantity>=2?2653:3790;return{unit,subtotal:unit*quantity,discount:(3790-unit)*quantity,discountPercent:quantity>=2?30:0};};
})();
