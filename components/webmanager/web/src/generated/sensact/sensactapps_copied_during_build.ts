import { ApplicationId } from "../../generated/flatbuffers/application-id";
import ApplicationGroup from "../../svelte_components/sensacts_widgets/ApplicationGroup.svelte"
import BlindApplication from "../../svelte_components/sensacts_widgets/BlindApplication.svelte"
import OnOffApplication from "../../svelte_components/sensacts_widgets/OnOffApplication.svelte"
import { mount } from 'svelte';

export default function Build(target:HTMLElement):Array<any>{
    var ret = new Array<any>();
    //OnOff erstes Licht 
    ret.push(mount(OnOffApplication, {target:target, props:{AppId:ApplicationId.ApplicationId_POWIT_9, DisplayName:"erstes Licht"}}))
    return ret;
}