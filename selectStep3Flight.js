function selectStep3Flight(traveler, stateKey, flightId, isJoint) {
      if (isJoint) {
        state.mario.trans = flightId;
        const selected = getCatalogBrick(flightId);
        if (selected?.segment === 'espana-mexico') {
          if (flightId === 'esp_mex_level_ib2601') state.yesica.trans = 'yes_trans_mex_level_bcn';
          else if (flightId === 'esp_mex_emirates_ek255') state.yesica.trans = 'yes_trans_mex_level_bcn';
          else if (flightId === 'esp_mex_iberia_bcn_con') state.yesica.trans = 'yes_trans_mex_iberia_bcn';
          else if (flightId === 'esp_mex_aeromexico_bcn') state.yesica.trans = 'yes_trans_mex_iberia_bcn';
          else state.yesica.trans = 'yes_trans_mex_iberia';
        } else if (selected?.segment === 'espana-colombia') {
          if (selected.airline === 'avianca') state.yesica.trans = selected.id === 'esp_col_avianca_bcn' ? 'esp_col_avianca_bcn' : 'yes_trans_avianca';
          else if (selected.airline === 'iberia') state.yesica.trans = selected.id === 'esp_col_iberia_bcn' ? 'esp_col_iberia_bcn' : 'yes_trans_iberia';
          else if (selected.airline === 'air-europa') state.yesica.trans = 'yes_trans_aireuropa_mad';
          else if (selected.airline === 'aeromexico') state.yesica.trans = 'yes_trans_aeromexico';
          else if (selected.airline === 'klm-airfrance') state.yesica.trans = 'yes_trans_klm';
          else state.yesica.trans = 'yes_trans_avianca';
        } else {
          const yKey = flightId.replace('_mario_', '_yesica_');
          state.yesica.trans = flightsCatalog[yKey] ? yKey : (selected?.airline === 'iberia' ? 'yes_trans_iberia' : 'yes_trans_avianca');
        }
        showToast('✓ Vuelo Conjunto Sincronizado para Mario y Yesica', 'success');
      } else {
        state[traveler][stateKey] = flightId;
        showToast('✓ Vuelo seleccionado con éxito', 'success');
      }
      autoSaveActiveSession();
      renderStep3();
      render();
    }