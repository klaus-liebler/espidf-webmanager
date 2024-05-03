<script lang="ts">
    import { ApplicationId } from '../../generated/flatbuffers/application-id'
    import * as x from '../../generated/sensact/sendCommandImplementation_copied_during_build'
    export var DisplayName = ''
    export var AppId:ApplicationId = 0

    function up() {
        x.SendUPCommand(AppId, 1)
        console.log(`blind_up ${AppId}`)
        //e.stopPropagation();
    }

    function stop() {
        x.SendSTOPCommand(AppId)
        console.log(`blind_stop ${AppId}`)
        //e.stopPropagation();
    }

    function down() {
        x.SendDOWNCommand(AppId, 1)
        console.log(`blind_down ${AppId}`)
        //e.stopPropagation();
    }
</script>

<div class="app">
    <div>
        <h2>{DisplayName}</h2>
        <p>{ApplicationId[AppId]}</p>
    </div>
    <div>
        <button on:click={() => up()}>⏶</button>
        <button on:click={() => stop()}>⏹</button>
        <button on:click={() => down()}>⏷</button>
    </div>
</div>
