<script lang="ts">
    
export var DisplayName=""
let showContent = true
</script>
<div class='appgroup'>
  <button on:click={()=>(showContent=!showContent)}><span>{showContent?'▼':'▶'}</span>{DisplayName}<span></span></button>
  <div style="display:{showContent?'block':'none'};">
  </div>
</div>