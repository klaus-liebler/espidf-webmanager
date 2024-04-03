import { RequestGetUserSettings, RequestSetUserSettings, RequestWrapper, Requests, ResponseGetUserSettings, ResponseSetUserSettings, ResponseWrapper, Responses } from "../generated/flatbuffers/webmanager";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';
import us from "../generated/usersettings_copied_during_build";
import { BooleanItem, ConfigGroup, ConfigItemRT, EnumItem, IntegerItem, StringItem, ValueUpdater } from "../usersettings_base";
import { T } from "../utils";
import { Severity } from "./dialog_controller";

class ConfigGroupRT{
    constructor(public groupKey:string, public saveButton:HTMLInputElement, public updateButton:HTMLInputElement){}
}


export class UsersettingsController extends ScreenController implements ValueUpdater{

    UpdateSaveButton(groupName:string){
        let group=this.groupName2itemName2configItemRT.get(groupName);
        let atLeastOneHasChanged=false;
        for(let v of group!.values()){
            if(v.cfgItem.HasAChangedValue()){
                atLeastOneHasChanged=true;
                break;
            }
        }
        let gc=this.groupName2configGroupRT.get(groupName)!;
        gc.saveButton.disabled=!atLeastOneHasChanged;
    }

    UpdateString(groupName:string, i:StringItem, v:string): void {
        console.log(`${i.displayName}=${v}`);
        this.UpdateSaveButton(groupName);
       
    }
    UpdateInteger(groupName:string, i:IntegerItem, v: number): void {
        console.log(`${i.displayName}=${v}`);
        this.UpdateSaveButton(groupName);
    }

    UpdateBoolean(groupName:string, i: BooleanItem, value: boolean): void {
        console.log(`${i.displayName}=${value}`);
        this.UpdateSaveButton(groupName);
    }
    UpdateEnum(groupName:string, i: EnumItem, selectedIndex: number): void {
        console.log(`${i.displayName}=${selectedIndex}`);
        this.UpdateSaveButton(groupName);
    }

    private groupName2itemName2configItemRT = new Map<string, Map<string,ConfigItemRT>>();
    private groupName2configGroupRT = new Map<string, ConfigGroupRT>();
    private cfg:ConfigGroup[]=[];


