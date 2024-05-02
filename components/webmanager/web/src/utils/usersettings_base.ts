import { BooleanSetting, EnumSetting, IntegerSetting, Setting, SettingWrapper, StringSetting } from '../generated/flatbuffers/webmanager';
import { A, T } from './utils'
import * as flatbuffers from 'flatbuffers';

export enum ItemState {
    NODATA,
    SYNCHRONIZED,
    NONSYNCHRONIZED,
}

export interface ValueUpdater {
    UpdateString(groupName: string, i: StringItem, v: string): void;
    UpdateInteger(groupName: string, i: IntegerItem, v: number): void;
    UpdateBoolean(groupName: string, i: BooleanItem, v: boolean): void;
    UpdateEnum(groupName: string, i: EnumItem, v: number): void;
}

export abstract class ConfigItem {
    protected inputElement!:HTMLInputElement|HTMLSelectElement;
    protected resetButton!:HTMLInputElement;
    protected itemState:ItemState=ItemState.NODATA;

    constructor(public readonly displayName: string, private key:string|null=null) { }

    public get Key(){
        return this.key??this.displayName;
    }

    public get ItemState(){
        return this.itemState;
    }

    public NoDataFromServerAvailable(){
        this.SetVisualState(ItemState.NODATA);
    }

    public ConfirmSuccessfulWrite(){
        this.SetVisualState(ItemState.SYNCHRONIZED);
    }

    protected SetVisualState(value: ItemState): void {
        this.inputElement.className = "";
        this.inputElement.classList.add("config-item");
        switch (value) {
            case ItemState.NODATA:
                this.inputElement.classList.add("nodata");
                this.inputElement.disabled=true;
                this.resetButton.disabled=true;
                break;
            case ItemState.SYNCHRONIZED:
                this.inputElement.classList.add("synchronized");
                this.inputElement.disabled=false;
                this.resetButton.disabled=true;
                break;
            case ItemState.NONSYNCHRONIZED:
                this.inputElement.classList.add("nonsynchronized");
                this.inputElement.disabled=false;
                this.resetButton.disabled=false;
                break;
            default:
                break;
        }
    }
    

    abstract RenderHtml(parent: HTMLElement, groupName: string, callback: ValueUpdater): void;
    abstract WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b: flatbuffers.Builder): number;
    abstract ReadFlatbuffersObjectAndSetValueInDom(sw: SettingWrapper): boolean;
    abstract HasAChangedValue(): boolean;
}

export class ConfigItemRT {
    public Flag: boolean = false; //for various use; eg. to check whether all Items got an update
    constructor(public readonly cfgItem: ConfigItem, public readonly groupKey: string) {
    }
}

export class StringItem extends ConfigItem {
    HasAChangedValue(): boolean {
        return this.inputElement.value != this.inputElement.dataset["previousvalue"];
    }
   
    WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b: flatbuffers.Builder): number {
        let settingOffset = StringSetting.createStringSetting(b, b.createString(this.inputElement.value));
        return SettingWrapper.createSettingWrapper(b, b.createString(this.Key), Setting.StringSetting, settingOffset);
    }
    ReadFlatbuffersObjectAndSetValueInDom(sw: SettingWrapper): boolean {
        if (sw.settingType() != Setting.StringSetting) return false;
        let s = <StringSetting>sw.setting(new StringSetting());
        if (!s.value()){console.warn("Returned a null value for string "+this.Key); true;}
        if (!this.regex.test(s.value()!)){console.warn(`Regex ${this.regex} does not accept ${s.value()}`);  return false;}
        this.inputElement.value = s.value()!;
        this.inputElement.dataset["previousvalue"] = s.value()!;
        this.SetVisualState(ItemState.SYNCHRONIZED);
        return true;
    }

    constructor(displayName: string, public readonly defaultValue: string = "", public readonly regex: RegExp = /.*/, key:string|null=null) { super(displayName, key) }
    RenderHtml(parent: HTMLElement, groupName: string, callback: ValueUpdater) {
        let tr = T(parent, "StringItem") as HTMLTableRowElement;
        tr.firstElementChild!.textContent = this.displayName;
        this.inputElement = tr.children[2]!.children[0] as HTMLInputElement;
        this.inputElement.value = this.defaultValue;
        this.inputElement.dataset["previousvalue"] = this.defaultValue;
        this.inputElement.pattern = this.regex.source;
        this.inputElement.oninput = () =>{
            this.SetVisualState(this.HasAChangedValue()?ItemState.NONSYNCHRONIZED:ItemState.SYNCHRONIZED);
            callback.UpdateString(groupName, this, this.inputElement.value);
        }
        this.resetButton = tr.children[1]!.children[0] as HTMLInputElement;
        this.resetButton.onclick=()=>{
            let fireChangeEvent= this.HasAChangedValue();
            this.inputElement.value = this.inputElement.dataset["previousvalue"]!;
            this.SetVisualState(ItemState.SYNCHRONIZED);
            if(fireChangeEvent)callback.UpdateString(groupName, this, this.inputElement.value); 
        }
        this.SetVisualState(ItemState.NODATA);
        return;
    }
}

