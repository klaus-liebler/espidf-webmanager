<script lang="ts">
    import type { ApplicationId } from '../../generated/flatbuffers/application-id'
    import * as x from '../../generated/sensact/sendCommandImplementation_copied_during_build'
    export var DisplayName = ''
    export var AppId:ApplicationId;
   
  
    function onclick(checkbox:EventTarget & HTMLInputElement): void {
    
    
      if (checkbox.checked) {
        x.SendONCommand(AppId, 0);
      } else {
        x.SendOFFCommand(AppId, 0);
      }
      console.log(`onoff ${AppId} ${checkbox.checked}`);
      //checkbox.stopPropagation();
    }
    
</script>

<div class='app'><div><h2>{DisplayName}</h2><p>{AppId}</p></div><div class='controls'><input class='toggle' type='checkbox' on:click={(e)=>{onclick(e)}}/></div></div>