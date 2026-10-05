function calculateTravelerCost(traveler) {
      let sum = 0;
      if (traveler === 'mario') {
        sum += getCatalogBrick(state.mario.salida)?.price || 0;
        if (isMarioAlt()) {
          sum += getCatalogBrick(state.mario.bog_esp)?.price || 0;
        } else {
          sum += getCatalogBrick(state.mario.trans)?.price || 0;
        }
      } else {
        sum += getCatalogBrick(state.yesica.salida)?.price || 0;
        sum += getCatalogBrick(state.yesica.trans)?.price || 0;
        if (state.yesica.retorno_trans) sum += getCatalogBrick(state.yesica.retorno_trans)?.price || 0;
        if (state.yesica.retorno_canarias) sum += getCatalogBrick(state.yesica.retorno_canarias)?.price || 0;
      }
      return sum;
    }