
import Home from './svelte_pages/Home.svelte'
import SensactScreen from './svelte_pages/SensactScreen.svelte'
import NotFound from './svelte_pages/NotFound.svelte'

import type { ComponentType } from "svelte";
import SystemInfo from './svelte_pages/SystemInfo.svelte';
import WifiManager from './svelte_pages/WifiManager.svelte';
import Fingerprint from './svelte_pages/Fingerprint.svelte';
import CanBusMonitor from './svelte_pages/CanBusMonitor.svelte';
import Timeseries from './svelte_pages/Timeseries.svelte';

export class MenuEntryDefinition {
    constructor(
      public path: string,
      public handler: ComponentType,
      public icon: string,
      public caption: string,
    ) {}
  }

export const   menuEntries: Array<MenuEntryDefinition> = [
    new MenuEntryDefinition('/', Home, '☗', 'Home'),
    new MenuEntryDefinition('/sensact', SensactScreen, '&#127760;', 'Sensact'),
    new MenuEntryDefinition('/wifiman', WifiManager, '📶', 'Wifi Manager'),
    new MenuEntryDefinition('/timeseries', Timeseries, '📊', 'Timeseries'),
    new MenuEntryDefinition('/systeminfo', SystemInfo, '&#9881;', 'System Info'),
    new MenuEntryDefinition('/usersettings', NotFound, '&#9000;', 'User Settings'),
    new MenuEntryDefinition('/fingerprint', Fingerprint, '&#128073;', 'Fingerprint'),
    new MenuEntryDefinition('/canbus', CanBusMonitor, '🖵', 'Can Bus Monitor'),
  ]