export class IntegerItem extends ConfigItem {
    HasAChangedValue(): boolean {
        return this.inputElement.value != this.inputElement.dataset["previousvalue"];
    }

    WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b: flatbuffers.Builder): number {
        let settingOffset = IntegerSetting.createIntegerSetting(b, parseInt(this.inputElement.value));
        return SettingWrapper.createSettingWrapper(b, b.createString(this.Key), Setting.IntegerSetting, settingOffset);
    }
    ReadFlatbuffersObjectAndSetValueInDom(sw: SettingWrapper): boolean {
        if (sw.settingType() != Setting.IntegerSetting) return false;
        let s = <IntegerSetting>sw.setting(new IntegerSetting());
        if (!s) return true;
        if (!s.value()) return true;
        this.inputElement.value = s.value().toString();
        this.inputElement.dataset["previousvalue"] = s.value().toString();
        this.SetVisualState(ItemState.SYNCHRONIZED);
        return true;
    }
    constructor(displayName: string, public readonly defaultValue: number = 0, public readonly min: number = 0, public readonly max: number = Number.MAX_SAFE_INTEGER, public readonly step: number = 1, key:string|null=null) {
        super(displayName, key)
    }

    RenderHtml(parent: HTMLElement, groupName: string, callback: ValueUpdater) {
        let tr = T(parent, "IntegerItem") as HTMLTableRowElement;
        tr.firstElementChild!.textContent = this.displayName;
        this.inputElement = tr.children[2]!.children[0] as HTMLInputElement;
        this.inputElement.value = this.defaultValue.toString();
        this.inputElement.min = this.min.toString();
        this.inputElement.max = this.max.toString();
        this.inputElement.dataset["previousvalue"] = this.defaultValue.toString();
        this.inputElement.oninput = () =>{
            this.SetVisualState(this.HasAChangedValue()?ItemState.NONSYNCHRONIZED:ItemState.SYNCHRONIZED);
            callback.UpdateInteger(groupName, this, parseInt(this.inputElement.value));
        }
        this.resetButton = tr.children[1]!.children[0] as HTMLInputElement;
        this.resetButton.onclick=()=>{
            let fireChangeEvent= this.HasAChangedValue();
            this.inputElement.value = this.inputElement.dataset["previousvalue"]!;
            this.SetVisualState(ItemState.SYNCHRONIZED);
            if(fireChangeEvent)callback.UpdateInteger(groupName, this, parseInt(this.inputElement.value)); 
        }
        this.SetVisualState(ItemState.NODATA);
        return;
    }


}

export class BooleanItem extends ConfigItem {

    HasAChangedValue(): boolean {
        return (<HTMLInputElement>this.inputElement).checked != (this.inputElement.dataset["previousvalue"]=="true");
    }


    WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b: flatbuffers.Builder): number {
        let settingOffset = BooleanSetting.createBooleanSetting(b, (<HTMLInputElement>this.inputElement).checked);
        return SettingWrapper.createSettingWrapper(b, b.createString(this.Key), Setting.BooleanSetting, settingOffset);
    }
    ReadFlatbuffersObjectAndSetValueInDom(sw: SettingWrapper): boolean {
        if (sw.settingType() != Setting.BooleanSetting) return false;
        let s = <BooleanSetting>sw.setting(new BooleanSetting());
        if (!s) return true;
        (<HTMLInputElement>this.inputElement).checked = s.value();
        this.inputElement.dataset["previousvalue"] = s.value() ? "true" : "false";
        this.SetVisualState(ItemState.SYNCHRONIZED);
        return true;
    }

    RenderHtml(parent: HTMLElement, groupName: string, callback: ValueUpdater) {
        let tr = T(parent, "BooleanItem") as HTMLTableRowElement;
        tr.firstElementChild!.textContent = this.displayName;
        this.inputElement = tr.children[2]!.children[0] as HTMLInputElement;
        this.inputElement.checked = this.defaultValue;
        this.inputElement.dataset["previousvalue"] = this.defaultValue.toString();
        this.inputElement.onchange = () => {
            this.SetVisualState(this.HasAChangedValue()?ItemState.NONSYNCHRONIZED:ItemState.SYNCHRONIZED);
            callback.UpdateBoolean(groupName, this, (<HTMLInputElement>this.inputElement).checked);
        }
        this.resetButton = tr.children[1]!.children[0] as HTMLInputElement;
        this.resetButton.onclick=()=>{
            let fireChangeEvent= this.HasAChangedValue();
            (<HTMLInputElement>this.inputElement).checked = this.inputElement.dataset["previousvalue"]=="true";
            this.SetVisualState(ItemState.SYNCHRONIZED);
            if(fireChangeEvent)callback.UpdateBoolean(groupName, this, (<HTMLInputElement>this.inputElement).checked); 
        }
        this.SetVisualState(ItemState.NODATA);
        return;
    }

    constructor(displayName: string, public readonly defaultValue: boolean = false, key:string|null=null) {
        super(displayName, key);
    }
}

export class EnumItem extends ConfigItem {
    HasAChangedValue(): boolean {
        return (<HTMLSelectElement>this.inputElement).selectedIndex != parseInt(this.inputElement.dataset["previousvalue"]!);
    }

    WriteToFlatbufferBufferAndReturnSettingWrapperOffset(b: flatbuffers.Builder): number {
        let settingOffset = EnumSetting.createEnumSetting(b, (<HTMLSelectElement>this.inputElement).selectedIndex);
        return SettingWrapper.createSettingWrapper(b, b.createString(this.Key), Setting.EnumSetting, settingOffset);
    }
    ReadFlatbuffersObjectAndSetValueInDom(sw: SettingWrapper): boolean {
        if (sw.settingType() != Setting.EnumSetting) return false;
        let s = <EnumSetting>sw.setting(new EnumSetting());
        if (!s) return true;
        (<HTMLSelectElement>this.inputElement).selectedIndex = s.value();
        this.inputElement.dataset["previousvalue"] = s.value().toString();
        this.SetVisualState(ItemState.SYNCHRONIZED);
        return true;
    }
    RenderHtml(parent: HTMLElement, groupName: string, callback: ValueUpdater): void {
        let tr = T(parent, "EnumItem") as HTMLTableRowElement;
        tr.firstElementChild!.textContent = this.displayName;
        this.inputElement = tr.children[2]!.children[0] as HTMLSelectElement;
        (<HTMLSelectElement>this.inputElement).selectedIndex = 0;
        this.values.forEach((v, i) => {
            let optionElement = <HTMLOptionElement>A((<HTMLSelectElement>this.inputElement), "option", undefined, v);
            optionElement.value = i.toString();
        });
        this.inputElement.dataset["previousvalue"] = (<HTMLSelectElement>this.inputElement).selectedIndex.toString();
        this.inputElement.onchange = () =>{
            this.SetVisualState(this.HasAChangedValue()?ItemState.NONSYNCHRONIZED:ItemState.SYNCHRONIZED);
            callback.UpdateEnum(groupName, this, (<HTMLSelectElement>this.inputElement).selectedIndex);
        }
        this.resetButton = tr.children[1]!.children[0] as HTMLInputElement;
        this.resetButton.onclick=()=>{
            let fireChangeEvent= this.HasAChangedValue();
            (<HTMLSelectElement>this.inputElement).selectedIndex = parseInt(this.inputElement.dataset["previousvalue"]!);
            this.SetVisualState(ItemState.SYNCHRONIZED);
            if(fireChangeEvent)callback.UpdateEnum(groupName, this, parseInt(this.inputElement.value));      
        }
        this.SetVisualState(ItemState.NODATA);
        return;
    }

    constructor(displayName: string, public readonly values: string[], key:string|null=null) {
        super(displayName, key);
    }

}

export class ConfigGroup {
    constructor(public readonly displayName: string, public items: ConfigItem[], private key:string|null=null) { }

    public get Key(){
        return this.key??this.displayName;
    }
}