    private sendRequestGetUserSettings(groupKey:string) {
        let b = new flatbuffers.Builder(256);
        let n = RequestGetUserSettings.createRequestGetUserSettings(b, b.createString(groupKey));
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestGetUserSettings, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseGetUserSettings], 3000);
    }

    sendRequestSetUserSettings(groupKey:string) {
        let b = new flatbuffers.Builder(1024);
        let vectorOfSettings:number[]=[];
        for(let v of this.groupName2itemName2configItemRT.get(groupKey)!.values()){
            if(!v.cfgItem.HasAChangedValue()) continue;
            vectorOfSettings.push(v.cfgItem.WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b));
        }
        let settingsOffset:number= ResponseGetUserSettings.createSettingsVector(b, vectorOfSettings)
        let n = RequestSetUserSettings.createRequestSetUserSettings(b, b.createString(groupKey), settingsOffset);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestSetUserSettings, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseSetUserSettings], 3000);
    }


    public onMessage(messageWrapper: ResponseWrapper): void {
        switch (messageWrapper.responseType()) {
            case Responses.ResponseGetUserSettings:
                this.onResponseGetUserSettings(messageWrapper);
                break;
            case Responses.ResponseSetUserSettings:
                this.onResponseSetUserSettings(messageWrapper);
            default:
                break;
        }
    }
    public onResponseSetUserSettings(messageWrapper: ResponseWrapper): void{
        let resp = <ResponseSetUserSettings>messageWrapper.response(new ResponseSetUserSettings());
        let groupRtMap=this.groupName2itemName2configItemRT.get(resp.groupKey()!);
        if(!groupRtMap){
            this.appManagement.DialogController().showOKDialog(Severity.WARN, `Received settings for unknown group index ${resp.groupKey()}`);
            return;
        }
        groupRtMap.forEach((v,k,m)=>{v.Flag=false});
        let unknownKeys:string[]=[];
        for (let i = 0; i < resp.settingKeysLength(); i++) {
            let key = resp.settingKeys(i);
            let itemRt = groupRtMap.get(key);
            if(!itemRt){
                unknownKeys.push(key);
                continue;
            }
            itemRt.cfgItem.ConfirmSuccessfulWrite();
            itemRt.Flag=true;
        }
        let nonStoredEntryKeys:string[]=[];
        groupRtMap.forEach((v,k,m)=>{
            if(!v.Flag){
                nonStoredEntryKeys.push(v.cfgItem.displayName);
            }
        });
        if(unknownKeys.length!=0 || nonStoredEntryKeys.length!=0){
            this.appManagement.DialogController().showOKDialog(Severity.WARN, `The following errors occured while receiving data for ${resp.groupKey()}: Unknown names: ${unknownKeys.join(", ")}; No successful storage for: ${nonStoredEntryKeys.join(", ")};`);
        }
        groupRtMap.forEach((v,k,m)=>{v.Flag=false});
    }
    
    public onResponseGetUserSettings(messageWrapper: ResponseWrapper): void{
        let resp = <ResponseGetUserSettings>messageWrapper.response(new ResponseGetUserSettings());
        let groupRtMap=this.groupName2itemName2configItemRT.get(resp.groupKey()!);
        if(!groupRtMap){
            this.appManagement.DialogController().showOKDialog(Severity.WARN, `Received settings for unknown group index ${resp.groupKey()}`);
            return;
        }
        groupRtMap.forEach((v,k,m)=>{v.Flag=false});
        let unknownKeys:string[]=[];
        for (let i = 0; i < resp.settingsLength(); i++) {
            let itemKey = resp.settings(i)!.settingKey()!;
            
            let itemRt = groupRtMap.get(itemKey)!;
            if(!itemRt){
                unknownKeys.push(itemKey);
                continue;
            }
            itemRt.cfgItem.ReadFlatbuffersObjectAndSetValueInDom(resp.settings(i)!);
            itemRt.Flag=true;
        }
        let nonUpdatedEntries:string[]=[];
        groupRtMap.forEach((v,k,m)=>{
            if(!v.Flag){
                nonUpdatedEntries.push(v.cfgItem.displayName);
                v.cfgItem.NoDataFromServerAvailable();
            }
        });
        if(unknownKeys.length!=0 || nonUpdatedEntries.length!=0){
            this.appManagement.DialogController().showOKDialog(Severity.WARN, `The following errors occured while receiving data for ${resp.groupKey()}: Unknown keys: ${unknownKeys.join(", ")}; No updates for: ${nonUpdatedEntries.join(", ")};`);
        }
    }

    
    onCreate(): void {
        this.appManagement.registerWebsocketMessageTypes(this, Responses.ResponseGetUserSettings, Responses.ResponseSetUserSettings);
        this.cfg = us.Build();
        this.cfg.forEach((group, groupIndex)=>{
            let acc_pan=T(this.appManagement.MainElement(), "Accordion");
            let button:HTMLButtonElement=<HTMLButtonElement>acc_pan.children[0];
            button.children[0].textContent="▶";
            button.children[1].textContent=group.displayName;
            button.onclick=(e)=>{
                button.classList.toggle("active");
                let panel = button.nextElementSibling as HTMLElement;
                if (panel.style.display === "block") {
                    panel.style.display = "none";
                    button.children[0].textContent="▶";
                } else {
                    panel.style.display = "block";
                    button.children[0].textContent="▼";
                    this.sendRequestGetUserSettings(group.Key);
                }
                e.stopPropagation();
            };
            let pan=acc_pan.children[1]!.children[0]!.children[1]! as HTMLTableSectionElement;
            for(const item of group.items){
                item.RenderHtml(pan, group.displayName, this);
                let itemName2configItemRT=this.groupName2itemName2configItemRT.get(group.Key);
                if(!itemName2configItemRT){
                    itemName2configItemRT=new Map<string, ConfigItemRT>();
                    this.groupName2itemName2configItemRT.set(group.Key, itemName2configItemRT);
                }
                itemName2configItemRT.set(item.displayName, new ConfigItemRT(item, group.Key));
            }
            let saveButton = button.children[2] as HTMLInputElement;
            saveButton.disabled=true;
            saveButton.onclick=(e)=>{this.sendRequestSetUserSettings(group.Key);e.stopPropagation()}
            let updateButton = button.children[3] as HTMLInputElement;
            updateButton.onclick=(e)=>{this.sendRequestGetUserSettings(group.Key);e.stopPropagation()}
            this.groupName2configGroupRT.set(group.Key, new ConfigGroupRT(group.Key, saveButton, updateButton));
        });
    }
   
    onFirstStart(): void {
        
    }
    onRestart(): void {
        
    }
    onPause(): void {
    }

}
