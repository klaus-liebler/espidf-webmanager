import { ConfigGroup, StringItem, IntegerItem, BooleanItem, EnumItem } from './usersettings_base';


export default class{
    public static Build():ConfigGroup[]{
        let i1:StringItem;
        let i2:StringItem;
        return [
            new ConfigGroup("Group1",
            [
                i1=new StringItem("G1I1 String", "foo", /.*/),
                i2=new StringItem("G1I2 String", "BAR", /.*/),
            ]),
            new ConfigGroup("Group2",
            [
                new StringItem("G2I1 String", "BAR", /.*/),
                new IntegerItem("G2I2 Int", 1, 0, 100000, 1),
                new BooleanItem("G2I3 Bool", true),
                new EnumItem("G2I4 Enum", ["Hund", "Katze", "Maus", "Ente"]),
            ]),
            new ConfigGroup("webmananger",[
                new StringItem("ssid", "smopla"),
                new StringItem("password", "myosotis2020"),
            ])
        ];
    }
}